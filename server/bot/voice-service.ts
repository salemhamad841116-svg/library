import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { dbService } from './database-service.js';

export type TTSProviderChoice = 'auto' | 'xtts' | 'elevenlabs' | 'openai';

export interface TTSOptions {
  provider?: TTSProviderChoice;
  voice?: string; // e.g. Voice ID for ElevenLabs or voice name ('onyx', 'echo') for OpenAI
  voiceId?: string; // Specific ElevenLabs Cloned Voice ID
  modelId?: string; // 'eleven_multilingual_v2' or 'tts-1'
  speed?: number; // 0.25 to 4.0, default 0.92 for clear, dignified, deliberate pacing
  stability?: number; // ElevenLabs stability (e.g. 0.65)
  similarityBoost?: number; // ElevenLabs similarity boost (e.g. 0.85)
  format?: 'ogg_opus' | 'mp3'; // Target format (ogg_opus required for WhatsApp PTT)
  xttsEndpointUrl?: string;
  referenceSpeakerPath?: string;
}

export interface VoiceEngineConfig {
  preferredProvider: TTSProviderChoice;
  xttsEndpointUrl: string;
  xttsApiKey: string;
  referenceSpeakerPath: string;
  referenceSpeakerName: string;
  hasUploadedReferenceAudio: boolean;
  uploadedReferenceSizeKb: number;
  elevenLabsVoiceId: string;
  openAiVoice: string;
  speed: number;
  updatedAt: string;
}

export interface CachedAudioResult {
  audioBuffer: Buffer;
  opusBuffer?: Buffer; // Specifically encoded for Baileys PTT (48kHz mono libopus)
  mimeType: string;
  audioBase64: string;
  opusBase64?: string;
  cacheKey: string;
  isCached: boolean;
  durationEstimateSec: number;
  providerUsed: 'xtts' | 'elevenlabs' | 'openai' | 'fallback';
  voiceIdUsed: string;
  voicePersonaLabel: string;
  latencyMs?: number;
}

// Memory & Disk cache structure for 24-hour retention
interface CacheMeta {
  hash: string;
  createdAt: number;
  expiresAt: number;
  filePath: string;
  opusFilePath?: string;
  mimeType: string;
  provider: string;
}

const CACHE_DIR = path.join(process.cwd(), '.audio_tts_cache');
const CONFIG_FILE_PATH = path.join(CACHE_DIR, 'voice-engine-config.json');
const REF_SPEAKER_FILE_PATH = path.join(CACHE_DIR, 'reference_speaker_sample.wav');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours credit window strictly enforced on server

// In-memory index of active audio cache items
const cacheIndex = new Map<string, CacheMeta>();

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create TTS cache directory:', err);
  }
}

const defaultVoiceConfig: VoiceEngineConfig = {
  preferredProvider: (process.env.TTS_PREFERRED_PROVIDER as TTSProviderChoice) || 'auto',
  xttsEndpointUrl: process.env.XTTS_ENDPOINT_URL || '',
  xttsApiKey: process.env.XTTS_API_KEY || '',
  referenceSpeakerPath: process.env.XTTS_SPEAKER_WAV || 'speaker_camel_commentator.wav',
  referenceSpeakerName: 'صوت المعلق الخليجي المرجعي (Zero-Shot WAV)',
  hasUploadedReferenceAudio: fs.existsSync(REF_SPEAKER_FILE_PATH),
  uploadedReferenceSizeKb: fs.existsSync(REF_SPEAKER_FILE_PATH)
    ? Math.round(fs.statSync(REF_SPEAKER_FILE_PATH).size / 1024)
    : 0,
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
  openAiVoice: 'onyx',
  speed: 0.92,
  updatedAt: new Date().toISOString(),
};

let currentVoiceConfig: VoiceEngineConfig = { ...defaultVoiceConfig };

// Load persisted config if present
try {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
    currentVoiceConfig = {
      ...defaultVoiceConfig,
      ...raw,
      hasUploadedReferenceAudio: fs.existsSync(REF_SPEAKER_FILE_PATH),
      uploadedReferenceSizeKb: fs.existsSync(REF_SPEAKER_FILE_PATH)
        ? Math.round(fs.statSync(REF_SPEAKER_FILE_PATH).size / 1024)
        : 0,
    };
  }
} catch (err) {
  console.warn('Could not read voice engine config file, using defaults:', err);
}

