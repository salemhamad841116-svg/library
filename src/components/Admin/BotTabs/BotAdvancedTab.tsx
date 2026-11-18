import React, { useState } from 'react';
import { Terminal, MessageCircle, QrCode, ShieldAlert, Cpu, Database, Sparkles } from 'lucide-react';
import { WhatsAppSimulator } from '../../../admin/bot/components/WhatsAppSimulator';
import { BaileysQrManager } from '../../../admin/bot/components/BaileysQrManager';
import { AntiBanSecurity } from '../../../admin/bot/components/AntiBanSecurity';
import { QueueMonitor } from '../../../admin/bot/components/QueueMonitor';
import { EngineerGatewayChat } from '../../../admin/bot/components/EngineerGatewayChat';
import { DualDatabaseViewer } from '../../../admin/bot/components/DualDatabaseViewer';
import { AiExtractionStudio } from '../../../admin/bot/components/AiExtractionStudio';

export const BotAdvancedTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<string>('database');

  const SUB_TABS = [
    { id: 'database', label: 'المعرفة المركزية والجداول', icon: Database },
    { id: 'simulator', label: 'محاكي الشات وواتساب', icon: MessageCircle },
    { id: 'engineer', label: 'بوابة المهندس (Gateway)', icon: Cpu },
    { id: 'baileys', label: 'إدارة Baileys و QR', icon: QrCode },
    { id: 'antiban', label: 'بروتوكولات الأمان Anti-Ban', icon: ShieldAlert },
    { id: 'queue', label: 'طابور المهام (Queue)', icon: Terminal },
    { id: 'aistudio', label: 'استوديو استخراج الذكاء', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 text-right">
      {/* Sub navigation bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub Tab Body */}
      <div>
        {activeSubTab === 'database' && <DualDatabaseViewer />}
        {activeSubTab === 'simulator' && <WhatsAppSimulator sampleMessages={[]} onMessageIngested={() => {}} />}
        {activeSubTab === 'engineer' && <EngineerGatewayChat />}
        {activeSubTab === 'baileys' && <BaileysQrManager baileysState={null} onRefresh={() => {}} />}
        {activeSubTab === 'antiban' && <AntiBanSecurity />}
        {activeSubTab === 'queue' && <QueueMonitor queueMetrics={null} onRefresh={() => {}} />}
        {activeSubTab === 'aistudio' && <AiExtractionStudio sampleMessages={[]} promptBiasingText="" onExtractionSuccess={() => {}} />}
      </div>
    </div>
  );
};
