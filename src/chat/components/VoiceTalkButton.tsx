import React from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';

interface VoiceTalkButtonProps {
  isRecording: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onPress: () => void;
}

/** Round gold "تحدث" button pinned on the left, directly above the message box. */
export const VoiceTalkButton: React.FC<VoiceTalkButtonProps> = ({
  isRecording,
  isSpeaking,
  isProcessing,
  onPress,
}) => {
  const active = isRecording || isSpeaking;
  const label = isRecording ? 'إيقاف' : isSpeaking ? 'إسكات' : 'تحدث';
  const Icon = isRecording ? Square : isSpeaking ? Volume2 : Mic;

  return (
    <button
      type="button"
      className={`gc-voice-btn ${active ? 'active' : ''}`}
      onClick={onPress}
      disabled={isProcessing && !isRecording && !isSpeaking}
      aria-pressed={isRecording}
      aria-label={isRecording ? 'إيقاف التسجيل وإرسال' : isSpeaking ? 'إيقاف الصوت' : 'تحدث مع المساعد'}
    >
      <span className="gc-voice-halo" />
      <Icon size={20} strokeWidth={2.4} fill={isRecording ? 'currentColor' : 'none'} />
      <span>{label}</span>
    </button>
  );
};
