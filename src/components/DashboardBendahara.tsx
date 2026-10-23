import { useState, useEffect, type FormEvent } from 'react';
import { 
  Wallet, TrendingDown, ArrowUpRight, FileDown, 
  AlertTriangle, CheckCircle2, Clock, Calendar, Edit3, Trash2, X,
  Mic, BookOpen, Utensils, Tent, Truck, Video, FileText, ArrowDownRight, Search, Archive
} from 'lucide-react';
import { Citizen, Pengeluaran, UserAccount, CommitteeSettings, PaymentSettings, TransferConfirmation, DonasiWargaPayment, DonasiSukarela, ProposalData, PeriodArchive } from '../types';
import { formatRupiah, formatInputNumber, parseRupiah, getCurrentIndonesianTime } from '../utils/formatters';
import { generatePdfLaporanBendahara } from '../utils/pdfGenerator';
import RekapitulasiTable from './RekapitulasiTable';
import ProposalKegiatan from './ProposalKegiatan';
import ArsipPeriodePanel from './ArsipPeriodePanel';

interface DashboardBendaharaProps {
  currentUser: UserAccount;
  citizens: Citizen[];
  wargaPayments?: DonasiWargaPayment[];
  sukarelaPayments?: DonasiSukarela[];
  pengeluaranList: Pengeluaran[];
  totalDonasiWarga: number;
  totalDonasiSukaRela: number;
  targetPerPerson?: number;
  committeeSettings?: CommitteeSettings;
  paymentSettings?: PaymentSettings;
  transferConfirmations?: TransferConfirmation[];
  proposalData?: ProposalData;
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
  onRefresh: () => void;
}

interface CategoryOption {
  id: string;
  title: string;
  subtitle: string;
  defaultDesc: string;
  icon: typeof Mic;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'penceramah',
    title: 'ACARA: PENCERAMAH',
    subtitle: 'Uang sewa penceramah',
    defaultDesc: 'Uang Sewa / Bisaroh Penceramah',
    icon: Mic
  },
  {
    id: 'qori',
    title: 'ACARA: QORI',
    subtitle: 'Uang sewa qori tilawah',
    defaultDesc: 'Uang Sewa / Honor Qori Tilawah',
    icon: BookOpen
  },
  {
    id: 'konsumsi',
    title: 'KONSUMSI',
    subtitle: 'Konsumsi jamaah & panitia',
    defaultDesc: 'Konsumsi Jamaah & Panitia',
    icon: Utensils
  },
  {
    id: 'tenda',
    title: 'TENDA & VENUE',
    subtitle: 'Sewa tenda, panggung & kursi',
    defaultDesc: 'Sewa Tenda, Panggung & Kursi',
    icon: Tent
  },
  {
    id: 'logistik',
    title: 'LOGISTIK',
    subtitle: 'Perlengkapan, genset & alat',
    defaultDesc: 'Logistik, Perlengkapan, Genset & Alat',
    icon: Truck
  },
  {
    id: 'multimedia',
    title: 'MULTI MEDIA',
    subtitle: 'Sound system, layar & proyektor',
    defaultDesc: 'Sound System, Layar & Proyektor',
    icon: Video
  },
  {
    id: 'lain-lain',
    title: 'DAN LAIN-LAIN',
    subtitle: 'Wajib cantumkan catatan',
    defaultDesc: '',
    icon: FileText
  }
];

