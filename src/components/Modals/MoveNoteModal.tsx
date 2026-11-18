import React, { useState } from 'react';
import { X, Folder, Move, Check } from 'lucide-react';
import { Note, NoteTreeNode } from '../../types';

interface MoveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToMoveId: string | null;
  tree: NoteTreeNode[];
  allNotes: Note[];
  onConfirmMove: (noteId: string, newParentId: string | null) => void;
}

export const MoveNoteModal: React.FC<MoveNoteModalProps> = ({
  isOpen,
  onClose,
  noteToMoveId,
  tree,
  allNotes,
  onConfirmMove,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  if (!isOpen || !noteToMoveId) return null;

  const currentNote = allNotes.find((n) => n.id === noteToMoveId);
  if (!currentNote) return null;

  const renderTreeOptions = (nodes: NoteTreeNode[]) => {
    return nodes.map((node) => {
      // Cannot move note inside itself or its children
      if (node.id === noteToMoveId || node.path.startsWith(currentNote.path + '/')) {
        return null;
      }

      const isSelected = selectedParentId === node.id;

      return (
        <div key={node.id} className="my-1">
          <div
            onClick={() => setSelectedParentId(node.id)}
            className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}
            style={{ paddingRight: `${node.depth * 14 + 10}px` }}
          >
            <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
            <span className="truncate">{node.title}</span>
            <span className="text-[10px] opacity-75 mr-auto">(عمق {node.depth})</span>
          </div>
          {node.children && renderTreeOptions(node.children)}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Move className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              نقل الملاحظة إلى أب جديد
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            اختر الملاحظة الرئيسية التي ترغب بنقل <strong>"{currentNote.title}"</strong> داخلها:
          </p>

          {/* Option: Root level */}
          <div
            onClick={() => setSelectedParentId(null)}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs cursor-pointer border transition-colors ${
              selectedParentId === null
                ? 'bg-blue-600 text-white font-bold border-blue-600'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <Folder className="w-4 h-4 text-amber-500" />
            <span>المستوى الرئيسي (Root - بدون أب)</span>
          </div>

          <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

          {/* Tree hierarchy options */}
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {renderTreeOptions(tree)}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmMove(noteToMoveId, selectedParentId);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد النقل</span>
          </button>
        </div>
      </div>
    </div>
  );
};
