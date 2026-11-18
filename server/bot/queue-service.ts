/**
 * إدارة الطوابير والمعالجة اللاتزامنية (Queue Management via BullMQ & Worker Queue)
 */

export interface QueueJob {
  id: string;
  type: 'text_message' | 'audio_message' | 'document_message' | 'rag_query';
  data: {
    messageId: string;
    senderId: string;
    senderName: string;
    groupId: string;
    groupName: string;
    timestamp: number;
    rawText?: string;
    audioBase64?: string;
    audioMimeType?: string;
    isMentionOrDM: boolean;
  };
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number; // 0 - 100
  attempts: number;
  maxAttempts: number;
  result?: any;
  error?: string;
  logs: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  totalProcessed: number;
}

class QueueService {
  private jobs: QueueJob[] = [];
  private isWorkerRunning: boolean = false;
  private workerProcessInterval: NodeJS.Timeout | null = null;
  private listeners: ((job: QueueJob) => void)[] = [];

  constructor() {
    this.startWorkerLoop();
  }

  onJobUpdated(fn: (job: QueueJob) => void) {
    this.listeners.push(fn);
  }

  private notify(job: QueueJob) {
    this.listeners.forEach(fn => {
      try { fn(job); } catch (e) { /* ignore */ }
    });
  }

  /**
   * إضافة مهمة جديدة إلى الطابور (Add Job to Worker Queue)
   */
  addJob(
    type: QueueJob['type'],
    data: QueueJob['data'],
    maxAttempts: number = 3
  ): QueueJob {
    const job: QueueJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      data,
      status: 'waiting',
      progress: 0,
      attempts: 0,
      maxAttempts,
      logs: [`[${new Date().toLocaleTimeString('ar-EG')}] تم استلام الرسالة وإدراجها في طابور المعالجة اللاتزامنية`],
      createdAt: Date.now(),
    };

    this.jobs.unshift(job);
    if (this.jobs.length > 100) this.jobs.pop();

