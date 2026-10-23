import React, { useState, useMemo } from 'react';
import {
  Archive,
  Calendar,
  FolderArchive,
  PlusCircle,
  RotateCcw,
  Trash2,
  Eye,
  FileDown,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  HeartHandshake,
  Receipt,
  ShieldCheck,
  Sparkles,
  Clock,
  FileText,
  X,
  Loader2,
  Check,
  History
} from 'lucide-react';
import {
  PeriodArchive,
  Citizen,
  DonasiWargaPayment,
  DonasiSukarela,
  Pengeluaran,
  CommitteeSettings,
  ProposalData,
  UserAccount
} from '../types';
import { formatRupiah, formatInputNumber, parseRupiah, getShortDate } from '../utils/formatters';
import {
  generatePdfTransparansiWarga,
  generatePdfRincianUangMasukWarga,
  generatePdfRincianUangKeluarWarga,
  generatePdfProposalKegiatan,
  generatePdfKolomMingguanAdmin
} from '../utils/pdfGenerator';

interface ArsipPeriodePanelProps {
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
  currentUser?: UserAccount | null;
  citizens: Citizen[];
  wargaPayments: DonasiWargaPayment[];
  sukarelaPayments: DonasiSukarela[];
  pengeluaranList: Pengeluaran[];
  targetPerPerson: number;
  committeeSettings?: CommitteeSettings;
  proposalData?: ProposalData;
  onRefresh?: () => void;
}

