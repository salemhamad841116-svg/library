import React, { useState } from 'react';
import { X, Search, BookOpen, Sparkles, Filter, Code2, Database, ArrowRight } from 'lucide-react';
import { CamelTerm, DialectIntentMapping } from '../types';

interface CamelGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms: CamelTerm[];
  dialectMappings?: DialectIntentMapping[];
}

export const CamelGlossaryModal: React.FC<CamelGlossaryModalProps> = ({
  isOpen,
  onClose,
  terms,
  dialectMappings = [],
}) => {
  const [activeTab, setActiveTab] = useState<'glossary' | 'dialect_sql'>('dialect_sql');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  if (!isOpen) return null;

  const categories = ['all', 'سن المطية', 'الجنس والنوع', 'الأشواط والرموز', 'الميدان والمهرجانات', 'الأنساب والسلالات', 'الأدوار والمصطلحات'];

  const filteredTerms = terms.filter((item) => {
    const matchCat = selectedCat === 'all' || item.category === selectedCat;
    const matchSearch =
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredDialects = dialectMappings.filter((item) => {
    const matchSearch =
      item.dialectTerm.toLowerCase().includes(search.toLowerCase()) ||
      item.fieldMeaning.toLowerCase().includes(search.toLowerCase()) ||
      item.targetSqlColumnOrTable.toLowerCase().includes(search.toLowerCase()) ||
      item.notes.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <span>معجم مصطلحات الهجن & قاموس لهجة الميدان (Intent Mapping)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Text-to-SQL
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                ترجمة اللهجة الشعبية الميدانية العفوية إلى استعلامات SQL وأعمدة دقيقة في PostgreSQL
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-stone-900 border-b border-stone-800">
          <button
            onClick={() => setActiveTab('dialect_sql')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dialect_sql'
                ? 'border-amber-400 text-amber-300 bg-stone-950/50 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Code2 className="w-4 h-4 text-amber-400" />
            <span>قاموس مرادفات لهجة الميدان (Dialect to SQL Mapping) 🐪</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'glossary'
                ? 'border-amber-400 text-amber-300 bg-stone-950/50 rounded-t-lg'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>معجم التوجيه الصوتي (Prompt Biasing)</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-3 bg-stone-900/90 border-b border-stone-800 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'dialect_sql'
                  ? 'ابحث في كلمات اللهجة (مركاض، سبج، العام، الفطامين، سلالة)...'
                  : 'بحث في معجم المصطلحات والتوجيه الصوتي...'
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pr-9 pl-4 py-2 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {activeTab === 'glossary' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCat === cat
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-750 hover:text-stone-200'
                  }`}
                >
                  {cat === 'all' ? 'جميع التصنيفات' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Dialect to SQL Intent Mapping */}
        {activeTab === 'dialect_sql' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
              <span className="font-bold block mb-1">💡 كيف يستجيب البوت للهجة الميدان العفوية؟</span>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                يقوم النظام بتحويل المفردات الشعبية (مثل نطق الجيم بدلاً من القاف "سبج"، "مركاض"، "الفطامين"، "العام") إلى استعلامات SQL حقيقية تستهدف أعمدة جدول النتائج <code className="text-amber-400 font-mono">race_results</code> مباشرة.
              </p>
            </div>

            <div className="space-y-2.5">
              {filteredDialects.map((mapping, idx) => (
                <div
                  key={idx}
                  className="bg-stone-950 border border-stone-800 hover:border-amber-500/40 rounded-xl p-3 transition-all space-y-2 text-right"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          {mapping.dialectTerm}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-600 rotate-180" />
                        <span className="text-xs font-semibold text-stone-200">
                          {mapping.fieldMeaning}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {mapping.notes}
                      </p>
                    </div>

                    <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-mono shrink-0">
                      {mapping.targetSqlColumnOrTable.split(' ')[0]}
                    </span>
                  </div>

                  <div className="bg-stone-900/90 rounded-lg p-2 font-mono text-[10px] text-emerald-400 border border-stone-800/80 flex items-center justify-between overflow-x-auto text-left" dir="ltr">
                    <code>{mapping.sqlPatternExample}</code>
                    <span className="text-[9px] text-stone-500 font-sans ml-2 shrink-0">SQL Query</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Standard Glossary (Prompt Biasing) */}
        {activeTab === 'glossary' && (
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-stone-850">
            {filteredTerms.map((item, idx) => (
              <div key={idx} className="pt-2.5 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{item.term}</span>
                  </span>
                  <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full border border-stone-700/50">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">{item.description}</p>
              </div>
            ))}

            {filteredTerms.length === 0 && (
              <div className="py-12 text-center text-stone-500 text-xs">
                لا توجد مصطلحات مطابقة لبحثك
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <span>يتم حقن قواعد الـ Intent Mapping داخل الـ System Prompt لنموذج LLM لترجمة الأسئلة بدقة.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 font-bold cursor-pointer transition-colors text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

