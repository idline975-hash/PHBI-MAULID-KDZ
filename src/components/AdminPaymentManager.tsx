import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, Smartphone, QrCode, CheckCircle2, XCircle, 
  Clock, AlertCircle, Plus, Trash2, Edit3, Save, Upload, 
  Eye, RefreshCw, Sparkles, HelpCircle, ShieldCheck, Check, 
  ExternalLink, FileText, ArrowRight, MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentSettings, TransferConfirmation, BankAccount, EWalletAccount, QrisConfig, UserAccount } from '../types';
import { getCurrentIndonesianTime } from '../utils/formatters';

interface AdminPaymentManagerProps {
  paymentSettings?: PaymentSettings;
  transferConfirmations?: TransferConfirmation[];
  currentUser?: UserAccount | null;
  onRefresh?: () => void;
  onClose?: () => void;
}

export default function AdminPaymentManager({
  paymentSettings,
  transferConfirmations = [],
  currentUser,
  onRefresh,
  onClose
}: AdminPaymentManagerProps) {
  const [managerTab, setManagerTab] = useState<'verifikasi' | 'rekening' | 'qris_guide'>('verifikasi');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);

  // Local state for transfer confirmations to guarantee immediate responsive UI & instant deletion
  const [confirmationsList, setConfirmationsList] = useState<TransferConfirmation[]>(transferConfirmations);

  useEffect(() => {
    setConfirmationsList(transferConfirmations);
  }, [transferConfirmations]);

  // Synchronize bank accounts when updated from server / prop changes
  useEffect(() => {
    if (paymentSettings?.bankAccounts) {
      setBankList(paymentSettings.bankAccounts);
    }
  }, [paymentSettings?.bankAccounts]);

  // Synchronize e-wallets when updated from server / prop changes
  useEffect(() => {
    if (paymentSettings?.eWallets) {
      setEWalletList(paymentSettings.eWallets);
    }
  }, [paymentSettings?.eWallets]);

  // Synchronize QRIS configuration when updated from server / prop changes
  useEffect(() => {
    if (paymentSettings?.qris) {
      setQrisConfig(paymentSettings.qris);
    }
  }, [paymentSettings?.qris]);

  // Helper to generate polite WhatsApp pre-filled message URL for the recipient
  const getWhatsAppUrl = (item: TransferConfirmation, senderName?: string) => {
    if (!item.nomorWa) return '#';
    let phone = item.nomorWa.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }

    const admin = senderName || 'Bendahara Panitia PHBI';
    const jenisText = item.tipePembayaran === 'iuran_pekanan'
      ? `Iuran Pekanan (${item.mingguKe && item.mingguKe.length > 0 ? item.mingguKe.map(w => `Pekan ${w}`).join(', ') : 'Pekan 1'})`
      : 'Donasi Sukarela / Infaq PHBI';

    let statusHeader = '';
    let statusKeterangan = '';

    if (item.status === 'verified') {
      statusHeader = '✅ *TELAH DISETUJUI & MASUK KAS*';
      statusKeterangan = 'Alhamdulillah, dana transfer Anda sudah kami periksa dan telah masuk ke rekening kas. Status pembayaran Anda sudah tercatat di sistem pembukuan aplikasi. Terima kasih banyak atas partisipasinya, semoga menjadi amal jariyah dan membawa keberkahan bagi keluarga. Aamiin YRA.';
    } else if (item.status === 'rejected') {
      statusHeader = '❌ *DITOLAK*';
      statusKeterangan = `Mohon maaf, pengajuan transfer Anda belum dapat kami setujui karena: *${item.rejectReason || 'Bukti transfer tidak sesuai atau dana belum masuk di mutasi rekening'}*. Mohon periksa kembali mutasi rekening atau kirim ulang bukti transfer yang jelas melalui aplikasi.`;
    } else {
      statusHeader = '⏳ *SEDANG DIPERIKSA / MENUNGGU VERIFIKASI*';
      statusKeterangan = 'Bukti transfer Anda telah kami terima dan saat ini sedang kami cocokkan dengan mutasi rekening/dompet digital panitia. Kami akan segera memperbarui statusnya setelah dana dipastikan masuk. Mohon ditunggu.';
    }

    const message = 
