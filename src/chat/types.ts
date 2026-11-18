export type ChatRole = 'user' | 'bot';

export interface GlassChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
  audioSrc?: string;
  attachmentName?: string;
  isVoice?: boolean;
  isPending?: boolean;
  isError?: boolean;
}

export interface GlassChatSession {
  id: string;
  title: string;
  iconIndex: number;
  createdAt: number;
  updatedAt: number;
  messages: GlassChatMessage[];
}

export interface GlassChatSettings {
  userName: string;
  autoVoice: boolean;
}

export interface PublicBotConfig {
  botName?: string;
  welcomeMessage?: string;
  voiceRepliesDefault?: boolean;
  publicUploadsEnabled?: boolean;
}

export interface QuickPrompt {
  id: string;
  title: string;
  query: string;
}
