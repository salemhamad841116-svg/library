import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ListPlus, FolderPlus, Check, Sparkles, Folder, 
  Tag, Palette, Layers, ChevronDown, CornerDownLeft
} from 'lucide-react';
import { ListCategory } from '../../types';
import { COLOR_PRESETS } from '../../services/storage';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: (title: string, icon: string, color: string, parentId: string | null) => void;
  parentList?: ListCategory | null;
  allLists?: ListCategory[];
  defaultParentId?: string | null;
}

const PRESET_ICONS = [
  { icon: '📋', label: 'قائمة مهام' },
  { icon: '📁', label: 'مجلد عام' },
  { icon: '🎯', label: 'أهداف' },
  { icon: '🚀', label: 'مشاريع' },
  { icon: '💡', label: 'أفكار' },
  { icon: '📚', label: 'دراسة وقراءة' },
  { icon: '💼', label: 'أعمال وتجارة' },
  { icon: '🛒', label: 'مشتريات' },
  { icon: '🎨', label: 'تصميم وإبداع' },
  { icon: '⭐', label: 'مفضلة' },
  { icon: '📌', label: 'ملاحظات هامة' },
  { icon: '🌱', label: 'عادات وصحة' },
];

export const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  onClose,
  onCreateList,
  parentList,
  allLists = [],
  defaultParentId = null,
}) => {
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSelectedIcon(parentList ? '📁' : '📋');
      setSelectedColor(parentList ? parentList.color : 'indigo');
      setSelectedParentId(parentList ? parentList.id : (defaultParentId || null));
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, parentList, defaultParentId]);

  if (!isOpen) return null;

  const currentParent = allLists.find((l) => l.id === selectedParentId) || parentList || null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('يرجى كتابة اسم للقائمة الجديدة للمتابعة');
      inputRef.current?.focus();
      return;
    }

    onCreateList(cleanTitle, selectedIcon, selectedColor, selectedParentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              {currentParent ? <FolderPlus className="w-5 h-5" /> : <ListPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {currentParent ? 'إنشاء قائمة فرعية (Sub-list)' : 'إنشاء قائمة جديدة (Create New List)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentParent 
                  ? `إضافة مجلد/قائمة تابعة داخل "${currentParent.name}"`
                  : 'أنشئ قائمة ديناميكية غير محدودة لتنظيم المهام والملاحظات'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Parent List Selector / Context Badge */}
          {currentParent ? (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">{currentParent.icon || '📁'}</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">
                    المجلد/القائمة الأب (Parent Folder):
                  </span>
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-100 truncate block">
                    {currentParent.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParentId(null)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
              >
                جعلها قائمة رئيسية (Root)
              </button>
            </div>
          ) : (
            allLists.length > 0 && (
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  المجلد الأب (اختياري - لتنظيم هرمي متداخل)
                </label>
                <select
                  value={selectedParentId || ''}
                  onChange={(e) => setSelectedParentId(e.target.value || null)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- بدون مجلد أب (قائمة رئيسية مستقلة) --</option>
                  {allLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {`${'— '.repeat(l.depth || 0)}${l.icon} ${l.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* List Name Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم القائمة <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute right-3.5 text-lg select-none">
                {selectedIcon}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="مثال: قائمة مهام العمل، مشتريات الأسبوع، أفكار مشاريع..."
                className={`w-full pr-11 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden transition-all ${
                  error 
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          {/* Quick Icon Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">
              أيقونة القائمة
            </label>
            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              {PRESET_ICONS.map((item) => {
                const isSelected = selectedIcon === item.icon;
                return (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => setSelectedIcon(item.icon)}
                    title={item.label}
                    className={`h-11 rounded-lg flex items-center justify-center text-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md scale-105 ring-2 ring-indigo-400/40'
                        : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.icon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">
              لون السمة والمظهر
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = selectedColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedColor(preset.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: preset.hex }} 
                    />
                    <span>{preset.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد وإنشاء القائمة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