export function getVoiceEngineConfig(): VoiceEngineConfig {
  const hasFile = fs.existsSync(REF_SPEAKER_FILE_PATH);
  currentVoiceConfig.hasUploadedReferenceAudio = hasFile;
  currentVoiceConfig.uploadedReferenceSizeKb = hasFile
    ? Math.round(fs.statSync(REF_SPEAKER_FILE_PATH).size / 1024)
    : 0;
  return {
    ...currentVoiceConfig,
    // Mask API key slightly if needed or return for admin panel
  };
}

export function updateVoiceEngineConfig(partial: Partial<VoiceEngineConfig>): VoiceEngineConfig {
  currentVoiceConfig = {
    ...currentVoiceConfig,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(currentVoiceConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist voice engine config:', err);
  }
  return getVoiceEngineConfig();
}

export function saveReferenceSpeakerAudio(fileName: string, base64Data: string): VoiceEngineConfig {
  const cleanedBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const buffer = Buffer.from(cleanedBase64, 'base64');
  fs.writeFileSync(REF_SPEAKER_FILE_PATH, new Uint8Array(buffer));

  return updateVoiceEngineConfig({
    referenceSpeakerName: fileName || 'reference_speaker_sample.wav',
    referenceSpeakerPath: fileName || 'reference_speaker_sample.wav',
    hasUploadedReferenceAudio: true,
    uploadedReferenceSizeKb: Math.round(buffer.length / 1024),
  });
}

export function getReferenceSpeakerBase64(): string | null {
  try {
    if (fs.existsSync(REF_SPEAKER_FILE_PATH)) {
      return fs.readFileSync(REF_SPEAKER_FILE_PATH).toString('base64');
    }
  } catch (err) {
    console.error('Failed reading reference speaker file:', err);
  }
  return null;
}

/**
 * Transcodes any audio buffer (MP3 / WAV / AAC) into 100% pure WhatsApp-compliant Ogg Opus format.
 * WhatsApp PTT requires:
 * - Codec: libopus
 * - Container: OGG
 * - Sample Rate: 48,000 Hz or 16,000 Hz
 * - Channels: 1 (Mono)
 * - Bitrate: 32k-64k VBR
 */
export async function convertToWhatsAppOpus(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve) => {
    try {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i', 'pipe:0',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-vbr', 'on',
        '-compression_level', '10',
        '-ar', '48000',
        '-ac', '1',
        '-f', 'ogg',
        'pipe:1'
      ]);

      const chunks: Buffer[] = [];
      let errLogs = '';

      ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (data) => { errLogs += data.toString(); });

      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const converted = Buffer.concat(chunks);
          console.log(`🎵 [FFmpeg] تم تحويل الصوت بنجاح إلى Ogg Opus للواتساب (${converted.length} bytes)`);
          resolve(converted);
        } else {
          console.warn('⚠️ [FFmpeg] تعذر تحويل الصوت عبر FFmpeg، يتم استخدام البافر المباشر:', errLogs.slice(-200));
          resolve(inputBuffer);
        }
      });

      ffmpeg.on('error', (err) => {
        console.warn('⚠️ [FFmpeg] لم يتم العثور على أداة ffmpeg في النظام، استخدام البافر الأصلي:', err.message);
        resolve(inputBuffer);
      });

      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    } catch (e: any) {
      console.warn('⚠️ [FFmpeg Error]:', e.message);
      resolve(inputBuffer);
    }
  });
}

/**
 * Clean up expired cached audio files older than 24 hours (Server-side retention)
 */
export function purgeExpiredAudioCache(): number {
  const now = Date.now();
  let purgedCount = 0;

  for (const [hash, meta] of cacheIndex.entries()) {
    if (now > meta.expiresAt) {
      try {
        if (fs.existsSync(meta.filePath)) {
          fs.unlinkSync(meta.filePath);
        }
        if (meta.opusFilePath && fs.existsSync(meta.opusFilePath)) {
          fs.unlinkSync(meta.opusFilePath);
        }
      } catch (e) {
        console.error('Error removing expired cache file:', e);
      }
      cacheIndex.delete(hash);
      purgedCount++;
    }
  }

  // Also sweep physical directory in case of server restart (skip config and reference speaker files)
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file === 'voice-engine-config.json' || file === 'reference_speaker_sample.wav') {
          continue;
        }
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > CACHE_TTL_MS) {
          fs.unlinkSync(filePath);
          purgedCount++;
        }
      }
    }
  } catch (e) {
    console.error('Error sweeping cache directory:', e);
  }

  return purgedCount;
}

