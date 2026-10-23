import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, FileDown, Users, Building2, Calendar } from 'lucide-react';
import { Citizen, UserAccount } from '../types';
import { formatRupiah, formatInputNumber, parseRupiah } from '../utils/formatters';
import { generatePdfKolomMingguanAdmin, generatePdfLaporanMingguanUsser } from '../utils/pdfGenerator';

interface RekapitulasiTableProps {
  citizens: Citizen[];
  currentUser: UserAccount;
  totalSukarela: number;
  totalKeluar: number;
  activeWeek?: number;
  onRefresh: () => void;
}

export default function RekapitulasiTable({
  citizens,
  currentUser,
  totalSukarela,
  totalKeluar,
  activeWeek = 2,
  onRefresh
}: RekapitulasiTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rekapPdfWeek, setRekapPdfWeek] = useState<number>(activeWeek);

  useEffect(() => {
    setRekapPdfWeek(activeWeek);
  }, [activeWeek]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCitizenName, setNewCitizenName] = useState('');
  const [newCitizenRt, setNewCitizenRt] = useState<'08' | '09' | '10'>('08');
  
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null);
  const [editName, setEditName] = useState('');
  const [editRt, setEditRt] = useState<'08' | '09' | '10'>('08');
  const [editWeeks, setEditWeeks] = useState<{ [w: number]: string }>({});
  const [editExcludedWeeks, setEditExcludedWeeks] = useState<{ [w: number]: boolean }>({});
  const [togglingCell, setTogglingCell] = useState<string | null>(null);
  const [deletingCitizen, setDeletingCitizen] = useState<Citizen | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Pisahkan Warga Berdasarkan RT (08, 09, 10), selalu terurut A-Z
  const wargaRt08 = useMemo(() => {
    return [...citizens]
      .filter(c => (c.rt || '08') === '08')
      .sort((a, b) =>
        a.name.trim().replace(/\s+/g, ' ').localeCompare(
          b.name.trim().replace(/\s+/g, ' '),
          'id',
          { sensitivity: 'base', numeric: true }
        )
      );
  }, [citizens]);

  const wargaRt09 = useMemo(() => {
    return [...citizens]
      .filter(c => c.rt === '09')
      .sort((a, b) =>
        a.name.trim().replace(/\s+/g, ' ').localeCompare(
          b.name.trim().replace(/\s+/g, ' '),
          'id',
          { sensitivity: 'base', numeric: true }
        )
      );
  }, [citizens]);

  const wargaRt10 = useMemo(() => {
    return [...citizens]
      .filter(c => c.rt === '10')
      .sort((a, b) =>
        a.name.trim().replace(/\s+/g, ' ').localeCompare(
          b.name.trim().replace(/\s+/g, ' '),
          'id',
          { sensitivity: 'base', numeric: true }
        )
      );
  }, [citizens]);

  // Filter berdasarkan pencarian nama
  const filteredRt08 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return wargaRt08;
    return wargaRt08.filter(c => c.name.toLowerCase().includes(q));
  }, [wargaRt08, searchQuery]);

  const filteredRt09 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return wargaRt09;
    return wargaRt09.filter(c => c.name.toLowerCase().includes(q));
  }, [wargaRt09, searchQuery]);

  const filteredRt10 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return wargaRt10;
    return wargaRt10.filter(c => c.name.toLowerCase().includes(q));
  }, [wargaRt10, searchQuery]);

  // Hitung total per minggu untuk RT 08
  const rt08WeekTotals = useMemo(() => {
    const totals: { [w: number]: number } = {};
    for (let w = 1; w <= 12; w++) {
      totals[w] = filteredRt08.reduce(
        (sum, c) => sum + (c.excludedWeeks?.[w] ? 0 : (c.weeks[w] || 0)),
        0
      );
    }
    const grandTotal = filteredRt08.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const excludedTotal = filteredRt08.reduce((sum, c) => sum + (c.totalExcluded || 0), 0);
    return { totals, grandTotal, excludedTotal };
  }, [filteredRt08]);

  // Hitung total per minggu untuk RT 09
  const rt09WeekTotals = useMemo(() => {
    const totals: { [w: number]: number } = {};
    for (let w = 1; w <= 12; w++) {
      totals[w] = filteredRt09.reduce(
        (sum, c) => sum + (c.excludedWeeks?.[w] ? 0 : (c.weeks[w] || 0)),
        0
      );
    }
    const grandTotal = filteredRt09.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const excludedTotal = filteredRt09.reduce((sum, c) => sum + (c.totalExcluded || 0), 0);
    return { totals, grandTotal, excludedTotal };
  }, [filteredRt09]);

  // Hitung total per minggu untuk RT 10
  const rt10WeekTotals = useMemo(() => {
    const totals: { [w: number]: number } = {};
    for (let w = 1; w <= 12; w++) {
      totals[w] = filteredRt10.reduce(
        (sum, c) => sum + (c.excludedWeeks?.[w] ? 0 : (c.weeks[w] || 0)),
        0
      );
    }
    const grandTotal = filteredRt10.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const excludedTotal = filteredRt10.reduce((sum, c) => sum + (c.totalExcluded || 0), 0);
    return { totals, grandTotal, excludedTotal };
  }, [filteredRt10]);

  // Toggle status hitung kas per minggu langsung dari sel tabel
  const handleToggleWeekExclude = async (citizen: Citizen, week: number) => {
    const currentExcluded = Boolean(citizen.excludedWeeks?.[week]);
    const cellKey = `${citizen.id}-${week}`;
    setTogglingCell(cellKey);
    try {
      const res = await fetch('/api/warga/toggle-exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: citizen.id,
          week,
          excluded: !currentExcluded,
          updatedBy: currentUser.name
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingCell(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (citizen: Citizen) => {
    setEditingCitizen(citizen);
    setEditName(citizen.name);
    setEditRt(citizen.rt || '08');
    const wMap: { [w: number]: string } = {};
    const exclMap: { [w: number]: boolean } = {};
    for (let w = 1; w <= 12; w++) {
      wMap[w] = citizen.weeks[w] ? formatRupiah(citizen.weeks[w]) : '';
      exclMap[w] = Boolean(citizen.excludedWeeks?.[w]);
    }
    setEditWeeks(wMap);
    setEditExcludedWeeks(exclMap);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Submit Add Citizen
  const handleAddCitizen = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = newCitizenName.trim();
    if (!cleanName) {
      setErrorMsg('Nama warga tidak boleh kosong!');
      return;
    }

    const isDuplicate = citizens.some(
      c => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Akses ditolak! Nama "${cleanName}" sudah terdaftar dalam daftar warga.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          rt: newCitizenRt,
          recordedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menambahkan warga');
        return;
      }

      setSuccessMsg(`Warga "${cleanName}" (RT ${newCitizenRt}) berhasil ditambahkan!`);
      setNewCitizenName('');
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menambahkan warga');
    } finally {
      setLoading(false);
    }
  };

  // Submit Edit Citizen
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCitizen) return;
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = editName.trim();
    if (!cleanName) {
      setErrorMsg('Nama warga tidak boleh kosong!');
      return;
    }

    const isDuplicate = citizens.some(
      c => c.id !== editingCitizen.id && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Akses ditolak! Nama "${cleanName}" sudah digunakan warga lain.`);
      return;
    }

    const weeksParsed: { [w: number]: number } = {};
    for (let w = 1; w <= 12; w++) {
      weeksParsed[w] = parseRupiah(editWeeks[w] || 0);
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/citizens/${encodeURIComponent(editingCitizen.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          oldName: editingCitizen.name,
          rt: editRt,
          weeks: weeksParsed,
          excludedWeeks: editExcludedWeeks,
          editedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan perubahan');
        return;
      }

      setSuccessMsg(`Data warga "${cleanName}" berhasil diperbarui!`);
      setEditingCitizen(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  // Submit Delete Citizen
  const handleConfirmDeleteCitizen = async () => {
    if (!deletingCitizen) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/citizens/${encodeURIComponent(deletingCitizen.id)}?user=${encodeURIComponent(currentUser.name)}&name=${encodeURIComponent(deletingCitizen.name)}`,
        {
          method: 'DELETE'
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Gagal menghapus warga');
        return;
      }

      setSuccessMsg(`Data warga "${deletingCitizen.name}" berhasil dihapus.`);
      setDeletingCitizen(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menghapus data warga');
    } finally {
      setLoading(false);
    }
  };

  const grandTotalAllRt = rt08WeekTotals.grandTotal + rt09WeekTotals.grandTotal + rt10WeekTotals.grandTotal;
  const grandExcludedAllRt = rt08WeekTotals.excludedTotal + rt09WeekTotals.excludedTotal + rt10WeekTotals.excludedTotal;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Rekapitulasi Iuran Warga (12 Minggu — 3 Bagian RT)
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-700 text-amber-300 text-[11px] font-black">
                  <Calendar className="w-3 h-3" />
                  Minggu Berjalan: M-{activeWeek}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Total {citizens.length} warga terdaftar terbagi di RT 08, RT 09, &amp; RT 10 &bull; Kp. Kedung Sapi
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Tambah Warga Button */}
          <button
            type="button"
            id="btn-tambah-warga"
            onClick={() => {
              setNewCitizenName('');
              setNewCitizenRt('08');
              setErrorMsg('');
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Warga RT</span>
          </button>

          {/* Download PDF Per Minggu */}
          <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg p-1">
            <select
              value={rekapPdfWeek}
              onChange={(e) => setRekapPdfWeek(Number(e.target.value))}
              className="bg-white text-rose-950 font-bold text-xs py-1 px-2 rounded border border-rose-200 cursor-pointer focus:outline-none"
              title="Pilih minggu untuk download PDF"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Minggu {w}
                </option>
              ))}
            </select>
            <button
              type="button"
              id="btn-download-pdf-per-minggu"
              onClick={() => generatePdfLaporanMingguanUsser(rekapPdfWeek, citizens, [], currentUser.name)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold cursor-pointer shadow-xs whitespace-nowrap"
              title={`Download PDF Resmi Minggu Ke-${rekapPdfWeek}`}
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>PDF M-{rekapPdfWeek}</span>
            </button>
          </div>

          {/* Download PDF Laporan Rekap 12 Minggu */}
          <button
            type="button"
            id="btn-download-rekap-pdf"
            onClick={() => generatePdfKolomMingguanAdmin(citizens, totalSukarela, totalKeluar)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-rose-400" />
            <span>Download PDF 12 Minggu</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Feedback Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              id="input-cari-warga"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama warga di semua RT (RT 08, RT 09, RT 10)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-500 font-medium"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {successMsg && (
          <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-rose-600" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-rose-700 hover:text-rose-950">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* BAGIAN 1: RT 08                                                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-rose-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-rose-50/70 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-rose-700 text-white font-black text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>RT 08</span>
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Rekapitulasi Iuran Warga (Identitas Terhapus) — RT 08 (12 Minggu)
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {filteredRt08.length} dari {wargaRt08.length} warga RT 08 (Terurut A-Z)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-rose-700 block">
              Subtotal RT 08 (Masuk Kas)
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-rose-900">
              Rp {formatRupiah(rt08WeekTotals.grandTotal)}
            </span>
            {rt08WeekTotals.excludedTotal > 0 && (
              <span className="text-[10px] font-bold font-mono text-amber-700 block">
                Ditahan Sementara: Rp {formatRupiah(rt08WeekTotals.excludedTotal)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] relative">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0 z-20 shadow">
              <tr>
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">No</th>
                <th className="py-2.5 px-3 min-w-[155px] border-r border-slate-700 sticky left-0 bg-slate-800 z-30">
                  Identitas Warga (RT 08)
                </th>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <th
                    key={w}
                    className={`py-2.5 px-2 text-center min-w-[74px] border-r border-slate-700 whitespace-nowrap ${
                      w === activeWeek ? 'bg-rose-700 text-amber-300 font-black' : ''
                    }`}
                  >
                    <div>M-{w}</div>
                    {w === activeWeek && (
                      <div className="text-[9px] font-bold text-rose-100 leading-none mt-0.5">
                        AKTIF
                      </div>
                    )}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right min-w-[105px] border-r border-slate-700 bg-rose-900 text-amber-200">
                  Total
                </th>
                <th className="py-2.5 px-2 text-center min-w-[80px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRt08.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-slate-400 italic">
                    Tidak ada warga RT 08 yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredRt08.map((citizen, idx) => (
                  <tr key={citizen.id} className="hover:bg-rose-50/50 transition-colors group">
                    <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-rose-50/90 z-10 shadow-sm">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">Warga {idx + 1}</span>
                        {citizen.totalPaid > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="Sudah Berdonasi" />
                        )}
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                      const val = citizen.weeks[w] || 0;
                      const isExcl = Boolean(citizen.excludedWeeks?.[w]);
                      const isBusy = togglingCell === `${citizen.id}-${w}`;
                      return (
                        <td
                          key={w}
                          className={`py-1.5 px-1 text-right border-r border-slate-100 font-mono text-[11px] whitespace-nowrap ${
                            val > 0
                              ? isExcl
                                ? 'bg-amber-50/80 text-amber-800'
                                : 'text-rose-700 font-bold bg-rose-50/30'
                              : 'text-slate-300'
                          }`}
                        >
                          {val > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={isExcl ? 'line-through decoration-amber-600/70 text-amber-800 font-semibold' : ''}>
                                {formatRupiah(val)}
                              </span>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleWeekExclude(citizen, w)}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold cursor-pointer transition-colors ${
                                  isExcl
                                    ? 'bg-amber-200/90 hover:bg-amber-300 text-amber-950'
                                    : 'bg-rose-100/90 hover:bg-rose-200 text-rose-800'
                                }`}
                              >
                                {isBusy ? '...' : isExcl ? 'Ditahan' : 'Masuk Kas'}
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-800 bg-rose-50/40 border-r border-slate-100">
                      <div>Rp {formatRupiah(citizen.totalPaid)}</div>
                      {(citizen.totalExcluded || 0) > 0 && (
                        <div className="text-[10px] font-semibold text-amber-700">
                          Ditahan: Rp {formatRupiah(citizen.totalExcluded || 0)}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(citizen)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCitizen(citizen)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-20">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-center uppercase tracking-wider sticky left-0 bg-slate-900 z-30">
                  TOTAL RT 08
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <td key={w} className="py-2.5 px-1 text-right font-mono text-[11px] text-rose-300 whitespace-nowrap">
                    {formatRupiah(rt08WeekTotals.totals[w])}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right font-mono text-amber-300 text-xs sm:text-sm whitespace-nowrap">
                  Rp {formatRupiah(rt08WeekTotals.grandTotal)}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BAGIAN 2: RT 09                                                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-700 text-white font-black text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>RT 09</span>
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Rekapitulasi Iuran Warga — RT 09 (12 Minggu)
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {filteredRt09.length} dari {wargaRt09.length} warga RT 09 (Terurut A-Z)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-blue-700 block">
              Subtotal RT 09 (Masuk Kas)
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-blue-900">
              Rp {formatRupiah(rt09WeekTotals.grandTotal)}
            </span>
            {rt09WeekTotals.excludedTotal > 0 && (
              <span className="text-[10px] font-bold font-mono text-amber-700 block">
                Ditahan Sementara: Rp {formatRupiah(rt09WeekTotals.excludedTotal)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] relative">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0 z-20 shadow">
              <tr>
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">No</th>
                <th className="py-2.5 px-3 min-w-[155px] border-r border-slate-700 sticky left-0 bg-slate-800 z-30">
                  Nama Warga (RT 09)
                </th>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <th
                    key={w}
                    className={`py-2.5 px-2 text-center min-w-[74px] border-r border-slate-700 whitespace-nowrap ${
                      w === activeWeek ? 'bg-blue-700 text-amber-300 font-black' : ''
                    }`}
                  >
                    <div>M-{w}</div>
                    {w === activeWeek && (
                      <div className="text-[9px] font-bold text-blue-100 leading-none mt-0.5">
                        AKTIF
                      </div>
                    )}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right min-w-[105px] border-r border-slate-700 bg-blue-900 text-amber-200">
                  Total
                </th>
                <th className="py-2.5 px-2 text-center min-w-[80px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRt09.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-slate-400 italic">
                    Tidak ada warga RT 09 yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredRt09.map((citizen, idx) => (
                  <tr key={citizen.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-blue-50/90 z-10 shadow-sm">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">{citizen.name}</span>
                        {citizen.totalPaid > 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Sudah Berdonasi" />
                        )}
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                      const val = citizen.weeks[w] || 0;
                      const isExcl = Boolean(citizen.excludedWeeks?.[w]);
                      const isBusy = togglingCell === `${citizen.id}-${w}`;
                      return (
                        <td
                          key={w}
                          className={`py-1.5 px-1 text-right border-r border-slate-100 font-mono text-[11px] whitespace-nowrap ${
                            val > 0
                              ? isExcl
                                ? 'bg-amber-50/80 text-amber-800'
                                : 'text-blue-700 font-bold bg-blue-50/30'
                              : 'text-slate-300'
                          }`}
                        >
                          {val > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={isExcl ? 'line-through decoration-amber-600/70 text-amber-800 font-semibold' : ''}>
                                {formatRupiah(val)}
                              </span>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleWeekExclude(citizen, w)}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold cursor-pointer transition-colors ${
                                  isExcl
                                    ? 'bg-amber-200/90 hover:bg-amber-300 text-amber-950'
                                    : 'bg-blue-100/90 hover:bg-blue-200 text-blue-800'
                                }`}
                              >
                                {isBusy ? '...' : isExcl ? 'Ditahan' : 'Masuk Kas'}
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-800 bg-blue-50/40 border-r border-slate-100">
                      <div>Rp {formatRupiah(citizen.totalPaid)}</div>
                      {(citizen.totalExcluded || 0) > 0 && (
                        <div className="text-[10px] font-semibold text-amber-700">
                          Ditahan: Rp {formatRupiah(citizen.totalExcluded || 0)}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(citizen)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCitizen(citizen)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-20">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-center uppercase tracking-wider sticky left-0 bg-slate-900 z-30">
                  TOTAL RT 09
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <td key={w} className="py-2.5 px-1 text-right font-mono text-[11px] text-blue-300 whitespace-nowrap">
                    {formatRupiah(rt09WeekTotals.totals[w])}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right font-mono text-amber-300 text-xs sm:text-sm whitespace-nowrap">
                  Rp {formatRupiah(rt09WeekTotals.grandTotal)}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BAGIAN 3: RT 10                                                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>RT 10</span>
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Rekapitulasi Iuran Warga — RT 10 (12 Minggu)
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {filteredRt10.length} dari {wargaRt10.length} warga RT 10 (Terurut A-Z)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">
              Subtotal RT 10 (Masuk Kas)
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-950">
              Rp {formatRupiah(rt10WeekTotals.grandTotal)}
            </span>
            {rt10WeekTotals.excludedTotal > 0 && (
              <span className="text-[10px] font-bold font-mono text-amber-800 block">
                Ditahan Sementara: Rp {formatRupiah(rt10WeekTotals.excludedTotal)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] relative">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0 z-20 shadow">
              <tr>
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">No</th>
                <th className="py-2.5 px-3 min-w-[155px] border-r border-slate-700 sticky left-0 bg-slate-800 z-30">
                  Nama Warga (RT 10)
                </th>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <th
                    key={w}
                    className={`py-2.5 px-2 text-center min-w-[74px] border-r border-slate-700 whitespace-nowrap ${
                      w === activeWeek ? 'bg-amber-600 text-slate-950 font-black' : ''
                    }`}
                  >
                    <div>M-{w}</div>
                    {w === activeWeek && (
                      <div className="text-[9px] font-bold text-amber-100 leading-none mt-0.5">
                        AKTIF
                      </div>
                    )}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right min-w-[105px] border-r border-slate-700 bg-amber-900 text-amber-200">
                  Total
                </th>
                <th className="py-2.5 px-2 text-center min-w-[80px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRt10.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-slate-400 italic">
                    Tidak ada warga RT 10 yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredRt10.map((citizen, idx) => (
                  <tr key={citizen.id} className="hover:bg-amber-50/50 transition-colors group">
                    <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-amber-50/90 z-10 shadow-sm">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">{citizen.name}</span>
                        {citizen.totalPaid > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Sudah Berdonasi" />
                        )}
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                      const val = citizen.weeks[w] || 0;
                      const isExcl = Boolean(citizen.excludedWeeks?.[w]);
                      const isBusy = togglingCell === `${citizen.id}-${w}`;
                      return (
                        <td
                          key={w}
                          className={`py-1.5 px-1 text-right border-r border-slate-100 font-mono text-[11px] whitespace-nowrap ${
                            val > 0
                              ? isExcl
                                ? 'bg-amber-50/80 text-amber-800'
                                : 'text-amber-800 font-bold bg-amber-50/30'
                              : 'text-slate-300'
                          }`}
                        >
                          {val > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={isExcl ? 'line-through decoration-amber-600/70 text-amber-800 font-semibold' : ''}>
                                {formatRupiah(val)}
                              </span>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleWeekExclude(citizen, w)}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold cursor-pointer transition-colors ${
                                  isExcl
                                    ? 'bg-amber-200/90 hover:bg-amber-300 text-amber-950'
                                    : 'bg-rose-100/90 hover:bg-rose-200 text-rose-800'
                                }`}
                              >
                                {isBusy ? '...' : isExcl ? 'Ditahan' : 'Masuk Kas'}
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/40 border-r border-slate-100">
                      <div>Rp {formatRupiah(citizen.totalPaid)}</div>
                      {(citizen.totalExcluded || 0) > 0 && (
                        <div className="text-[10px] font-semibold text-amber-700">
                          Ditahan: Rp {formatRupiah(citizen.totalExcluded || 0)}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(citizen)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCitizen(citizen)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-20">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-center uppercase tracking-wider sticky left-0 bg-slate-900 z-30">
                  TOTAL RT 10
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <td key={w} className="py-2.5 px-1 text-right font-mono text-[11px] text-amber-300 whitespace-nowrap">
                    {formatRupiah(rt10WeekTotals.totals[w])}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right font-mono text-amber-300 text-xs sm:text-sm whitespace-nowrap">
                  Rp {formatRupiah(rt10WeekTotals.grandTotal)}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Ringkasan Gabungan ke Menu Uang Masuk */}
      <div className="bg-gradient-to-r from-rose-900 via-teal-900 to-slate-900 rounded-xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Total Gabungan Iuran Masuk (RT 08 + RT 09 + RT 10)
          </span>
          <p className="text-xs text-rose-100">
            RT 08 (<strong className="text-amber-200">Rp {formatRupiah(rt08WeekTotals.grandTotal)}</strong>) + RT 09 (<strong className="text-amber-200">Rp {formatRupiah(rt09WeekTotals.grandTotal)}</strong>) + RT 10 (<strong className="text-amber-200">Rp {formatRupiah(rt10WeekTotals.grandTotal)}</strong>)
          </p>
          {grandExcludedAllRt > 0 && (
            <p className="text-[11px] text-amber-300 font-mono font-semibold">
              • Total Ditahan Sementara: Rp {formatRupiah(grandExcludedAllRt)}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase text-rose-300 font-semibold block">
            Total Masuk Kas Donasi Warga
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
            Rp {formatRupiah(grandTotalAllRt)}
          </span>
        </div>
      </div>

      {/* Modal Tambah Warga */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <Plus className="w-4 h-4 text-rose-600" />
                Tambah Warga Baru (Pilih RT)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCitizen} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Pilih Bagian RT
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['08', '09', '10'] as const).map((rtVal) => (
                    <button
                      key={rtVal}
                      type="button"
                      onClick={() => setNewCitizenRt(rtVal)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newCitizenRt === rtVal
                          ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      RT {rtVal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Warga
                </label>
                <input
                  type="text"
                  required
                  id="input-tambah-nama-warga"
                  value={newCitizenName}
                  onChange={(e) => setNewCitizenName(e.target.value)}
                  placeholder="Contoh: Bpk. Sulaeman"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Warga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Warga & 12 Weeks */}
      {editingCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-4 sm:p-6 border border-rose-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  Edit Data Warga, RT &amp; Iuran 12 Minggu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCitizen(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Warga
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Wilayah RT
                  </label>
                  <select
                    value={editRt}
                    onChange={(e) => setEditRt(e.target.value as '08' | '09' | '10')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-rose-600"
                  >
                    <option value="08">RT 08</option>
                    <option value="09">RT 09</option>
                    <option value="10">RT 10</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Nominal Iuran Minggu ke-1 s/d 12
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                    <div key={w} className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Minggu {w}</span>
                        <label className="flex items-center gap-1 text-[10px] text-amber-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editExcludedWeeks[w])}
                            onChange={(e) =>
                              setEditExcludedWeeks(prev => ({ ...prev, [w]: e.target.checked }))
                            }
                            className="rounded text-amber-600 focus:ring-amber-500 w-3 h-3"
                          />
                          <span>Tahan</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editWeeks[w] || ''}
                        onChange={(e) =>
                          setEditWeeks(prev => ({ ...prev, [w]: formatInputNumber(e.target.value) }))
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-right focus:bg-white focus:border-rose-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCitizen(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Warga */}
      {deletingCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 border border-rose-100 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Data Warga?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda akan menghapus <strong className="text-slate-800">{deletingCitizen.name}</strong> (RT {deletingCitizen.rt || '08'}) beserta seluruh riwayat iurannya. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCitizen(null)}
                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDeleteCitizen}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
