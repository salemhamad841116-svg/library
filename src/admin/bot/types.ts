export interface CamelTerm {
  term: string;
  category: string;
  description: string;
}

export interface DialectIntentMapping {
  dialectTerm: string;
  fieldMeaning: string;
  targetSqlColumnOrTable: string;
  sqlPatternExample: string;
  notes: string;
}

export interface SampleMessage {
  id: string;
  title: string;
  sender: string;
  group: string;
  type: 'text' | 'audio';
  text: string;
  expectedCategory: string;
  expectedWinner: string;
  expectedOwner: string;
  expectedTrainer?: string;
  expectedSire?: string;
  expectedHeat: number | null;
  expectedTime: string;
  expectedTrack?: string;
  expectedFestival?: string;
  videoUrl?: string;
}

export interface BaileysState {
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

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  totalProcessed: number;
}

export interface QueueJobItem {
  id: string;
  type: string;
  data: {
    messageId: string;
    senderId: string;
    senderName: string;
    groupId: string;
    groupName: string;
    timestamp: number;
    rawText?: string;
    audioBase64?: string;
    isMentionOrDM: boolean;
  };
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  attempts: number;
  maxAttempts: number;
  result?: any;
  error?: string;
  logs: string[];
  createdAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface RaceResultItem {
  id: string;
  category: string;
  heat_number: number;
  winner_name: string;
  former_name?: string;
  owner_name: string;
  trainer_name?: string;
  sire_lineage?: string;
  time: string;
  time_seconds?: number;
  distance?: string;
  track_name?: string;
  festival_name?: string;
  media_urls?: string[];
  source_group_id: string;
  source_group_name: string;
  sender_id: string;
  sender_name: string;
  raw_message_text: string;
  notes: string;
  created_at: string;
}

export interface ChatEmbeddingItem {
  id: string;
  message_id: string;
  group_id: string;
  group_name: string;
  sender_id: string;
  sender_name: string;
  content_text: string;
  category: string;
  vector: number[];
  created_at: string;
}

export interface AntiBanConfig {
  minDelayMs: number;
  maxDelayMs: number;
  maxMessagesPerMinute: number;
  enableComposingPresence: boolean;
  silentOnGroupJoin: boolean;
  passiveListeningOnly: boolean;
  proxyUrl?: string;
}

export interface ProjectFiles {
  schemaSql: string;
  baileysBotTs: string;
  workerAiTs: string;
  dockerfile: string;
  dockerCompose: string;
  timelineEstimate: {
    title: string;
    projectSummary: string;
    estimatedTimelineDays: number;
    phases: {
      phase: string;
      duration: string;
      deliverables: string[];
      status: string;
    }[];
  };
}
