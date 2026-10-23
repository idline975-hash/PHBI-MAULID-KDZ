import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { 
  HeartHandshake, Gift, Calculator, FileDown, 
  Calendar, CheckCircle2, AlertTriangle, Edit3, X, Clock, Search, FileText, Archive,
  ChevronLeft, ChevronRight, FolderArchive, RefreshCw, Sparkles, BookOpen, Lock
} from 'lucide-react';
import { Citizen, DonasiWargaPayment, DonasiSukarela, UserAccount, Pengeluaran, CommitteeSettings, ProposalData, PeriodArchive } from '../types';
import { formatRupiah, formatInputNumber, parseRupiah, getCurrentIndonesianTime } from '../utils/formatters';
import { getWeeklyScheduleInfo, resolveSukarelaWeek } from '../utils/weeklySchedule';
import { generatePdfLaporanUsser, generatePdfLaporanMingguanUsser } from '../utils/pdfGenerator';
import RekapitulasiTable from './RekapitulasiTable';
import ProposalKegiatan from './ProposalKegiatan';
import ArsipPeriodePanel from './ArsipPeriodePanel';

interface DashboardUsserProps {
  currentUser: UserAccount;
  citizens: Citizen[];
  wargaPayments: DonasiWargaPayment[];
  sukarelaPayments: DonasiSukarela[];
  pengeluaranList?: Pengeluaran[];
  totalSukarela: number;
  totalKeluar: number;
  targetPerPerson?: number;
  committeeSettings?: CommitteeSettings;
  proposalData?: ProposalData;
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
  onRefresh: () => void;
}

