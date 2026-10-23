import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileDown, 
  HeartHandshake, 
  Calendar, 
  ShieldCheck, 
  Info,
  Sparkles,
  Receipt,
  Calculator,
  Target,
  AlertCircle,
  PhoneCall,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import { Citizen, DonasiWargaPayment, DonasiSukarela, Pengeluaran, UserAccount, CommitteeSettings, PaymentSettings, TransferConfirmation, ProposalData, PeriodArchive } from '../types';
import { formatRupiah, getCurrentIndonesianTime, getShortDate } from '../utils/formatters';
import StrukturPanitiaCard from './StrukturPanitiaCard';


interface DashboardWargaProps {
  currentUser: UserAccount;
  citizens: Citizen[];
  wargaPayments: DonasiWargaPayment[];
  sukarelaPayments: DonasiSukarela[];
  pengeluaranList: Pengeluaran[];
  targetPerPerson: number;
  committeeSettings?: CommitteeSettings;
  paymentSettings?: PaymentSettings;
  transferConfirmations?: TransferConfirmation[];
  proposalData?: ProposalData;
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
  onRefresh?: () => void;
}

export default function DashboardWarga({
  currentUser,
  citizens,
  wargaPayments,
  sukarelaPayments,
  pengeluaranList,
  targetPerPerson,
  committeeSettings,
  paymentSettings,
  transferConfirmations = [],
  proposalData,
  activePeriodLabel = '1448 H / 2027 M',
  periodArchives = [],
  onRefresh = () => {}
}: DashboardWargaProps) {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'target_warga' | 'uang_masuk' | 'uang_keluar' | 'struktur'>('ringkasan');
  const [realtimeClock, setRealtimeClock] = useState(getCurrentIndonesianTime());


  // Search state for pengeluaran
  const [pengeluaranSearch, setPengeluaranSearch] = useState('');

  // Search state for sukarela
  const [sukarelaSearch, setSukarelaSearch] = useState('');

  // Keep live time ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeClock(getCurrentIndonesianTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Financial calculations (excluding payments marked excludedFromTotal)
  const totalWarga = useMemo(() => {
    return wargaPayments.reduce((sum, p) => sum + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)), 0);
  }, [wargaPayments]);

  const totalSukarela = useMemo(() => {
    return sukarelaPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [sukarelaPayments]);

  const totalMasuk = totalWarga + totalSukarela;

  const totalKeluar = useMemo(() => {
    return pengeluaranList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [pengeluaranList]);

  const sisaSaldo = totalMasuk - totalKeluar;

  // Pisahkan warga utama (ngontrak tidak disatukan ke jumlah warga, selalu urut A-Z)
  const wargaUtama = useMemo(() => {
    return [...citizens]
      .filter(c => !c.isNgontrak)
      .sort((a, b) =>
        a.name.trim().replace(/\s+/g, ' ').localeCompare(
          b.name.trim().replace(/\s+/g, ' '),
          'id',
          { sensitivity: 'base', numeric: true }
        )
      );
  }, [citizens]);

  // Target perorangan x jumlah warga utama calculations
  const totalTargetWarga = useMemo(() => {
    return (wargaUtama.length || 0) * (targetPerPerson || 0);
  }, [wargaUtama.length, targetPerPerson]);

  const persentaseTargetExact = useMemo(() => {
    if (totalTargetWarga <= 0) return '0';
    return ((totalWarga / totalTargetWarga) * 100).toFixed(1);
  }, [totalWarga, totalTargetWarga]);

  const persentaseTargetBar = useMemo(() => {
    if (totalTargetWarga <= 0) return 0;
    return Math.min(100, Math.round((totalWarga / totalTargetWarga) * 100));
  }, [totalWarga, totalTargetWarga]);

  const sisaKekuranganWarga = useMemo(() => {
    return Math.max(0, totalTargetWarga - totalWarga);
  }, [totalTargetWarga, totalWarga]);

  const wargaLunasCount = useMemo(() => {
    return wargaUtama.filter(c => (Number(c.totalPaid) || 0) >= targetPerPerson).length;
  }, [wargaUtama, targetPerPerson]);

  const wargaMencicilCount = useMemo(() => {
    return wargaUtama.filter(c => {
      const paid = Number(c.totalPaid) || 0;
      return paid > 0 && paid < targetPerPerson;
    }).length;
  }, [wargaUtama, targetPerPerson]);

  const wargaBelumBayarCount = useMemo(() => {
    return wargaUtama.filter(c => !c.totalPaid || Number(c.totalPaid) === 0).length;
  }, [wargaUtama]);

  const targetPerMingguPerOrang = Math.round(targetPerPerson / 12);
  const targetPerMingguTotal = targetPerMingguPerOrang * wargaUtama.length;

  // Filtered lists
  const filteredPengeluaran = useMemo(() => {
    if (!pengeluaranSearch.trim()) return pengeluaranList;
    const q = pengeluaranSearch.toLowerCase().trim();
    return pengeluaranList.filter(
      p => p.description.toLowerCase().includes(q) || (p.recipient && p.recipient.toLowerCase().includes(q))
    );
  }, [pengeluaranList, pengeluaranSearch]);

  const filteredSukarela = useMemo(() => {
    if (!sukarelaSearch.trim()) return sukarelaPayments;
    const q = sukarelaSearch.toLowerCase().trim();
    return sukarelaPayments.filter(
      s => s.donorName.toLowerCase().includes(q) || (s.keterangan && s.keterangan.toLowerCase().includes(q))
    );
  }, [sukarelaPayments, sukarelaSearch]);

  return (
    <div className="space-y-5 pb-8">
      {/* 1. WELCOME BANNER FOR WARGA */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-emerald-700/40 relative overflow-hidden">
        {/* Background Islamic Accent Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Portal Transparansi Keuangan Warga Kp. Kedung Sapi</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Keterbukaan Dana Isra Miraj {activePeriodLabel}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Selamat datang di portal transparansi keuangan Panitia PHBI Isra Miraj Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten. 
              Seluruh warga dapat memantau uang masuk, uang keluar, dan sisa saldo kas panitia secara jujur, amanah, dan terverifikasi.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-emerald-200/90 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                Ketua Panitia: <strong>{committeeSettings?.ketuaPanitia || '—'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Wakil Ketua: <strong>{committeeSettings?.wakilKetua || '—'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-300" />
                <span className="font-mono">{realtimeClock}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Hotline Informasi & Pengaduan Warga */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl flex-shrink-0 shadow-xs">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-emerald-950">
                Layanan Informasi & Pengaduan Warga
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 text-emerald-900">
                WhatsApp Resmi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-800 mt-0.5">
              Apabila terdapat kesalahan pencatatan iuran atau ingin mengonfirmasi donasi, hubungi Panitia di <strong className="font-mono text-emerald-950">081414033436</strong>.
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/6281414033436?text=Assalamualaikum%20Panitia%20Isra%20Miraj%20Kp%20Kedung%20Sapi,%20saya%20warga%20ingin%20bertanya/menyampaikan%20pengaduan"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Hubungi via WhatsApp</span>
        </a>
      </div>

      {/* 2. TIGA KARTU UTAMA: UANG MASUK, UANG KELUAR & SISA SALDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KARTU 1: TOTAL UANG MASUK */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-emerald-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                1. Total Uang Masuk
              </span>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 mt-2">
                Rp {formatRupiah(totalMasuk)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Donasi Warga ({wargaUtama.length} Warga):
              </span>
              <span className="font-bold font-mono text-emerald-800">
                Rp {formatRupiah(totalWarga)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                Donasi Suka Rela / Dermawan:
              </span>
              <span className="font-bold font-mono text-amber-800">
                Rp {formatRupiah(totalSukarela)}
              </span>
            </div>
          </div>
        </div>

        {/* KARTU 2: TOTAL UANG KELUAR */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-emerald-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                2. Total Uang Keluar
              </span>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 mt-2">
                Rp {formatRupiah(totalKeluar)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                Belanja & Beban Acara:
              </span>
              <span className="font-bold font-mono text-emerald-800">
                {pengeluaranList.length} Transaksi
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                Dikelola oleh:
              </span>
              <span className="font-semibold text-slate-700">
                Alwi (Bendahara PHBI)
              </span>
            </div>
          </div>
        </div>

        {/* KARTU 3: SISA SALDO KAS BERSIH */}
        <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-emerald-900/90 px-2.5 py-1 rounded-full border border-amber-400/40">
                3. Sisa Saldo Kas Bersih
              </span>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-2">
                Rp {formatRupiah(sisaSaldo)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-800/80 space-y-1.5 text-xs text-emerald-200">
            <div className="flex items-center justify-between">
              <span>Status Saldo:</span>
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Kas Terjaga & Amanah
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-300/80 font-mono">
              <span>Rumus: Masuk - Keluar</span>
              <span>v1.0 Real-Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS FOR TRANSPARENCY DETAILS */}
      <div id="warga-tabs-container" className="bg-white rounded-2xl shadow-md border-2 border-slate-300 overflow-hidden relative z-10 scroll-mt-20">
        {/* Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 p-2 gap-2 bg-slate-100 border-b-2 border-slate-300">
          <button
            type="button"
            id="tab-warga-ringkasan"
            onClick={() => setActiveTab('ringkasan')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ringkasan'
                ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Ringkasan Kas</span>
          </button>

          <button
            type="button"
            id="tab-warga-target"
            onClick={() => setActiveTab('target_warga')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'target_warga'
                ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
            }`}
          >
            <Calculator className="w-4 h-4 text-amber-600" />
            <span>Target Iuran</span>
          </button>

          <button
            type="button"
            id="tab-warga-uang-masuk"
            onClick={() => setActiveTab('uang_masuk')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'uang_masuk'
                ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-teal-600" />
            <span>Rincian Masuk</span>
          </button>

          <button
            type="button"
            id="tab-warga-uang-keluar"
            onClick={() => setActiveTab('uang_keluar')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'uang_keluar'
                ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            <span>Rincian Keluar</span>
          </button>

          <button
            type="button"
            id="tab-warga-struktur"
            onClick={() => setActiveTab('struktur')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'struktur'
                ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Panitia</span>
          </button>
        </div>

        {/* TAB 1: RINGKASAN KAS & INFORMASI PANITIA */}
        {activeTab === 'ringkasan' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-6">
            {/* Visual Bar Comparison */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Perbandingan Arus Kas Panitia:</span>
                <span className="text-emerald-800">
                  Uang Masuk: Rp {formatRupiah(totalMasuk)} • Uang Keluar: Rp {formatRupiah(totalKeluar)}
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {totalMasuk > 0 && (
                  <>
                    <div
                      className="bg-emerald-600 h-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, ((totalMasuk - totalKeluar) / totalMasuk) * 100))}%` }}
                      title={`Sisa Saldo Kas: Rp ${formatRupiah(sisaSaldo)}`}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${Math.min(95, Math.max(5, (totalKeluar / totalMasuk) * 100))}%` }}
                      title={`Pengeluaran: Rp ${formatRupiah(totalKeluar)}`}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Sisa Saldo (Rp {formatRupiah(sisaSaldo)})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pengeluaran Kas (Rp {formatRupiah(totalKeluar)})
                </span>
              </div>
            </div>

            {/* Information Grid for Citizens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Pengurus Panitia</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Ketua Panitia: <strong>{committeeSettings?.ketuaPanitia || 'Sahroji'}</strong><br />
                  Wakil Ketua: <strong>{committeeSettings?.wakilKetua || 'Riki'}</strong><br />
                  Sekretaris: <strong>{committeeSettings?.sekretaris || 'Rama'}</strong><br />
                  Bendahara PHBI: <strong>{committeeSettings?.bendahara || 'Alwi'}</strong><br />
                  Petugas Usser: <strong>Pencatat Lapangan</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase mb-1">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Periode Iuran</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Iuran Warga dijadwalkan selama <strong>12 Minggu</strong> menuju Peringatan Isra Miraj Nabi Muhammad SAW 1448 H / 2027 M.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase mb-1">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>Akuntabilitas Publik</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Setiap transaksi uang masuk dan uang keluar tercatat real-time dan dapat diaudit kapan saja oleh seluruh warga.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TARGET PERORANGAN × JUMLAH WARGA TERCATAT */}
        {activeTab === 'target_warga' && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-6">
            {/* Header & Rumus Utama */}
            <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-emerald-600/40 shadow-md">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Target className="w-4 h-4 text-amber-300" />
                <span>Rumus Target Pendanaan Iuran Warga</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white">
                Perhitungan Target Perorangan × Jumlah Warga
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                Perkalian target yang ditetapkan panitia untuk setiap warga dengan total jumlah warga yang tercatat secara resmi di Kp Kedung Sapi.
              </p>

              {/* Formula Visual Box */}
              <div className="mt-5 p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs sm:text-sm font-bold">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-800/90 border border-emerald-400/40 text-amber-200">
                      Target Per Orang: Rp {formatRupiah(targetPerPerson)}
                    </span>
                    <span className="text-amber-300 text-base font-black">×</span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-800/90 border border-emerald-400/40 text-emerald-100">
                      Jumlah Warga: {wargaUtama.length} Orang
                    </span>
                    <span className="text-amber-300 text-base font-black">=</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] sm:text-xs text-emerald-200 uppercase font-semibold block">
                      Total Target Kas Warga
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                      Rp {formatRupiah(totalTargetWarga)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Kartu Breakdown Angka */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Target Perorangan */}
              <div className="p-4 bg-emerald-50/70 border-2 border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Target Perorangan</span>
                  <Target className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                  Rp {formatRupiah(targetPerPerson)}
                </p>
                <p className="text-[11px] text-emerald-700">
                  ~ Rp {formatRupiah(targetPerMingguPerOrang)} / minggu (12 mgg)
                </p>
              </div>

              {/* Card 2: Jumlah Warga Tercatat */}
              <div className="p-4 bg-teal-50/70 border-2 border-teal-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-teal-800">
                  <span>Jumlah Warga Tercatat</span>
                  <Users className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xl sm:text-2xl font-black font-mono text-teal-950">
                  {wargaUtama.length} Warga
                </p>
                <p className="text-[11px] text-teal-700">
                  Kp. Kedung Sapi
                </p>
              </div>

              {/* Card 3: Total Target Pemasukan */}
              <div className="p-4 bg-amber-50/70 border-2 border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Total Target Pemasukan</span>
                  <Calculator className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xl sm:text-2xl font-black font-mono text-amber-950">
                  Rp {formatRupiah(totalTargetWarga)}
                </p>
                <p className="text-[11px] text-amber-800 font-medium">
                  {wargaUtama.length} × Rp {formatRupiah(targetPerPerson)}
                </p>
              </div>

              {/* Card 4: Realisasi Terkumpul */}
              <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Realisasi Iuran Terkumpul</span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-800">
                  Rp {formatRupiah(totalWarga)}
                </p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Tercapai {persentaseTargetExact}% dari target
                </p>
              </div>
            </div>

            {/* Progress Bar & Kekurangan Dana */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm font-bold">
                <span className="text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  Progres Capaian Target Iuran Warga:
                </span>
                <span className="text-emerald-800 font-mono">
                  Rp {formatRupiah(totalWarga)} dari Rp {formatRupiah(totalTargetWarga)} ({persentaseTargetExact}%)
                </span>
              </div>

              {/* Bar */}
              <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden shadow-inner flex">
                <div
                  className="bg-emerald-600 h-full transition-all"
                  style={{ width: `${persentaseTargetBar}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sudah Terkumpul: Rp {formatRupiah(totalWarga)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-emerald-600" />
                  <span>Sisa Kekurangan Menuju Target: Rp {formatRupiah(sisaKekuranganWarga)}</span>
                </div>
              </div>
            </div>

            {/* Status Capaian Warga */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase block">
                  Sudah Lunas Target (100%)
                </span>
                <span className="text-2xl font-black font-mono text-emerald-950 mt-1 block">
                  {wargaLunasCount} Warga
                </span>
                <span className="text-[11px] text-emerald-700">
                  Mencapai ≥ Rp {formatRupiah(targetPerPerson)}
                </span>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900 uppercase block">
                  Sedang Berjalan / Mencicil
                </span>
                <span className="text-2xl font-black font-mono text-amber-950 mt-1 block">
                  {wargaMencicilCount} Warga
                </span>
                <span className="text-[11px] text-amber-800">
                  Setoran bertahap per minggu
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase block">
                  Belum Memulai Setoran
                </span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
                  {wargaBelumBayarCount} Warga
                </span>
                <span className="text-[11px] text-slate-500">
                  Dapat menyusul sebelum acara
                </span>
              </div>
            </div>

            {/* Tabel Rincian Target Iuran Mingguan (Minggu 1 s/d 12) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-700" />
                    <span>Target & Realisasi Per Minggu (Minggu 1 s/d 12)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Target mingguan keseluruhan: {wargaUtama.length} warga × Rp {formatRupiah(targetPerMingguPerOrang)} = <strong>Rp {formatRupiah(targetPerMingguTotal)} / minggu</strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-emerald-800 text-white font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-16">Minggu</th>
                      <th className="p-2.5 text-right">Target / Orang</th>
                      <th className="p-2.5 text-right">Target Total ({wargaUtama.length} Warga)</th>
                      <th className="p-2.5 text-right">Realisasi Terkumpul</th>
                      <th className="p-2.5 text-center">Warga Menyetor</th>
                      <th className="p-2.5 text-center">Status Capaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                      const weekSum = citizens.reduce((sum, c) => sum + (Number(c.weeks?.[w]) || 0), 0);
                      const paidCount = wargaUtama.filter(c => (Number(c.weeks?.[w]) || 0) > 0).length;
                      const weekPercent = targetPerMingguTotal > 0 ? ((weekSum / targetPerMingguTotal) * 100).toFixed(0) : '0';
                      return (
                        <tr key={w} className={w % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="p-2.5 text-center font-bold text-slate-800">
                            Minggu {w}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            Rp {formatRupiah(targetPerMingguPerOrang)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                            Rp {formatRupiah(targetPerMingguTotal)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            Rp {formatRupiah(weekSum)}
                          </td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">
                            {paidCount} Warga
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              Number(weekPercent) >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : Number(weekPercent) > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {weekPercent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-emerald-50 font-bold border-t-2 border-emerald-200">
                    <tr>
                      <td className="p-2.5 text-center text-emerald-950 font-black">TOTAL (12 Mgg)</td>
                      <td className="p-2.5 text-right font-mono text-emerald-950">Rp {formatRupiah(targetPerPerson)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-950">Rp {formatRupiah(totalTargetWarga)}</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-950">Rp {formatRupiah(totalWarga)}</td>
                      <td className="p-2.5 text-center text-emerald-950">{wargaUtama.length} Warga</td>
                      <td className="p-2.5 text-center text-emerald-950">{persentaseTargetExact}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Note donasi suka rela / dermawan */}
            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
              <HeartHandshake className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-900">Tambahan Pendanaan Donasi Suka Rela / Dermawan:</strong>
                <p className="mt-0.5 leading-relaxed text-slate-700">
                  Selain dari target iuran warga di atas, panitia PHBI Isra Miraj Kp Kedung Sapi juga menerima <strong>Donasi Suka Rela</strong> dari para dermawan yang saat ini terkumpul sebesar <strong>Rp {formatRupiah(totalSukarela)}</strong> ({sukarelaPayments.length} donatur), sehingga memperkuat kas panitia dalam menyukseskan acara.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* ... and so on for other tabs ... */}

        {/* TAB 2: RINCIAN UANG MASUK */}
        {activeTab === 'uang_masuk' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Donasi Suka Rela Table */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-amber-600" />
                    <span>Daftar Donasi Suka Rela / Dermawan ({sukarelaPayments.length} Donatur)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total terkumpul dari para donatur: <strong>Rp {formatRupiah(totalSukarela)}</strong>
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Cari nama donatur..."
                  value={sukarelaSearch}
                  onChange={(e) => setSukarelaSearch(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border rounded-lg text-xs w-full sm:w-64 font-medium"
                />
              </div>

              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-amber-50 text-amber-950 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 text-center w-12">No</th>
                      <th className="p-2.5">Tanggal / Waktu</th>
                      <th className="p-2.5">Nama Donatur</th>
                      <th className="p-2.5">Keterangan</th>
                      <th className="p-2.5 text-right">Nominal Donasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSukarela.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                          Belum ada donasi suka rela yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredSukarela.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">{getShortDate(s.timestamp)}</td>
                          <td className="p-2.5 font-bold text-slate-900">{s.donorName}</td>
                          <td className="p-2.5 text-slate-600">{s.keterangan || 'Infaq / Shodaqoh'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            Rp {formatRupiah(s.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistik Iuran Warga Per Minggu */}
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>Penerimaan Iuran Warga Per Minggu (1 s/d 12)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Total iuran terkumpul dari warga ({wargaUtama.length} Warga): <strong>Rp {formatRupiah(totalWarga)}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                  const weekSum = citizens.reduce((sum, c) => sum + (Number(c.weeks?.[w]) || 0), 0);
                  const paidCount = wargaUtama.filter(c => (Number(c.weeks?.[w]) || 0) > 0).length;
                  return (
                    <div key={w} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span>Minggu {w}</span>
                        <span className="text-[10px] text-emerald-700">{paidCount} Warga</span>
                      </div>
                      <p className="text-sm font-black font-mono text-emerald-950 mt-1">
                        Rp {formatRupiah(weekSum)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RINCIAN UANG KELUAR (PENGELUARAN KAS) */}
        {activeTab === 'uang_keluar' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-700" />
                  <span>Rincian Pengeluaran Kas ({pengeluaranList.length} Transaksi)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Total dana yang telah dibelanjakan: <strong className="text-emerald-700">Rp {formatRupiah(totalKeluar)}</strong>
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari keperluan belanja..."
                value={pengeluaranSearch}
                onChange={(e) => setPengeluaranSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border rounded-lg text-xs w-full sm:w-64 font-medium"
              />
            </div>

            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-emerald-50 text-emerald-950 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5 text-center w-12">No</th>
                    <th className="p-2.5">Tanggal / Jam</th>
                    <th className="p-2.5">Uraian Keperluan Belanja</th>
                    <th className="p-2.5">Penerima / Toko</th>
                    <th className="p-2.5">Dicatat Oleh</th>
                    <th className="p-2.5 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPengeluaran.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                        Belum ada data pengeluaran kas yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredPengeluaran.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{getShortDate(p.timestamp)}</td>
                        <td className="p-2.5 font-bold text-slate-900">{p.description}</td>
                        <td className="p-2.5 text-slate-700">{p.recipient || '-'}</td>
                        <td className="p-2.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px]">
                            {p.recordedBy || 'Bendahara'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          Rp {formatRupiah(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: STRUKTUR KEPANITIAAN ISRA MIRAJ 1448 H / 2027 M */}
        {activeTab === 'struktur' && (
          <div className="p-4 sm:p-6">
            <StrukturPanitiaCard 
              committeeSettings={committeeSettings} 
              canEdit={currentUser?.role === 'admin'}
              currentUser={currentUser}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </div>


    </div>
  );
}