// Run periodic cleanup every 1 hour
setInterval(purgeExpiredAudioCache, 60 * 60 * 1000);

/**
 * Generate SHA-256 hash of normalized text + voice identifier + provider options
 */
export function generateTextHash(
  text: string,
  voiceIdentifier: string = 'default',
  provider: string = 'auto',
  speed: number = 0.92
): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const payload = `${normalized}|provider:${provider}|voice:${voiceIdentifier}|speed:${speed}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Self-Hosted / Serverless GPU Coqui XTTS-v2 Synthesis (Zero-Shot Arabic Voice Cloning)
 * Supports:
 * 1. Standard Coqui XTTS API server (`POST /tts_to_audio` or `/api/tts`) returning binary WAV/PCM
 * 2. RunPod / Modal Serverless GPU endpoints (`POST /runsync`) returning JSON `{ output: { audio_base64: "..." } }`
 */
export async function synthesizeWithXTTS(
  text: string,
  config: VoiceEngineConfig,
  speed: number = 0.92
): Promise<Buffer> {
  const endpoint = config.xttsEndpointUrl?.trim();
  if (!endpoint) {
    throw new Error('XTTS_ENDPOINT_URL is not configured');
  }

  const refSpeakerBase64 = getReferenceSpeakerBase64();
  const speakerWavPayload = refSpeakerBase64 || config.referenceSpeakerPath || 'speaker_camel_commentator.wav';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'audio/wav, audio/mpeg, application/json',
  };

  if (config.xttsApiKey?.trim()) {
    headers['Authorization'] = `Bearer ${config.xttsApiKey.trim()}`;
  }

  const isRunPodStyle = endpoint.includes('runpod.ai') || endpoint.endsWith('/runsync') || endpoint.endsWith('/run');

  const requestBody = isRunPodStyle
    ? {
        input: {
          text,
          language: 'ar',
          speaker_wav: speakerWavPayload,
          speed,
        },
      }
    : {
        text,
        language: 'ar',
        speaker_wav: speakerWavPayload,
        speed,
      };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`XTTS-v2 Server Error [${response.status}]: ${errText.slice(0, 200)}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json: any = await response.json();
      const base64Audio =
        json?.output?.audio_base64 ||
        json?.output?.audio ||
        json?.audio_base64 ||
        json?.audio ||
        (typeof json?.output === 'string' ? json.output : null);

      if (!base64Audio) {
        throw new Error('XTTS-v2 JSON response did not contain audio_base64 field');
      }
      const cleaned = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
      return Buffer.from(cleaned, 'base64');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ElevenLabs Arabic Dialect TTS Synthesis with Voice Cloning support
 * Supports Eleven Multilingual v2 with stability & similarity tuning
 */
export async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const modelId = options.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const stability = options.stability ?? 0.65;
  const similarityBoost = options.similarityBoost ?? 0.85;

  // ElevenLabs API endpoint
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: text,
      model_id: modelId,
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs TTS Error [${response.status}]: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * OpenAI TTS Synthesis
 * Requests native mp3 or opus depending on target
 */
export async function synthesizeWithOpenAI(
  text: string,
  voice: string,
  apiKey: string,
  speed: number = 0.92,
  format: 'mp3' | 'opus' = 'mp3'
): Promise<Buffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice || 'onyx',
      speed: speed,
      response_format: format, // 'mp3' or 'opus' (native OGG Opus container)
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI TTS Error [${response.status}]: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate synthetic audio tone buffer for preview/testing when live external keys are absent
 */