export default function DashboardUsser({
  currentUser,
  citizens,
  wargaPayments,
  sukarelaPayments,
  pengeluaranList = [],
  totalSukarela,
  totalKeluar,
  targetPerPerson = 250000,
  committeeSettings,
  proposalData,
  activePeriodLabel = '1448 H / 2027 M',
  periodArchives = [],
  onRefresh
}: DashboardUsserProps) {
  const scheduleInfo = getWeeklyScheduleInfo(committeeSettings);
  const activeSystemWeek = scheduleInfo.activeWeek;

  const [activeTab, setActiveTab] = useState<'warga' | 'sukarela' | 'total' | 'rekap' | 'proposal' | 'arsip_periode'>('warga');
  const [selectedPdfWeek, setSelectedPdfWeek] = useState<number>(activeSystemWeek);

  // Real-time Indonesian time
  const [realtimeClock, setRealtimeClock] = useState(getCurrentIndonesianTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeClock(getCurrentIndonesianTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- DONASI WARGA STATE ---
  const [selectedRtFilter, setSelectedRtFilter] = useState<'08' | '09' | '10' | 'all'>(
    currentUser.assignedRt || '08'
  );

  useEffect(() => {
    if (currentUser.assignedRt) {
      setSelectedRtFilter(currentUser.assignedRt);
    }
  }, [currentUser.assignedRt]);
  const [selectedCitizenId, setSelectedCitizenId] = useState('');
  const [citizenInputText, setCitizenInputText] = useState('');
  const [isCitizenDropdownOpen, setIsCitizenDropdownOpen] = useState(false);
  const [useSelectMode, setUseSelectMode] = useState(false);
  const [newCitizenInput, setNewCitizenInput] = useState('');
  const [isAddingNewCitizen, setIsAddingNewCitizen] = useState(false);
  const [wargaWeek, setWargaWeek] = useState<number>(activeSystemWeek);
  const [wargaAmount, setWargaAmount] = useState('10.000');
  const [wargaError, setWargaError] = useState('');
  const [wargaSuccess, setWargaSuccess] = useState('');
  const [wargaLoading, setWargaLoading] = useState(false);

  // Weekly History & Schedule Filter State
  const [historyViewMode, setHistoryViewMode] = useState<'per_week' | 'grouped_archive'>('per_week');
  const [historySelectedWeek, setHistorySelectedWeek] = useState<number>(activeSystemWeek);
  const [expandedArchiveWeeks, setExpandedArchiveWeeks] = useState<{ [w: number]: boolean }>({
    [activeSystemWeek]: true,
    [Math.max(1, activeSystemWeek - 1)]: true
  });
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  // Sync form week & history filter automatically when system activeWeek rotates
  useEffect(() => {
    setWargaWeek(activeSystemWeek);
    setSelectedPdfWeek(activeSystemWeek);
    setHistorySelectedWeek(activeSystemWeek);
    setSukarelaWeek(activeSystemWeek);
    setSukarelaHistoryWeek(activeSystemWeek);
    setExpandedArchiveWeeks(prev => ({
      ...prev,
      [activeSystemWeek]: true,
      [Math.max(1, activeSystemWeek - 1)]: true
    }));
  }, [activeSystemWeek]);

  const handleChangeSystemActiveWeek = async (newWeek: number, newAutoRotate?: boolean) => {
    if (newWeek < 1 || newWeek > 12) return;
    setUpdatingSchedule(true);
    try {
      const res = await fetch('/api/weekly-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWeek: newWeek,
          autoRotateWeekly: newAutoRotate !== undefined ? newAutoRotate : scheduleInfo.autoRotateWeekly,
          updatedBy: currentUser.name
        })
      });
      if (res.ok) {
        setWargaWeek(newWeek);
        setHistorySelectedWeek(newWeek);
        setSelectedPdfWeek(newWeek);
        setSukarelaWeek(newWeek);
        setSukarelaHistoryWeek(newWeek);
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating weekly schedule:', err);
    } finally {
      setUpdatingSchedule(false);
    }
  };

  // Filter & matching citizen search state (Selalu urut A-Z, disaring berdasarkan RT)
  const sortedCitizens = useMemo(() => {
    return [...citizens].sort((a, b) =>
      a.name.trim().replace(/\s+/g, ' ').localeCompare(
        b.name.trim().replace(/\s+/g, ' '),
        'id',
        { sensitivity: 'base', numeric: true }
      )
    );
  }, [citizens]);

  const activeRtCitizens = useMemo(() => {
    if (selectedRtFilter === 'all') return sortedCitizens;
    return sortedCitizens.filter(c => (c.rt || '08') === selectedRtFilter);
  }, [sortedCitizens, selectedRtFilter]);

  const rtFilteredWargaPayments = useMemo(() => {
    if (!currentUser.assignedRt) return wargaPayments;
    const citizensInRt = citizens.filter(c => c.rt === currentUser.assignedRt);
    const citizenIdsInRt = new Set(citizensInRt.map(c => c.id));
    return wargaPayments.filter(p => citizenIdsInRt.has(p.citizenId));
  }, [wargaPayments, citizens, currentUser.assignedRt]);

  const wargaUtamaCount = activeRtCitizens.length;
  const cleanTypedCitizen = citizenInputText.trim().replace(/\s+/g, ' ');
  const matchingCitizens = cleanTypedCitizen
    ? activeRtCitizens
        .filter(c => c.name.toLowerCase().includes(cleanTypedCitizen.toLowerCase()))
        .sort((a, b) => {
          const q = cleanTypedCitizen.toLowerCase();
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          if (aLower === q && bLower !== q) return -1;
          if (bLower === q && aLower !== q) return 1;
          const aStarts = aLower.startsWith(q);
          const bStarts = bLower.startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (bStarts && !aStarts) return 1;
          return a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true });
        })
    : activeRtCitizens;

  const exactCitizenMatch = cleanTypedCitizen
    ? activeRtCitizens.find(
        c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanTypedCitizen.toLowerCase()
      ) || null
    : null;

  const isNameNotMatched = !isAddingNewCitizen && !useSelectMode && cleanTypedCitizen.length > 0 && matchingCitizens.length === 0;

  const activeMatchedCitizen = useSelectMode
    ? activeRtCitizens.find(c => c.id === selectedCitizenId) || null
    : exactCitizenMatch;

  const handleCitizenInputChange = (val: string) => {
    setCitizenInputText(val);
    setIsCitizenDropdownOpen(true);
    setWargaError('');

    const normalized = val.trim().replace(/\s+/g, ' ').toLowerCase();
    const exact = activeRtCitizens.find(
      c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalized
    );
    if (exact) {
      setSelectedCitizenId(exact.id);
    } else {
      setSelectedCitizenId('');
    }
  };

  const handleSelectCitizen = (citizen: Citizen) => {
    setSelectedCitizenId(citizen.id);
    setCitizenInputText(citizen.name);
    setIsCitizenDropdownOpen(false);
    setWargaError('');
  };

  // Edit Donasi Warga
  const [editingPayment, setEditingPayment] = useState<DonasiWargaPayment | null>(null);
  const [editPaymentName, setEditPaymentName] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentWeek, setEditPaymentWeek] = useState<number>(1);

  // --- DONASI SUKA RELA STATE ---
  const [sukarelaName, setSukarelaName] = useState('');
  const [sukarelaAmount, setSukarelaAmount] = useState('50.000');
  const [sukarelaKet, setSukarelaKet] = useState('');
  const [sukarelaWeek, setSukarelaWeek] = useState<number>(activeSystemWeek);
  const [sukarelaHistoryMode, setSukarelaHistoryMode] = useState<'per_week' | 'grouped_archive'>('per_week');
  const [sukarelaHistoryWeek, setSukarelaHistoryWeek] = useState<number>(activeSystemWeek);
  const [sukarelaError, setSukarelaError] = useState('');
  const [sukarelaSuccess, setSukarelaSuccess] = useState('');
  const [sukarelaLoading, setSukarelaLoading] = useState(false);

  // Edit Donasi Suka Rela
  const [editingSukarela, setEditingSukarela] = useState<DonasiSukarela | null>(null);
  const [editSukarelaName, setEditSukarelaName] = useState('');
  const [editSukarelaAmount, setEditSukarelaAmount] = useState('');
  const [editSukarelaKet, setEditSukarelaKet] = useState('');

  // Calculations (excluding payments marked excludedFromTotal)
  const totalDonasiWarga = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );
  const totalDonasiWargaExcluded = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? (Number(p.amount) || 0) : 0),
    0
  );
  const totalDonasiSukaRela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalGabungan = totalDonasiWarga + totalDonasiSukaRela;

  const [togglingPaymentId, setTogglingPaymentId] = useState<string | null>(null);

  const handleTogglePaymentExclude = async (payment: DonasiWargaPayment) => {
    setTogglingPaymentId(payment.id);
    try {
      const res = await fetch('/api/warga/toggle-exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          citizenId: payment.citizenId,
          week: payment.week,
          excluded: !payment.excludedFromTotal,
          updatedBy: currentUser.name
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingPaymentId(null);
    }
  };

  // SUBMIT DONASI WARGA
  const handleSimpanDonasiWarga = async (e: FormEvent) => {
    e.preventDefault();
    setWargaError('');
    setWargaSuccess('');

    let citizenIdToUse = selectedCitizenId;
    let targetName = '';

    if (isAddingNewCitizen) {
      const cleanName = newCitizenInput.trim();
      if (!cleanName) {
        setWargaError('Nama warga tidak boleh kosong!');
        return;
      }
      // Duplicate name check
      const exists = citizens.some(
        c => c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) {
        setWargaError(`Akses Ditolak! Nama "${cleanName}" sudah terdaftar dalam daftar warga. Silakan pilih dari dropdown.`);
        return;
      }

      // Add citizen first
      setWargaLoading(true);
      try {
        const targetRt = selectedRtFilter === 'all' ? '08' : selectedRtFilter;
        const addRes = await fetch('/api/citizens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            rt: targetRt,
            recordedBy: currentUser.name
          })
        });
        const addData = await addRes.json();
        if (!addRes.ok) {
          setWargaError(addData.error || 'Gagal menambahkan warga baru');
          setWargaLoading(false);
          return;
        }
        citizenIdToUse = addData.citizen.id;
        targetName = cleanName;
      } catch (err) {
        console.error(err);
        setWargaError('Gagal memproses data warga');
        setWargaLoading(false);
        return;
      }
    } else if (useSelectMode) {
      const cit = activeRtCitizens.find(c => c.id === selectedCitizenId);
      if (!cit) {
        setWargaError('Silakan pilih nama warga dari dropdown terlebih dahulu!');
        return;
      }
      citizenIdToUse = cit.id;
      targetName = cit.name;
    } else {
      let resolvedCitizen: Citizen | null = exactCitizenMatch;
      if (!resolvedCitizen && selectedCitizenId) {
        const byId = activeRtCitizens.find(c => c.id === selectedCitizenId);
        if (byId && byId.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanTypedCitizen.toLowerCase()) {
          resolvedCitizen = byId;
        }
      }
      if (!resolvedCitizen && cleanTypedCitizen.length > 0 && matchingCitizens.length === 1) {
        resolvedCitizen = matchingCitizens[0];
      }

      if (!resolvedCitizen) {
        if (cleanTypedCitizen.length > 0 && matchingCitizens.length > 1) {
          setWargaError(
            `Terdapat ${matchingCitizens.length} nama warga yang cocok dengan "${cleanTypedCitizen}" (${matchingCitizens.slice(0, 4).map(c => c.name).join(', ')}). Silakan klik nama warga yang dimaksud pada daftar saran di bawah!`
          );
          setIsCitizenDropdownOpen(true);
        } else if (cleanTypedCitizen.length > 0) {
          setWargaError(`Peringatan: Nama tidak cocok! Warga "${citizenInputText.trim()}" tidak terdaftar dalam RT ${selectedRtFilter === 'all' ? 'pilihan' : selectedRtFilter}.`);
        } else {
          setWargaError('Silakan ketik atau pilih nama warga terlebih dahulu!');
        }
        return;
      }

      citizenIdToUse = resolvedCitizen.id;
      targetName = resolvedCitizen.name;
    }

    const numAmount = parseRupiah(wargaAmount);
    if (numAmount <= 0) {
      setWargaError('Nominal donasi harus lebih dari 0!');
      setWargaLoading(false);
      return;
    }

    setWargaLoading(true);
    try {
      const rtToAssign = selectedRtFilter === 'all' ? undefined : selectedRtFilter;
      const res = await fetch('/api/warga/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: citizenIdToUse,
          citizenName: targetName,
          rt: rtToAssign,
          week: wargaWeek,
          amount: numAmount,
          recordedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setWargaError(data.error || 'Gagal menyimpan pembayaran');
        return;
      }

      const savedName = data.citizen?.name || targetName;
      const savedRt = data.citizen?.rt || (selectedRtFilter === 'all' ? '08' : selectedRtFilter);
      setWargaSuccess(`Berhasil mencatat iuran ${savedName} (RT ${savedRt}) Minggu ke-${wargaWeek} sebesar Rp ${formatRupiah(numAmount)}! Data otomatis masuk ke Rekap RT ${savedRt}.`);
      setSelectedCitizenId('');
      setCitizenInputText('');
      setNewCitizenInput('');
      setIsAddingNewCitizen(false);
      setIsCitizenDropdownOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setWargaError('Terjadi kesalahan saat menyimpan donasi warga');
    } finally {
      setWargaLoading(false);
    }
  };

  // EDIT DONASI WARGA
  const handleOpenEditWarga = (payment: DonasiWargaPayment) => {
    setEditingPayment(payment);
    setEditPaymentName(payment.citizenName);
    setEditPaymentAmount(formatRupiah(payment.amount));
    setEditPaymentWeek(payment.week);
    setWargaError('');
  };

  const handleSaveEditWarga = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setWargaError('');

    const cleanName = editPaymentName.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      setWargaError('Nama warga tidak boleh kosong!');
      return;
    }

    const numAmount = parseRupiah(editPaymentAmount);
    if (numAmount <= 0) {
      setWargaError('Nominal iuran harus lebih besar dari 0!');
      return;
    }

    const matchedTargetCitizen = sortedCitizens.find(
      c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanName.toLowerCase()
    );

    setWargaLoading(true);
    try {
      const res = await fetch(`/api/warga/payment/${encodeURIComponent(editingPayment.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCitizenId: matchedTargetCitizen?.id,
          newCitizenName: matchedTargetCitizen ? matchedTargetCitizen.name : cleanName,
          amount: numAmount,
          week: editPaymentWeek,
          editedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setWargaError(data.error || 'Gagal mengubah data pembayaran');
        return;
      }

      setWargaSuccess(`Perubahan berhasil disimpan! Data diperbarui secara real-time.`);
      setEditingPayment(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setWargaError('Gagal mengubah data pembayaran');
    } finally {
      setWargaLoading(false);
    }
  };

  // SUBMIT DONASI SUKA RELA
  const handleSimpanSukarela = async (e: FormEvent) => {
    e.preventDefault();
    setSukarelaError('');
    setSukarelaSuccess('');

    const cleanName = sukarelaName.trim();
    if (!cleanName) {
      setSukarelaError('Nama donatur tidak boleh kosong!');
      return;
    }

    // Duplicate name check: "pada kolom pencarian nama warga jika terdapat nama yang sama tidak bisa di input, dan mendapatkan notifikasi nama tersebut sudah terdaftar"
    const duplicate = sukarelaPayments.some(
      s => s.donorName.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      setSukarelaError(`Akses ditolak! Nama donatur "${cleanName}" sudah terdaftar di Donasi Suka Rela.`);
      return;
    }

    const numAmount = parseRupiah(sukarelaAmount);
    if (numAmount <= 0) {
      setSukarelaError('Nominal donasi harus lebih dari 0!');
      return;
    }

    setSukarelaLoading(true);
    try {
      const res = await fetch('/api/sukarela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: cleanName,
          amount: numAmount,
          week: sukarelaWeek,
          keterangan: sukarelaKet || 'Donasi Sukarela PHBI Isra Miraj',
          recordedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSukarelaError(data.error || 'Gagal menyimpan donasi');
        return;
      }

      setSukarelaSuccess(`Donasi suka rela dari "${cleanName}" (Minggu ke-${sukarelaWeek}) senilai Rp ${formatRupiah(numAmount)} berhasil disimpan!`);
      setSukarelaName('');
      setSukarelaKet('');
      setSukarelaHistoryWeek(sukarelaWeek);
      onRefresh();
    } catch (err) {
      console.error(err);
      setSukarelaError('Terjadi kesalahan saat menyimpan donasi suka rela');
    } finally {
      setSukarelaLoading(false);
    }
  };

  // EDIT DONASI SUKA RELA
  const handleOpenEditSukarela = (item: DonasiSukarela) => {
    setEditingSukarela(item);
    setEditSukarelaName(item.donorName);
    setEditSukarelaAmount(formatRupiah(item.amount));
    setEditSukarelaKet(item.keterangan || '');
    setSukarelaError('');
  };

  const handleSaveEditSukarela = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSukarela) return;
    setSukarelaError('');

    const cleanName = editSukarelaName.trim();
    if (!cleanName) {
      setSukarelaError('Nama donatur tidak boleh kosong!');
      return;
    }

    if (cleanName.toLowerCase() !== editingSukarela.donorName.toLowerCase()) {
      const duplicate = sukarelaPayments.some(
        s => s.id !== editingSukarela.id && s.donorName.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        setSukarelaError(`Akses ditolak! Nama donatur "${cleanName}" sudah digunakan.`);
        return;
      }
    }

    const numAmount = parseRupiah(editSukarelaAmount);
    if (numAmount <= 0) {
      setSukarelaError('Nominal donasi harus lebih besar dari 0!');
      return;
    }

    setSukarelaLoading(true);
    try {
      const res = await fetch(`/api/sukarela/${editingSukarela.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: cleanName,
          amount: numAmount,
          keterangan: editSukarelaKet,
          editedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSukarelaError(data.error || 'Gagal menyimpan perubahan');
        return;
      }

      setSukarelaSuccess('Perubahan donasi suka rela berhasil disimpan secara real-time!');
      setEditingSukarela(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setSukarelaError('Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setSukarelaLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation Menu */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-300 p-2.5 sm:p-3 flex flex-wrap gap-2 relative z-10">
        <button
          type="button"
          id="btn-tab-donasi-warga"
          onClick={() => setActiveTab('warga')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'warga'
              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-teal-600" />
          <span>Donasi Warga</span>
        </button>

        <button
          type="button"
          id="btn-tab-donasi-sukarela"
          onClick={() => setActiveTab('sukarela')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sukarela'
              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-600" />
          <span>Donasi Suka Rela</span>
        </button>

        <button
          type="button"
          id="btn-tab-cek-total"
          onClick={() => setActiveTab('total')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'total'
              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-600" />
          <span>Cek Total & PDF</span>
        </button>

        <button
          type="button"
          id="btn-tab-rekap-warga"
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Rekap 12 Minggu</span>
        </button>

        <button
          type="button"
          id="btn-tab-proposal-usser"
          onClick={() => setActiveTab('proposal')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'proposal'
              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Proposal Kegiatan</span>
        </button>

        <button
          type="button"
          id="btn-tab-arsip-periode-usser"
          onClick={() => setActiveTab('arsip_periode')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'arsip_periode'
              ? 'bg-emerald-900 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-2 border-emerald-300 font-bold'
          }`}
        >
          <Archive className={`w-4 h-4 ${activeTab === 'arsip_periode' ? 'text-amber-300' : 'text-emerald-700'}`} />
          <span>Arsip Multi-Tahun ({periodArchives.length})</span>
        </button>
      </div>



      {/* 1. DONASI WARGA TAB */}
      {activeTab === 'warga' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Form: Input Donasi Warga */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Input Donasi Warga</h3>
                  <p className="text-xs text-slate-500">
                    Otomatis diarahkan ke <strong className="text-emerald-700">Minggu ke-{activeSystemWeek}</strong>
                  </p>
                </div>
              </div>

            </div>

            {wargaError && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">Peringatan Validasi</p>
                  <p>{wargaError}</p>
                </div>
              </div>
            )}

            {wargaSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{wargaSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSimpanDonasiWarga} className="space-y-4">
              {/* Tab Pilihan RT untuk Input Donasi Warga */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                    <span>Pilih Wilayah RT Warga</span>
                  </label>
                  {currentUser.assignedRt ? (
                    <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      RT {currentUser.assignedRt} (Terkunci)
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                      {selectedRtFilter === 'all' ? 'Semua RT' : `RT ${selectedRtFilter}`}
                    </span>
                  )}
                </div>

                {currentUser.assignedRt ? (
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-200/80 text-amber-900 rounded-lg shrink-0">
                        <Lock className="w-4 h-4 text-amber-800" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-amber-950">
                          Petugas Wilayah RT {currentUser.assignedRt}
                        </p>
                        <p className="text-[11px] text-amber-900 font-medium leading-tight">
                          Wilayah RT otomatis terkunci pada <strong>RT {currentUser.assignedRt}</strong>. Data yang Anda input langsung tersimpan di Rekapitulasi RT {currentUser.assignedRt}.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-950 border border-amber-400 px-2 py-1 rounded-md shrink-0">
                      🔒 Terkunci
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-300 relative z-10">
                      {(['08', '09', '10', 'all'] as const).map((rtVal) => (
                        <button
                          key={rtVal}
                          type="button"
                          onClick={() => {
                            setSelectedRtFilter(rtVal);
                            setSelectedCitizenId('');
                            setCitizenInputText('');
                            setWargaError('');
                            setIsCitizenDropdownOpen(false);
                          }}
                          className={`py-2 px-2 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                            selectedRtFilter === rtVal
                              ? 'bg-emerald-800 text-white shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                              : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                          }`}
                        >
                          {rtVal === 'all' ? 'Semua' : `RT ${rtVal}`}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      * Klik tab RT untuk menyaring nama warga. Data yang diinput otomatis masuk ke Rekapitulasi RT pilihan.
                    </p>
                  </>
                )}
              </div>

              {/* Tanggal & Waktu (Auto Real-time) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>Tanggal & Waktu Input</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Otomatis Real-Time
                  </span>
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{realtimeClock}</span>
                </div>
              </div>

              {/* Pembayaran: Pilih Minggu ke 1 - 12 (Otomatis Mengikuti Minggu Aktif) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Pembayaran (Minggu Ke)
                  </label>
                  {wargaWeek === activeSystemWeek ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Otomatis Minggu Aktif (M-{activeSystemWeek})
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setWargaWeek(activeSystemWeek);
                        setHistorySelectedWeek(activeSystemWeek);
                      }}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer underline"
                    >
                      Kembali ke Minggu Aktif (M-{activeSystemWeek})
                    </button>
                  )}
                </div>
                <select
                  id="select-pembayaran-minggu"
                  value={wargaWeek}
                  onChange={(e) => {
                    const chosen = parseInt(e.target.value, 10);
                    if (chosen >= activeSystemWeek) {
                      setWargaWeek(chosen);
                      setHistorySelectedWeek(chosen);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-900 focus:bg-white focus:border-emerald-600"
                >
                  {scheduleInfo.weeks.map((wk) => (
                    <option key={wk.week} value={wk.week} disabled={wk.week < activeSystemWeek}>
                      Minggu {wk.week}{wk.week === activeSystemWeek ? ' (Aktif)' : wk.week < activeSystemWeek ? ' (Terlewat)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Warga */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <span>Nama Warga</span>
                    {isNameNotMatched && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-emerald-600" />
                        Nama Tidak Cocok
                      </span>
                    )}
                    {activeMatchedCitizen && !isNameNotMatched && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Terdaftar
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUseSelectMode(!useSelectMode);
                        setIsAddingNewCitizen(false);
                        setWargaError('');
                        setIsCitizenDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline"
                    >
                      {useSelectMode ? 'Mode Ketik Nama' : 'Pilih dari Dropdown'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCitizen(!isAddingNewCitizen);
                        setUseSelectMode(false);
                        setWargaError('');
                        setIsCitizenDropdownOpen(false);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
                    >
                      {isAddingNewCitizen ? 'Batal' : '+ Warga Baru'}
                    </button>
                  </div>
                </div>

                {isAddingNewCitizen ? (
                  <div>
                    <input
                      type="text"
                      id="input-donasi-nama-baru"
                      required
                      value={newCitizenInput}
                      onChange={(e) => setNewCitizenInput(e.target.value)}
                      placeholder="Ketik nama warga baru..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      * Warga baru akan otomatis terdaftar di tabel Rekapitulasi 12 Minggu.
                    </p>
                  </div>
                ) : useSelectMode ? (
                  <div>
                    <select
                      id="select-donasi-warga"
                      required
                      value={selectedCitizenId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setSelectedCitizenId(selId);
                        const c = activeRtCitizens.find((item) => item.id === selId);
                        setCitizenInputText(c ? c.name : '');
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">-- Pilih Nama Warga RT {selectedRtFilter === 'all' ? 'Gabungan' : selectedRtFilter} ({wargaUtamaCount} terdaftar) --</option>
                      {activeRtCitizens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.isNgontrak ? ' [Ngontrak]' : ''} {c.totalPaid > 0 ? `(Sudah bayar: Rp ${formatRupiah(c.totalPaid)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className={`w-4 h-4 ${isNameNotMatched ? 'text-emerald-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="text"
                        id="input-nama-warga"
                        value={citizenInputText}
                        onChange={(e) => handleCitizenInputChange(e.target.value)}
                        onFocus={() => setIsCitizenDropdownOpen(true)}
                        placeholder="Ketik nama warga (contoh: Yandi, Koder, Agus...)"
                        autoComplete="off"
                        className={`w-full pl-10 pr-20 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isNameNotMatched
                            ? 'bg-emerald-50/60 border-2 border-emerald-500 text-emerald-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                            : activeMatchedCitizen
                            ? 'bg-emerald-50/50 border-2 border-emerald-500 text-emerald-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                            : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                        {citizenInputText && (
                          <button
                            type="button"
                            onClick={() => {
                              setCitizenInputText('');
                              setSelectedCitizenId('');
                              setIsCitizenDropdownOpen(false);
                              setWargaError('');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Hapus teks"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </div>

                    {/* PERINGATAN NAMA TIDAK COCOK */}
                    {isNameNotMatched && (
                      <div 
                        id="peringatan-nama-tidak-cocok"
                        className="mt-2 p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-shake shadow-sm"
                      >
                        <AlertTriangle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                            Peringatan: Nama Tidak Cocok!
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Nama &ldquo;<span className="font-bold text-emerald-950 underline">{citizenInputText}</span>&rdquo; tidak terdaftar di sistem ({wargaUtamaCount} data warga resmi PHBI RT 011 / RW 04).
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-1">
                            Silakan ketik nama yang sesuai atau klik &ldquo;Pilih dari Dropdown&rdquo; untuk melihat seluruh daftar warga.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* INFO NAMA COCOK */}
                    {activeMatchedCitizen && !isNameNotMatched && (
                      <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Nama Cocok: <strong>{activeMatchedCitizen.name}</strong></span>
                          {activeMatchedCitizen.isNgontrak && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Ngontrak
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-700 font-mono">
                          Total Iuran: Rp {formatRupiah(activeMatchedCitizen.totalPaid)}
                        </span>
                      </div>
                    )}

                    {/* SUGGESTION DROPDOWN KETIKA MENGETIK */}
                    {isCitizenDropdownOpen && cleanTypedCitizen.length > 0 && !isNameNotMatched && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 sticky top-0 flex items-center justify-between border-b border-slate-200">
                          <span>Saran Nama Warga Terdaftar ({matchingCitizens.length})</span>
                          <button
                            type="button"
                            onClick={() => setIsCitizenDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                        {matchingCitizens.slice(0, 15).map((c) => {
                          const isSelected = selectedCitizenId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCitizen(c)}
                              className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                <span>{c.name}</span>
                                {c.isNgontrak && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    Ngontrak
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                {c.totalPaid > 0 ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    Rp {formatRupiah(c.totalPaid)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Belum ada iuran</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Donasi Warga (Contoh: 10.000) with dot format */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Donasi Warga (Rp)
                  </label>
                  <span className="text-[11px] text-slate-500">Contoh: 10.000</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    id="input-donasi-warga-jumlah"
                    required
                    value={wargaAmount}
                    onChange={(e) => setWargaAmount(formatInputNumber(e.target.value))}
                    placeholder="10.000"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold font-mono text-emerald-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />

                </div>
              </div>

              {/* Quick Nominal Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[10000, 20000, 50000, 100000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => setWargaAmount(formatRupiah(nominal))}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer"
                  >
                    Rp {formatRupiah(nominal)}
                  </button>
                ))}
              </div>

              {/* Simpan Data Button */}
              <button
                type="submit"
                id="btn-simpan-donasi-warga"
                disabled={wargaLoading}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{wargaLoading ? 'Menyimpan...' : `Simpan Donasi Minggu Ke-${wargaWeek}`}</span>
              </button>

              {/* Quick Download PDF per Minggu for active wargaWeek */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-quick-download-pdf-warga-week"
                  onClick={() => generatePdfLaporanMingguanUsser(wargaWeek, citizens, wargaPayments, currentUser.name)}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.99] text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  title={`Download cetak PDF laporan resmi khusus Minggu Ke-${wargaWeek}`}
                >
                  <FileDown className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Download PDF Iuran Minggu Ke-{wargaWeek}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Riwayat Pencatatan Per Minggu & Arsip Rapi */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span>Riwayat Donasi Warga Per Minggu</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {historyViewMode === 'per_week' ? `Minggu Ke-${historySelectedWeek}` : 'Arsip 12 Minggu'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diperbarui otomatis setiap minggu &amp; riwayat minggu sebelumnya tetap tersimpan rapi
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                  Total Kas: Rp {formatRupiah(totalDonasiWarga)}
                </span>
                {totalDonasiWargaExcluded > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                    Ditahan: Rp {formatRupiah(totalDonasiWargaExcluded)}
                  </span>
                )}
              </div>
            </div>

            {/* Mode Tampilan Riwayat: Minggu Terpilih vs Arsip Rapi Semua Minggu */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-2 rounded-2xl border-2 border-slate-300 relative z-10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryViewMode('per_week');
                    setHistorySelectedWeek(activeSystemWeek);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    historyViewMode === 'per_week'
                      ? 'bg-emerald-800 text-white font-black shadow-md border-2 border-emerald-950'
                      : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                  }`}
                >
                  Minggu Berjalan / Per Minggu
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('grouped_archive')}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    historyViewMode === 'grouped_archive'
                      ? 'bg-emerald-800 text-white font-black shadow-md border-2 border-emerald-950'
                      : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Arsip Rapi Tiap Minggu (M-1 s/d M-12)</span>
                </button>
              </div>

              {historyViewMode === 'per_week' && historySelectedWeek !== activeSystemWeek && (
                <button
                  type="button"
                  onClick={() => setHistorySelectedWeek(activeSystemWeek)}
                  className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Lihat Minggu Ini (M-{activeSystemWeek})
                </button>
              )}
            </div>

            {/* Pemilih Cepat Folder Minggu 1 - 12 */}
            {historyViewMode === 'per_week' && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 relative z-10">
                {scheduleInfo.weeks.map((wk) => {
                  const countInWeek = wargaPayments.filter(p => p.week === wk.week).length;
                  const isSel = historySelectedWeek === wk.week;
                  const isCurr = wk.week === activeSystemWeek;
                  return (
                    <button
                      key={wk.week}
                      type="button"
                      onClick={() => setHistorySelectedWeek(wk.week)}
                      className={`py-1.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                        isSel
                          ? 'bg-emerald-800 text-white border-emerald-950 font-black shadow-md ring-2 ring-emerald-300'
                          : isCurr
                          ? 'bg-amber-100 text-slate-950 border-amber-500 font-black'
                          : countInWeek > 0
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold hover:bg-emerald-200'
                          : 'bg-white text-slate-700 border-slate-300 font-semibold hover:bg-slate-100'
                      }`}
                      title={`Minggu ke-${wk.week} (${wk.rangeLabel}) • ${countInWeek} transaksi`}
                    >
                      <span className="text-[11px] font-black leading-tight">
                        M-{wk.week}
                      </span>
                      <span className={`text-[9px] font-mono leading-tight ${
                        isSel ? 'text-amber-300 font-black' : countInWeek > 0 ? 'text-emerald-900 font-black' : 'text-slate-600'
                      }`}>
                        {countInWeek} data
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Daftar Riwayat Sesuai Mode */}
            <div className="overflow-y-auto max-h-[520px] space-y-2.5 pr-1 flex-1">
              {historyViewMode === 'per_week' ? (
                (() => {
                  const weekMeta = scheduleInfo.weeks[historySelectedWeek - 1] || scheduleInfo.weeks[0];
                  const weekPayments = rtFilteredWargaPayments.filter(p => p.week === historySelectedWeek);
                  const weekTotalIncluded = weekPayments.reduce(
                    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
                    0
                  );
                  const weekTotalExcluded = weekPayments.reduce(
                    (s, p) => s + (p.excludedFromTotal ? (Number(p.amount) || 0) : 0),
                    0
                  );

                  return (
                    <div className="space-y-2.5">
                      {/* Ringkasan Minggu Terpilih */}
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-emerald-950">
                              Buku Riwayat Minggu Ke-{historySelectedWeek}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-800">
                              ({weekMeta.rangeLabel})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              historySelectedWeek === activeSystemWeek
                                ? 'bg-amber-300 text-slate-950'
                                : 'bg-white text-emerald-800 border border-emerald-200'
                            }`}>
                              {weekMeta.statusLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800 mt-0.5 font-mono">
                            {weekPayments.length} Transaksi · Masuk Kas: <strong>Rp {formatRupiah(weekTotalIncluded)}</strong>
                            {weekTotalExcluded > 0 && ` · Ditahan: Rp ${formatRupiah(weekTotalExcluded)}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => generatePdfLaporanMingguanUsser(historySelectedWeek, citizens, wargaPayments, currentUser.name)}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <FileDown className="w-3.5 h-3.5 text-amber-300" />
                          <span>PDF M-{historySelectedWeek}</span>
                        </button>
                      </div>

                      {weekPayments.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                          <HeartHandshake className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">
                            Belum ada transaksi donasi warga pada Minggu ke-{historySelectedWeek} ({weekMeta.shortRangeLabel}).
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {historySelectedWeek === activeSystemWeek
                              ? `Buku riwayat Minggu ke-${historySelectedWeek} telah diperbarui & siap mencatat iuran minggu ini. Data minggu sebelumnya tetap tersimpan rapi di tab M-1 s/d M-${Math.max(1, historySelectedWeek - 1)}.`
                              : 'Silakan pilih minggu lain di atas atau gunakan form di samping untuk menginput.'}
                          </p>
                        </div>
                      ) : (
                        weekPayments.map((payment) => {
                          const isExcl = Boolean(payment.excludedFromTotal);
                          const isBusy = togglingPaymentId === payment.id;
                          return (
                            <div
                              key={payment.id}
                              className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isExcl
                                  ? 'bg-amber-50/70 border-amber-300'
                                  : 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {citizens.find(c => c.id === payment.citizenId)?.rt === '08' ? 'Warga (Identitas Terhapus)' : payment.citizenName}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Minggu ke-{payment.week}
                                  </span>
                                  {isExcl && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                                      Tidak Masuk Total Kas
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {payment.timestamp}
                                  </span>
                                  <span>•</span>
                                  <span>Input: <strong>{payment.recordedBy}</strong></span>
                                </div>
                                {payment.lastEditedBy && (
                                  <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                    * Diedit oleh: {payment.lastEditedBy} ({payment.lastEditedAt})
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                                <span className={`font-bold font-mono text-sm sm:text-base ${isExcl ? 'text-amber-800 line-through' : 'text-emerald-800'}`}>
                                  Rp {formatRupiah(payment.amount)}
                                </span>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleTogglePaymentExclude(payment)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                    isExcl
                                      ? 'bg-amber-200 hover:bg-amber-300 text-amber-950'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                  }`}
                                  title={
                                    isExcl
                                      ? 'Klik untuk memasukkan kembali ke Total Uang Masuk'
                                      : 'Klik untuk mengecualikan sementara dari Total Uang Masuk'
                                  }
                                >
                                  {isBusy ? '...' : isExcl ? 'Masukkan ke Total' : 'Tahan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditWarga(payment)}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Edit Nama Warga / Uang Masuk"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()
              ) : (
                /* MODE ARSIP RAPI PER MINGGU (M-1 s/d M-12) */
                <div className="space-y-3">
                  {scheduleInfo.weeks.map((wk) => {
                    const weekPayments = rtFilteredWargaPayments.filter(p => p.week === wk.week);
                    if (weekPayments.length === 0 && wk.week !== activeSystemWeek && wk.week > activeSystemWeek) {
                      return null;
                    }
                    const weekIncluded = weekPayments.reduce(
                      (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
                      0
                    );
                    const weekExcluded = weekPayments.reduce(
                      (s, p) => s + (p.excludedFromTotal ? (Number(p.amount) || 0) : 0),
                      0
                    );
                    const isExpanded = Boolean(expandedArchiveWeeks[wk.week]);

                    return (
                      <div
                        key={wk.week}
                        className={`rounded-xl border overflow-hidden ${
                          wk.week === activeSystemWeek
                            ? 'border-emerald-400 bg-emerald-50/30'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div
                          onClick={() =>
                            setExpandedArchiveWeeks(prev => ({
                              ...prev,
                              [wk.week]: !prev[wk.week]
                            }))
                          }
                          className="p-3 bg-slate-50 hover:bg-slate-100/80 flex flex-wrap items-center justify-between gap-2 cursor-pointer border-b border-slate-200/70"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${
                              wk.week === activeSystemWeek
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-800 text-white'
                            }`}>
                              Minggu Ke-{wk.week}
                            </span>
                            <span className="text-xs font-mono text-slate-600">
                              {wk.rangeLabel}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              · {weekPayments.length} Warga
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-emerald-800">
                              Rp {formatRupiah(weekIncluded)}
                            </span>
                            {weekExcluded > 0 && (
                              <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                Ditahan: Rp {formatRupiah(weekExcluded)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePdfLaporanMingguanUsser(wk.week, citizens, wargaPayments, currentUser.name);
                              }}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <FileDown className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                            <span className="text-[11px] font-bold text-slate-500">
                              {isExpanded ? 'Tutup' : 'Buka'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-2.5 space-y-2">
                            {weekPayments.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-3">
                                Belum ada pencatatan donasi warga pada Minggu ke-{wk.week}.
                              </p>
                            ) : (
                              weekPayments.map((payment) => {
                                const isExcl = Boolean(payment.excludedFromTotal);
                                const isBusy = togglingPaymentId === payment.id;
                                return (
                                  <div
                                    key={payment.id}
                                    className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                      isExcl ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                          {payment.citizenName}
                                        </span>
                                        {isExcl && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                                            Ditahan
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        {payment.timestamp} · {payment.recordedBy}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold font-mono text-xs sm:text-sm ${isExcl ? 'text-amber-800 line-through' : 'text-emerald-800'}`}>
                                        Rp {formatRupiah(payment.amount)}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleTogglePaymentExclude(payment)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                                          isExcl ? 'bg-amber-200 text-amber-950' : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {isExcl ? 'Masukkan' : 'Tahan'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditWarga(payment)}
                                        className="p-1 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 2. DONASI SUKA RELA TAB */}
      {activeTab === 'sukarela' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form Donasi Suka Rela */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Input Donasi Suka Rela</h3>
                  <p className="text-xs text-slate-500">
                    Otomatis tercatat pada <strong className="text-amber-800">Minggu ke-{sukarelaWeek}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {currentUser.name}
                </span>
              </div>
            </div>

            {sukarelaError && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">Peringatan Validasi</p>
                  <p>{sukarelaError}</p>
                </div>
              </div>
            )}

            {sukarelaSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{sukarelaSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSimpanSukarela} className="space-y-4">
              {/* Nama Donatur with Duplicate Check */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nama Donatur
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-sukarela-nama"
                    required
                    value={sukarelaName}
                    onChange={(e) => setSukarelaName(e.target.value)}
                    placeholder="Contoh: H. Apipi / Hamba Allah / Bpk. Samsul"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />

                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Nama yang sudah terdaftar tidak dapat diinput ganda (akan ada peringatan).
                </p>
              </div>

              {/* Minggu Pencatatan Donasi Sukarela */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Minggu Pencatatan
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Otomatis Minggu Ke-{activeSystemWeek}
                  </span>
                </div>
                <select
                  value={sukarelaWeek}
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10);
                    if (w >= activeSystemWeek) {
                      setSukarelaWeek(w);
                      setSukarelaHistoryWeek(w);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-amber-950 focus:bg-white focus:border-emerald-600"
                >
                  {scheduleInfo.weeks.map((wk) => (
                    <option key={wk.week} value={wk.week} disabled={wk.week < activeSystemWeek}>
                      Minggu {wk.week}{wk.week === activeSystemWeek ? ' (Aktif)' : wk.week < activeSystemWeek ? ' (Terlewat)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal (Auto Real-time) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>Tanggal & Waktu Otomatis</span>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                    Real-Time
                  </span>
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{realtimeClock}</span>
                </div>
              </div>

              {/* Uang Masuk with dot formatting */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Uang Masuk (Rp)
                  </label>
                  <span className="text-[11px] text-slate-500">Contoh: 50.000</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    id="input-sukarela-jumlah"
                    required
                    value={sukarelaAmount}
                    onChange={(e) => setSukarelaAmount(formatInputNumber(e.target.value))}
                    placeholder="50.000"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold font-mono text-emerald-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />

                </div>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Keterangan / Keperluan (Opsional)
                </label>
                <input
                  type="text"
                  value={sukarelaKet}
                  onChange={(e) => setSukarelaKet(e.target.value)}
                  placeholder="Contoh: Titipan donasi konsumsi / infak shodaqoh"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* Simpan Button */}
              <button
                type="submit"
                id="btn-simpan-donasi-sukarela"
                disabled={sukarelaLoading}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{sukarelaLoading ? 'Menyimpan...' : `Simpan Donasi Suka Rela (M-${sukarelaWeek})`}</span>
              </button>
            </form>
          </div>

          {/* Right: Riwayat Donasi Suka Rela Per Minggu */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span>Riwayat Donasi Suka Rela Per Minggu</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {sukarelaHistoryMode === 'per_week' ? `Minggu Ke-${sukarelaHistoryWeek}` : 'Arsip 12 Minggu'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Diperbarui setiap minggu &amp; tersimpan rapi dari setiap minggunya
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                Total Semua: Rp {formatRupiah(totalDonasiSukaRela)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-2 rounded-2xl border-2 border-slate-300 relative z-10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSukarelaHistoryMode('per_week');
                    setSukarelaHistoryWeek(activeSystemWeek);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    sukarelaHistoryMode === 'per_week'
                      ? 'bg-amber-600 text-slate-950 font-black shadow-md border-2 border-amber-800'
                      : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                  }`}
                >
                  Minggu Berjalan / Per Minggu
                </button>
                <button
                  type="button"
                  onClick={() => setSukarelaHistoryMode('grouped_archive')}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    sukarelaHistoryMode === 'grouped_archive'
                      ? 'bg-amber-600 text-slate-950 font-black shadow-md border-2 border-amber-800'
                      : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Arsip Rapi Semua Minggu ({sukarelaPayments.length})</span>
                </button>
              </div>
            </div>

            {sukarelaHistoryMode === 'per_week' && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 relative z-10">
                {scheduleInfo.weeks.map((wk) => {
                  const countInWeek = sukarelaPayments.filter(
                    item => resolveSukarelaWeek(item, committeeSettings) === wk.week
                  ).length;
                  const isSel = sukarelaHistoryWeek === wk.week;
                  const isCurr = wk.week === activeSystemWeek;
                  return (
                    <button
                      key={wk.week}
                      type="button"
                      onClick={() => setSukarelaHistoryWeek(wk.week)}
                      className={`py-1.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSel
                          ? 'bg-amber-500 text-slate-950 border-amber-700 font-black shadow-md ring-2 ring-amber-300'
                          : isCurr
                          ? 'bg-amber-100 text-slate-950 border-amber-400 font-black'
                          : countInWeek > 0
                          ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold hover:bg-amber-200'
                          : 'bg-white text-slate-700 border-slate-300 font-semibold hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-black leading-tight">M-{wk.week}</span>
                      <span className={`text-[9px] font-mono leading-tight ${isSel ? 'text-slate-950 font-black' : countInWeek > 0 ? 'text-amber-950 font-black' : 'text-slate-600'}`}>
                        {countInWeek} data
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-y-auto max-h-[520px] space-y-2 pr-1 flex-1">
              {sukarelaHistoryMode === 'per_week' ? (
                (() => {
                  const weekItems = sukarelaPayments.filter(
                    item => resolveSukarelaWeek(item, committeeSettings) === sukarelaHistoryWeek
                  );
                  const weekSum = weekItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
                  const wkMeta = scheduleInfo.weeks[sukarelaHistoryWeek - 1] || scheduleInfo.weeks[0];

                  return (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-amber-950">
                            Donasi Suka Rela Minggu Ke-{sukarelaHistoryWeek} ({wkMeta.rangeLabel})
                          </span>
                          <p className="text-[11px] text-amber-800 font-mono">
                            {weekItems.length} Donatur · Subtotal Minggu Ke-{sukarelaHistoryWeek}: <strong>Rp {formatRupiah(weekSum)}</strong>
                          </p>
                        </div>
                      </div>

                      {weekItems.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                          <Gift className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">
                            Belum ada donasi suka rela pada Minggu ke-{sukarelaHistoryWeek}.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Riwayat donasi minggu lainnya tersimpan rapi pada tab M-1 s/d M-12 di atas.
                          </p>
                        </div>
                      ) : (
                        weekItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 hover:bg-amber-50/40 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {item.donorName}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                                  Minggu ke-{resolveSukarelaWeek(item, committeeSettings)}
                                </span>
                                <span className="text-[10px] text-slate-500 italic">
                                  ({item.keterangan || 'Donasi Sukarela'})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {item.timestamp}
                                </span>
                                <span>•</span>
                                <span>Input: <strong>{item.recordedBy}</strong></span>
                              </div>
                              {item.lastEditedBy && (
                                <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                  * Diedit oleh: {item.lastEditedBy} ({item.lastEditedAt})
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                              <span className="font-bold font-mono text-amber-800 text-sm sm:text-base">
                                Rp {formatRupiah(item.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSukarela(item)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Edit Donasi Suka Rela"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-3">
                  {scheduleInfo.weeks.map((wk) => {
                    const weekItems = sukarelaPayments.filter(
                      item => resolveSukarelaWeek(item, committeeSettings) === wk.week
                    );
                    if (weekItems.length === 0 && wk.week !== activeSystemWeek) return null;
                    const weekSum = weekItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
                    return (
                      <div key={wk.week} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-3 bg-amber-50/70 border-b border-amber-200/70 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-amber-700 text-white text-xs font-bold">
                              Minggu Ke-{wk.week}
                            </span>
                            <span className="text-xs font-mono text-slate-600">{wk.rangeLabel}</span>
                            <span className="text-[11px] text-slate-500">· {weekItems.length} Donatur</span>
                          </div>
                          <span className="text-xs font-bold font-mono text-amber-900">
                            Rp {formatRupiah(weekSum)}
                          </span>
                        </div>
                        <div className="p-2.5 space-y-2">
                          {weekItems.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">
                              Belum ada donasi suka rela pada Minggu ke-{wk.week}.
                            </p>
                          ) : (
                            weekItems.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.donorName}</span>
                                  <p className="text-[11px] text-slate-500 font-mono">{item.timestamp}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold font-mono text-amber-800 text-xs sm:text-sm">
                                    Rp {formatRupiah(item.amount)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSukarela(item)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CEK TOTAL DONASI WARGA DAN DONASI SUKA RELA TAB */}
      {activeTab === 'total' && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 sm:p-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Cek Total Donasi Warga & Donasi Suka Rela
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Laporan ringkasan akumulasi seluruh penerimaan dana panitia Isra Miraj secara real-time.
            </p>
          </div>

          {/* Metric Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Donasi Warga Card */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  1. Donasi Warga ({wargaUtamaCount} Warga)
                </span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-900">
                  Rp {formatRupiah(totalDonasiWarga)}
                </p>
              </div>
              <p className="text-[11px] text-emerald-700 mt-3 font-medium">
                {wargaUtamaCount} warga terdaftar • {wargaPayments.length} transaksi tercatat dari 12 minggu
              </p>
            </div>

            {/* Donasi Suka Rela Card */}
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  2. Donasi Suka Rela
                </span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-amber-900">
                  Rp {formatRupiah(totalDonasiSukaRela)}
                </p>
              </div>
              <p className="text-[11px] text-amber-700 mt-3 font-medium">
                {sukarelaPayments.length} donatur sukarela terdaftar
              </p>
            </div>

            {/* Grand Total Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-1">
                  TOTAL KESELURUHAN DANA MASUK
                </span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                  Rp {formatRupiah(totalGabungan)}
                </p>
              </div>
              <p className="text-[11px] text-emerald-200 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Data terverifikasi panitia real-time
              </p>
            </div>
          </div>

          {/* MODUL DOWNLOAD PDF PER MINGGU (Permintaan Khusus Usser) */}
          <div className="p-5 sm:p-6 bg-white border-2 border-emerald-300 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>Download Laporan PDF Per Minggu (1 s/d 12)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Resmi
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cetak arsip PDF iuran warga per minggu khusus untuk setiap Usser ({currentUser.name})
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-center">
                Format KOP Surat PHBI
              </span>
            </div>

            {/* Week Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Minggu Iuran (Klik untuk melihat ringkasan & unduh):
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                  const weekPaidCount = citizens.filter(c => !c.isNgontrak && (Number(c.weeks?.[w]) || 0) > 0).length;
                  const isSelected = selectedPdfWeek === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      id={`btn-select-pdf-week-${w}`}
                      onClick={() => setSelectedPdfWeek(w)}
                      className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/50 scale-[1.03]'
                          : 'bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-black">M-{w}</span>
                      <span className={`text-[10px] truncate max-w-full font-semibold ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {weekPaidCount} Warga
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Selected Week Summary Card & Download Action */}
            {(() => {
              const activeWeekSum = citizens.reduce((s, c) => s + (Number(c.weeks?.[selectedPdfWeek]) || 0), 0);
              const activeWeekPaid = citizens.filter(c => !c.isNgontrak && (Number(c.weeks?.[selectedPdfWeek]) || 0) > 0).length;
              const activeWeekUnpaid = Math.max(0, wargaUtamaCount - activeWeekPaid);
              const percentage = wargaUtamaCount > 0 ? Math.min(100, Math.round((activeWeekPaid / wargaUtamaCount) * 100)) : 0;

              return (
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-emerald-950">
                        Laporan Iuran Minggu Ke-{selectedPdfWeek}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-bold font-mono shadow-xs">
                        Rp {formatRupiah(activeWeekSum)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        {percentage}% Warga Lunas
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>{activeWeekPaid} warga</strong> sudah membayar • <strong>{activeWeekUnpaid} warga</strong> belum bayar dari total <strong>{wargaUtamaCount} warga</strong> terdaftar (Urut Abjad A-Z).
                    </p>
                  </div>

                  <button
                    type="button"
                    id={`btn-download-pdf-minggu-${selectedPdfWeek}`}
                    onClick={() => generatePdfLaporanMingguanUsser(selectedPdfWeek, citizens, wargaPayments, currentUser.name)}
                    className="w-full md:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
                  >
                    <FileDown className="w-4 h-4 text-amber-300" />
                    <span>Download PDF Minggu Ke-{selectedPdfWeek}</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Official PDF Download Banner (Keseluruhan Donasi Warga & Suka Rela) */}
          <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <FileDown className="w-5 h-5 text-emerald-700" />
                Download Laporan PDF Rekapitulasi Keseluruhan (Warga + Suka Rela)
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                File PDF laporan resmi lengkap dengan KOP SURAT PHBI Isra Miraj Kp Kedung Sapi,
                rincian data donasi warga & suka rela, serta kolom tanda tangan resmi
                <strong> Ketua Panitia (Sahroji)</strong> dan <strong>{currentUser.name}</strong>.
              </p>
            </div>

            <button
              type="button"
              id="btn-download-pdf-usser"
              onClick={() => generatePdfLaporanUsser(wargaPayments, sukarelaPayments, currentUser.name)}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Download PDF Rekap Gabungan</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. REKAPITULASI TAB */}
      {activeTab === 'rekap' && (
        <RekapitulasiTable
          citizens={citizens}
          currentUser={currentUser}
          totalSukarela={totalDonasiSukaRela}
          totalKeluar={totalKeluar}
          activeWeek={activeSystemWeek}
          onRefresh={onRefresh}
        />
      )}

      {/* 5. PROPOSAL KEGIATAN TAB */}
      {activeTab === 'proposal' && (
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
      )}

      {/* 6. ARSIP MULTI-TAHUN TAB */}
      {activeTab === 'arsip_periode' && (
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
      )}

      {/* MODAL EDIT DONASI WARGA */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-emerald-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  Edit Data Donasi Warga
                </h3>
                <p className="text-xs text-slate-500">Ubah nama atau uang masuk</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWarga} className="mt-4 space-y-4">
              {wargaError && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
                  {wargaError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Warga
                </label>
                <input
                  type="text"
                  required
                  id="input-edit-donasi-nama"
                  value={editPaymentName}
                  onChange={(e) => setEditPaymentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pembayaran Minggu Ke
                </label>
                <select
                  value={editPaymentWeek}
                  onChange={(e) => setEditPaymentWeek(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-600"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Minggu ke-{w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Edit Uang Masuk (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    required
                    id="input-edit-donasi-jumlah"
                    value={editPaymentAmount}
                    onChange={(e) => setEditPaymentAmount(formatInputNumber(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono text-emerald-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Diedit oleh: <strong>{currentUser.name}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={wargaLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {wargaLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DONASI SUKA RELA */}
      {editingSukarela && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-emerald-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  Edit Donasi Suka Rela
                </h3>
                <p className="text-xs text-slate-500">Ubah nama donatur atau nominal</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSukarela(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSukarela} className="mt-4 space-y-4">
              {sukarelaError && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
                  {sukarelaError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Edit Nama Donatur
                </label>
                <input
                  type="text"
                  required
                  id="input-edit-sukarela-nama"
                  value={editSukarelaName}
                  onChange={(e) => setEditSukarelaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Edit Uang Masuk (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    required
                    id="input-edit-sukarela-jumlah"
                    value={editSukarelaAmount}
                    onChange={(e) => setEditSukarelaAmount(formatInputNumber(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono text-amber-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={editSukarelaKet}
                  onChange={(e) => setEditSukarelaKet(e.target.value)}
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
                    onClick={() => setEditingSukarela(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sukarelaLoading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {sukarelaLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
