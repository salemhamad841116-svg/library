import React, { useState, useEffect } from 'react';
import { 
  Save, Layout, Filter, Eye, UploadCloud, Plus, GripVertical, 
  Settings, Trash2, Copy, EyeOff, Edit, Move, Check, X,
  Monitor, Smartphone, Tablet
} from 'lucide-react';
import { UIRootConfig, UIElementConfig, UIFilterConfig } from '../../types/ui';
import { getDraftUIConfig, saveDraftUIConfig, publishUIConfig, discardDraftUIConfig, getPublishedUIConfig } from '../../services/uiStorage';
import { getAdminSession } from '../../services/adminStorage';

type TabView = 'elements' | 'filters' | 'preview' | 'publish';

export const AdminUIBuilderTab: React.FC = () => {
  const [config, setConfig] = useState<UIRootConfig | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('elements');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);

  // Edit Modals state
  const [editingElement, setEditingElement] = useState<UIElementConfig | null>(null);
  const [editingFilter, setEditingFilter] = useState<UIFilterConfig | null>(null);

  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = () => {
    const draft = getDraftUIConfig();
    setConfig(draft);
  };

  const handleSaveDraft = () => {
    if (!config) return;
    setIsSaving(true);
    const session = getAdminSession();
    saveDraftUIConfig(config, session.currentUser?.name || 'System');
    setTimeout(() => setIsSaving(false), 500);
  };

  const handlePublish = () => {
    if (!window.confirm('هل أنت متأكد من رغبتك بنشر هذه التعديلات لجميع المستخدمين؟')) return;
    const session = getAdminSession();
    const published = publishUIConfig(session.currentUser?.name || 'System');
    setConfig(published);
    alert('تم نشر واجهة المستخدم بنجاح!');
  };

  const handleDiscard = () => {
    if (!window.confirm('سيتم مسح جميع التعديلات الحالية والعودة لآخر نسخة منشورة. هل أنت متأكد؟')) return;
    const session = getAdminSession();
    discardDraftUIConfig(session.currentUser?.name || 'System');
    loadDraft();
  };

  const addElement = () => {
    const newEl: UIElementConfig = {
      id: `el_${Date.now()}`,
      type: 'button',
      internalName: 'new_element',
      displayName: 'عنصر جديد',
      location: 'main_workspace',
      order: config?.elements.length || 0,
      status: 'draft',
      isVisible: true,
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setConfig(prev => prev ? { ...prev, elements: [...prev.elements, newEl] } : null);
    setEditingElement(newEl);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedElementId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!config || !draggedElementId || draggedElementId === targetId) return;

    const elements = [...config.elements];
    const draggedIdx = elements.findIndex(el => el.id === draggedElementId);
    const targetIdx = elements.findIndex(el => el.id === targetId);

    const [draggedItem] = elements.splice(draggedIdx, 1);
    elements.splice(targetIdx, 0, draggedItem);
    
    // Update orders
    const updatedElements = elements.map((el, idx) => ({ ...el, order: idx }));
    setConfig({ ...config, elements: updatedElements });
    setDraggedElementId(null);
  };

  if (!config) return <div className="p-8 text-center text-slate-500">جاري تحميل المحرر...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      
      {/* Header & Main Actions */}
      <div className="bg-white dark:bg-slate-950 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            محرر واجهة المستخدم (UI Builder)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            إدارة العناصر، القوائم، والفلاتر بدون الحاجة لتعديل الكود.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            تراجع عن المسودة
          </button>
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/20"
          >
            <UploadCloud className="w-4 h-4" />
            نشر التعديلات
          </button>
        </div>
      </div>

      {/* Builder Navigation */}
      <div className="flex items-center gap-1 p-2 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'elements', label: 'عناصر الواجهة', icon: <Layout className="w-4 h-4" /> },
          { id: 'filters', label: 'إدارة الفلاتر', icon: <Filter className="w-4 h-4" /> },
          { id: 'preview', label: 'المعاينة', icon: <Eye className="w-4 h-4" /> },
          { id: 'publish', label: 'إدارة النشر', icon: <UploadCloud className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabView)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        {activeTab === 'elements' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">ترتيب وإدارة العناصر</h3>
              <button 
                onClick={addElement}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </button>
            </div>
            
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
              {config.elements.sort((a, b) => a.order - b.order).map(el => (
                <div 
                  key={el.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, el.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, el.id)}
                  className={`flex items-center gap-4 p-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors ${draggedElementId === el.id ? 'opacity-50' : ''}`}
                >
                  <div className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                    {el.type === 'button' ? <span className="text-xs font-bold border border-current px-1 rounded">Btn</span> : <Layout className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{el.displayName}</span>
                      {!el.isVisible && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500">مخفي</span>}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                        {el.location}
                      </span>
                      <span>نوع: {el.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        const updated = config.elements.map(e => e.id === el.id ? { ...e, isVisible: !e.isVisible } : e);
                        setConfig({ ...config, elements: updated });
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg cursor-pointer transition-colors"
                      title={el.isVisible ? "إخفاء" : "إظهار"}
                    >
                      {el.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setEditingElement(el)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg cursor-pointer transition-colors"
                      title="تعديل الإعدادات"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('هل تريد حذف هذا العنصر؟')) {
                          setConfig({ ...config, elements: config.elements.filter(e => e.id !== el.id) });
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg cursor-pointer transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {config.elements.length === 0 && (
                <div className="p-8 text-center text-slate-500">لا يوجد عناصر. ابدأ بـ "إضافة عنصر".</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">إدارة الفلاتر الذكية</h3>
              <button 
                onClick={() => {
                  const newFilter: UIFilterConfig = {
                    id: `f_${Date.now()}`,
                    internalName: 'new_filter',
                    displayName: 'فلتر جديد',
                    filterType: 'dropdown',
                    targetField: 'category',
                    options: [],
                    isActive: true,
                    order: config.filters.length
                  };
                  setConfig({ ...config, filters: [...config.filters, newFilter] });
                  setEditingFilter(newFilter);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة فلتر
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.filters.map(f => (
                <div key={f.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs relative group">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {f.displayName}
                        {!f.isActive && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">معطل</span>}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">حقل الاستهداف: <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">{f.targetField}</code></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingFilter(f)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-700/50 rounded cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('حذف هذا الفلتر نهائياً؟')) {
                            setConfig({ ...config, filters: config.filters.filter(x => x.id !== f.id) });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-700/50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {f.options.slice(0, 5).map(opt => (
                      <span key={opt.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300" style={opt.color ? { borderColor: opt.color, color: opt.color } : {}}>
                        {opt.label}
                      </span>
                    ))}
                    {f.options.length > 5 && <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400">+{f.options.length - 5}</span>}
                    {f.options.length === 0 && <span className="text-xs text-slate-400 italic">لا توجد خيارات...</span>}
                  </div>
                </div>
              ))}
              {config.filters.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  لا توجد فلاتر مخصصة حتى الآن.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full flex flex-col">
             <div className="flex justify-center mb-4 gap-2">
                <button className="p-2 bg-white dark:bg-slate-800 shadow-sm rounded-lg text-slate-500 hover:text-blue-600"><Monitor className="w-5 h-5"/></button>
                <button className="p-2 bg-white dark:bg-slate-800 shadow-sm rounded-lg text-slate-500 hover:text-blue-600"><Tablet className="w-5 h-5"/></button>
                <button className="p-2 bg-white dark:bg-slate-800 shadow-sm rounded-lg text-slate-500 hover:text-blue-600"><Smartphone className="w-5 h-5"/></button>
             </div>
             <div className="flex-1 border-4 border-slate-300 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto w-full relative bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto text-blue-500">
                    <Eye className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">Live Preview Engine</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">سيتم استعراض واجهة التطبيق هنا بناءً على إعدادات المسودة الحالية. <br/><span className="text-amber-500">ميزة قيد التطوير: يتم حالياً تطبيق التعديلات عند تحديث الصفحة بعد الحفظ.</span></p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'publish' && (
          <div className="max-w-2xl mx-auto space-y-6 py-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">إصدار الواجهة الحالي: {config.version}</h3>
              <p className="text-slate-500 mb-8">آخر نشر: {config.lastPublished ? new Date(config.lastPublished).toLocaleString('ar-EG') : 'لم يتم النشر بعد'}</p>
              
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={handleSaveDraft}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  حفظ المسودة فقط
                </button>
                <button 
                  onClick={handlePublish}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  نشر للمستخدمين
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editing Modals Placeholder - normally broken down into separate components */}
      {editingElement && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-full">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-white">تعديل عنصر واجهة: {editingElement.displayName}</h3>
              <button onClick={() => setEditingElement(null)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الظاهر (العنوان)</label>
                <input 
                  type="text" 
                  value={editingElement.displayName}
                  onChange={(e) => setEditingElement({...editingElement, displayName: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع العنصر</label>
                  <select 
                    value={editingElement.type}
                    onChange={(e) => setEditingElement({...editingElement, type: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="menu">قائمة (Menu)</option>
                    <option value="card">صندوق (Card)</option>
                    <option value="button">زر (Button)</option>
                    <option value="section">قسم (Section)</option>
                    <option value="filter">فلتر (Filter)</option>
                    <option value="search">بحث (Search)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموقع في الواجهة</label>
                  <select 
                    value={editingElement.location}
                    onChange={(e) => setEditingElement({...editingElement, location: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="sidebar">القائمة الجانبية (Sidebar)</option>
                    <option value="header">الشريط العلوي (Header)</option>
                    <option value="bottom_nav">الشريط السفلي (Bottom Nav)</option>
                    <option value="main_workspace">مساحة العمل (Workspace)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حالة الظهور</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingElement({...editingElement, isVisible: true})}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editingElement.isVisible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent'}`}
                  >
                    مفعل (ظاهر)
                  </button>
                  <button
                    onClick={() => setEditingElement({...editingElement, isVisible: false})}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!editingElement.isVisible ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent'}`}
                  >
                    معطل (مخفي)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرابط أو الوظيفة (Action/Link)</label>
                <input 
                  type="text" 
                  placeholder="/notes or handleMyAction"
                  value={editingElement.linkOrAction || ''}
                  onChange={(e) => setEditingElement({...editingElement, linkOrAction: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
              <button 
                onClick={() => setEditingElement(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button 
                onClick={() => {
                  setConfig({
                    ...config,
                    elements: config.elements.map(e => e.id === editingElement.id ? editingElement : e)
                  });
                  setEditingElement(null);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-sm cursor-pointer"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Editing Modal Placeholder */}
      {editingFilter && (
         <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-lg dark:text-white">تعديل فلتر: {editingFilter.displayName}</h3>
                <button onClick={() => setEditingFilter(null)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الفلتر الظاهر</label>
                    <input 
                      type="text" 
                      value={editingFilter.displayName}
                      onChange={(e) => setEditingFilter({...editingFilter, displayName: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حقل الاستهداف (Target Field)</label>
                    <input 
                      type="text" 
                      value={editingFilter.targetField}
                      onChange={(e) => setEditingFilter({...editingFilter, targetField: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الفلتر</label>
                  <select 
                    value={editingFilter.filterType}
                    onChange={(e) => setEditingFilter({...editingFilter, filterType: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="dropdown">قائمة منسدلة (Dropdown)</option>
                    <option value="checkbox">تحديد متعدد (Checkbox)</option>
                    <option value="radio">تحديد فردي (Radio)</option>
                    <option value="date">تاريخ (Date)</option>
                    <option value="search">بحث نصوص (Search)</option>
                  </select>
                </div>
                
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">خيارات الفلتر</label>
                    <button 
                      onClick={() => {
                        setEditingFilter({
                          ...editingFilter, 
                          options: [...editingFilter.options, { id: `opt_${Date.now()}`, label: 'خيار جديد', value: 'new_val' }]
                        });
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> إضافة خيار
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingFilter.options.map((opt, idx) => (
                      <div key={opt.id} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          placeholder="الاسم (Label)"
                          value={opt.label}
                          onChange={(e) => {
                            const newOpts = [...editingFilter.options];
                            newOpts[idx].label = e.target.value;
                            setEditingFilter({...editingFilter, options: newOpts});
                          }}
                          className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                        />
                        <input 
                          type="text" 
                          placeholder="القيمة (Value)"
                          value={opt.value}
                          onChange={(e) => {
                            const newOpts = [...editingFilter.options];
                            newOpts[idx].value = e.target.value;
                            setEditingFilter({...editingFilter, options: newOpts});
                          }}
                          className="w-1/3 px-2 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono"
                        />
                        <button 
                          onClick={() => {
                            const newOpts = [...editingFilter.options];
                            newOpts.splice(idx, 1);
                            setEditingFilter({...editingFilter, options: newOpts});
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {editingFilter.options.length === 0 && <div className="text-xs text-slate-500 text-center py-2">لا توجد خيارات...</div>}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
                <button 
                  onClick={() => setEditingFilter(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    setConfig({
                      ...config,
                      filters: config.filters.map(f => f.id === editingFilter.id ? editingFilter : f)
                    });
                    setEditingFilter(null);
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-sm cursor-pointer"
                >
                  حفظ الفلتر
                </button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
};