    this.notify(job);
    return job;
  }

  getJobs(limit: number = 20): QueueJob[] {
    return this.jobs.slice(0, limit);
  }

  getJobById(id: string): QueueJob | undefined {
    return this.jobs.find(j => j.id === id);
  }

  getMetrics(): QueueMetrics {
    const waiting = this.jobs.filter(j => j.status === 'waiting').length;
    const active = this.jobs.filter(j => j.status === 'active').length;
    const completed = this.jobs.filter(j => j.status === 'completed').length;
    const failed = this.jobs.filter(j => j.status === 'failed').length;

    const completedJobs = this.jobs.filter(j => j.durationMs !== undefined);
    const avgDurationMs = completedJobs.length > 0
      ? Math.round(completedJobs.reduce((acc, j) => acc + (j.durationMs || 0), 0) / completedJobs.length)
      : 850;

    return {
      waiting,
      active,
      completed,
      failed,
      avgDurationMs,
      totalProcessed: completed + failed,
    };
  }

  /**
   * حلقة معالجة الطابور (Worker Loop)
   */
  private startWorkerLoop() {
    if (this.workerProcessInterval) return;

    this.workerProcessInterval = setInterval(async () => {
      if (this.isWorkerRunning) return;

      const nextJob = this.jobs.slice().reverse().find(j => j.status === 'waiting');
      if (!nextJob) return;

      this.isWorkerRunning = true;
      await this.processJob(nextJob);
      this.isWorkerRunning = false;
    }, 300);
  }

  private async processJob(job: QueueJob) {
    job.status = 'active';
    job.startedAt = Date.now();
    job.attempts += 1;
    job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] بدء معالجة المهمة (المحاولة ${job.attempts}/${job.maxAttempts})`);
    this.notify(job);

    try {
      // Step 1: Voice transcription if audio message
      let textToProcess = job.data.rawText || '';

      if (job.type === 'audio_message' && job.data.audioBase64) {
        job.progress = 25;
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] تحويل صيغة الصوت وتطبيق Prompt Biasing بمصطلحات الهجن...`);
        this.notify(job);

        // Dynamically import AI module to avoid cyclic dependencies
        const { transcribeAudio } = await import('./gemini.js');
        const transcription = await transcribeAudio(job.data.audioBase64, job.data.audioMimeType || 'audio/mp3');
        textToProcess = transcription;
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] نجح التفريغ الصوتي: "${textToProcess.substring(0, 70)}..."`);
      }

      // Step 2: Structured Entity Extraction (LLM JSON Mode)
      job.progress = 55;
      job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] تمرير النص لنموذج LLM لاستخراج الكيانات المهيكلة وتصنيف الرسالة...`);
      this.notify(job);

      const { extractStructuredRaceResult, generateEmbedding, handleUserQueryRAG } = await import('./gemini.js');
      const { dbService } = await import('./database-service.js');
      const { antiBanManager } = await import('./anti-ban.js');

      const extracted = await extractStructuredRaceResult(textToProcess);
      job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] التصنيف: ${extracted.is_race_result ? 'نتيجة شوط رسمية ✅' : 'محادثة عامة / استفسار 💬'}`);

      // Step 3: Dual Storage Insert (PostgreSQL Relational + Vector DB)
      job.progress = 80;
      if (extracted.is_race_result) {
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] حفظ النتيجة في جدول race_results (المطية: ${extracted.winner_name}، المالك: ${extracted.owner_name}، الشوط: ${extracted.heat_number})...`);
        const savedRecord = dbService.saveRaceResult({
          category: extracted.category || 'عام',
          heat_number: extracted.heat_number || 1,
          winner_name: extracted.winner_name,
          owner_name: extracted.owner_name,
          trainer_name: extracted.trainer_name || undefined,
          sire_lineage: extracted.sire_lineage || undefined,
          former_name: extracted.former_name || undefined,
          time: extracted.time,
          distance: extracted.distance,
          track_name: extracted.track_name || 'ميدان السباق',
          festival_name: extracted.festival_name || 'مهرجان ولي العهد للهجن 2026',
          media_urls: extracted.media_urls,
          source_group_id: job.data.groupId,
          source_group_name: job.data.groupName,
          sender_id: job.data.senderId,
          sender_name: job.data.senderName,
          raw_message_text: textToProcess,
          notes: extracted.notes,
        });
        job.result = { extracted, savedRecord, storage: 'relational_sql' };
      } else {
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] توليد التضمين المتجهي (Vector Embedding) وحفظه في chat_embeddings للبحث الدلالي...`);
        const vector = await generateEmbedding(textToProcess);
        const savedEmbedding = dbService.saveChatEmbedding({
          message_id: job.data.messageId,
          group_id: job.data.groupId,
          group_name: job.data.groupName,
          sender_id: job.data.senderId,
          sender_name: job.data.senderName,
          content_text: textToProcess,
          category: extracted.message_type === 'news' ? 'announcement' : 'general_discussion',
          vector,
        });
        job.result = { extracted, savedEmbedding, storage: 'vector_db' };
      }

      // Step 4: Handle response if Mention or Direct Message (Passive mode respect)
      if (job.data.isMentionOrDM) {
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] تم رصد إشارة مباشرة بالمنشن (@bot) أو رسالة خاصة -> تشغيل محرك RAG وتطبيق بروتوكول مكافحة الحظر`);
        const contextResults = dbService.getRaceResults().slice(0, 5);
        const contextEmbeddings = dbService.getChatEmbeddings().slice(0, 3);
        
        const ragResponse = await handleUserQueryRAG(textToProcess, contextResults, contextEmbeddings);

        // Safe send with composing and delay
        await antiBanManager.executeSafeSend(
          job.data.groupId,
          ragResponse.responseMessage,
          job.data.groupId.includes('@g.us') ? 'mention' : 'direct_message'
        );

        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] تم إرسال الرد الآمن بنجاح: "${ragResponse.responseMessage.substring(0, 60)}..."`);
        if (job.result) {
          job.result.ragResponse = ragResponse;
        }
      } else {
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] وضع الاستماع السلبي (Passive Mode): تم التخزين بنجاح دون إرسال أي رد للحفاظ على هدوء القروب.`);
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = Date.now();
      job.durationMs = job.completedAt - (job.startedAt || job.createdAt);
      this.notify(job);
    } catch (err: any) {
      console.error(`Error processing job ${job.id}:`, err);
      job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] خطأ: ${err?.message || 'تعذر إكمال المعالجة'}`);
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'waiting';
        job.logs.push(`[${new Date().toLocaleTimeString('ar-EG')}] إعادة جدولة المهمة للمحاولة التالية...`);
      } else {
        job.status = 'failed';
        job.error = err?.message || 'فشلت المهمة بعد استنفاد المحاولات';
        job.completedAt = Date.now();
        job.durationMs = job.completedAt - (job.startedAt || job.createdAt);
      }
      this.notify(job);
    }
  }
}

export const queueService = new QueueService();
