import QRCode from 'qrcode';
import { queueService } from './queue-service.js';
import { antiBanManager } from './anti-ban.js';

export interface BaileysConnectionState {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  qrCodeDataUrl?: string;
  qrCodeRaw?: string;
  phoneNumber?: string;
  sessionPath: string;
  lastConnectedAt?: string;
  reconnectAttempts: number;
  monitoredGroupsCount: number;
  passiveListening: boolean;
}

export interface IngestedMessagePayload {
  messageId: string;
  senderId: string;
  senderName: string;
  groupId: string;
  groupName: string;
  type: 'text' | 'audio' | 'document';
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  timestamp: number;
  isMention: boolean;
}

class BaileysEngine {
  private state: BaileysConnectionState = {
    status: 'connected', // default to connected in demo, with realistic session
    phoneNumber: '+971 50 882 1944 (بوت الهجن الذكي)',
    sessionPath: '/var/data/baileys_auth_info',
    lastConnectedAt: new Date().toISOString(),
    reconnectAttempts: 0,
    monitoredGroupsCount: 3,
    passiveListening: true,
  };

  private isSimulatingBaileys: boolean = true;
  private messageListeners: ((msg: IngestedMessagePayload) => void)[] = [];

  constructor() {
    this.generateDemoQR();
  }

  onMessage(fn: (msg: IngestedMessagePayload) => void) {
    this.messageListeners.push(fn);
  }

  private notifyMessage(msg: IngestedMessagePayload) {
    this.messageListeners.forEach(fn => {
      try { fn(msg); } catch (e) { /* ignore */ }
    });
  }

  async generateDemoQR() {
    const rawQr = `2@${Date.now()}-${Math.random().toString(36).substring(2, 10)},camel_racing_bot_${Date.now()},s192h9`;
    this.state.qrCodeRaw = rawQr;
    try {
      this.state.qrCodeDataUrl = await QRCode.toDataURL(rawQr, {
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#f5f5f4',
        },
        width: 280,
      });
    } catch (e) {
      console.error('QR generation error:', e);
    }
  }

  getState(): BaileysConnectionState {
    return { ...this.state };
  }

  async toggleConnection(action: 'connect' | 'disconnect' | 'refresh_qr'): Promise<BaileysConnectionState> {
    if (action === 'refresh_qr') {
      this.state.status = 'qr_ready';
      await this.generateDemoQR();
    } else if (action === 'disconnect') {
      this.state.status = 'disconnected';
    } else if (action === 'connect') {
      this.state.status = 'connecting';
      await new Promise(r => setTimeout(r, 600));
      this.state.status = 'connected';
      this.state.lastConnectedAt = new Date().toISOString();
      this.state.reconnectAttempts = 0;
    }
    return this.getState();
  }

  /**
   * استقبال رسالة ومعالجتها (Ingest Message from Baileys messages.upsert)
   */
  async handleIncomingMessage(payload: IngestedMessagePayload) {
    this.notifyMessage(payload);

    const isDirectMessage = !payload.groupId.includes('@g.us');
    const isMention = payload.isMention || (payload.text?.includes('@bot') ?? false) || (payload.text?.includes('@البوت') ?? false);
    const shouldReply = isDirectMessage || isMention;

    // Push to Queue to decouple ingestion from heavy AI
    const jobType = payload.type === 'audio' ? 'audio_message' : 'text_message';

    const job = queueService.addJob(jobType, {
      messageId: payload.messageId || `msg-${Date.now()}`,
      senderId: payload.senderId,
      senderName: payload.senderName,
      groupId: payload.groupId,
      groupName: payload.groupName,
      timestamp: payload.timestamp || Date.now(),
      rawText: payload.text,
      audioBase64: payload.audioBase64,
      audioMimeType: payload.audioMimeType,
      isMentionOrDM: shouldReply,
    });

    return job;
  }
}

export const baileysEngine = new BaileysEngine();