export default function ArsipPeriodePanel({
  activePeriodLabel = '1448 H / 2027 M',
  periodArchives = [],
  currentUser = null,
  citizens = [],
  wargaPayments = [],
  sukarelaPayments = [],
  pengeluaranList = [],
  targetPerPerson = 250000,
  committeeSettings,
  proposalData,
  onRefresh
}: ArsipPeriodePanelProps) {
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = Boolean(currentUser && currentUser.role !== 'warga');

  // Modal states for Admin actions
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<PeriodArchive | null>(null);
  const [detailTab, setDetailTab] = useState<'ringkasan' | 'mingguan' | 'sukarela' | 'pengeluaran'>('ringkasan');
  const [confirmRestoreArchive, setConfirmRestoreArchive] = useState<PeriodArchive | null>(null);
  const [confirmDeleteArchive, setConfirmDeleteArchive] = useState<PeriodArchive | null>(null);

  // Form states for Save Snapshot
  const [savePeriodLabel, setSavePeriodLabel] = useState(activePeriodLabel);
  const [saveCatatan, setSaveCatatan] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Form states for Start New Period (Tutup Buku & Tahun Baru)
  const [archiveCurrentLabel, setArchiveCurrentLabel] = useState(activePeriodLabel);
  const [archiveCurrentCatatan, setArchiveCurrentCatatan] = useState('');
  const [newHijriYear, setNewHijriYear] = useState('1449 H');
  const [newMasehiYear, setNewMasehiYear] = useState('2028 M');
  const [newTargetInput, setNewTargetInput] = useState(formatRupiah(targetPerPerson));
  const [resetForNewPeriod, setResetForNewPeriod] = useState(true);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active period live summary
  const activeSummary = useMemo(() => {
    const wargaUtama = citizens.filter(c => !c.isNgontrak);
    const totalWargaPaid = wargaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalSukarela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalMasuk = totalWargaPaid + totalSukarela;
    const totalKeluar = pengeluaranList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const sisaSaldo = totalMasuk - totalKeluar;
    return {
      wargaUtamaCount: wargaUtama.length,
      totalWargaPaid,
      totalSukarela,
      totalMasuk,
      totalKeluar,
      sisaSaldo
    };
  }, [citizens, wargaPayments, sukarelaPayments, pengeluaranList]);

  const handleOpenSaveModal = () => {
    setSavePeriodLabel(activePeriodLabel || '1448 H / 2027 M');
    setSaveCatatan(`Arsip laporan keuangan, rekapitulasi 12 minggu, struktur panitia & proposal PHBI Isra Mi'raj periode ${activePeriodLabel || '1448 H / 2027 M'}.`);
    setOverwriteExisting(true);
    setErrorMsg('');
    setShowSaveModal(true);
  };

  const handleOpenNewPeriodModal = () => {
    const curr = activePeriodLabel || '1448 H / 2027 M';
    setArchiveCurrentLabel(curr);
    setArchiveCurrentCatatan(`Arsip Tutup Buku Resmi PHBI Isra Mi'raj Periode ${curr}.`);

    // Auto-suggest next Hijri & Masehi year
    const matchH = curr.match(/(\d{4})\s*H/i);
    const matchM = curr.match(/(\d{4})\s*M/i);
    const nextH = matchH ? `${parseInt(matchH[1], 10) + 1} H` : '1449 H';
    const nextM = matchM ? `${parseInt(matchM[1], 10) + 1} M` : '2028 M';
    setNewHijriYear(nextH);
    setNewMasehiYear(nextM);
    setNewTargetInput(formatRupiah(targetPerPerson || 250000));
    setResetForNewPeriod(true);
    setErrorMsg('');
    setShowNewPeriodModal(true);
  };

  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/archives/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodLabel: savePeriodLabel.trim() || activePeriodLabel,
          catatan: saveCatatan.trim(),
          archivedBy: currentUser?.name || 'Admin PHBI',
          overwriteExistingPeriod: overwriteExisting,
          startNewPeriod: false
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan arsip periode');
      }
      setSuccessMsg(data.message || 'Arsip periode berhasil disimpan!');
      setShowSaveModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan arsip');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHijriYear.trim() || !newMasehiYear.trim()) {
      setErrorMsg('Tahun Hijriah dan Tahun Masehi baru wajib diisi');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/archives/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodLabel: archiveCurrentLabel.trim() || activePeriodLabel,
          catatan: archiveCurrentCatatan.trim(),
          archivedBy: currentUser?.name || 'Admin PHBI',
          overwriteExistingPeriod: true,
          startNewPeriod: true,
          newHijriYear: newHijriYear.trim(),
          newMasehiYear: newMasehiYear.trim(),
          newTargetPerPerson: parseRupiah(newTargetInput) || targetPerPerson,
          resetTransactions: resetForNewPeriod
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memulai periode tahun baru');
      }
      setSuccessMsg(data.message || 'Periode lama berhasil diarsipkan & periode tahun baru telah aktif!');
      setShowNewPeriodModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses periode baru');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreArchive = async (archive: PeriodArchive) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/archives/${archive.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restoredBy: currentUser?.name || 'Admin PHBI',
          autoBackupCurrent: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengaktifkan arsip periode');
      }
      setSuccessMsg(data.message || `Periode ${archive.periodLabel} berhasil diaktifkan!`);
      setConfirmRestoreArchive(null);
      setSelectedArchive(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memulihkan arsip');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArchive = async (archive: PeriodArchive) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(
        `/api/admin/archives/${archive.id}?deletedBy=${encodeURIComponent(currentUser?.name || 'Admin PHBI')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus arsip periode');
      }
      setSuccessMsg(data.message || `Arsip ${archive.periodLabel} berhasil dihapus.`);
      setConfirmDeleteArchive(null);
      if (selectedArchive?.id === archive.id) {
        setSelectedArchive(null);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menghapus arsip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. HEADER BANNER PENYIMPANAN MULTI-TAHUN */}
      <div className="bg-gradient-to-r from-rose-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-rose-700/50 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-rose-800/80 border border-rose-500/40 text-rose-200 text-xs font-bold">
              <FolderArchive className="w-3.5 h-3.5 text-amber-300" />
              <span>Penyimpanan Multi-Tahun & Arsip Antar-Periode PHBI</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
              Manajemen Arsip Tahunan & Riwayat Antar-Periode
            </h2>
            <p className="text-xs sm:text-sm text-rose-100/90 max-w-3xl leading-relaxed">
              Seluruh data keuangan, rekapitulasi iuran 12 minggu, donasi sukarela, pengeluaran kas, struktur panitia, dan proposal disimpan per periode tahunan sehingga tidak hilang saat berganti tahun kegiatan.
            </p>
          </div>

          {/* Admin Action Buttons */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                id="btn-save-current-archive"
                onClick={handleOpenSaveModal}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md border border-rose-400/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Archive className="w-4 h-4 text-amber-300" />
                <span>Simpan Arsip Periode Ini</span>
              </button>

              <button
                type="button"
                id="btn-start-new-period"
                onClick={handleOpenNewPeriodModal}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tutup Buku & Mulai Tahun Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Period Status Strip */}
        <div className="mt-5 pt-4 border-t border-rose-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60">
            <span className="text-rose-300/90 text-[10px] font-bold uppercase block">Periode Aktif Berjalan</span>
            <span className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              {activePeriodLabel}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60">
            <span className="text-rose-300/90 text-[10px] font-bold uppercase block">Total Kas Masuk Aktif</span>
            <span className="text-sm sm:text-base font-black font-mono text-rose-300 mt-0.5 block">
              Rp {formatRupiah(activeSummary.totalMasuk)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60">
            <span className="text-rose-300/90 text-[10px] font-bold uppercase block">Total Pengeluaran Aktif</span>
            <span className="text-sm sm:text-base font-black font-mono text-rose-300 mt-0.5 block">
              Rp {formatRupiah(activeSummary.totalKeluar)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60">
            <span className="text-rose-300/90 text-[10px] font-bold uppercase block">Sisa Saldo Periode Aktif</span>
            <span className="text-sm sm:text-base font-black font-mono text-white mt-0.5 block">
              Rp {formatRupiah(activeSummary.sisaSaldo)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60">
            <span className="text-rose-300/90 text-[10px] font-bold uppercase block">Total Arsip Tersimpan</span>
            <span className="text-sm sm:text-base font-black text-amber-200 mt-0.5 block">
              {periodArchives.length} Periode Tahunan
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. DAFTAR ARSIP ANTAR-PERIODE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-rose-700" />
              <span>Daftar Arsip Periode Tahunan ({periodArchives.length} Arsip)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Klik &ldquo;Lihat Detail &amp; Laporan&rdquo; untuk membuka data atau mencetak PDF laporan dari periode tahun sebelumnya.
            </p>
          </div>
        </div>

        {periodArchives.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                Belum Ada Arsip Periode yang Disimpan
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Periode saat ini (<strong>{activePeriodLabel}</strong>) sedang berjalan secara aktif.
                {isAdmin
                  ? ' Anda dapat menekan tombol "Simpan Arsip Periode Ini" di atas untuk mencadangkan data tahun berjalan, atau "Tutup Buku & Mulai Tahun Baru" saat berganti tahun kegiatan.'
                  : ' Arsip laporan tahunan akan tampil di sini setelah disimpan oleh Administrator Panitia.'}
              </p>
            </div>
            {isAdmin && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-300" />
                  <span>Simpan Snapshot Periode {activePeriodLabel} Sekarang</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {periodArchives.map((archive) => {
              const isCurrentActive =
                archive.periodLabel.trim().toLowerCase() === activePeriodLabel.trim().toLowerCase();
              const sum = archive.summary;
              const targetPct =
                sum.totalTargetWarga > 0
                  ? ((sum.totalWargaPaid / sum.totalTargetWarga) * 100).toFixed(1)
                  : '0';

              return (
                <div
                  key={archive.id}
                  className={`rounded-2xl border-2 p-5 transition-all flex flex-col justify-between gap-4 ${
                    isCurrentActive
                      ? 'border-rose-500 bg-rose-50/30 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-rose-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-900 text-amber-300 font-black text-xs sm:text-sm">
                            {archive.periodLabel}
                          </span>
                          {isCurrentActive && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold uppercase">
                              Periode Aktif
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-2 leading-snug">
                          {archive.namaKegiatan}
                        </h4>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span>Diarsipkan pada:</span>
                        <strong className="text-slate-700 font-mono">{archive.archivedAt}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pengurus Inti:</span>
                        <strong className="text-slate-700">
                          Ketua: {sum.ketuaPanitia} • Bendahara: {sum.bendahara}
                        </strong>
                      </div>
                      {archive.catatan && (
                        <p className="text-slate-600 italic pt-1 border-t border-slate-200/70">
                          &ldquo;{archive.catatan}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Financial Summary Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">
                          Total Masuk
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-rose-950 mt-0.5 block">
                          Rp {formatRupiah(sum.totalMasuk)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">
                          Total Keluar
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-rose-950 mt-0.5 block">
                          Rp {formatRupiah(sum.totalKeluar)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-900 uppercase block">
                          Sisa Saldo
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-amber-950 mt-0.5 block">
                          Rp {formatRupiah(sum.sisaSaldo)}
                        </span>
                      </div>
                    </div>

                    {/* Sub-stats */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 px-1">
                      <span>
                        Iuran Warga: <strong>Rp {formatRupiah(sum.totalWargaPaid)}</strong> ({targetPct}%)
                      </span>
                      <span>
                        Sukarela: <strong>Rp {formatRupiah(sum.totalSukarela)}</strong> ({sum.sukarelaCount} Donatur)
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArchive(archive);
                          setDetailTab('ringkasan');
                        }}
                        className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Detail &amp; Laporan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          generatePdfTransparansiWarga(
                            archive.snapshot.citizens || [],
                            archive.snapshot.sukarelaPayments || [],
                            archive.snapshot.pengeluaranList || [],
                            sum.totalWargaPaid,
                            sum.totalSukarela,
                            sum.totalKeluar,
                            sum.sisaSaldo,
                            sum.targetPerPerson
                          )
                        }
                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        title={`Download PDF Laporan Kas Periode ${archive.periodLabel}`}
                      >
                        <FileDown className="w-3.5 h-3.5 text-amber-800" />
                        <span>PDF Kas</span>
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreArchive(archive)}
                          className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                          title="Aktifkan dan muat periode ini sebagai periode utama aplikasi"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Aktifkan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteArchive(archive)}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl cursor-pointer transition-colors"
                          title="Hapus Arsip Periode"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. PANEL DETAIL ARSIP PERIODE TERPILIH */}
      {selectedArchive && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-600 overflow-hidden animate-in fade-in">
          {/* Header Detail */}
          <div className="bg-gradient-to-r from-rose-900 via-teal-900 to-slate-900 text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                  ARSIP PERIODE {selectedArchive.periodLabel}
                </span>
                <span className="text-xs text-rose-200 font-mono">
                  Diarsipkan: {selectedArchive.archivedAt}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white mt-1.5">
                {selectedArchive.namaKegiatan}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  generatePdfTransparansiWarga(
                    selectedArchive.snapshot.citizens || [],
                    selectedArchive.snapshot.sukarelaPayments || [],
                    selectedArchive.snapshot.pengeluaranList || [],
                    selectedArchive.summary.totalWargaPaid,
                    selectedArchive.summary.totalSukarela,
                    selectedArchive.summary.totalKeluar,
                    selectedArchive.summary.sisaSaldo,
                    selectedArchive.summary.targetPerPerson
                  )
                }
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>PDF Transparansi</span>
              </button>

              {selectedArchive.snapshot.proposalData && (
                <button
                  type="button"
                  onClick={() =>
                    generatePdfProposalKegiatan(
                      selectedArchive.snapshot.proposalData!,
                      selectedArchive.snapshot.committeeSettings
                    )
                  }
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white border border-teal-400/40 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>PDF Proposal</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    generatePdfKolomMingguanAdmin(
                      selectedArchive.snapshot.citizens || [],
                      selectedArchive.summary.totalSukarela,
                      selectedArchive.summary.totalKeluar
                    )
                  }
                  className="px-3 py-2 bg-rose-800 hover:bg-rose-700 text-white border border-rose-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-300" />
                  <span>PDF Rekap 12 Minggu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedArchive(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer"
                title="Tutup Detail Arsip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-navigation inside archive detail */}
          <div className="p-2.5 bg-slate-100 border-b-2 border-slate-300 flex flex-wrap gap-2 relative z-10">
            {[
              { id: 'ringkasan' as const, label: 'Ringkasan Kas Periode' },
              { id: 'mingguan' as const, label: 'Rekap Per Minggu (1–12)' },
              { id: 'sukarela' as const, label: `Donasi Sukarela (${selectedArchive.summary.sukarelaCount})` },
              { id: 'pengeluaran' as const, label: `Pengeluaran Kas (${selectedArchive.summary.pengeluaranCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  detailTab === tab.id
                    ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                    : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content of Archive Detail */}
          <div className="p-5 space-y-4">
            {detailTab === 'ringkasan' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs font-bold text-rose-800 uppercase block">
                      Total Uang Masuk ({selectedArchive.periodLabel})
                    </span>
                    <span className="text-xl font-black font-mono text-rose-950 mt-1 block">
                      Rp {formatRupiah(selectedArchive.summary.totalMasuk)}
                    </span>
                    <span className="text-[11px] text-rose-700 block mt-1">
                      Iuran Warga: Rp {formatRupiah(selectedArchive.summary.totalWargaPaid)} • Sukarela: Rp {formatRupiah(selectedArchive.summary.totalSukarela)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs font-bold text-rose-800 uppercase block">
                      Total Pengeluaran ({selectedArchive.periodLabel})
                    </span>
                    <span className="text-xl font-black font-mono text-rose-950 mt-1 block">
                      Rp {formatRupiah(selectedArchive.summary.totalKeluar)}
                    </span>
                    <span className="text-[11px] text-rose-700 block mt-1">
                      {selectedArchive.summary.pengeluaranCount} Transaksi Belanja Tercatat
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 uppercase block">
                      Sisa Saldo Akhir Periode
                    </span>
                    <span className="text-xl font-black font-mono text-amber-950 mt-1 block">
                      Rp {formatRupiah(selectedArchive.summary.sisaSaldo)}
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-1">
                      Warga Lunas: {selectedArchive.summary.wargaLunasCount} dari {selectedArchive.summary.wargaUtamaCount} Warga Utama
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-800 uppercase">Susunan Pengurus Inti Periode {selectedArchive.periodLabel}:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>Ketua Panitia: <strong>{selectedArchive.summary.ketuaPanitia}</strong></div>
                    <div>Wakil Ketua: <strong>{selectedArchive.summary.wakilKetua}</strong></div>
                    <div>Sekretaris: <strong>{selectedArchive.summary.sekretaris}</strong></div>
                    <div>Bendahara: <strong>{selectedArchive.summary.bendahara}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'mingguan' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Rekapitulasi Penerimaan Iuran Per Minggu (Minggu 1 s/d 12) — {selectedArchive.periodLabel}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        generatePdfRincianUangMasukWarga(
                          selectedArchive.snapshot.citizens || [],
                          selectedArchive.snapshot.sukarelaPayments || [],
                          selectedArchive.summary.totalWargaPaid,
                          selectedArchive.summary.totalSukarela
                        )
                      }
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>PDF Uang Masuk</span>
                    </button>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() =>
                          generatePdfKolomMingguanAdmin(
                            selectedArchive.snapshot.citizens || [],
                            selectedArchive.summary.totalSukarela,
                            selectedArchive.summary.totalKeluar
                          )
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 text-amber-300" />
                        <span>PDF Tabel 12 Minggu</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(w => {
                    const archCitizens = selectedArchive.snapshot.citizens || [];
                    const weekSum = archCitizens.reduce((s, c) => s + (Number(c.weeks?.[w]) || 0), 0);
                    const paidCount = archCitizens.filter(c => !c.isNgontrak && (Number(c.weeks?.[w]) || 0) > 0).length;
                    return (
                      <div key={w} className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                          <span>Minggu {w}</span>
                          <span className="text-[10px] text-rose-700">{paidCount} Warga</span>
                        </div>
                        <p className="text-sm font-black font-mono text-rose-950 mt-1">
                          Rp {formatRupiah(weekSum)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detailTab === 'sukarela' && (
              <div className="space-y-3">
                <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-amber-50 text-amber-950 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5 text-center w-12">No</th>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Nama Donatur</th>
                        <th className="p-2.5">Keterangan</th>
                        <th className="p-2.5 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedArchive.snapshot.sukarelaPayments || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                            Tidak ada data donasi suka rela pada arsip periode ini.
                          </td>
                        </tr>
                      ) : (
                        (selectedArchive.snapshot.sukarelaPayments || []).map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 text-slate-600">{getShortDate(s.timestamp)}</td>
                            <td className="p-2.5 font-bold text-slate-900">{s.donorName}</td>
                            <td className="p-2.5 text-slate-600">{s.keterangan || 'Infaq / Shodaqoh'}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                              Rp {formatRupiah(s.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailTab === 'pengeluaran' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      generatePdfRincianUangKeluarWarga(
                        selectedArchive.snapshot.pengeluaranList || [],
                        selectedArchive.summary.totalKeluar
                      )
                    }
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF Uang Keluar</span>
                  </button>
                </div>
                <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-rose-50 text-rose-950 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5 text-center w-12">No</th>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Uraian Keperluan Belanja</th>
                        <th className="p-2.5">Penerima / Toko</th>
                        <th className="p-2.5 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedArchive.snapshot.pengeluaranList || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                            Tidak ada data pengeluaran kas pada arsip periode ini.
                          </td>
                        </tr>
                      ) : (
                        (selectedArchive.snapshot.pengeluaranList || []).map((p, idx) => (
                          <tr key={p.id || idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 text-slate-600">{getShortDate(p.timestamp)}</td>
                            <td className="p-2.5 font-bold text-slate-900">{p.description}</td>
                            <td className="p-2.5 text-slate-700">{p.recipient || '-'}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-700">
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
          </div>
        </div>
      )}

      {/* MODAL 1: SIMPAN SNAPSHOT ARSIP PERIODE BERJALAN */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Simpan Arsip Periode Berjalan
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Menyimpan salinan lengkap data periode aktif ke daftar arsip
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Label Periode Tahun (Hijriah / Masehi)
                </label>
                <input
                  type="text"
                  required
                  value={savePeriodLabel}
                  onChange={e => setSavePeriodLabel(e.target.value)}
                  placeholder="Contoh: 1448 H / 2027 M"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Arsip (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={saveCatatan}
                  onChange={e => setSaveCatatan(e.target.value)}
                  placeholder="Keterangan singkat arsip periode ini..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-rose-600"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={e => setOverwriteExisting(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Perbarui arsip jika periode dengan nama yang sama sudah ada</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan ke Arsip Multi-Tahun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TUTUP BUKU & MULAI PERIODE TAHUN BARU */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-amber-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Tutup Buku &amp; Mulai Periode Tahun Baru
                  </h3>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Otomatis mengarsipkan periode berjalan &amp; menyiapkan buku kas tahun baru
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartNewPeriod} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <span className="text-[11px] font-black uppercase text-rose-900 block">
                  Langkah 1: Arsipkan Periode Saat Ini
                </span>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Label Periode yang Ditutup / Diarsipkan
                  </label>
                  <input
                    type="text"
                    required
                    value={archiveCurrentLabel}
                    onChange={e => setArchiveCurrentLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Penutupan Buku
                  </label>
                  <input
                    type="text"
                    value={archiveCurrentCatatan}
                    onChange={e => setArchiveCurrentCatatan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <span className="text-[11px] font-black uppercase text-amber-950 block">
                  Langkah 2: Konfigurasi Periode Tahun Baru
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tahun Hijriah Baru
                    </label>
                    <input
                      type="text"
                      required
                      value={newHijriYear}
                      onChange={e => setNewHijriYear(e.target.value)}
                      placeholder="Contoh: 1449 H"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tahun Masehi Baru
                    </label>
                    <input
                      type="text"
                      required
                      value={newMasehiYear}
                      onChange={e => setNewMasehiYear(e.target.value)}
                      placeholder="Contoh: 2028 M"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Iuran Per Warga Tahun Baru (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTargetInput}
                    onChange={e => setNewTargetInput(formatInputNumber(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-rose-900"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={resetForNewPeriod}
                    onChange={e => setResetForNewPeriod(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    <strong>Kosongkan tabel iuran 12 minggu &amp; pengeluaran kas</strong> untuk memulai pencatatan dari Rp 0 pada periode tahun baru (data periode lama tetap tersimpan utuh di Arsip).
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>Arsipkan &amp; Mulai Periode {newHijriYear} / {newMasehiYear}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI AKTIFKAN / PULIHKAN ARSIP PERIODE */}
      {confirmRestoreArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-blue-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Beralih ke Periode {confirmRestoreArchive.periodLabel}?
                </h3>
                <span className="text-[11px] text-slate-500">
                  Periode yang sedang aktif ({activePeriodLabel}) akan dicadangkan otomatis
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh data transaksi, rekap 12 minggu, pengeluaran bendahara, struktur panitia, dan proposal dari periode <strong>{confirmRestoreArchive.periodLabel}</strong> akan dimuat sebagai periode aktif di seluruh perangkat.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmRestoreArchive(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRestoreArchive(confirmRestoreArchive)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Ya, Aktifkan Periode {confirmRestoreArchive.periodLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KONFIRMASI HAPUS ARSIP */}
      {confirmDeleteArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Hapus Arsip Periode {confirmDeleteArchive.periodLabel}?
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold">
                  Diarsipkan pada: {confirmDeleteArchive.archivedAt}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data arsip periode <strong>{confirmDeleteArchive.periodLabel}</strong> dari daftar penyimpanan multi-tahun?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteArchive(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteArchive(confirmDeleteArchive)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Ya, Hapus Arsip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