`Assalamu'alaikum Wr. Wb.
Halo Bpk/Ibu/Sdr *${item.citizenName || item.pengirimNama}*,

Saya *${admin}* dari *Panitia PHBI Isra Mi'raj 1448 H / 2027 M Kp. Kedung Sapi*, mengonfirmasi bukti transfer pembayaran yang Anda kirimkan:

📋 *Rincian Pembayaran:*
• Nama Warga: *${item.citizenName}*
• Jenis: *${jenisText}*
• Nominal: *Rp ${item.nominal.toLocaleString('id-ID')}*
• Metode: *${item.metode.toUpperCase()} (${item.tujuanNama})*
• Waktu Kirim: *${item.tanggal}*
• Status: ${statusHeader}

${statusKeterangan}

Terima kasih. Jazakumullah Khairan Katsiran.
Wassalamu'alaikum Wr. Wb.

_Panitia PHBI Isra Mi'raj Nabi Muhammad SAW 1448 H / 2027 M_
_Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten_`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Reject Modal State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Bukti transfer tidak sesuai atau dana belum masuk di rekening');

  // Delete Modal State (In-App Dialog, eliminates window.confirm iframe blockage)
  const [deletingConfirmation, setDeletingConfirmation] = useState<TransferConfirmation | null>(null);
  const [deletingBank, setDeletingBank] = useState<BankAccount | null>(null);
  const [deletingWallet, setDeletingWallet] = useState<EWalletAccount | null>(null);

  // Loading States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bank & E-Wallet Form State
  const [bankList, setBankList] = useState<BankAccount[]>(paymentSettings?.bankAccounts || [
    {
      id: 'bank-bri-1',
      bankName: 'Bank BRI',
      accountNumber: '0123-01-045678-50-9',
      accountHolder: 'Alwi (Bendahara PHBI)',
      catatan: 'Dapat transfer dari ATM BRI, BRImo, atau Antar-Bank (Kode: 002)'
    },
    {
      id: 'bank-bca-1',
      bankName: 'Bank BCA',
      accountNumber: '7890-1234-56',
      accountHolder: 'Alwi',
      catatan: 'Transfer via BCA Mobile, KlikBCA, atau ATM BCA (Kode: 014)'
    },
    {
      id: 'bank-bsi-1',
      bankName: 'Bank BSI',
      accountNumber: '719-8765-432',
      accountHolder: 'Panitia Isra Miraj Kp Kedung Sapi',
      catatan: 'Bank Syariah Indonesia (Kode: 451) / Rekening Panitia'
    }
  ]);

  const [eWalletList, setEWalletList] = useState<EWalletAccount[]>(paymentSettings?.eWallets || [
    {
      id: 'ewallet-dana-1',
      walletName: 'DANA',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Alwi / PHBI Kedung Sapi',
      catatan: 'Transfer via nomor HP atau ID DANA (Bebas biaya admin)'
    },
    {
      id: 'ewallet-gopay-1',
      walletName: 'GoPay',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Alwi (Bendahara)',
      catatan: 'Transfer via Gojek / GoPay ke nomor HP'
    },
    {
      id: 'ewallet-ovo-1',
      walletName: 'OVO',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Alwi',
      catatan: 'Transfer antar akun OVO'
    }
  ]);

  // QRIS State
  const [qrisConfig, setQrisConfig] = useState<QrisConfig>(paymentSettings?.qris || {
    qrisName: "PHBI ISRA MI'RAJ KP. KEDUNG SAPI",
    qrisNmid: 'ID1024356789012',
    qrisImageUrl: '',
    qrisPayloadString: '00020101021126590014ID.GO.QRIS.WWW01189360099900000000000209ID10243567890120303UMI51440014ID.CO.QRIS.WWW02150000000000000000303UMI5204541153033605802ID5932PHBI ISRA MIRAJ KP KEDUNG SAPI6007SERANG61054217762070703A0163041A2B',
    instructions: 'Scan QRIS ini menggunakan m-Banking (BCA, BRImo, Livin Mandiri, BSI, BNI, Jago, dll) atau E-Wallet (DANA, GoPay, OVO, ShopeePay, LinkAja).'
  });

  const qrisFileInputRef = useRef<HTMLInputElement>(null);

  // New Account Dialog States
  const [newBank, setNewBank] = useState<Partial<BankAccount>>({ bankName: '', accountNumber: '', accountHolder: '', catatan: '' });
  const [newWallet, setNewWallet] = useState<Partial<EWalletAccount>>({ walletName: 'DANA', accountNumber: '', accountHolder: '', catatan: '' });
  const [showAddBank, setShowAddBank] = useState<boolean>(false);
  const [showAddWallet, setShowAddWallet] = useState<boolean>(false);

  // Save All Payment Settings to Server
  const handleSavePaymentSettings = async (
    overrideQris?: QrisConfig,
    overrideBanks?: BankAccount[],
    overrideWallets?: EWalletAccount[],
    customSuccessMsg?: string
  ) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentSettings: {
            bankAccounts: overrideBanks || bankList,
            eWallets: overrideWallets || eWalletList,
            qris: overrideQris || qrisConfig
          },
          updatedBy: currentUser?.name || 'Bendahara'
        })
      });

      if (res.ok) {
        setActionMessage({ 
          type: 'success', 
          text: customSuccessMsg || 'Pengaturan Rekening & Kode QRIS berhasil disimpan ke Cloud!' 
        });
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Gagal menyimpan pengaturan pembayaran' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal terhubung ke server: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload QRIS Image Handler
  const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran file QRIS maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...qrisConfig, qrisImageUrl: dataUrl };
      setQrisConfig(updated);
      handleSavePaymentSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  // Verify Transfer (Dengan Waktu Real-Time WIB)
  const handleVerifyConfirmation = async (id: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const realTimeWIB = getCurrentIndonesianTime();
      const res = await fetch(`/api/transfer-confirmations/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: currentUser?.name || 'Bendahara (Alwi)',
          clientTimestamp: realTimeWIB
        })
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Bukti transfer berhasil disetujui pada ${realTimeWIB}! Dana otomatis masuk kas & iuran tercatat lunas.`
        });
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 4500);
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Gagal memverifikasi transfer' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal memverifikasi transfer: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Transfer
  const handleRejectConfirmation = async () => {
    if (!rejectingId) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/transfer-confirmations/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: currentUser?.name || 'Bendahara',
          reason: rejectReason
        })
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: 'Konfirmasi transfer ditolak dengan alasan yang telah dicatat.'
        });
        setRejectingId(null);
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Gagal menolak transfer' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal menolak transfer: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Confirmation Record (Called after user confirms in-app dialog)
  const executeDeleteConfirmation = async (id: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/transfer-confirmations/${id}?deletedBy=${encodeURIComponent(currentUser?.name || 'Bendahara')}`, { 
        method: 'DELETE' 
      });
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: 'Catatan pengajuan transfer berhasil dihapus dari sistem.'
        });
        setDeletingConfirmation(null);
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Gagal menghapus catatan transfer' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal menghapus data: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Bank
  const handleAddBank = async () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolder) {
      setActionMessage({ type: 'error', text: 'Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi' });
      return;
    }
    const item: BankAccount = {
      id: 'bank-' + Date.now(),
      bankName: newBank.bankName.trim(),
      accountNumber: newBank.accountNumber.trim(),
      accountHolder: newBank.accountHolder.trim(),
      catatan: newBank.catatan?.trim() || undefined
    };
    const next = [...bankList, item];
    setBankList(next);
    setNewBank({ bankName: '', accountNumber: '', accountHolder: '', catatan: '' });
    setShowAddBank(false);
    await handleSavePaymentSettings(undefined, next, undefined, `Rekening ${item.bankName} berhasil ditambahkan dan disimpan!`);
  };

  // Delete Bank (In-App Dialog Execution)
  const executeDeleteBank = async (bankId: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    const target = bankList.find(b => b.id === bankId);
    const updated = bankList.filter(item => item.id !== bankId);
    try {
      const res = await fetch(`/api/payment-settings/banks/${encodeURIComponent(bankId)}?deletedBy=${encodeURIComponent(currentUser?.name || 'Bendahara')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBankList(updated);
        setDeletingBank(null);
        setActionMessage({
          type: 'success',
          text: `Rekening ${target?.bankName || 'Bank'} berhasil dihapus dari sistem!`
        });
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        // Fallback to saving complete settings
        await handleSavePaymentSettings(
          undefined, 
          updated, 
          undefined, 
          `Rekening ${target?.bankName || 'Bank'} berhasil dihapus dari sistem!`
        );
        setBankList(updated);
        setDeletingBank(null);
      }
    } catch (err: any) {
      try {
        await handleSavePaymentSettings(
          undefined, 
          updated, 
          undefined, 
          `Rekening ${target?.bankName || 'Bank'} berhasil dihapus dari sistem!`
        );
        setBankList(updated);
        setDeletingBank(null);
      } catch (fallbackErr: any) {
        setActionMessage({ type: 'error', text: 'Gagal menghapus rekening bank: ' + fallbackErr.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Wallet
  const handleAddWallet = async () => {
    if (!newWallet.walletName || !newWallet.accountNumber || !newWallet.accountHolder) {
      setActionMessage({ type: 'error', text: 'Nama E-Wallet, Nomor HP, dan Atas Nama wajib diisi' });
      return;
    }
    const item: EWalletAccount = {
      id: 'wallet-' + Date.now(),
      walletName: newWallet.walletName.trim(),
      accountNumber: newWallet.accountNumber.trim(),
      accountHolder: newWallet.accountHolder.trim(),
      catatan: newWallet.catatan?.trim() || undefined
    };
    const next = [...eWalletList, item];
    setEWalletList(next);
    setNewWallet({ walletName: 'DANA', accountNumber: '', accountHolder: '', catatan: '' });
    setShowAddWallet(false);
    await handleSavePaymentSettings(undefined, undefined, next, `Akun E-Wallet ${item.walletName} berhasil ditambahkan dan disimpan!`);
  };

  // Delete Wallet (In-App Dialog Execution)
  const executeDeleteWallet = async (walletId: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    const target = eWalletList.find(w => w.id === walletId);
    const updated = eWalletList.filter(item => item.id !== walletId);
    try {
      const res = await fetch(`/api/payment-settings/wallets/${encodeURIComponent(walletId)}?deletedBy=${encodeURIComponent(currentUser?.name || 'Bendahara')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEWalletList(updated);
        setDeletingWallet(null);
        setActionMessage({
          type: 'success',
          text: `Akun E-Wallet ${target?.walletName || 'Dompet Digital'} berhasil dihapus dari sistem!`
        });
        if (onRefresh) onRefresh();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        await handleSavePaymentSettings(
          undefined, 
          undefined, 
          updated, 
          `Akun E-Wallet ${target?.walletName || 'Dompet Digital'} berhasil dihapus dari sistem!`
        );
        setEWalletList(updated);
        setDeletingWallet(null);
      }
    } catch (err: any) {
      try {
        await handleSavePaymentSettings(
          undefined, 
          undefined, 
          updated, 
          `Akun E-Wallet ${target?.walletName || 'Dompet Digital'} berhasil dihapus dari sistem!`
        );
        setEWalletList(updated);
        setDeletingWallet(null);
      } catch (fallbackErr: any) {
        setActionMessage({ type: 'error', text: 'Gagal menghapus akun e-wallet: ' + fallbackErr.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered Confirmations
  const filteredConfirmations = transferConfirmations.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const pendingCount = transferConfirmations.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Top Banner Control */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-rose-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
            <ShieldCheck className="w-3 h-3 text-slate-950" />
            Panel Pengelola Keuangan & Verifikasi Transfer
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-rose-400 flex-shrink-0" />
            Verifikasi Transfer, Rekening Bank & QRIS
          </h2>
          <p className="text-xs sm:text-sm text-rose-200/90 font-medium">
            Kelola data rekening bank panitia, e-wallet, dan kode QRIS serta verifikasi bukti transfer warga.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer flex-shrink-0"
          >
            Kembali
          </button>
        )}
      </div>

      {/* Action Message Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-rose-50 text-rose-900 border border-rose-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setManagerTab('verifikasi')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              managerTab === 'verifikasi'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Verifikasi Bukti Transfer</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('rekening')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              managerTab === 'rekening'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Atur Bank & E-Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('qris_guide')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              managerTab === 'qris_guide'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Atur Kode QRIS & Panduan</span>
          </button>
        </div>

        {managerTab !== 'verifikasi' && (
          <button
            type="button"
            onClick={() => handleSavePaymentSettings()}
            disabled={isProcessing}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Pembayaran</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VERIFIKASI BUKTI TRANSFER WARGA */}
      {/* ========================================================================= */}
      {managerTab === 'verifikasi' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-700" />
                Daftar Pengajuan Transfer Pembayaran Warga
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Periksa bukti struk dan mutasi rekening bank/wallet Anda sebelum menyetujui.
              </p>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filterStatus === 'pending' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('verified')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filterStatus === 'verified' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Terverifikasi
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filterStatus === 'rejected' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Ditolak
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {filteredConfirmations.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <CheckCircle2 className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-700">Tidak ada data transfer pada filter ini</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterStatus === 'pending'
                  ? 'Semua pengajuan transfer warga sudah Anda verifikasi!'
                  : 'Belum ada data pada kategori ini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConfirmations.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 border-2 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    item.status === 'pending'
                      ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                      : item.status === 'verified'
                      ? 'bg-white border-slate-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-base text-slate-900">
                        {item.citizenName}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                        {item.metode.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.tanggal}
                      </span>
                      {item.status === 'pending' && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full animate-pulse">
                          Perlu Verifikasi
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Nominal: </span>
                        <span className="font-black text-rose-800 text-sm">
                          Rp {item.nominal.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span>•</span>
                      <div>
                        <span className="text-slate-400 font-medium">Jenis: </span>
                        <span className="font-bold text-slate-800">
                          {item.tipePembayaran === 'iuran_pekanan' 
                            ? `Iuran Pekan: ${item.mingguKe && item.mingguKe.length > 0 ? item.mingguKe.map(w => `P${w}`).join(', ') : 'Pekan 1'}`
                            : 'Donasi Sukarela / Infaq'}
                        </span>
                      </div>
                      <span>•</span>
                      <div>
                        <span className="text-slate-400 font-medium">Tujuan: </span>
                        <span className="font-semibold text-slate-700">{item.tujuanNama}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span>Pengirim: <strong>{item.pengirimNama}</strong></span>
                      {item.pengirimBankAtauWallet && (
                        <span>({item.pengirimBankAtauWallet})</span>
                      )}
                      {item.nomorWa && (
                        <a 
                          href={getWhatsAppUrl(item, currentUser?.name)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition-all active:scale-95 cursor-pointer"
                          title="Klik untuk membuka WhatsApp dengan pesan konfirmasi otomatis untuk si penerima"
                        >
                          <MessageSquare className="w-3 h-3 text-white flex-shrink-0" />
                          <span>WA: {item.nomorWa}</span>
                        </a>
                      )}
                      {item.catatan && (
                        <span className="italic text-slate-500">"{item.catatan}"</span>
                      )}
                    </div>

                    {item.status === 'verified' && (
                      <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Diverifikasi oleh: <strong>{item.verifiedBy || 'Bendahara'}</strong> pada {item.verifiedAt}</span>
                      </div>
                    )}

                    {item.status === 'rejected' && (
                      <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1 pt-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ditolak oleh: <strong>{item.verifiedBy || 'Bendahara'}</strong>. Alasan: {item.rejectReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Proof Preview & Approval Buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                    {/* View Proof Button */}
                    {item.buktiUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedProofImage(item.buktiUrl || null)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Lihat Foto Bukti Struk"
                      >
                        <Eye className="w-4 h-4 text-rose-700" />
                        <span>Lihat Bukti Foto</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic px-2">Tanpa Bukti Foto</span>
                    )}

                    {/* Chat WhatsApp Otomatis Button */}
                    {item.nomorWa && (
                      <a
                        href={getWhatsAppUrl(item, currentUser?.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        title="Buka WhatsApp dengan pesan otomatis untuk si penerima"
                      >
                        <MessageSquare className="w-4 h-4 text-white flex-shrink-0" />
                        <span>Chat WA</span>
                      </a>
                    )}

                    {item.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifyConfirmation(item.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Setujui & Masukkan Kas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectingId(item.id)}
                          disabled={isProcessing}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Tolak</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      id={`btn-delete-transfer-${item.id}`}
                      onClick={() => setDeletingConfirmation(item)}
                      className="px-2.5 py-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs active:scale-95"
                      title="Hapus data transfer ini"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATUR REKENING BANK & E-WALLET */}
      {/* ========================================================================= */}
      {managerTab === 'rekening' && (
        <div className="space-y-6">
          {/* Section 1: Rekening Bank */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-rose-700" />
                  Daftar Rekening Bank Panitia PHBI
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Warga dapat menyalin nomor rekening ini saat melakukan transfer bank.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBank(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Rekening Bank</span>
              </button>
            </div>

            {/* Form Tambah Bank Baru */}
            {showAddBank && (
              <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-3">
                <div className="font-bold text-xs text-rose-950 flex items-center justify-between">
                  <span>Input Data Rekening Bank Baru</span>
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={newBank.bankName || ''}
                      onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                      placeholder="Contoh: Bank BCA / Bank BRI"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={newBank.accountNumber || ''}
                      onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                      placeholder="Contoh: 0123-4567-890"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama (Pemilik)</label>
                    <input
                      type="text"
                      value={newBank.accountHolder || ''}
                      onChange={(e) => setNewBank({ ...newBank, accountHolder: e.target.value })}
                      placeholder="Contoh: Alwi (Bendahara)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={newBank.catatan || ''}
                    onChange={(e) => setNewBank({ ...newBank, catatan: e.target.value })}
                    placeholder="Contoh: Kode Bank: 014 / Transfer antar BCA"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddBank}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Tambahkan ke Daftar
                  </button>
                </div>
              </div>
            )}

            {/* List Bank */}
            {bankList.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                <p className="text-xs font-semibold text-slate-500">Belum ada rekening bank yang terdaftar.</p>
                <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Tambah Rekening Bank" di atas untuk menambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {bankList.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{b.bankName}</span>
                        <button
                          type="button"
                          id={`btn-delete-bank-${b.id || idx}`}
                          onClick={() => setDeletingBank(b)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold shadow-2xs active:scale-95"
                          title="Hapus Rekening Bank Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                          <span>Hapus</span>
                        </button>
                      </div>
                      <div className="font-mono font-black text-base text-rose-900">
                        {b.accountNumber}
                      </div>
                      <div className="text-xs text-slate-600">
                        a.n. <strong>{b.accountHolder}</strong>
                      </div>
                      {b.catatan && (
                        <p className="text-[11px] text-slate-500 pt-1">{b.catatan}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Dompet Digital E-Wallet */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-teal-700" />
                  Daftar Akun Dompet Digital (E-Wallet) Panitia
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  DANA, GoPay, OVO, ShopeePay, LinkAja.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddWallet(true)}
                className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah E-Wallet</span>
              </button>
            </div>

            {/* Form Tambah Wallet Baru */}
            {showAddWallet && (
              <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 space-y-3">
                <div className="font-bold text-xs text-teal-950 flex items-center justify-between">
                  <span>Input Akun E-Wallet Baru</span>
                  <button
                    type="button"
                    onClick={() => setShowAddWallet(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Dompet Digital</label>
                    <input
                      type="text"
                      value={newWallet.walletName || ''}
                      onChange={(e) => setNewWallet({ ...newWallet, walletName: e.target.value })}
                      placeholder="DANA / GoPay / OVO / ShopeePay"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor HP / ID</label>
                    <input
                      type="text"
                      value={newWallet.accountNumber || ''}
                      onChange={(e) => setNewWallet({ ...newWallet, accountNumber: e.target.value })}
                      placeholder="0857-xxxx-xxxx"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama Akun</label>
                    <input
                      type="text"
                      value={newWallet.accountHolder || ''}
                      onChange={(e) => setNewWallet({ ...newWallet, accountHolder: e.target.value })}
                      placeholder="Alwi / PHBI Kedung Sapi"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddWallet}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Tambahkan E-Wallet
                  </button>
                </div>
              </div>
            )}

            {/* List E-Wallet */}
            {eWalletList.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                <p className="text-xs font-semibold text-slate-500">Belum ada akun dompet digital (e-wallet) yang terdaftar.</p>
                <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Tambah E-Wallet" di atas untuk menambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {eWalletList.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{w.walletName}</span>
                        <button
                          type="button"
                          id={`btn-delete-wallet-${w.id || idx}`}
                          onClick={() => setDeletingWallet(w)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold shadow-2xs active:scale-95"
                          title="Hapus Akun E-Wallet Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                          <span>Hapus</span>
                        </button>
                      </div>
                      <div className="font-mono font-black text-base text-teal-900">
                        {w.accountNumber}
                      </div>
                      <div className="text-xs text-slate-600">
                        a.n. <strong>{w.accountHolder}</strong>
                      </div>
                      {w.catatan && (
                        <p className="text-[11px] text-slate-500 pt-1">{w.catatan}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENGATURAN KODE QRIS & PANDUAN LENGKAP */}
      {/* ========================================================================= */}
      {managerTab === 'qris_guide' && (
        <div className="space-y-6">
          {/* Main QRIS Config Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-500" />
                Pengaturan Kode QRIS Resmi Panitia PHBI
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Anda dapat memasukkan kode QRIS dengan mengupload gambar atau mengetik teks string kode QRIS.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Toko / Merchant QRIS
                  </label>
                  <input
                    type="text"
                    value={qrisConfig.qrisName}
                    onChange={(e) => setQrisConfig({ ...qrisConfig, qrisName: e.target.value })}
                    placeholder="Contoh: PHBI ISRA MI'RAJ KP BARANI"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:bg-white focus:outline-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NMID (National Merchant ID - Dari Bank / E-Wallet)
                  </label>
                  <input
                    type="text"
                    value={qrisConfig.qrisNmid || ''}
                    onChange={(e) => setQrisConfig({ ...qrisConfig, qrisNmid: e.target.value })}
                    placeholder="Contoh: ID1024356789012"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-rose-600"
                  />
                </div>

                {/* Metode 1: Upload File Gambar QRIS */}
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-rose-700" />
                      Cara 1: Upload File Gambar QRIS (PNG / JPG)
                    </span>
                    {qrisConfig.qrisImageUrl && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        Foto Tersedia
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Jika Anda sudah memiliki gambar barcode QRIS dari BCA, BRImo, DANA Bisnis, atau GoPay Merchant:
                  </p>

                  <input
                    type="file"
                    ref={qrisFileInputRef}
                    onChange={handleQrisImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => qrisFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{qrisConfig.qrisImageUrl ? 'Ganti Foto QRIS' : 'Pilih Foto QRIS dari Perangkat'}</span>
                    </button>
                    {qrisConfig.qrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...qrisConfig, qrisImageUrl: '' };
                          setQrisConfig(updated);
                          handleSavePaymentSettings(updated);
                        }}
                        className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Hapus Foto (Gunakan Barcode Generator)
                      </button>
                    )}
                  </div>
                </div>

                {/* Metode 2: Input String Payload QRIS */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-700" />
                    Cara 2: Masukkan Kode String / Payload QRIS (EMVCo)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Masukkan kode teks QRIS (diawali format <code>000201010211...</code>) atau link gambar:
                  </p>
                  <textarea
                    rows={3}
                    value={qrisConfig.qrisPayloadString || ''}
                    onChange={(e) => setQrisConfig({ ...qrisConfig, qrisPayloadString: e.target.value })}
                    placeholder="00020101021126590014ID.GO.QRIS..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[11px] font-mono text-slate-900 focus:outline-rose-600"
                  />
                </div>

                {/* Petunjuk Penggunaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Petunjuk / Deskripsi Pembayaran untuk Warga
                  </label>
                  <textarea
                    rows={2}
                    value={qrisConfig.instructions || ''}
                    onChange={(e) => setQrisConfig({ ...qrisConfig, instructions: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-rose-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSavePaymentSettings()}
                  disabled={isProcessing}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan QRIS</span>
                </button>
              </div>

              {/* Right: Real-time QR Preview */}
              <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Pratinjau Tampilan QRIS Warga
                </span>

                <div className="bg-white p-5 rounded-2xl border-2 border-rose-600 shadow-md text-center max-w-xs w-full">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-md mb-2">
                    <span>QRIS</span>
                  </div>
                  <div className="font-black text-sm text-slate-900">{qrisConfig.qrisName}</div>
                  <div className="text-[10px] text-slate-500 font-mono mb-2">
                    NMID: {qrisConfig.qrisNmid || 'ID1024356789012'}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-300 flex items-center justify-center my-2">
                    {qrisConfig.qrisImageUrl ? (
                      <img 
                        src={qrisConfig.qrisImageUrl} 
                        alt="Preview QRIS" 
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    ) : (
                      <QRCodeSVG
                        value={qrisConfig.qrisPayloadString || `https://qris.id/pay?nmid=${qrisConfig.qrisNmid || 'ID1024356789012'}`}
                        size={180}
                        level="H"
                        includeMargin={true}
                      />
                    )}
                  </div>

                  <div className="text-[10px] text-slate-600 font-medium">
                    BCA • BRI • Mandiri • BSI • DANA • GoPay • OVO
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PANDUAN LENGKAP: BAGAIMANA CARA MEMASUKAN KODE QRIS KE APLIKASI INI */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl p-5 sm:p-6 border border-amber-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-base sm:text-lg text-amber-950">
                  Panduan: Cara Memasukkan Kode QRIS ke Aplikasi Ini
                </h4>
                <p className="text-xs text-amber-800">
                  Langkah praktis untuk pengurus / bendahara agar warga bisa langsung scan bayar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Step 1 */}
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    Dapatkan Kode QRIS
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Buat atau minta QRIS resmi dari salah satu penyedia berikut:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                  <li><strong>Bank BRI</strong> (Merchant QRIS BRImo)</li>
                  <li><strong>Bank BCA</strong> (Merchant QRIS BCA)</li>
                  <li><strong>DANA Bisnis</strong> (QRIS Instan di aplikasi DANA)</li>
                  <li><strong>GoPay Usaha / Merchant</strong> (Gojek)</li>
                  <li><strong>QRIS.id</strong> atau BSI Hasanah Merchant</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    Pilih Cara Memasukkan
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Ada 2 pilihan cara yang sangat mudah:
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-rose-950">
                    <strong>Paling Mudah:</strong> Simpan foto/screenshot barcode QRIS dari HP Anda, lalu klik tombol <strong>"Pilih Foto QRIS dari Perangkat"</strong> di atas.
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                    <strong>Alternatif:</strong> Ketik kode NMID dan teks string payload QRIS pada kotak yang tersedia.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    Klik Simpan & Selesai!
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Klik tombol <strong>"Simpan Perubahan QRIS"</strong>.
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Secara otomatis, seluruh warga yang membuka aplikasi di HP mereka akan melihat kode QRIS ini, siap di-scan dari aplikasi m-banking atau e-wallet apa saja di seluruh Indonesia!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom Foto Bukti Struk */}
      {selectedProofImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedProofImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-4 overflow-hidden relative shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-black text-sm text-slate-900">Foto Bukti Transfer Warga</span>
              <button
                type="button"
                onClick={() => setSelectedProofImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-slate-100 rounded-xl p-2">
              <img
                src={selectedProofImage}
                alt="Bukti Transfer"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setSelectedProofImage(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alasan Tolak Transfer */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setRejectingId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 relative shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-black text-sm text-rose-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Alasan Penolakan Transfer
              </span>
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tulis Alasan Penolakan (Akan Terlihat oleh Warga):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-rose-600"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirmation}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Konfirmasi Tolak Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data Transfer */}
      {deletingConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeletingConfirmation(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl space-y-4 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Hapus Pengajuan Transfer?
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Tindakan ini akan menghapus data pengajuan secara permanen
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingConfirmation(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengirim/Warga:</span>
                <span className="font-bold text-slate-900">{deletingConfirmation.citizenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-black text-rose-800">Rp {deletingConfirmation.nominal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-semibold text-slate-800">
                  {deletingConfirmation.tipePembayaran === 'iuran_pekanan'
                    ? `Iuran Pekanan (${deletingConfirmation.mingguKe && deletingConfirmation.mingguKe.length > 0 ? deletingConfirmation.mingguKe.map(w => `P${w}`).join(', ') : '-'})`
                    : 'Donasi Sukarela / Infaq'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-semibold uppercase text-slate-800">{deletingConfirmation.metode}</span>
              </div>
              {deletingConfirmation.nomorWa && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nomor WhatsApp:</span>
                  <a
                    href={getWhatsAppUrl(deletingConfirmation, currentUser?.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-rose-800 underline hover:text-rose-950 flex items-center gap-1"
                    title="Buka WhatsApp dengan pesan otomatis untuk warga ini"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{deletingConfirmation.nomorWa}</span>
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status Saat Ini:</span>
                <span className={`font-bold uppercase ${
                  deletingConfirmation.status === 'verified'
                    ? 'text-rose-700'
                    : deletingConfirmation.status === 'rejected'
                    ? 'text-rose-700'
                    : 'text-amber-700'
                }`}>
                  {deletingConfirmation.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingConfirmation(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteConfirmation(deletingConfirmation.id)}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Data Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data Rekening Bank */}
      {deletingBank && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeletingBank(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl space-y-4 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Hapus Rekening Bank?
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Rekening ini tidak akan ditampilkan lagi ke warga
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingBank(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Bank:</span>
                <span className="font-bold text-slate-900">{deletingBank.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Rekening:</span>
                <span className="font-mono font-bold text-rose-800">{deletingBank.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atas Nama:</span>
                <span className="font-semibold text-slate-800">{deletingBank.accountHolder}</span>
              </div>
              {deletingBank.catatan && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Catatan:</span>
                  <span className="text-slate-700 italic">{deletingBank.catatan}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingBank(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteBank(deletingBank.id)}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Rekening</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data E-Wallet */}
      {deletingWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeletingWallet(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl space-y-4 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Hapus Akun E-Wallet?
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Akun dompet digital ini tidak akan ditampilkan lagi ke warga
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingWallet(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Dompet Digital:</span>
                <span className="font-bold text-slate-900">{deletingWallet.walletName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor HP / Akun:</span>
                <span className="font-mono font-bold text-teal-800">{deletingWallet.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atas Nama:</span>
                <span className="font-semibold text-slate-800">{deletingWallet.accountHolder}</span>
              </div>
              {deletingWallet.catatan && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Catatan:</span>
                  <span className="text-slate-700 italic">{deletingWallet.catatan}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingWallet(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteWallet(deletingWallet.id)}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus E-Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