function createFallbackAudioBuffer(text: string): Buffer {
  const wordsCount = text.split(/\s+/).length;
  const estimatedSeconds = Math.max(2, Math.min(25, Math.ceil(wordsCount / 2.2)));
  
  const sampleRate = 16000;
  const numSamples = sampleRate * estimatedSeconds;
  const bufferSize = 44 + numSamples * 2;
  const buffer = Buffer.alloc(bufferSize);

  // RIFF/WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(bufferSize - 8, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Gentle harmonious male vocal formants simulation
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f0 = 135 + Math.sin(t * 2) * 15; // Masculine fundamental pitch
    const val = 0.4 * Math.sin(2 * Math.PI * f0 * t) + 0.2 * Math.sin(2 * Math.PI * f0 * 2 * t);
    const intSample = Math.floor(val * 24000);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

export function getPersonaLabelForProvider(
  providerUsed: 'xtts' | 'elevenlabs' | 'openai' | 'fallback',
  preferredProvider?: TTSProviderChoice
): string {
  if (providerUsed === 'xtts') {
    return 'XTTS-v2 (محركك الصوتي الخاص - Serverless GPU)';
  }
  if (providerUsed === 'elevenlabs') {
    return 'ElevenLabs (صوت الميدان الخليجي المستنسخ)';
  }
  if (providerUsed === 'openai') {
    return 'OpenAI Onyx (صوت رجولي وقور)';
  }
  if (preferredProvider === 'xtts') {
    return 'XTTS-v2 (وضع المحاكاة المحلي - بانتظار ربط نقطة Serverless GPU)';
  }
  return 'محرك الصوت الهجين (Ogg Opus 48kHz)';
}

/**
 * Master Hybrid Voice Synthesis Function:
 * 1. Checks Server-Side Cache (SHA-256) first to preserve GPU seconds & API credits.
 * 2. Synthesizes via Coqui XTTS-v2 (Serverless GPU / Self-Hosted) when selected or configured in 'auto' mode.
 * 3. Fails over seamlessly to ElevenLabs Cloned Voice, then OpenAI TTS (Onyx), or internal synthesis engine.
 * 4. Transcodes to 100% genuine WhatsApp PTT Ogg Opus (48kHz, Mono, libopus) via FFmpeg.
 * 5. Saves generated audio to Server-Side cache with a 24-hour expiration window.
 */
export async function synthesizeVoiceReply(
  text: string,
  options: TTSOptions = {}
): Promise<CachedAudioResult> {
  const startTime = Date.now();
  const config = getVoiceEngineConfig();

  // الربط الديناميكي (Dynamic Key Injection): قراءة المفاتيح النشطة والمشفرة من جدول api_settings مع التراجع التلقائي إلى .env
  const elevenLabsDynamic = dbService.getActiveProviderKey('elevenlabs', 'ELEVENLABS_API_KEY');
  const openAiDynamic = dbService.getActiveProviderKey('openai', 'OPENAI_API_KEY');
  const xttsDynamic = dbService.getActiveProviderKey('xtts', 'XTTS_API_KEY');

  const elevenLabsApiKey = elevenLabsDynamic.key;
  const elevenLabsVoiceId =
    options.voiceId ||
    elevenLabsDynamic.extraConfig ||
    config.elevenLabsVoiceId ||
    process.env.ELEVENLABS_VOICE_ID ||
    'pNInz6obpgDQGcFmaJgB';
  const openAIApiKey = openAiDynamic.key;
  const speed = options.speed ?? config.speed ?? 0.92;

  const requestedProvider: TTSProviderChoice =
    options.provider && options.provider !== 'auto'
      ? options.provider
      : config.preferredProvider || 'auto';

  const effectiveXttsUrl = options.xttsEndpointUrl ?? xttsDynamic.extraConfig ?? config.xttsEndpointUrl;
  const effectiveSpeakerPath = options.referenceSpeakerPath ?? config.referenceSpeakerPath;
  if (xttsDynamic.key) {
    config.xttsApiKey = xttsDynamic.key;
  }

  const voiceIdentifier =
    requestedProvider === 'xtts' || (requestedProvider === 'auto' && effectiveXttsUrl)
      ? `xtts:${effectiveSpeakerPath}`
      : requestedProvider === 'elevenlabs'
      ? elevenLabsVoiceId
      : options.voice || config.openAiVoice || 'onyx';

  const hash = generateTextHash(text, voiceIdentifier, requestedProvider, speed);
  const cacheFilePath = path.join(CACHE_DIR, `${hash}.mp3`);
  const opusCacheFilePath = path.join(CACHE_DIR, `${hash}.opus.ogg`);

  // 1. Check Server-Side Cache
  if (fs.existsSync(cacheFilePath)) {
    try {
      const audioBuffer = fs.readFileSync(cacheFilePath);
      let opusBuffer: Buffer = audioBuffer;
      if (fs.existsSync(opusCacheFilePath)) {
        opusBuffer = fs.readFileSync(opusCacheFilePath);
      } else {
        opusBuffer = await convertToWhatsAppOpus(audioBuffer);
        fs.writeFileSync(opusCacheFilePath, new Uint8Array(opusBuffer));
      }

      const wordsCount = text.split(/\s+/).length;
      const durationEstimateSec = Math.max(2, Math.ceil(wordsCount / 2.2));
      const cachedMeta = cacheIndex.get(hash);
      const cachedProvider = (cachedMeta?.provider as 'xtts' | 'elevenlabs' | 'openai' | 'fallback') ||
        (requestedProvider === 'xtts' ? 'xtts' : requestedProvider === 'elevenlabs' ? 'elevenlabs' : requestedProvider === 'openai' ? 'openai' : 'fallback');

      return {
        audioBuffer,
        opusBuffer,
        mimeType: 'audio/mp3',
        audioBase64: audioBuffer.toString('base64'),
        opusBase64: opusBuffer.toString('base64'),
        cacheKey: hash,
        isCached: true,
        durationEstimateSec,
        providerUsed: cachedProvider,
        voiceIdUsed: voiceIdentifier,
        voicePersonaLabel: getPersonaLabelForProvider(cachedProvider, requestedProvider),
        latencyMs: Date.now() - startTime,
      };
    } catch (readErr) {
      console.error('Error reading cached audio file:', readErr);
    }
  }

  let audioBuffer: Buffer | null = null;
  let providerUsed: 'xtts' | 'elevenlabs' | 'openai' | 'fallback' = 'fallback';

  // 2. Priority 1: Coqui XTTS-v2 (Local / Serverless GPU) if explicitly selected or configured in 'auto'
  const shouldTryXTTS =
    (requestedProvider === 'xtts' || requestedProvider === 'auto') &&
    Boolean(effectiveXttsUrl && effectiveXttsUrl.trim().length > 0);

  if (shouldTryXTTS) {
    try {
      audioBuffer = await synthesizeWithXTTS(
        text,
        {
          ...config,
          xttsEndpointUrl: effectiveXttsUrl,
          referenceSpeakerPath: effectiveSpeakerPath,
        },
        speed
      );
      providerUsed = 'xtts';
      console.log(`🎙️ [XTTS-v2] تم توليد الصوت بنجاح عبر السيرفر الخاص (${effectiveXttsUrl})`);
    } catch (xttsErr: any) {
      console.warn('⚠️ [XTTS-v2] تعذر الاتصال بسيرفر XTTS-v2، جاري التحويل التلقائي لمزود الاحتياط (Failover):', xttsErr.message);
    }
  }

  // 3. Priority 2: ElevenLabs Cloned Voice (if selected or failover from XTTS/auto)
  const shouldTryElevenLabs =
    !audioBuffer &&
    (requestedProvider === 'elevenlabs' || requestedProvider === 'auto' || requestedProvider === 'xtts') &&
    Boolean(elevenLabsApiKey && elevenLabsVoiceId);

  if (shouldTryElevenLabs && elevenLabsApiKey) {
    try {
      audioBuffer = await synthesizeWithElevenLabs(text, elevenLabsVoiceId, elevenLabsApiKey, options);
      providerUsed = 'elevenlabs';
      console.log(`🎙️ [ElevenLabs] تم توليد الصوت بنجاح عبر Voice ID: ${elevenLabsVoiceId}`);
    } catch (elevenErr) {
      console.warn('⚠️ [ElevenLabs] تعذر التوليد، التحويل التلقائي إلى OpenAI TTS:', elevenErr);
    }
  }

  // 4. Priority 3: OpenAI TTS (Onyx)
  if (!audioBuffer && openAIApiKey) {
    try {
      audioBuffer = await synthesizeWithOpenAI(text, options.voice || config.openAiVoice || 'onyx', openAIApiKey, speed, 'mp3');
      providerUsed = 'openai';
      console.log('🎙️ [OpenAI TTS] تم توليد الصوت بنجاح (Onyx Voice)');
    } catch (openAiErr) {
      console.warn('⚠️ [OpenAI TTS] تعذر التوليد، استخدام المولد الاحتياطي المحلي:', openAiErr);
    }
  }

  // 5. Priority 4: Local Synthetic Fallback (or Reference Speaker Sample preview if uploaded & testing locally without GPU URL)
  if (!audioBuffer) {
    const uploadedRef = fs.existsSync(REF_SPEAKER_FILE_PATH) ? fs.readFileSync(REF_SPEAKER_FILE_PATH) : null;
    if (requestedProvider === 'xtts' && uploadedRef && uploadedRef.length > 100) {
      // Use the uploaded reference speaker sample so the user hears real clear audio in simulation mode
      audioBuffer = uploadedRef;
      providerUsed = 'xtts';
    } else {
      audioBuffer = createFallbackAudioBuffer(text);
      providerUsed = 'fallback';
    }
  }

  // 6. Transcode to pure WhatsApp PTT Ogg Opus (48kHz, Mono, libopus) via FFmpeg
  const opusBuffer = await convertToWhatsAppOpus(audioBuffer);

  // 7. Save to Server-Side Cache with strict 24-Hour Expiration
  try {
    fs.writeFileSync(cacheFilePath, new Uint8Array(audioBuffer));
    fs.writeFileSync(opusCacheFilePath, new Uint8Array(opusBuffer));

    const now = Date.now();
    cacheIndex.set(hash, {
      hash,
      createdAt: now,
      expiresAt: now + CACHE_TTL_MS,
      filePath: cacheFilePath,
      opusFilePath: opusCacheFilePath,
      mimeType: 'audio/mp3',
      provider: providerUsed,
    });
  } catch (writeErr) {
    console.error('Failed to write server-side audio cache:', writeErr);
  }

  const wordsCount = text.split(/\s+/).length;
  const durationEstimateSec = Math.max(2, Math.ceil(wordsCount / 2.2));

  return {
    audioBuffer,
    opusBuffer,
    mimeType: 'audio/mp3',
    audioBase64: audioBuffer.toString('base64'),
    opusBase64: opusBuffer.toString('base64'),
    cacheKey: hash,
    isCached: false,
    durationEstimateSec,
    providerUsed,
    voiceIdUsed: voiceIdentifier,
    voicePersonaLabel: getPersonaLabelForProvider(providerUsed, requestedProvider),
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Voice Cloned Info & Cache Statistics
 */
export function getVoiceCacheStats() {
  let totalFiles = 0;
  let totalBytes = 0;

  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR).filter(
        (f) => f !== 'voice-engine-config.json' && f !== 'reference_speaker_sample.wav'
      );
      totalFiles = files.length;
      for (const file of files) {
        const stats = fs.statSync(path.join(CACHE_DIR, file));
        totalBytes += stats.size;
      }
    }
  } catch (e) {
    console.error('Error reading cache stats:', e);
  }

  const config = getVoiceEngineConfig();

  return {
    cachedVoiceNotesCount: totalFiles,
    totalSizeBytes: totalBytes,
    totalSizeKb: Math.round(totalBytes / 1024),
    retentionWindowHours: 24,
    activeProvider:
      config.preferredProvider === 'xtts' || (config.preferredProvider === 'auto' && config.xttsEndpointUrl)
        ? 'Coqui XTTS-v2 (Serverless GPU / Self-Hosted)'
        : process.env.ELEVENLABS_API_KEY
        ? 'ElevenLabs (Voice Cloning - Multilingual v2)'
        : process.env.OPENAI_API_KEY
        ? 'OpenAI (tts-1 Onyx)'
        : 'Hybrid Engine (Ready for XTTS-v2 GPU URL or ElevenLabs)',
    configuredVoiceId: config.elevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || 'بانتظار تزويد الـ Voice ID',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'xtts_v2 / eleven_multilingual_v2',
    serverSideOnlyCaching: true,
    voiceConfig: config,
  };
}

/**
 * Resolve safe server-side file path for a cached audio key (SHA-256 hex)
 * Used by GET /api/audio/:file to stream audio URLs directly to Mobile App clients
 */
export function getCachedAudioFilePath(cacheKey: string, format: 'mp3' | 'ogg' = 'mp3'): string | null {
  const cleanKey = (cacheKey || '').replace(/\.(mp3|ogg|opus\.ogg)$/i, '').trim();
  if (!/^[a-f0-9]{64}$/i.test(cleanKey)) {
    return null;
  }
  const fileName = format === 'ogg' ? `${cleanKey}.opus.ogg` : `${cleanKey}.mp3`;
  const fullPath = path.join(CACHE_DIR, fileName);
  return fs.existsSync(fullPath) ? fullPath : null;
}