export default function DashboardBendahara({
  currentUser,
  citizens,
  wargaPayments = [],
  sukarelaPayments = [],
  pengeluaranList,
  totalDonasiWarga,
  totalDonasiSukaRela,
  targetPerPerson = 250000,
  committeeSettings,
  paymentSettings,
  transferConfirmations = [],
  proposalData,
  activePeriodLabel = '1448 H / 2027 M',
  periodArchives = [],
  onRefresh
}: DashboardBendaharaProps) {
  const [activeTab, setActiveTab] = useState<'kas' | 'rekap' | 'proposal' | 'arsip_periode'>('kas');

  const [realtimeClock, setRealtimeClock] = useState(getCurrentIndonesianTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeClock(getCurrentIndonesianTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Category & Form State matching reference image
  const [selectedCategory, setSelectedCategory] = useState<string>('penceramah');
  const [desc, setDesc] = useState('Uang Sewa / Bisaroh Penceramah');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<Pengeluaran | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRecipient, setEditRecipient] = useState('');

  // Financial calculations
  const totalUangMasukTersedia = totalDonasiWarga + totalDonasiSukaRela;
  const totalPengeluaran = pengeluaranList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const sisaSaldoTersedia = totalUangMasukTersedia - totalPengeluaran;

  const handleSelectCategory = (cat: CategoryOption) => {
    setSelectedCategory(cat.id);
    if (cat.defaultDesc) {
      setDesc(cat.defaultDesc);
    } else {
      setDesc('');
    }
  };

  // Submit Pengeluaran
  const handleSimpanPengeluaran = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanDesc = desc.trim();
    if (!cleanDesc) {
      setErrorMsg('Keperluan pengeluaran harus diisi!');
      return;
    }

    const numAmount = parseRupiah(amount);
    if (numAmount <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari 0!');
      return;
    }

    // STRICT VALIDATION: "Jika pengeluaran melebihi uang tersedia maka Akses di tolak."
    if (numAmount > sisaSaldoTersedia) {
      setErrorMsg(
        `Akses ditolak otomatis! Nominal pengeluaran (Rp ${formatRupiah(numAmount)}) melebihi sisa uang tersedia (Rp ${formatRupiah(sisaSaldoTersedia)}).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pengeluaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: cleanDesc,
          amount: numAmount,
          recipient: recipient.trim() || 'Panitia / Toko',
          recordedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Akses ditolak atau gagal menyimpan pengeluaran');
        return;
      }

      setSuccessMsg(`Pengeluaran sebesar Rp ${formatRupiah(numAmount)} berhasil dicatat! Sisa saldo kas otomatis berkurang.`);
      setAmount('');
      setRecipient('');
      setSelectedCategory('penceramah');
      setDesc('Uang Sewa / Bisaroh Penceramah');
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menyimpan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Pengeluaran) => {
    setEditingItem(item);
    setEditDesc(item.description);
    setEditAmount(formatRupiah(item.amount));
    setEditRecipient(item.recipient || '');
    setErrorMsg('');
  };

  // Save Edit Pengeluaran
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setErrorMsg('');

    const cleanDesc = editDesc.trim();
    if (!cleanDesc) {
      setErrorMsg('Keperluan pengeluaran harus diisi!');
      return;
    }

    const numAmount = parseRupiah(editAmount);
    if (numAmount <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari 0!');
      return;
    }

    // Check if new amount exceeds available
    const availableWithoutThis = sisaSaldoTersedia + editingItem.amount;
    if (numAmount > availableWithoutThis) {
      setErrorMsg(
        `Akses di tolak! Nominal pengeluaran baru (Rp ${formatRupiah(numAmount)}) melebihi total kas tersedia (Rp ${formatRupiah(availableWithoutThis)}).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pengeluaran/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: cleanDesc,
          amount: numAmount,
          recipient: editRecipient.trim(),
          editedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengubah data pengeluaran');
        return;
      }

      setSuccessMsg('Perubahan pengeluaran berhasil disimpan secara real-time!');
      setEditingItem(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengubah data pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  // Delete Pengeluaran
  const handleDeletePengeluaran = async (item: Pengeluaran) => {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus pengeluaran "${item.description}" senilai Rp ${formatRupiah(item.amount)}?`);
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/pengeluaran/${item.id}?user=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus pengeluaran');
        return;
      }

      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-300 p-2.5 sm:p-3 flex flex-wrap gap-2 relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab('kas')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'kas'
              ? 'bg-rose-800 text-white shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
              : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
          }`}
        >
          <Wallet className="w-4 h-4 text-amber-300" />
          <span>Kelola Kas & Pengeluaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-rose-800 text-white shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
              : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Rekap 12 Minggu</span>
        </button>

        <button
          type="button"
          id="btn-bendahara-tab-proposal"
          onClick={() => setActiveTab('proposal')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'proposal'
              ? 'bg-rose-800 text-white shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
              : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Proposal Kegiatan</span>
        </button>

        <button
          type="button"
          id="btn-bendahara-tab-arsip-periode"
          onClick={() => setActiveTab('arsip_periode')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'arsip_periode'
              ? 'bg-indigo-900 text-white shadow-md border-2 border-indigo-950 ring-2 ring-indigo-300'
              : 'bg-white hover:bg-indigo-200 text-indigo-950 border-2 border-indigo-300 font-black'
          }`}
        >
          <Archive className={`w-4 h-4 ${activeTab === 'arsip_periode' ? 'text-amber-300' : 'text-indigo-700'}`} />
          <span>Arsip Multi-Tahun ({periodArchives.length})</span>
        </button>
      </div>

      {activeTab === 'kas' && (
        <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          {/* Top Financial Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Total Uang Masuk Tersedia */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    UANG TERSEDIA (MASUK)
                  </span>
                  <div className="p-1.5 rounded-lg bg-rose-200 text-rose-800">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900 mt-2">
                  Rp {formatRupiah(totalUangMasukTersedia)}
                </p>
              </div>
              <div className="text-[11px] text-rose-700 mt-2 font-medium flex justify-between border-t border-rose-200/60 pt-2">
                <span>Donasi Warga ({citizens.filter(c => !c.isNgontrak).length} Warga): Rp {formatRupiah(totalDonasiWarga)}</span>
                <span>Suka Rela: Rp {formatRupiah(totalDonasiSukaRela)}</span>
              </div>
            </div>

            {/* Total Pengeluaran */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    TOTAL PENGELUARAN
                  </span>
                  <div className="p-1.5 rounded-lg bg-rose-200 text-rose-800">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900 mt-2">
                  Rp {formatRupiah(totalPengeluaran)}
                </p>
              </div>
              <p className="text-[11px] text-rose-700 mt-2 font-medium border-t border-rose-200/60 pt-2">
                {pengeluaranList.length} transaksi pengeluaran operasional
              </p>
            </div>

            {/* Sisa Saldo Kas */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-rose-950 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    SISA SALDO KAS TERSEDIA
                  </span>
                  <div className="p-1.5 rounded-lg bg-rose-800/80 text-rose-200">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-2">
                  Rp {formatRupiah(sisaSaldoTersedia)}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-rose-200 mt-2 font-medium border-t border-rose-800/60 pt-2">
                <span>Batas Pengeluaran Kas</span>
                <span className="text-amber-300 font-bold">Siap Pakai</span>
              </div>
            </div>
          </div>

          {/* Download Laporan PDF Resmi Bendahara Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <FileDown className="w-5 h-5 text-rose-700" />
                Laporan Pertanggungjawaban Kas Bendahara (PDF)
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Format resmi ber-KOP SURAT dengan tanda tangan sah <strong>Bendahara ({currentUser.name})</strong> dan <strong>Ketua Panitia (Sahroji)</strong>, mencantumkan total pengeluaran dan sisa saldo kas panitia.
              </p>
            </div>

            <button
              type="button"
              id="btn-download-pdf-bendahara"
              onClick={() => generatePdfLaporanBendahara(totalUangMasukTersedia, pengeluaranList, currentUser.name)}
              className="w-full sm:w-auto px-5 py-3 bg-rose-700 hover:bg-rose-800 active:scale-[0.99] text-white font-black rounded-xl shadow-md border-2 border-rose-900 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
            >
              <FileDown className="w-4 h-4 text-amber-300" />
              <span>Download Laporan Kas (PDF)</span>
            </button>
          </div>

          {/* Form Input Pengeluaran Anggaran Kegiatan (Matching Reference Image) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-7 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Form Input Pengeluaran Anggaran Kegiatan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Pilih pos kategori pengeluaran. Nominal akan otomatis mengurangi Uang Tersedia. Jika melebihi saldo kas, pengajuan ditolak otomatis.
              </p>
            </div>

            {/* Category Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-950 bg-rose-800 text-white font-black shadow-md ring-2 ring-rose-300'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 font-black'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-300 absolute top-3.5 right-3.5" />
                    )}
                    <IconComponent
                      className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-rose-700'}`}
                    />
                    <span
                      className={`font-black text-xs tracking-wider uppercase mt-3 block ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {cat.title}
                    </span>
                    <span className={`text-[11px] mt-0.5 block leading-tight ${isSelected ? 'text-rose-100' : 'text-slate-600'}`}>
                      {cat.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-bold">Akses Ditolak / Gagal</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSimpanPengeluaran}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Field 1: Nama Pengeluaran / Uraian * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Nama Pengeluaran / Uraian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-pengeluaran-keperluan"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Uang Sewa / Bisaroh Penceramah"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
                  />
                </div>

                {/* Field 2: Nominal Pengeluaran (Format Titik) * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Nominal Pengeluaran (Format Titik) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 font-bold text-sm">
                      Rp
                    </div>
                    <input
                      type="text"
                      required
                      id="input-pengeluaran-jumlah"
                      value={amount}
                      onChange={(e) => setAmount(formatInputNumber(e.target.value))}
                      placeholder="Contoh: 500.000"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                    Maksimal yang dapat dikeluarkan: Rp {formatRupiah(sisaSaldoTersedia)}
                  </p>
                  {parseRupiah(amount) > sisaSaldoTersedia && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Pengeluaran melebihi uang tersedia! Akses akan ditolak otomatis.
                    </p>
                  )}
                </div>

                {/* Field 3: Catatan / Keterangan (Opsional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Catatan / Keterangan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    id="input-pengeluaran-penerima"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Contoh: Nama penerima atau nota..."
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Submit Button Aligned to the Right */}
              <div className="flex justify-end mt-5">
                <button
                  type="submit"
                  id="btn-simpan-pengeluaran"
                  disabled={loading || parseRupiah(amount) > sisaSaldoTersedia}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#006A4E] hover:bg-[#005840] active:scale-[0.99] text-white font-black rounded-xl shadow-md border-2 border-rose-900 flex items-center justify-center gap-2.5 cursor-pointer text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  <span>{loading ? 'Memproses...' : 'Catat Pengeluaran & Kurangi Saldo'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Riwayat Pengeluaran List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Daftar Pengeluaran Kas ({pengeluaranList.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Semua transaksi belanja terdaftar dan otomatis mengurangi saldo kas
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pengeluaran..."
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-rose-600 outline-none w-44 sm:w-56"
                  />
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 whitespace-nowrap">
                  Total: Rp {formatRupiah(totalPengeluaran)}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[500px] space-y-2.5 pr-1">
              {pengeluaranList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Wallet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">Belum ada catatan pengeluaran kas.</p>
                </div>
              ) : (
                pengeluaranList
                  .filter((item) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      item.description.toLowerCase().includes(q) ||
                      (item.recipient && item.recipient.toLowerCase().includes(q)) ||
                      (item.recordedBy && item.recordedBy.toLowerCase().includes(q))
                    );
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-rose-50/30 rounded-xl border border-slate-200/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.description}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Penerima: {item.recipient || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.timestamp}
                          </span>
                          <span>•</span>
                          <span>Input: <strong>{item.recordedBy}</strong></span>
                        </div>
                        {item.lastEditedBy && (
                          <p className="text-[10px] text-amber-700 font-medium">
                            * Diedit oleh: {item.lastEditedBy} ({item.lastEditedAt})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <span className="font-bold font-mono text-rose-700 text-sm sm:text-base">
                          Rp {formatRupiah(item.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Pengeluaran"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePengeluaran(item)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rekapitulasi View for Bendahara */}
      {activeTab === 'rekap' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <RekapitulasiTable
          citizens={citizens}
          currentUser={currentUser}
          totalSukarela={totalDonasiSukaRela}
          totalKeluar={totalPengeluaran}
          activeWeek={committeeSettings?.activeWeek || 2}
          onRefresh={onRefresh}
        />
        </div>
      )}

      {/* Proposal Kegiatan View for Bendahara */}
      {activeTab === 'proposal' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <ProposalKegiatan
          proposalData={proposalData}
          committeeSettings={committeeSettings}
          citizens={citizens}
          wargaPayments={wargaPayments}
          sukarelaPayments={sukarelaPayments}
          pengeluaranList={pengeluaranList}
          targetPerPerson={targetPerPerson}
          currentUser={currentUser}
          canEdit={false}
          onRefresh={onRefresh}
          />
        </div>
      )}

      {/* Arsip Multi-Tahun View for Bendahara */}
      {activeTab === 'arsip_periode' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <ArsipPeriodePanel
          currentUser={currentUser}
          activePeriodLabel={activePeriodLabel}
          periodArchives={periodArchives}
          citizens={citizens}
          wargaPayments={wargaPayments}
          sukarelaPayments={sukarelaPayments}
          pengeluaranList={pengeluaranList}
          targetPerPerson={targetPerPerson}
          committeeSettings={committeeSettings}
          proposalData={proposalData}
          onRefresh={onRefresh}
        />
        </div>
      )}

      {/* Modal Edit Pengeluaran */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  Edit Pengeluaran Kas
                </h3>
                <p className="text-xs text-slate-500">Ubah rincian atau jumlah pengeluaran</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keperluan Pengeluaran
                </label>
                <input
                  type="text"
                  required
                  id="input-edit-pengeluaran-keperluan"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jumlah Pengeluaran (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    required
                    id="input-edit-pengeluaran-jumlah"
                    value={editAmount}
                    onChange={(e) => setEditAmount(formatInputNumber(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono text-rose-900 focus:bg-white focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Penerima / Toko
                </label>
                <input
                  type="text"
                  value={editRecipient}
                  onChange={(e) => setEditRecipient(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Diedit oleh: <strong>{currentUser.name}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
