import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, QrCode, Smartphone, Building2, Copy, Check, 
  Upload, CheckCircle2, Clock, XCircle, AlertCircle, FileText, 
  Download, HelpCircle, ArrowRight, ShieldCheck, ChevronRight, 
  RefreshCw, Eye, Sparkles, Send, Info, Wallet, Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentSettings, TransferConfirmation, Citizen, UserAccount } from '../types';

interface PaymentViewProps {
  paymentSettings?: PaymentSettings;
  citizens: Citizen[];
  transferConfirmations?: TransferConfirmation[];
  currentUser?: UserAccount | null;
  onRefresh?: () => void;
  onOpenAdminManager?: () => void;
  isModal?: boolean;
  preselectedCitizenId?: string;
  initialTab?: 'bank' | 'ewallet' | 'qris' | 'konfirmasi' | 'riwayat';
  activeWeek?: number;
}

export default function PaymentView({
  paymentSettings,
  citizens,
  transferConfirmations = [],
  currentUser,
  onRefresh,
  onOpenAdminManager,
  isModal = false,
  preselectedCitizenId,
  initialTab,
  activeWeek = 2
}: PaymentViewProps) {
  const [activeTab, setActiveTab] = useState<'bank' | 'ewallet' | 'qris' | 'konfirmasi' | 'riwayat'>(initialTab || 'qris');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State Konfirmasi
  const [selectedCitizenId, setSelectedCitizenId] = useState<string>(preselectedCitizenId || '');
  const [customDonorName, setCustomDonorName] = useState<string>('');
  const [tipePembayaran, setTipePembayaran] = useState<'iuran_pekanan' | 'donasi_sukarela'>('iuran_pekanan');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([activeWeek]);
  const [nominal, setNominal] = useState<string>('20000');
  const [metode, setMetode] = useState<'bank_transfer' | 'ewallet' | 'qris'>('qris');
  const [tujuanNama, setTujuanNama] = useState<string>('QRIS PHBI Kp. Kedung Sapi');
  const [pengirimNama, setPengirimNama] = useState<string>('');
  const [pengirimBankAtauWallet, setPengirimBankAtauWallet] = useState<string>('');
  const [nomorWa, setNomorWa] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [buktiImage, setBuktiImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete modal state
  const [deletingConfirmation, setDeletingConfirmation] = useState<TransferConfirmation | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrisContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!selectedCitizenId) {
      setSelectedWeeks([activeWeek]);
      setNominal('20000');
    }
  }, [activeWeek, selectedCitizenId]);

  useEffect(() => {
    if (preselectedCitizenId) {
      setSelectedCitizenId(preselectedCitizenId);
      const c = citizens.find(item => item.id === preselectedCitizenId);
      if (c) {
        setPengirimNama(c.name);
        setTipePembayaran('iuran_pekanan');
        if (!c.weeks[activeWeek] || c.weeks[activeWeek] === 0) {
          setSelectedWeeks([activeWeek]);
          setNominal('20000');
        }
      }
    }
  }, [preselectedCitizenId, citizens, activeWeek]);

  // Data default jika belum ada di database
  const banks = paymentSettings?.bankAccounts || [
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
      accountHolder: 'Panitia Maulid Nabi Kp Kedung Sapi',
      catatan: 'Bank Syariah Indonesia (Kode: 451) / Rekening Panitia'
    }
  ];

  const eWallets = paymentSettings?.eWallets || [
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
  ];

  const qris = paymentSettings?.qris || {
    qrisName: "PHBI MAULID NABI KP. KEDUNG SAPI",
    qrisNmid: 'ID1024356789012',
    qrisImageUrl: '',
    qrisPayloadString: '00020101021126590014ID.GO.QRIS.WWW01189360099900000000000209ID10243567890120303UMI51440014ID.CO.QRIS.WWW02150000000000000000303UMI5204541153033605802ID5932PHBI MAULID NABI KP KEDUNG SAPI6007SERANG61054217762070703A0163041A2B',
    instructions: 'Scan QRIS ini menggunakan m-Banking (BCA, BRImo, Livin Mandiri, BSI, BNI, Jago, dll) atau E-Wallet (DANA, GoPay, OVO, ShopeePay, LinkAja).'
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Toggle selection week for iuran
  const handleToggleWeek = (w: number) => {
    if (selectedWeeks.includes(w)) {
      if (selectedWeeks.length > 1) {
        const next = selectedWeeks.filter(item => item !== w);
        setSelectedWeeks(next);
        setNominal(String(next.length * 20000));
      }
    } else {
      const next = [...selectedWeeks, w].sort((a, b) => a - b);
      setSelectedWeeks(next);
      setNominal(String(next.length * 20000));
    }
  };

  // Image Upload Handler (convert to Data URL)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran file foto bukti maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBuktiImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Download QRIS Image
  const handleDownloadQRIS = () => {
    if (qris.qrisImageUrl) {
      const link = document.createElement('a');
      link.href = qris.qrisImageUrl;
      link.download = `QRIS_PHBI_Maulid_Nabi_Kp_Kedung_Sapi.png`;
      link.click();
    } else {
      // Create canvas from SVG QR
      const svg = document.getElementById('qris-svg-element');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 600;
        canvas.height = 750;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Header text
          ctx.fillStyle = '#064e3b';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('QRIS STANDAR PEMBAYARAN NASIONAL', 300, 45);
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText(qris.qrisName, 300, 80);
          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(`NMID: ${qris.qrisNmid || 'ID1024356789012'} | Kp. Kedung Sapi`, 300, 105);
          
          // Draw QR
          ctx.drawImage(img, 75, 140, 450, 450);

          // Footer
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('BCA • BRI • Mandiri • BSI • BNI • DANA • OVO • GoPay • ShopeePay', 300, 640);
          ctx.fillStyle = '#64748b';
          ctx.font = '12px sans-serif';
          ctx.fillText('Dicetak resmi oleh Panitia PHBI Maulid Nabi 1448 H / 2027 M', 300, 680);

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `QRIS_PHBI_Maulid_Nabi_Kp_Kedung_Sapi.png`;
          downloadLink.click();
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  // Submit Konfirmasi
  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    let citizenName = customDonorName.trim();
    if (selectedCitizenId) {
      const found = citizens.find(c => c.id === selectedCitizenId);
      if (found) citizenName = found.name;
    }

    if (!citizenName) {
      setSubmitMessage({ type: 'error', text: 'Silakan pilih nama warga atau masukkan nama donatur' });
      setIsSubmitting(false);
      return;
    }

    const cleanedWa = nomorWa.trim();
    if (!cleanedWa) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Nomor WhatsApp yang aktif wajib diisi! Anda tidak dapat mengirim bukti transfer jika nomor WhatsApp kosong.' 
      });
      setIsSubmitting(false);
      return;
    }

    const digitsOnly = cleanedWa.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Format nomor WhatsApp tidak valid. Masukkan nomor WhatsApp yang benar (minimal 8 angka).' 
      });
      setIsSubmitting(false);
      return;
    }

    const num = parseInt(nominal, 10);
    if (isNaN(num) || num <= 0) {
      setSubmitMessage({ type: 'error', text: 'Nominal transfer tidak valid' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/transfer-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: selectedCitizenId || undefined,
          citizenName,
          nomorWa: cleanedWa,
          tipePembayaran,
          mingguKe: tipePembayaran === 'iuran_pekanan' ? selectedWeeks : [],
          metode,
          tujuanNama,
          pengirimNama: pengirimNama || citizenName,
          pengirimBankAtauWallet,
          nominal: num,
          buktiUrl: buktiImage || undefined,
          catatan
        })
      });

      if (res.ok) {
        setSubmitMessage({
          type: 'success',
          text: 'Alhamdulillah, konfirmasi transfer Anda berhasil dikirim! Bendahara akan memverifikasi mutasi dan saldo kas akan terupdate otomatis.'
        });
        // Reset form
        setBuktiImage(null);
        setCatatan('');
        setPengirimNama('');
        setPengirimBankAtauWallet('');
        setNomorWa('');
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setActiveTab('riwayat');
        }, 1500);
      } else {
        const err = await res.json();
        setSubmitMessage({ type: 'error', text: err.error || 'Gagal mengirim konfirmasi transfer' });
      }
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: 'Gagal terhubung ke server: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Confirmation Handler
  const executeDeleteConfirmation = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transfer-confirmations/${id}?deletedBy=${encodeURIComponent(currentUser?.name || 'Pengguna')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeletingConfirmation(null);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBendaharaOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'bendahara';
  const pendingCount = transferConfirmations.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Banner Information */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-800/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              <Sparkles className="w-3 h-3 text-slate-950" />
              Sistem Pembayaran Resmi Non-Tunai
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-300 flex-shrink-0" />
              Transfer Bank, E-Wallet & QRIS PHBI
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
              Iuran Pekanan & Donasi Peringatan Maulid Nabi 1448 H / 2027 M Kp. Kedung Sapi
            </p>
          </div>

          {/* If Bendahara or Admin, provide shortcut to Admin Verification Panel */}
          {isBendaharaOrAdmin && onOpenAdminManager && (
            <button
              type="button"
              onClick={onOpenAdminManager}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Kelola Akun & Verifikasi ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('qris')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'qris'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QRIS Nasional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Transfer Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ewallet')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'ewallet'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Dompet Digital</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('konfirmasi')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'konfirmasi'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Kirim Bukti Transfer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'riwayat'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Konfirmasi</span>
          {pendingCount > 0 && isBendaharaOrAdmin && (
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2"></span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QRIS NASIONAL */}
      {/* ========================================================================= */}
      {activeTab === 'qris' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* QR Card Container */}
            <div 
              ref={qrisContainerRef}
              className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border-2 border-emerald-600 shadow-md text-center flex-shrink-0 w-full md:w-80 flex flex-col items-center relative"
            >
              {/* Badge QRIS */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-black text-[11px] rounded-lg mb-2 shadow-xs tracking-wider">
                <span>QRIS</span>
                <span className="text-[9px] font-normal opacity-90">| ASPI & BI</span>
              </div>

              <div className="text-sm font-black text-slate-900 leading-tight">
                {qris.qrisName}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                NMID: {qris.qrisNmid || 'ID1024356789012'}
              </div>

              {/* QR Image / Generated QR */}
              <div className="p-3 bg-white rounded-xl border border-slate-300 shadow-inner my-3 flex items-center justify-center">
                {qris.qrisImageUrl ? (
                  <img 
                    src={qris.qrisImageUrl} 
                    alt="QRIS PHBI Maulid Nabi" 
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                ) : (
                  <QRCodeSVG
                    id="qris-svg-element"
                    value={qris.qrisPayloadString || `https://qris.id/pay?nmid=${qris.qrisNmid || 'ID1024356789012'}&merchant=${encodeURIComponent(qris.qrisName)}`}
                    size={220}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </div>

              <div className="text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1">
                <span>M-Banking</span>
                <span>•</span>
                <span>E-Wallet</span>
                <span>•</span>
                <span>Semua Aplikasi</span>
              </div>

              {/* Download QR Button */}
              <button
                type="button"
                onClick={handleDownloadQRIS}
                className="mt-3 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar QRIS (PNG)</span>
              </button>
            </div>

            {/* Instructions & Features */}
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Cara Bayar Praktis dengan Scan QRIS
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Cukup satu kode QRIS untuk semua aplikasi perbankan dan dompet digital tanpa perlu repot mengetik nomor rekening!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Buka Aplikasi Anda</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Buka BCA Mobile, BRImo, Livin Mandiri, BSI Mobile, DANA, GoPay, OVO, atau ShopeePay.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Pilih Menu 'Scan / QRIS'</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Arahkan kamera ke kode QRIS di samping atau upload gambar QRIS yang telah diunduh.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Masukkan Nominal Iuran</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Ketik jumlah transfer (misal Rp 20.000 untuk 1 pekan, Rp 40.000 untuk 2 pekan, dll).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">4</span>
                    <span>Kirim Bukti Pembayaran</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Screenshot bukti berhasil lalu klik tab <strong>'Kirim Bukti Transfer'</strong> untuk verifikasi instan.
                  </p>
                </div>
              </div>

              {/* Action Button: Langsung ke Tab Konfirmasi */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMetode('qris');
                    setTujuanNama('QRIS ' + qris.qrisName);
                    setActiveTab('konfirmasi');
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Sudah Scan? Kirim Bukti Pembayaran Sekarang</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRANSFER BANK */}
      {/* ========================================================================= */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-700" />
              Daftar Rekening Bank Resmi Panitia PHBI
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Silakan transfer ke salah satu rekening resmi berikut melalui ATM, Mobile Banking, atau Internet Banking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {banks.map((b) => {
              const isCopied = copiedId === b.id;
              return (
                <div
                  key={b.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 mb-2">
                      <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>{b.bankName}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Nomor Rekening
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                          {b.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(b.accountNumber.replace(/[^0-9]/g, ''), b.id)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Salin Nomor Rekening"
                        >
                          {isCopied ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Salin!
                            </span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Atas Nama (Penerima)
                      </span>
                      <span className="font-black text-slate-900 block">
                        {b.accountHolder}
                      </span>
                    </div>

                    {b.catatan && (
                      <p className="text-[11px] text-slate-500 mt-2 bg-white/70 p-2 rounded-lg border border-slate-100">
                        {b.catatan}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMetode('bank_transfer');
                      setTujuanNama(`${b.bankName} - ${b.accountHolder}`);
                      setActiveTab('konfirmasi');
                    }}
                    className="mt-4 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Kirim Bukti Transfer Bank Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOMPET DIGITAL (E-WALLET) */}
      {/* ========================================================================= */}
      {activeTab === 'ewallet' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-teal-700" />
              Daftar Akun Dompet Digital Resmi (DANA, GoPay, OVO)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Bisa transfer antar pengguna aplikasi tanpa biaya admin ke nomor resmi bendahara.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {eWallets.map((w) => {
              const isCopied = copiedId === w.id;
              return (
                <div
                  key={w.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-teal-500 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 mb-2">
                      <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-teal-600" />
                        <span>{w.walletName}</span>
                      </span>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Nomor Akun / HP
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                          {w.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(w.accountNumber.replace(/[^0-9]/g, ''), w.id)}
                          className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Salin Nomor HP"
                        >
                          {isCopied ? (
                            <span className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Salin!
                            </span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Atas Nama
                      </span>
                      <span className="font-black text-slate-900 block">
                        {w.accountHolder}
                      </span>
                    </div>

                    {w.catatan && (
                      <p className="text-[11px] text-slate-500 mt-2 bg-white/70 p-2 rounded-lg border border-slate-100">
                        {w.catatan}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMetode('ewallet');
                      setTujuanNama(`${w.walletName} - ${w.accountHolder}`);
                      setActiveTab('konfirmasi');
                    }}
                    className="mt-4 w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Kirim Bukti Transfer E-Wallet Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FORM KIRIM BUKTI TRANSFER */}
      {/* ========================================================================= */}
      {activeTab === 'konfirmasi' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Formulir Konfirmasi Bukti Pembayaran Transfer
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Isi data di bawah ini dan lampirkan bukti struk/screenshot transfer Anda agar bendahara segera mencatatnya ke kas.
            </p>
          </div>

          {submitMessage && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
                submitMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              }`}
            >
              {submitMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <span>{submitMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitConfirmation} className="space-y-4">
            {/* 1. Tipe Pembayaran */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipePembayaran('iuran_pekanan')}
                className={`p-3 rounded-xl border-2 text-left font-bold text-xs flex flex-col justify-between transition-all cursor-pointer ${
                  tipePembayaran === 'iuran_pekanan'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-[10px] text-emerald-700 uppercase font-black">Kategori 1</span>
                <span className="text-sm font-black mt-0.5">Iuran Wajib Pekanan (12 Pekan)</span>
                <span className="text-[11px] text-slate-500 mt-1 font-normal">Rp 20.000 / pekan per warga</span>
              </button>

              <button
                type="button"
                onClick={() => setTipePembayaran('donasi_sukarela')}
                className={`p-3 rounded-xl border-2 text-left font-bold text-xs flex flex-col justify-between transition-all cursor-pointer ${
                  tipePembayaran === 'donasi_sukarela'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-200'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-[10px] text-amber-700 uppercase font-black">Kategori 2</span>
                <span className="text-sm font-black mt-0.5">Donasi Sukarela / Infaq</span>
                <span className="text-[11px] text-slate-500 mt-1 font-normal">Bebas nominal tanpa batasan</span>
              </button>
            </div>

            {/* 2. Pilih Nama Warga atau Donatur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tipePembayaran === 'iuran_pekanan' ? (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Nama Warga Terdaftar <span className="text-emerald-500">*</span>
                  </label>
                  <select
                    value={selectedCitizenId}
                    onChange={(e) => {
                      setSelectedCitizenId(e.target.value);
                      const c = citizens.find(item => item.id === e.target.value);
                      if (c) {
                        setPengirimNama(c.name);
                        // Auto direct to activeWeek if unpaid, otherwise first unpaid week
                        if (!c.weeks[activeWeek] || c.weeks[activeWeek] === 0) {
                          setSelectedWeeks([activeWeek]);
                          setNominal('20000');
                        } else {
                          const unpaidWeeks = [];
                          for (let w = 1; w <= 12; w++) {
                            if (!c.weeks[w] || c.weeks[w] === 0) unpaidWeeks.push(w);
                          }
                          if (unpaidWeeks.length > 0) {
                            setSelectedWeeks([unpaidWeeks[0]]);
                            setNominal('20000');
                          }
                        }
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                    required
                  >
                    <option value="">-- Pilih Nama Warga Kp. Kedung Sapi --</option>
                    {[...citizens]
                      .sort((a, b) =>
                        a.name.trim().replace(/\s+/g, ' ').localeCompare(
                          b.name.trim().replace(/\s+/g, ' '),
                          'id',
                          { sensitivity: 'base', numeric: true }
                        )
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isNgontrak ? '(Ngontrak)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Donatur / Hamba Allah <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customDonorName}
                    onChange={(e) => {
                      setCustomDonorName(e.target.value);
                      setPengirimNama(e.target.value);
                    }}
                    placeholder="Contoh: Bpk. H. Ahmad / Hamba Allah"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                    required
                  />
                </div>
              )}
            </div>

            {/* 3. Pilihan Pekan (Khusus Iuran Pekanan) */}
            {tipePembayaran === 'iuran_pekanan' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Pilih Pekan Iuran yang Dibayarkan ({selectedWeeks.length} Pekan Terpilih):
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                      Otomatis Minggu Ini: P{activeWeek}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-800">
                    Total: Rp {(selectedWeeks.length * 20000).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                    const isSelected = selectedWeeks.includes(w);
                    const isCurrentActive = w === activeWeek;
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => handleToggleWeek(w)}
                        className={`py-2 text-center rounded-lg text-xs font-black border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                            : isCurrentActive
                            ? 'bg-amber-50 text-amber-900 border-amber-400 hover:border-emerald-500'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                        }`}
                      >
                        <div>P{w}</div>
                        {isCurrentActive && (
                          <div className={`text-[8px] font-bold leading-none mt-0.5 ${isSelected ? 'text-amber-300' : 'text-amber-700'}`}>
                            AKTIF
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Nominal & Metode Pembayaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Transfer (Rp) <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="number"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  placeholder="20000"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metode Pembayaran yang Digunakan
                </label>
                <select
                  value={metode}
                  onChange={(e) => {
                    const m = e.target.value as any;
                    setMetode(m);
                    if (m === 'qris') setTujuanNama('QRIS ' + qris.qrisName);
                    else if (m === 'bank_transfer' && banks.length > 0) setTujuanNama(banks[0].bankName + ' - ' + banks[0].accountHolder);
                    else if (m === 'ewallet' && eWallets.length > 0) setTujuanNama(eWallets[0].walletName + ' - ' + eWallets[0].accountHolder);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                >
                  <option value="qris">📲 QRIS Nasional (Scan QR)</option>
                  <option value="bank_transfer">💳 Transfer Bank (BCA / BRI / BSI)</option>
                  <option value="ewallet">📱 Dompet Digital (DANA / GoPay / OVO)</option>
                </select>
              </div>
            </div>

            {/* 5. Nama Pengirim & Bank/Wallet Pengirim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Rekening / Akun Pengirim
                </label>
                <input
                  type="text"
                  value={pengirimNama}
                  onChange={(e) => setPengirimNama(e.target.value)}
                  placeholder="Nama pemilik rekening yang mentransfer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank / E-Wallet Asal Pengirim
                </label>
                <input
                  type="text"
                  value={pengirimBankAtauWallet}
                  onChange={(e) => setPengirimBankAtauWallet(e.target.value)}
                  placeholder="Contoh: BCA / BRImo / DANA / Mandiri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* 6. Upload Foto Bukti Struk Transfer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Upload Foto / Tangkapan Layar Bukti Transfer (Opsional tapi Disarankan)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{buktiImage ? 'Ganti Foto Bukti' : 'Pilih Foto Struk / Screenshot'}</span>
                </button>

                {buktiImage && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={buktiImage} 
                      alt="Preview Bukti" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setBuktiImage(null)}
                      className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Nomor WhatsApp Aktif (Wajib Diisi) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor WhatsApp yang Aktif <span className="text-emerald-500 font-extrabold">* (Wajib Diisi)</span>
              </label>
              <input
                type="tel"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                placeholder="Contoh: 081234567890 / 0857xxxxxxxx"
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-emerald-600 focus:border-emerald-600 ${
                  !nomorWa.trim() && submitMessage?.type === 'error' ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-300' : 'border-slate-300'
                }`}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Kolom ini wajib diisi agar panitia/bendahara dapat mengonfirmasi atau menghubungi Anda terkait bukti transfer ini.
              </p>
            </div>

            {/* 8. Catatan Tambahan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Keterangan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Iuran pekan 1 & 2 untuk Sahroji"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-emerald-600 focus:border-emerald-600"
              />
            </div>

            {/* Tombol Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !nomorWa.trim()}
                className={`w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                  isSubmitting || !nomorWa.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-emerald-700 hover:to-teal-800 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Mengirim Konfirmasi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Konfirmasi Pembayaran Sekarang</span>
                  </>
                )}
              </button>
              {!nomorWa.trim() && (
                <p className="text-[11px] text-emerald-500 text-center font-semibold mt-1.5">
                  * Isi nomor WhatsApp yang aktif di atas agar tombol kirim dapat ditekan.
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RIWAYAT KONFIRMASI PEMBAYARAN */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat' && (() => {
        // Filter: Hanya tampilkan status Disetujui (verified) dan Ditolak (rejected) untuk warga
        const displayedConfirmations = isBendaharaOrAdmin
          ? transferConfirmations
          : transferConfirmations.filter(item => item.status === 'verified' || item.status === 'rejected');

        return (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-700" />
                  Riwayat Konfirmasi Pembayaran
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  {isBendaharaOrAdmin 
                    ? 'Status verifikasi transfer bank, dompet digital, dan QRIS oleh bendahara.' 
                    : 'Daftar pengajuan konfirmasi transfer warga yang telah disetujui atau ditolak oleh bendahara.'}
                </p>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Muat Ulang Riwayat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {displayedConfirmations.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-bold text-slate-700">Belum ada data konfirmasi transfer</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBendaharaOrAdmin
                    ? 'Belum ada pengajuan konfirmasi transfer dari warga.'
                    : 'Belum ada riwayat konfirmasi transfer yang disetujui atau ditolak.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedConfirmations.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {item.citizenName || item.pengirimNama}
                        </span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {item.metode.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.tanggal}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                        {isBendaharaOrAdmin ? (
                          <span className="font-bold text-emerald-800 text-sm">
                            Rp {item.nominal.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-500 text-xs italic bg-slate-200/70 px-2 py-0.5 rounded">
                            Nominal Dirahasiakan
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {item.tipePembayaran === 'iuran_pekanan' 
                            ? `Iuran Pekan: ${item.mingguKe && item.mingguKe.length > 0 ? item.mingguKe.map(w => `P${w}`).join(', ') : '-'}`
                            : 'Donasi Sukarela / Infaq'}
                        </span>
                      </div>

                      {item.catatan && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{item.catatan}"
                        </p>
                      )}

                      {item.status === 'rejected' && item.rejectReason && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Alasan penolakan: {item.rejectReason}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.buktiUrl && isBendaharaOrAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open('');
                            w?.document.write(`<img src="${item.buktiUrl}" style="max-width:100%; height:auto;" />`);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 cursor-pointer"
                          title="Lihat Bukti Foto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {item.status === 'pending' && isBendaharaOrAdmin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          Menunggu Verifikasi
                        </span>
                      )}

                      {item.status === 'verified' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Disetujui
                        </span>
                      )}

                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <XCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Ditolak
                        </span>
                      )}

                      {isBendaharaOrAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeletingConfirmation(item)}
                          className="p-1.5 text-emerald-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 cursor-pointer transition-colors"
                          title="Hapus Catatan Transfer Ini"
                        >
                          <Trash2 className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* In-App Delete Confirmation Modal */}
      {deletingConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeletingConfirmation(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl space-y-4 border border-emerald-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Trash2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Hapus Data Transfer?
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
                <span className="font-black text-emerald-800">Rp {deletingConfirmation.nominal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-semibold text-slate-800">
                  {deletingConfirmation.tipePembayaran === 'iuran_pekanan' ? 'Iuran Pekanan' : 'Donasi Sukarela'}
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
                disabled={isDeleting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
