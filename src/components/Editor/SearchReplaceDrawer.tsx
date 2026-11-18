import React, { useState } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchReplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchTerm: string) => number; // returns count of matches
  onReplace: (searchTerm: string, replaceTerm: string, replaceAll: boolean) => void;
}

export const SearchReplaceDrawer: React.FC<SearchReplaceDrawerProps> = ({
  isOpen,
  onClose,
  onSearch,
  onReplace,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (val.trim()) {
      const count = onSearch(val);
      setMatchCount(count);
    } else {
      setMatchCount(null);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 p-3 flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-150 text-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="البحث عن كلمة داخل الملاحظة..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pr-8 pl-16 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          autoFocus
        />
        {matchCount !== null && (
          <span className="absolute left-2 top-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {matchCount} نتيجة
          </span>
        )}
      </div>

      {/* Replace Input */}
      <div className="relative flex-1 min-w-[180px]">
        <Replace className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="استبدال بـ..."
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          className="w-full pr-8 pl-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onReplace(searchTerm, replaceTerm, false)}
          disabled={!searchTerm}
          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          استبدال
        </button>
        <button
          type="button"
          onClick={() => onReplace(searchTerm, replaceTerm, true)}
          disabled={!searchTerm}
          className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          استبدال الكل
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
