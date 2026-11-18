/**
 * Unified Answer Engine for the Conversational Bot.
 *
 * Implements the required 5-tier answer sequence:
 * 1. Q&A Rule match (instant response + direct audio attachment, zero LLM cost)
 * 2. Manual Knowledge (+0.30 priority verified reference)
 * 3. Published Books & Notes Library (search in SQLite across admin's published content)
 * 4. Structured Results & News (live database tables)
 * 5. Multi-Provider LLM fallback (OpenAI / Gemini / Claude) using active admin keys & system prompt.
 *
 * Live SQLite queries run on every request with ZERO caching delay.
 */
import {
  matchQaRule,
  searchPublishedLibrary,
  getBotSettings,
  DbQaRule,
  LibrarySearchResult,
} from '../db/platformDb.js';
import { dbService } from './database-service.js';
import {
  handleUserQueryRAG,
  isBotIdentityIntent,
  isGreetingIntent,
  resolveDisplayUserName,
  generateEmbedding,
} from './gemini.js';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AnswerResult {
  responseMessage: string;
  sourceType: 'qa_rule' | 'manual_knowledge' | 'library_notes' | 'sql_table' | 'vector_search' | 'hybrid' | 'llm_fallback';
  matchedEntities: string[];
  audioUrl?: string | null;
  ruleId?: string;
  sources: Array<{ title: string; listName?: string; snippet?: string; url?: string }>;
  providerUsed?: string;
  modelUsed?: string;
  intentType?: string;
  generatedSql?: string;
  dialectDetected?: string[];
  resolvedUserName?: string;
  searchingMessage?: string;
  videoTimestampData?: any;
}

