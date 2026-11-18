export interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  audioUrl?: string;
  audioBase64?: string;
  audioDuration?: string;
  source?: 'rule' | 'library' | 'ai' | 'fallback' | 'identity';
  matchedRuleTitle?: string;
  sourceNoteTitle?: string;
  attachments?: {
    name: string;
    type: string;
    url?: string;
    size?: number;
  }[];
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: BotMessage[];
}

export interface BotPublicConfig {
  botName: string;
  systemPrompt?: string;
  welcomeMessage: string;
  voiceEnabled: boolean;
  avatarUrl?: string;
}

export interface QuickButton {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
  color?: string;
}

export interface UserVoiceSettings {
  autoPlayVoice: boolean;
  speechSpeed: number; // 0.8 - 1.2
  inputLanguage: string; // 'ar-SA' | 'en-US'
  soundEffects: boolean;
}
