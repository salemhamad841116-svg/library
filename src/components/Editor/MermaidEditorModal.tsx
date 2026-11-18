import React, { useState, useEffect, useRef } from 'react';
import { X, Check, GitFork, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';

interface MermaidEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string, svgHtml: string) => void;
}

export const MermaidEditorModal: React.FC<MermaidEditorModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [code, setCode] = useState<string>(`graph TD
    A[المشروع الرئيسي] --> B(التصميم)
    A --> C(البرمجة)
    B --> D[الألوان والشعار]
    C --> E[الواجهة والخادم]`);

  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  }, []);

  useEffect(() => {
    if (!isOpen || !code.trim()) return;

    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const id = 'mermaid-render-' + Date.now();
        const { svg } = await mermaid.render(id, code);
        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'خطأ في تشييد المخطط الرسم البياني');
        }
      }
    };

    renderDiagram();
    return () => { isMounted = false; };
  }, [code, isOpen]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (svgHtml && !error) {
      const blockHtml = `<div class="mermaid-block py-4 px-4 my-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center overflow-x-auto flex justify-center" data-mermaid="${encodeURIComponent(code)}">${svgHtml}</div>`;
      onInsert(code, blockHtml);
      onClose();
    }
  };

  const PRESETS = [
    {
      label: 'مخطط تدفق (Flowchart)',
      code: `graph TD\n  Start[البداية] --> Process[المعالجة]\n  Process --> Decision{هل البيانات صحيحة؟}\n  Decision -- نعم --> Success[نجاح]\n  Decision -- لا --> Error[إعادة المحاولة]`,
    },
    {
      label: 'مخطط تسلسلي (Sequence)',
      code: `sequenceDiagram\n  المستخدم->>الواجهة: فتح الملاحظات المتداخلة\n  الواجهة->>الخادم: طلب بيانات الشجرة\n  الخادم-->>الواجهة: إرجاع الملاحظات\n  الواجهة-->>المستخدم: عرض الشجرة التفاعلية`,
    },
    {
      label: 'مخطط حالات (State)',
      code: `stateDiagram-v2\n  [*] --> مسودة\n  مسودة --> مراجعة\n  مراجعة --> منشور\n  منشور --> أرشيف`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              مخططات Mermaid الرسم البيانية
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              كود المخطط (Mermaid syntax):
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={5}
              className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">نماذج مخططات جاهزة:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCode(p.code)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rendered Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950/60 min-h-[140px] flex items-center justify-center overflow-x-auto">
            {error ? (
              <span className="text-xs text-rose-500 font-medium">{error}</span>
            ) : svgHtml ? (
              <div
                ref={containerRef}
                dangerouslySetInnerHTML={{ __html: svgHtml }}
                className="max-w-full flex justify-center"
              />
            ) : (
              <span className="text-xs text-slate-400">جاري رسم المخطط البياني...</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!svgHtml || !!error}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>إدراج المخطط التفاعلي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
