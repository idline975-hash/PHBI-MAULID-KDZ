import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { CommitteeSettings, UserAccount } from '../types';
import StrukturPanitiaCard from './StrukturPanitiaCard';

interface StrukturPanitiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  committeeSettings?: CommitteeSettings;
  canEdit?: boolean;
  currentUser?: UserAccount | null;
  onRefresh?: () => void;
}

export default function StrukturPanitiaModal({
  isOpen,
  onClose,
  committeeSettings,
  canEdit = true,
  currentUser = null,
  onRefresh
}: StrukturPanitiaModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-2 sm:my-6 max-h-[96vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky top close bar */}
        <div className="bg-emerald-950 text-emerald-200 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold truncate pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
            <span className="truncate">SK Susunan Panitia PHBI 1448 H / 2027 M</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body hosting StrukturPanitiaCard */}
        <div className="p-2.5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          <StrukturPanitiaCard 
            committeeSettings={committeeSettings}
            canEdit={canEdit}
            currentUser={currentUser}
            onRefresh={onRefresh}
          />
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 flex-shrink-0">
          <span className="truncate pr-2">Kp. Kedung Sapi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors min-h-[34px]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