export async function answerWithPlatformKnowledge(
  query: string,
  raceResultsContext?: any[],
  chatEmbeddingsContext?: any[],
  userName?: string
): Promise<AnswerResult> {
  const cleanQuery = (query || '').trim();
  const settings = getBotSettings();
  const displayUserName = resolveDisplayUserName(userName);

  // -------------------------------------------------------------------------
  // Tier 1: Instant Direct Q&A Rule Match
  // -------------------------------------------------------------------------
  const matchedRule = matchQaRule(cleanQuery);
  if (matchedRule) {
    return {
      responseMessage: matchedRule.answer,
      sourceType: 'qa_rule',
      ruleId: matchedRule.id,
      audioUrl: matchedRule.audio_url || null,
      matchedEntities: [matchedRule.question, ...matchedRule.keywords],
      sources: [
        {
          title: `قاعدة إجابة مباشرة: ${matchedRule.question}`,
          snippet: matchedRule.answer,
        },
      ],
      intentType: 'direct_qa_rule',
      resolvedUserName: displayUserName,
      providerUsed: 'direct_rule',
    };
  }

  // -------------------------------------------------------------------------
  // Tier 2: Core Bot Identity & Greeting Intents
  // -------------------------------------------------------------------------
  if (isBotIdentityIntent(cleanQuery)) {
    return {
      responseMessage: `${settings.botName}: أنا مساعدك الذكي المخصص لخدمتك والإجابة على أسئلتك من واقع مكتبة الملاحظات والكتب والمعلومات المعتمدة.`,
      sourceType: 'hybrid',
      matchedEntities: ['هوية البوت', settings.botName],
      sources: [],
      intentType: 'bot_identity',
      resolvedUserName: displayUserName,
    };
  }

  if (isGreetingIntent(cleanQuery)) {
    return {
      responseMessage: `يا مرحباً بك ${displayUserName}! ${settings.welcomeMessage}`,
      sourceType: 'hybrid',
      matchedEntities: ['ترحيب مخصص', displayUserName],
      sources: [],
      intentType: 'greeting',
      resolvedUserName: displayUserName,
    };
  }

  // -------------------------------------------------------------------------
  // Tier 3: Search Published Books & Notes Library
  // -------------------------------------------------------------------------
  const libraryResults = searchPublishedLibrary(cleanQuery, settings.maxContextNotes || 5);

  // If high-relevance library notes are found, formulate response using LLM or structured summary
  if (libraryResults.length > 0) {
    const topResult = libraryResults[0];
    const isDirectMatch = topResult.relevance >= 10;

    // Build context string from matched library notes
    const libraryContext = libraryResults
      .map(
        (r, i) =>
          `[مرجع ${i + 1}] عنوان الملاحظة: «${r.title}» ${r.listName ? `(في قائمة/كتاب: ${r.listName})` : ''}\nالمحتوى: ${r.snippet}`
      )
      .join('\n\n');

    // Attempt LLM generation using active provider
    const llmAnswer = await generateLlmResponse(
      cleanQuery,
      libraryContext,
      settings,
      displayUserName,
      'library'
    );

    if (llmAnswer) {
      return {
        responseMessage: llmAnswer.text,
        sourceType: 'library_notes',
        matchedEntities: libraryResults.map((r) => r.title),
        sources: libraryResults.map((r) => ({
          title: r.title,
          listName: r.listName,
          snippet: r.snippet,
        })),
        providerUsed: llmAnswer.provider,
        modelUsed: llmAnswer.model,
        intentType: 'library_lookup',
        resolvedUserName: displayUserName,
      };
    }

    // Direct fallback if no LLM key is configured: return formatted summary
    if (isDirectMatch) {
      const summary =
        `بحسب الموثق في المكتبة ضمن «${topResult.listName || 'الملاحظات'}» تحت عنوان «${topResult.title}»:\n\n` +
        `${topResult.snippet}\n\n` +
        (libraryResults.length > 1
          ? `(توجد مراجع أخرى ذات صلة: ${libraryResults.slice(1).map((r) => `«${r.title}»`).join('، ')})`
          : '');

      return {
        responseMessage: summary,
        sourceType: 'library_notes',
        matchedEntities: libraryResults.map((r) => r.title),
        sources: libraryResults.map((r) => ({
          title: r.title,
          listName: r.listName,
          snippet: r.snippet,
        })),
        intentType: 'library_lookup',
        resolvedUserName: displayUserName,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Tier 4: Fall back to existing Domain RAG (Results, News, Manual Knowledge)
  // -------------------------------------------------------------------------
  try {
    const results =
      Array.isArray(raceResultsContext) && raceResultsContext.length > 0
        ? raceResultsContext
        : dbService.getRaceResults();
    const embeddings =
      Array.isArray(chatEmbeddingsContext) && chatEmbeddingsContext.length > 0
        ? chatEmbeddingsContext
        : dbService.getChatEmbeddings();

    const ragResult = await handleUserQueryRAG(cleanQuery, results, embeddings, userName);

    if (ragResult && ragResult.responseMessage) {
      return {
        responseMessage: ragResult.responseMessage,
        sourceType: ragResult.sourceType || 'hybrid',
        matchedEntities: ragResult.matchedEntities || [],
        generatedSql: ragResult.generatedSql,
        dialectDetected: ragResult.dialectDetected,
        intentType: ragResult.intentType,
        searchingMessage: ragResult.searchingMessage,
        resolvedUserName: ragResult.resolvedUserName || displayUserName,
        videoTimestampData: ragResult.videoTimestampData,
        sources: (ragResult.matchedEntities || []).map((e) => ({ title: e })),
        providerUsed: 'domain_rag',
      };
    }
  } catch (err) {
    console.warn('Domain RAG step encountered error, falling through to general LLM:', err);
  }

  // -------------------------------------------------------------------------
  // Tier 5: General LLM Fallback (OpenAI / Gemini / Claude)
  // -------------------------------------------------------------------------
  const generalLlm = await generateLlmResponse(cleanQuery, '', settings, displayUserName, 'general');
  if (generalLlm) {
    return {
      responseMessage: generalLlm.text,
      sourceType: 'llm_fallback',
      matchedEntities: [],
      sources: [],
      providerUsed: generalLlm.provider,
      modelUsed: generalLlm.model,
      intentType: 'general_ai',
      resolvedUserName: displayUserName,
    };
  }

  // Final fallback when no external keys exist and nothing matched
  return {
    responseMessage:
      `أهلاً بك يا ${displayUserName}. لم أجد إجابة مباشرة مطابقة في مكتبة الملاحظات أو المعرفة المسجلة حالياً. ` +
      `يمكنك إضافة السؤال وجوابه من لوحة الإدارة في قسم «أسئلة وأجوبة البوت» ليتم الرد عليه فورياً.`,
    sourceType: 'hybrid',
    matchedEntities: [],
    sources: [],
    intentType: 'unmatched',
    resolvedUserName: displayUserName,
  };
}

/**
 * Multi-Provider LLM invocation with graceful fallback
 */
async function generateLlmResponse(
  userQuery: string,
  contextText: string,
  settings: ReturnType<typeof getBotSettings>,
  userName: string,
  mode: 'library' | 'general'
): Promise<{ text: string; provider: string; model: string } | null> {
  const systemPrompt = settings.systemPrompt || 'أنت مساعد ذكي وموثوق. أجب بدقة واختصار.';
  const userContent = contextText
    ? `السياق المتاح من مكتبة الملاحظات والكتب:\n${contextText}\n\nسؤال المستخدم (${userName}): ${userQuery}`
    : `سؤال المستخدم (${userName}): ${userQuery}`;

  const preferred = settings.chatProvider || 'auto';

  // 1. Try Gemini
  if (preferred === 'gemini' || preferred === 'auto') {
    const geminiKeyInfo = dbService.getActiveProviderKey('gemini', 'GEMINI_API_KEY');
    if (geminiKeyInfo.key) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKeyInfo.key,
          httpOptions: { headers: { 'User-Agent': 'platform-bot' } },
        });
        const modelName = settings.models.gemini || 'gemini-3.6-flash';
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: userContent,
          config: {
            systemInstruction: systemPrompt,
            temperature: settings.temperature || 0.3,
          },
        });
        const out = resp.text?.trim();
        if (out) return { text: out, provider: 'gemini', model: modelName };
      } catch (err: any) {
        console.warn('Gemini LLM error:', err?.message || err);
      }
    }
  }

  // 2. Try OpenAI
  if (preferred === 'openai' || preferred === 'auto') {
    const openAiKeyInfo = dbService.getActiveProviderKey('openai', 'OPENAI_API_KEY');
    if (openAiKeyInfo.key) {
      try {
        const openai = new OpenAI({ apiKey: openAiKeyInfo.key });
        const modelName = settings.models.openai || 'gpt-4o-mini';
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: settings.temperature || 0.3,
        });
        const out = completion.choices[0]?.message?.content?.trim();
        if (out) return { text: out, provider: 'openai', model: modelName };
      } catch (err: any) {
        console.warn('OpenAI LLM error:', err?.message || err);
      }
    }
  }

  // 3. Try Anthropic Claude
  if (preferred === 'anthropic' || preferred === 'auto') {
    const anthropicKeyInfo = dbService.getActiveProviderKey('anthropic', 'ANTHROPIC_API_KEY');
    if (anthropicKeyInfo.key) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKeyInfo.key });
        const modelName = settings.models.anthropic || 'claude-3-5-sonnet-20241022';
        const msg = await (anthropic.messages.create as any)({
          model: modelName,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          temperature: settings.temperature || 0.3,
        });
        const firstBlock = msg.content[0];
        const out = firstBlock && firstBlock.type === 'text' ? firstBlock.text.trim() : '';
        if (out) return { text: out, provider: 'anthropic', model: modelName };
      } catch (err: any) {
        console.warn('Anthropic Claude LLM error:', err?.message || err);
      }
    }
  }

  return null;
}
