import React, { useState } from 'react';
import { X, Check, Table as TableIcon } from 'lucide-react';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

export const TableModal: React.FC<TableModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [rows, setRows] = useState<number>(3);
  const [cols, setCols] = useState<number>(3);
  const [hasHeader, setHasHeader] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleGenerate = () => {
    let html = '<table class="w-full border-collapse border border-slate-300 dark:border-slate-700 my-4 text-xs font-sans">\n';

    if (hasHeader) {
      html += '  <thead>\n    <tr class="bg-slate-100 dark:bg-slate-800">\n';
      for (let c = 1; c <= cols; c++) {
        html += `      <th class="border border-slate-300 dark:border-slate-700 px-3 py-2 text-right font-bold">عمود ${c}</th>\n`;
      }
      html += '    </tr>\n  </thead>\n';
    }

    html += '  <tbody>\n';
    const startRow = hasHeader ? 1 : 0;
    const totalRows = hasHeader ? rows - 1 : rows;

    for (let r = 1; r <= Math.max(1, totalRows); r++) {
      html += '    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">\n';
      for (let c = 1; c <= cols; c++) {
        html += `      <td class="border border-slate-300 dark:border-slate-700 px-3 py-2">بيانات ${r}-${c}</td>\n`;
      }
      html += '    </tr>\n';
    }

    html += '  </tbody>\n</table>\n';

    onInsert(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              إدراج جدول بيانات
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
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                عدد الصفوف:
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={rows}
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                عدد الأعمدة:
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={cols}
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 text-center"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-xs border-slate-300"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              يحتوي الجدول على صف رأس (Header)
            </span>
          </label>
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
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>إدراج الجدول</span>
          </button>
        </div>
      </div>
    </div>
  );
};
