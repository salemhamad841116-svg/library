import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, Clock, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { TaskItem } from '../../types';

interface NoteTasksManagerProps {
  tasks: TaskItem[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
}

export const NoteTasksManager: React.FC<NoteTasksManagerProps> = ({ tasks, onUpdateTasks }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newText, setNewText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddTask = () => {
    if (!newText.trim()) return;
    const newTask: TaskItem = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      text: newText.trim(),
      completed: false,
      priority,
      dueDate: dueDate || null,
    };
    onUpdateTasks([...tasks, newTask]);
    setNewText('');
    setDueDate('');
  };

  const handleToggleTask = (id: string) => {
    onUpdateTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    onUpdateTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 select-none transition-all">
      {/* Header - Click to toggle expand/collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            مهام الملاحظة ({completedCount} من {totalCount})
          </h4>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {progressPercent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isExpanded ? 'إغلاق المهام' : 'فتح الشريط'}
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
          {/* Progress Bar Track */}
          {totalCount > 0 && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Task input bar */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="إضافة مهمة جديدة لمتابعتها..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
              }}
              className="flex-1 min-w-[200px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="low">عادية</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية جداً</option>
            </select>

            <button
              type="button"
              onClick={handleAddTask}
              disabled={!newText.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>

          {/* Task items list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-colors ${
                  task.completed
                    ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 text-slate-400 line-through'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="w-4 h-4 text-blue-600 rounded-xs border-slate-300 cursor-pointer"
                  />
                  <span className="truncate">{task.text}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.priority === 'high' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                      مهم جداً
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
