import React, { useState } from 'react';
import { Filter, Search, Calendar, ChevronDown, Check, X } from 'lucide-react';
import { UIFilterConfig, FilterOption } from '../types/ui';

interface DynamicFilterBarProps {
  filters: UIFilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (targetField: string, value: any) => void;
  onClearFilters: () => void;
}

export const DynamicFilterBar: React.FC<DynamicFilterBarProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (!filters || filters.length === 0) return null;

  const activeCount = Object.keys(activeFilters).length;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-10">
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 text-slate-500">
        <Filter className="w-4 h-4" />
        <span className="text-xs font-bold">تصفية:</span>
      </div>

      {filters.map((f) => {
        const isActive = activeFilters[f.targetField] !== undefined && activeFilters[f.targetField] !== null && activeFilters[f.targetField] !== '';
        
        return (
          <div key={f.id} className="relative">
            {/* Filter Trigger Button */}
            <button
              onClick={() => setOpenDropdown(openDropdown === f.id ? null : f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                  : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {f.displayName}
              {isActive && (
                <span className="w-4 h-4 flex items-center justify-center bg-indigo-200 dark:bg-indigo-800 rounded-full text-[9px] font-bold ml-1">
                  {Array.isArray(activeFilters[f.targetField]) ? activeFilters[f.targetField].length : '1'}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === f.id ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Dropdown Popover */}
            {openDropdown === f.id && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{f.displayName}</span>
                  {isActive && (
                    <button 
                      onClick={() => onFilterChange(f.targetField, null)}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
                
                <div className="max-h-60 overflow-y-auto p-1">
                  {f.filterType === 'search' && (
                    <div className="p-2">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute right-2 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="بحث..."
                          value={activeFilters[f.targetField] || ''}
                          onChange={(e) => onFilterChange(f.targetField, e.target.value)}
                          className="w-full pr-7 pl-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                  
                  {f.filterType !== 'search' && f.options.map(opt => {
                    const isSelected = Array.isArray(activeFilters[f.targetField]) 
                      ? activeFilters[f.targetField].includes(opt.value)
                      : activeFilters[f.targetField] === opt.value;
                      
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (f.filterType === 'checkbox' || f.filterType === 'multi_select') {
                            const current = Array.isArray(activeFilters[f.targetField]) ? activeFilters[f.targetField] : [];
                            const updated = isSelected 
                              ? current.filter((v: string) => v !== opt.value)
                              : [...current, opt.value];
                            onFilterChange(f.targetField, updated.length > 0 ? updated : null);
                          } else {
                            onFilterChange(f.targetField, isSelected ? null : opt.value);
                            setOpenDropdown(null);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {opt.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                          {opt.label}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                  {f.filterType !== 'search' && f.options.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">لا توجد خيارات</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {activeCount > 0 && (
        <button
          onClick={onClearFilters}
          className="mr-auto flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
        >
          <X className="w-3 h-3" /> مسح الكل
        </button>
      )}
      
      {/* Invisible overlay to close dropdowns */}
      {openDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
};
