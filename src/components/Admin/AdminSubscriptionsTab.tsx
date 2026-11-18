import React, { useState } from 'react';
import { CreditCard, Check, Edit3, Plus, Users, HardDrive, FileText, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '../../types/admin';
import { getSubscriptionPlans, saveSubscriptionPlans } from '../../services/adminStorage';

export const AdminSubscriptionsTab: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(getSubscriptionPlans());
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    const updated = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
    setPlans(updated);
    saveSubscriptionPlans(updated);
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Plans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border text-xs space-y-4 relative flex flex-col justify-between ${
              plan.id === 'plan-pro'
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                : 'border-slate-200 dark:border-slate-800 shadow-xs'
            }`}
          >
            {plan.id === 'plan-pro' && (
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white shadow-xs">
                الأكثر شعبية
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                <span className="text-xs text-slate-400 font-semibold">{plan.activeUsersCount} مشترك</span>
              </div>

              <div className="my-4">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">${plan.priceMonthly}</span>
                <span className="text-slate-400 text-[11px]"> / شهرياً</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  <span>السعة التخزينية: <strong>{plan.storageMB >= 1024 ? `${(plan.storageMB / 1024).toFixed(0)}GB` : `${plan.storageMB}MB`}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>الحد الأقصى للملاحظات: <strong>{plan.maxNotes.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="pt-4 space-y-1.5">
                <div className="font-bold text-slate-500 mb-1">المميزات المضمنة:</div>
                {plan.features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setEditingPlan(plan)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل حدود الباقة والأسعار</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs select-none">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">تعديل باقة ({editingPlan.name})</h3>

            <form onSubmit={handleSavePlan} className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">السعر الشهري ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPlan.priceMonthly}
                  onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">السعة التخزينية (MB)</label>
                <input
                  type="number"
                  value={editingPlan.storageMB}
                  onChange={(e) => setEditingPlan({ ...editingPlan, storageMB: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الحد الأقصى للملاحظات</label>
                <input
                  type="number"
                  value={editingPlan.maxNotes}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxNotes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
