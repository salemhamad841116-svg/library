import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, Plus, Image as ImageIcon, Video, Music, FileText, Link as LinkIcon, 
  ExternalLink, X, Eye, Trash2, ChevronUp, ChevronDown, Mic, MicOff, Square, 
  Upload, CheckCircle2, Play, Pause, Radio, AlertCircle
} from 'lucide-react';
import { AttachmentItem } from '../../types';

interface AttachmentsGalleryProps {
  attachments: AttachmentItem[];
  onUpdateAttachments: (items: AttachmentItem[]) => void;
}

export const AttachmentsGallery: React.FC<AttachmentsGalleryProps> = ({
  attachments,
  onUpdateAttachments,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);

  // Manual URL Add state
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<AttachmentItem['type']>('image');
  
  // Media Lightbox preview
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentItem | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Manual URL Add
  const handleAddAttachment = () => {
    if (!fileName.trim() || !fileUrl.trim()) return;
    const item: AttachmentItem = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: fileName.trim(),
      url: fileUrl.trim(),
      type: fileType,
      createdAt: new Date().toISOString(),
    };

    onUpdateAttachments([...attachments, item]);
    setFileName('');
    setFileUrl('');
    setIsOpenAdd(false);
  };

  // Handle Local File Upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        let detectedType: AttachmentItem['type'] = 'pdf';
        if (file.type.startsWith('image/')) detectedType = 'image';
        else if (file.type.startsWith('video/')) detectedType = 'video';
        else if (file.type.startsWith('audio/')) detectedType = 'audio';
        else if (file.type.includes('pdf')) detectedType = 'pdf';

        const newItem: AttachmentItem = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          url: resultUrl,
          type: detectedType,
          createdAt: new Date().toISOString(),
        };

        onUpdateAttachments([...attachments, newItem]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Start Audio Recording
  const startRecording = async () => {
    setRecordingError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setRecordingError('تعذر الوصول إلى المايكروفون. يرجى السماح لصلاحيات الصوت في المتصفح.');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Save Audio Recording as Attachment
  const handleSaveAudioRecording = () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const recordingItem: AttachmentItem = {
        id: 'att-audio-' + Date.now(),
        name: `تسجيل صوتي (${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})`,
        url: base64Audio,
        type: 'audio',
        createdAt: new Date().toISOString(),
      };

      onUpdateAttachments([...attachments, recordingItem]);
      setIsRecordingOpen(false);
      setAudioUrl(null);
      setAudioBlob(null);
      setRecordingTime(0);
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleDelete = (id: string) => {
    onUpdateAttachments(attachments.filter((a) => a.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getIcon = (type: AttachmentItem['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'video': return <Video className="w-4 h-4 text-purple-500" />;
      case 'audio': return <Music className="w-4 h-4 text-amber-500" />;
      case 'pdf': return <FileText className="w-4 h-4 text-rose-500" />;
      default: return <LinkIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 select-none transition-all">
      {/* Clickable Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            الوسائط والتسجيلات المرفقة ({attachments.length})
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isExpanded ? 'إغلاق المرفقات' : 'فتح المرفقات والتسجيل الصوتي'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-2 space-y-3 border-t border-slate-200/60 dark:border-slate-800/60 animate-in slide-in-from-bottom-2 duration-150">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-slate-500">رفع الصور، المستندات، أو التسجيل الصوتي المباشر:</span>
            
            <div className="flex items-center gap-2">
              {/* Direct File Upload Input Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع ملف / صورة</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                className="hidden"
              />

              {/* Voice Recorder Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRecordingOpen(!isRecordingOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>تسجيل صوتي مباشر</span>
              </button>

              {/* URL Add Toggle Button */}
              <button
                type="button"
                onClick={() => setIsOpenAdd(!isOpenAdd)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة رابط</span>
              </button>
            </div>
          </div>

          {/* Voice Recorder Widget Modal / Card */}
          {isRecordingOpen && (
            <div className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-md space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Mic className="w-4 h-4 text-rose-500" />
                  <span>مسجل الصوت المباشر (Voice Recorder)</span>
                </div>
                <button
                  onClick={() => {
                    stopRecording();
                    setIsRecordingOpen(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {recordingError ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recordingError}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      {isRecording ? (
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      ) : (
                        <Radio className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatTime(recordingTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isRecording && !audioUrl && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>بدء التسجيل</span>
                        </button>
                      )}

                      {isRecording && (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>إيقاف وحفظ</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {audioUrl && (
                    <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>تم التسجيل بنجاح! استمع للمقطع الصوتي قبل الحفظ:</span>
                      </div>

                      <audio src={audioUrl} controls className="w-full my-2 h-10" />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-3 py-1 text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          إعادة التسجيل
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAudioRecording}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                        >
                          إرفاق بالملاحظة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add Attachment URL Dialog */}
          {isOpenAdd && (
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="اسم الملف أو الوصف..."
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="image">صورة (Image)</option>
                  <option value="video">فيديو (Video)</option>
                  <option value="audio">صوت (Audio)</option>
                  <option value="pdf">مستند PDF</option>
                  <option value="link">رابط موقع (Link)</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="رابط الملف (URL)..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpenAdd(false)}
                  className="px-3 py-1 text-slate-500 hover:text-slate-700 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  حفظ المرفق
                </button>
              </div>
            </div>
          )}

          {/* Attachments List Grid */}
          {attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getIcon(att.type)}
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={att.name}>
                      {att.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(att)}
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer"
                      title="معاينة المرفق"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {att.url.startsWith('http') && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded-lg"
                        title="فتح الرابط في نافذة جديدة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                      title="حذف المرفق"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">لا توجد ملفات أو تسجيلات صوتية مرفقة بالملاحظة حالياً.</p>
          )}
        </div>
      )}

      {/* Media Lightbox Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-w-2xl w-full flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{previewAttachment.name}</span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewAttachment.type === 'image' && (
              <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-[70vh] rounded-xl object-contain" />
            )}

            {previewAttachment.type === 'video' && (
              <video src={previewAttachment.url} controls className="max-h-[70vh] rounded-xl w-full" />
            )}

            {previewAttachment.type === 'audio' && (
              <div className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <Music className="w-4 h-4" />
                  <span>مشغل التسجيل الصوتي</span>
                </div>
                <audio src={previewAttachment.url} controls className="w-full my-2" />
              </div>
            )}

            {previewAttachment.type === 'pdf' && (
              <iframe src={previewAttachment.url} title={previewAttachment.name} className="w-full h-96 rounded-xl border" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
