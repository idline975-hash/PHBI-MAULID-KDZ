import React from 'react';
import { X, Wallet, Sparkles } from 'lucide-react';
import PaymentView from './PaymentView';
import { PaymentSettings, TransferConfirmation, Citizen, UserAccount } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentSettings?: PaymentSettings;
  citizens: Citizen[];
  transferConfirmations?: TransferConfirmation[];
  currentUser?: UserAccount | null;
  onRefresh?: () => void;
  onOpenAdminManager?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  paymentSettings,
  citizens,
  transferConfirmations = [],
  currentUser,
  onRefresh,
  onOpenAdminManager
}: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-2 sm:my-6 max-h-[96vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky top close bar */}
        <div className="bg-emerald-950 text-emerald-200 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold truncate pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
            <span className="truncate">Pembayaran Transfer Bank, E-Wallet & QRIS PHBI 1448 H / 2027 M</span>
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

        {/* Modal Scrollable Body hosting PaymentView */}
        <div className="p-2.5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          <PaymentView
            paymentSettings={paymentSettings}
            citizens={citizens}
            transferConfirmations={transferConfirmations}
            currentUser={currentUser}
            onRefresh={onRefresh}
            onOpenAdminManager={onOpenAdminManager}
            isModal={true}
          />
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 flex-shrink-0">
          <span className="truncate pr-2">Panitia PHBI Maulid Nabi 1448 H / 2027 M – Kp. Kedung Sapi</span>
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
