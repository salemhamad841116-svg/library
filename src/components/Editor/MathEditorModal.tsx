import React, { useState, useEffect } from 'react';
import { X, Check, Calculator, RefreshCw } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string, html: string) => void;
}

export const MathEditorModal: React.FC<MathEditorModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [formula, setFormula] = useState<string>('E = mc^2');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formula.trim()) {
      setPreviewHtml('');
      setError(null);
      return;
    }

    try {
      const html = katex.renderToString(formula, { displayMode: true, throwOnError: true });
      setPreviewHtml(html);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'خطأ في معادلة LaTeX');
    }
  }, [formula]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (previewHtml && !error) {
      const containerHtml = `<div class="math-block py-3 px-4 my-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center overflow-x-auto" data-latex="${encodeURIComponent(formula)}">${previewHtml}</div>`;
      onInsert(formula, containerHtml);
      onClose();
    }
  };

  const PRESETS = [
    { label: 'نسبية أينشتاين', latex: 'E = mc^2' },
    { label: 'نظرية فيثاغورس', latex: 'a^2 + b^2 = c^2' },
    { label: 'التكامل الممتد', latex: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
    { label: 'المصفوفات', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'المعادلة التربيعية', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              محرر المعادلات الرياضية (KaTeX Math)
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              صيغة LaTeX للمعادلة:
            </label>
            <textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              rows={3}
              placeholder="أدخل صيغة LaTeX مثلاً \int_{0}^{1} x dx"
              className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">نماذج معادلات جاهزة:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setFormula(p.latex)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rendered Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 text-center min-h-[90px] flex items-center justify-center">
            {error ? (
              <span className="text-xs text-rose-500 font-medium">{error}</span>
            ) : previewHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="text-slate-900 dark:text-slate-100 text-lg overflow-x-auto max-w-full"
              />
            ) : (
              <span className="text-xs text-slate-400">ستظهر المعاينة المباشرة هنا</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
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
            disabled={!previewHtml || !!error}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>إدراج المعادلة في الملاحظة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
