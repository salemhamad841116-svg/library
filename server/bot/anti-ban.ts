/**
 * بروتوكول الأمان وتفادي الحظر (Anti-Ban Protocols)
 */

export interface AntiBanConfig {
  minDelayMs: number; // 1500 ms
  maxDelayMs: number; // 3500 ms
  maxMessagesPerMinute: number; // 15 msg/min
  enableComposingPresence: boolean; // إشعار جاري الكتابة
  silentOnGroupJoin: boolean; // عدم إرسال ترحيب لمنع الإزعاج والحظر
  passiveListeningOnly: boolean; // الرد فقط عند المنشن أو الخاص
  proxyUrl?: string; // Residential Proxy
}

export interface OutgoingMessageLog {
  id: string;
  recipient: string;
  timestamp: number;
  delayAppliedMs: number;
  text: string;
  triggerType: 'mention' | 'direct_message' | 'admin_broadcast' | 'simulation';
  status: 'sent' | 'rate_limited' | 'blocked_passive_mode';
}

class AntiBanManager {
  private config: AntiBanConfig = {
    minDelayMs: 1500,
    maxDelayMs: 3500,
    maxMessagesPerMinute: 15,
    enableComposingPresence: true,
    silentOnGroupJoin: true,
    passiveListeningOnly: true,
    proxyUrl: '',
  };

  private messageTimestamps: number[] = [];
  private logs: OutgoingMessageLog[] = [];

  getConfig(): AntiBanConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AntiBanConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * حساب التأخير العشوائي البشري (Random Jitter Delay 1.5s - 3.5s)
   */
  calculateRandomDelay(): number {
    const min = this.config.minDelayMs;
    const max = this.config.maxDelayMs;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * فحص محدد المعدل (Rate Limiter: Max 15 messages/minute)
   */
  checkRateLimit(): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // تنظيف الطوابع القديمة
    this.messageTimestamps = this.messageTimestamps.filter(t => t > oneMinuteAgo);
    
    const count = this.messageTimestamps.length;
    const allowed = count < this.config.maxMessagesPerMinute;
    const remaining = Math.max(0, this.config.maxMessagesPerMinute - count);
    
    const oldestTimestamp = this.messageTimestamps[0] || now;
    const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + 60000 - now) / 1000));

    return { allowed, remaining, resetInSeconds };
  }

  /**
   * تسجيل رسالة صادرة جديدة
   */
  recordSentMessage(recipient: string, text: string, delayAppliedMs: number, triggerType: 'mention' | 'direct_message' | 'admin_broadcast' | 'simulation'): OutgoingMessageLog {
    const now = Date.now();
    this.messageTimestamps.push(now);

    const log: OutgoingMessageLog = {
      id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipient,
      timestamp: now,
      delayAppliedMs,
      text,
      triggerType,
      status: 'sent',
    };

    this.logs.unshift(log);
    if (this.logs.length > 50) this.logs.pop();

    return log;
  }

  /**
   * تسجيل محاولة تم حظرها بواسطة محدد المعدل
   */
  recordRateLimitedAttempt(recipient: string, text: string): OutgoingMessageLog {
    const log: OutgoingMessageLog = {
      id: `rl-${Date.now()}`,
      recipient,
      timestamp: Date.now(),
      delayAppliedMs: 0,
      text,
      triggerType: 'mention',
      status: 'rate_limited',
    };
    this.logs.unshift(log);
    return log;
  }

  getLogs(): OutgoingMessageLog[] {
    return this.logs;
  }

  /**
   * محاكاة الإرسال الآمن مع التهدئة وإشعار الكتابة
   */
  async executeSafeSend(
    recipient: string,
    text: string,
    triggerType: 'mention' | 'direct_message' | 'admin_broadcast' | 'simulation',
    onComposing?: () => void
  ): Promise<{ success: boolean; delayMs: number; error?: string }> {
    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      this.recordRateLimitedAttempt(recipient, text);
      return {
        success: false,
        delayMs: 0,
        error: `تم كبح الإرسال لتفادي الحظر: تجاوز الحد الأقصى (${this.config.maxMessagesPerMinute} رسالة/دقيقة). يرجى الانتظار ${rateCheck.resetInSeconds} ثانية.`,
      };
    }

    const delayMs = this.calculateRandomDelay();

    // إشعار جاري الكتابة (Composing)
    if (this.config.enableComposingPresence && onComposing) {
      onComposing();
    }

    // الانتظار البشري
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    this.recordSentMessage(recipient, text, delayMs, triggerType);
    return { success: true, delayMs };
  }
}

export const antiBanManager = new AntiBanManager();
