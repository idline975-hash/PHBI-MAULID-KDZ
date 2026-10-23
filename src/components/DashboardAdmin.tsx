import { useState, useEffect, type FormEvent } from 'react';
import { 
  ShieldCheck, UserPlus, Target, FileDown, 
  HeartHandshake, Gift, Wallet, History, Users, Eye, EyeOff, 
  CheckCircle2, AlertTriangle, ArrowRight, Clock, Trash2, Edit3, X, Percent,
  Settings, PhoneCall, MessageSquare, Copy, Check, BookOpen, ExternalLink, FileText, HelpCircle, Send, Phone,
  RotateCcw, Save, Archive, Calendar, ChevronLeft, ChevronRight, FolderArchive, RefreshCw,
  Activity, Globe, Smartphone, Monitor, Tablet, BarChart3, Filter,
  Mic, Sparkles
} from 'lucide-react';
import { Citizen, DonasiWargaPayment, DonasiSukarela, Pengeluaran, UserAccount, AuditLog, UserRole, CommitteeSettings, PaymentSettings, TransferConfirmation, ProposalData, PeriodArchive, VisitorStats, VisitorLog } from '../types';
import { formatRupiah, formatInputNumber, parseRupiah, getCurrentIndonesianTime } from '../utils/formatters';
import { getWeeklyScheduleInfo, resolveSukarelaWeek } from '../utils/weeklySchedule';
import { 
  generatePdfDonasiWargaAdmin,
  generatePdfDonasiSukarelaAdmin,
  generatePdfPengeluaranAdmin,
  generatePdfKolomMingguanAdmin,
  generatePdfLaporanKeseluruhanAdmin,
  generatePdfLaporanMingguanUsser
} from '../utils/pdfGenerator';
import RekapitulasiTable from './RekapitulasiTable';
import StrukturPanitiaCard from './StrukturPanitiaCard';
import ProposalKegiatan from './ProposalKegiatan';
import ArsipPeriodePanel from './ArsipPeriodePanel';


import { WELCOME_GREETING_OPTIONS, WelcomeGreetingOption } from './WelcomeScreen';

interface DashboardAdminProps {
  currentUser: UserAccount;
  citizens: Citizen[];
  wargaPayments: DonasiWargaPayment[];
  sukarelaPayments: DonasiSukarela[];
  pengeluaranList: Pengeluaran[];
  accounts: UserAccount[];
  targetPerPerson: number;
  auditLogs: AuditLog[];
  committeeSettings?: CommitteeSettings;
  paymentSettings?: PaymentSettings;
  transferConfirmations?: TransferConfirmation[];
  proposalData?: ProposalData;
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
  visitorStats?: VisitorStats;
  onRefresh: () => void;
}

export default function DashboardAdmin({
  currentUser,
  citizens,
  wargaPayments,
  sukarelaPayments,
  pengeluaranList,
  accounts,
  targetPerPerson,
  auditLogs,
  committeeSettings,
  paymentSettings,
  transferConfirmations = [],
  proposalData,
  activePeriodLabel = '1448 H / 2027 M',
  periodArchives = [],
  visitorStats,
  onRefresh
}: DashboardAdminProps) {
  const weeklySchedule = getWeeklyScheduleInfo(committeeSettings);
  const activeSystemWeek = weeklySchedule.activeWeek;

  const [activeTab, setActiveTab] = useState<
    'saldo' | 'target' | 'buat_akun' | 'donasi_warga' | 'donasi_sukarela' | 'bendahara' | 'rekap_mingguan' | 'perubahan_data' | 'pengaturan' | 'struktur' | 'proposal' | 'arsip_periode' | 'pengunjung' | 'catatan'
  >('saldo');
  const [adminPdfWeek, setAdminPdfWeek] = useState<number>(activeSystemWeek);
  const [adminWargaFilterWeek, setAdminWargaFilterWeek] = useState<number | 'all'>('all');
  const [adminSukarelaFilterWeek, setAdminSukarelaFilterWeek] = useState<number | 'all'>('all');
  const [updatingWeekSchedule, setUpdatingWeekSchedule] = useState(false);
  const [waCopied, setWaCopied] = useState(false);

  // --- MENU CATATAN PANITIA (ADMIN) ---
  const [noteContent, setNoteContent] = useState(committeeSettings?.adminNote || '');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);

  useEffect(() => {
    // Only sync from props if we are NOT currently saving
    if (committeeSettings?.adminNote !== undefined && !noteSaving) {
      setNoteContent(prev => {
        if (prev !== committeeSettings.adminNote) {
          return committeeSettings.adminNote || '';
        }
        return prev;
      });
    }
  }, [committeeSettings?.adminNote, noteSaving]);

  const handleSaveNote = async () => {
    setNoteSaving(true);
    setNoteSavedMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...settingsForm,
            adminNote: noteContent
          },
          updatedBy: `Admin (${currentUser.name})`
        })
      });
      if (res.ok) {
        setNoteSavedMsg('Catatan panitia berhasil disimpan ke database cloud!');
        onRefresh();
        setTimeout(() => setNoteSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan catatan');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleCopyNoteToWa = () => {
    const text = `📝 *CATATAN & AGENDA PANITIA PHBI ISRA MI'RAJ*\n` +
      `*Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten*\n\n` +
      `${noteContent || 'Belum ada catatan'}\n\n` +
      `_Diperbarui oleh: Admin (${currentUser.name}) pada ${getCurrentIndonesianTime()}_\n` +
      `_Sistem Informasi Kas & Iuran PHBI_`;
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2500);
  };


  useEffect(() => {
    setAdminPdfWeek(activeSystemWeek);
  }, [activeSystemWeek]);

  const weeklyDonationSummaries = weeklySchedule.weeks.map((s) => ({
    ...s,
    wargaPayments: wargaPayments.filter((p) => Number(p.week) === s.week),
    sukarelaPayments: sukarelaPayments.filter((p) => resolveSukarelaWeek(p, committeeSettings) === s.week)
  }));

  const handleAdminChangeActiveWeek = async (targetWeek: number, toggleAutoRotate?: boolean) => {
    if (targetWeek < 1 || targetWeek > 12) return;
    setUpdatingWeekSchedule(true);
    try {
      const res = await fetch('/api/weekly-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWeek,
          autoRotateWeekly: toggleAutoRotate !== undefined ? toggleAutoRotate : weeklySchedule.autoRotateWeekly,
          updatedBy: `Admin (${currentUser.name})`
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingWeekSchedule(false);
    }
  };

  // --- EDITABLE PENGATURAN STATE ---
  const [settingsForm, setSettingsForm] = useState({
    namaKegiatan: committeeSettings?.namaKegiatan || 'Peringatan Hari Besar Islam (PHBI) Isra Miraj Nabi Muhammad SAW 1448 H / 2027 M',
    wilayah: committeeSettings?.wilayah || 'Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten',
    ketuaPanitia: committeeSettings?.ketuaPanitia || '',
    wakilKetua: committeeSettings?.wakilKetua || '',
    sekretaris: committeeSettings?.sekretaris || '',
    adminSistem: committeeSettings?.adminSistem || '',
    bendahara: committeeSettings?.bendahara || '',
    waGroupLink: committeeSettings?.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4',
    nomorWa: committeeSettings?.nomorWa || '081414033436',
    targetPerPerson: formatRupiah(committeeSettings?.targetPerPerson || targetPerPerson),
    adminNote: committeeSettings?.adminNote || ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // --- KATA SAMBUTAN TAMPILAN AWAL STATE (ADMIN) ---
  const initialPreset =
    WELCOME_GREETING_OPTIONS.find((item) => item.id === committeeSettings?.welcomeGreetingId) ||
    WELCOME_GREETING_OPTIONS[0];
  const [welcomeForm, setWelcomeForm] = useState({
    welcomeGreetingId: committeeSettings?.welcomeGreetingId || initialPreset.id,
    welcomeSalam: committeeSettings?.welcomeSalam || initialPreset.salam,
    welcomeHeadline: committeeSettings?.welcomeHeadline || initialPreset.headline,
    welcomeBody: committeeSettings?.welcomeBody || initialPreset.body,
    welcomeClosing: committeeSettings?.welcomeClosing || initialPreset.closing
  });
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);
  const [welcomeSavedMsg, setWelcomeSavedMsg] = useState('');
  const [welcomeCopied, setWelcomeCopied] = useState(false);

  useEffect(() => {
    // Only sync from props if we are NOT currently editing or saving
    if (committeeSettings && !welcomeSaving && !isEditingWelcome) {
      setWelcomeForm(prev => {
        const preset =
          WELCOME_GREETING_OPTIONS.find((item) => item.id === committeeSettings.welcomeGreetingId) ||
          WELCOME_GREETING_OPTIONS[0];
        
        const newWelcome = {
          welcomeGreetingId: committeeSettings.welcomeGreetingId || preset.id,
          welcomeSalam: committeeSettings.welcomeSalam || preset.salam,
          welcomeHeadline: committeeSettings.welcomeHeadline || preset.headline,
          welcomeBody: committeeSettings.welcomeBody || preset.body,
          welcomeClosing: committeeSettings.welcomeClosing || preset.closing
        };

        if (JSON.stringify(prev) !== JSON.stringify(newWelcome)) {
          return newWelcome;
        }
        return prev;
      });
    }
  }, [committeeSettings, welcomeSaving]);

  const handleSelectWelcomePreset = (option: WelcomeGreetingOption) => {
    setIsEditingWelcome(true);
    setWelcomeForm({
      welcomeGreetingId: option.id,
      welcomeSalam: option.salam,
      welcomeHeadline: option.headline,
      welcomeBody: option.body,
      welcomeClosing: option.closing
    });
  };

  const handleSaveWelcomeGreeting = async (e: FormEvent) => {
    e.preventDefault();
    setWelcomeSaving(true);
    setWelcomeSavedMsg('');
    try {
      const parsedTarget = parseRupiah(settingsForm.targetPerPerson);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            namaKegiatan: settingsForm.namaKegiatan,
            wilayah: settingsForm.wilayah,
            ketuaPanitia: settingsForm.ketuaPanitia,
            wakilKetua: settingsForm.wakilKetua,
            sekretaris: settingsForm.sekretaris,
            adminSistem: settingsForm.adminSistem,
            bendahara: settingsForm.bendahara,
            waGroupLink: settingsForm.waGroupLink,
            nomorWa: settingsForm.nomorWa,
            targetPerPerson: parsedTarget > 0 ? parsedTarget : targetPerPerson,
            welcomeGreetingId: welcomeForm.welcomeGreetingId,
            welcomeSalam: welcomeForm.welcomeSalam,
            welcomeHeadline: welcomeForm.welcomeHeadline,
            welcomeBody: welcomeForm.welcomeBody,
            welcomeClosing: welcomeForm.welcomeClosing
          },
          updatedBy: currentUser.name
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWelcomeSavedMsg('Kata sambutan pada Tampilan Awal berhasil disimpan dan diperbarui untuk seluruh pengunjung!');
        setIsEditingWelcome(false);
        onRefresh();
        setTimeout(() => setWelcomeSavedMsg(''), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWelcomeSaving(false);
    }
  };

  const handleCopyWelcomeText = () => {
    const fullText = `${welcomeForm.welcomeSalam}\n\n${welcomeForm.welcomeHeadline}\n\n${welcomeForm.welcomeBody}\n\n${welcomeForm.welcomeClosing}`;
    navigator.clipboard.writeText(fullText);
    setWelcomeCopied(true);
    setTimeout(() => setWelcomeCopied(false), 2000);
  };

  useEffect(() => {
    // Only sync from props if we are NOT currently editing or saving
    if (committeeSettings && !isEditingSettings && !settingsLoading) {
      setSettingsForm(prev => {
        const newForm = {
          namaKegiatan: committeeSettings.namaKegiatan || '',
          wilayah: committeeSettings.wilayah || '',
          ketuaPanitia: committeeSettings.ketuaPanitia || '',
          wakilKetua: committeeSettings.wakilKetua || '',
          sekretaris: committeeSettings.sekretaris || '',
          adminSistem: committeeSettings.adminSistem || '',
          bendahara: committeeSettings.bendahara || '',
          waGroupLink: committeeSettings.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4',
          nomorWa: committeeSettings.nomorWa || '081414033436',
          targetPerPerson: formatRupiah(committeeSettings.targetPerPerson || targetPerPerson),
          adminNote: committeeSettings.adminNote || ''
        };
        
        // Only update state if values are actually different to prevent input focus loss or flicker
        if (JSON.stringify(prev) !== JSON.stringify(newForm)) {
          return newForm;
        }
        return prev;
      });
    }
  }, [committeeSettings, targetPerPerson, isEditingSettings, settingsLoading]);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      const parsedTarget = parseRupiah(settingsForm.targetPerPerson);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            namaKegiatan: settingsForm.namaKegiatan,
            wilayah: settingsForm.wilayah,
            ketuaPanitia: settingsForm.ketuaPanitia,
            wakilKetua: settingsForm.wakilKetua,
            sekretaris: settingsForm.sekretaris,
            adminSistem: settingsForm.adminSistem,
            bendahara: settingsForm.bendahara,
            waGroupLink: settingsForm.waGroupLink,
            nomorWa: settingsForm.nomorWa,
            targetPerPerson: parsedTarget > 0 ? parsedTarget : targetPerPerson,
            adminNote: settingsForm.adminNote,
            welcomeGreetingId: welcomeForm.welcomeGreetingId,
            welcomeSalam: welcomeForm.welcomeSalam,
            welcomeHeadline: welcomeForm.welcomeHeadline,
            welcomeBody: welcomeForm.welcomeBody,
            welcomeClosing: welcomeForm.welcomeClosing
          },
          updatedBy: currentUser.name
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsSuccess('Perubahan pengaturan panitia & sistem berhasil disimpan dan diperbarui secara real-time!');
        setIsEditingSettings(false);
        onRefresh();
        setTimeout(() => setSettingsSuccess(''), 5000);
      } else {
        setSettingsError(data.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      setSettingsError('Terjadi kesalahan jaringan saat menyimpan data pengaturan.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // --- ZONA PENGATURAN LANJUTAN: RESET DATA AWAL STATE ---
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleExecuteReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      setResetError('Silakan ketik "RESET" dengan huruf kapital untuk mengonfirmasi tindakan ini.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedBy: currentUser.name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(data.message || 'Data awal berhasil direset ke kondisi awal.');
        setShowResetModal(false);
        setResetConfirmText('');
        onRefresh();
        setTimeout(() => setResetSuccess(''), 7000);
      } else {
        setResetError(data.error || 'Gagal mereset data awal.');
      }
    } catch (err) {
      setResetError('Terjadi kesalahan jaringan saat melakukan reset data.');
    } finally {
      setResetLoading(false);
    }
  };

  // --- KOSONGKAN DATA RT 08 STATE ---
  const [showClearRt08Modal, setShowClearRt08Modal] = useState(false);
  const [clearRt08ConfirmText, setClearRt08ConfirmText] = useState('');
  const [clearRt08Loading, setClearRt08Loading] = useState(false);

  const handleExecuteClearRt08 = async () => {
    if (clearRt08ConfirmText.trim().toUpperCase() !== 'HAPUS RT08') {
      setResetError('Silakan ketik "HAPUS RT08" dengan huruf kapital untuk mengonfirmasi.');
      return;
    }
    setClearRt08Loading(true);
    setResetError('');
    try {
      const res = await fetch('/api/admin/clear-rt08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedBy: currentUser.name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(data.message || 'Data iuran warga RT 08 berhasil dikosongkan.');
        setShowClearRt08Modal(false);
        setClearRt08ConfirmText('');
        onRefresh();
        setTimeout(() => setResetSuccess(''), 7000);
      } else {
        setResetError(data.error || 'Gagal mengosongkan data RT 08.');
      }
    } catch (err) {
      setResetError('Terjadi kesalahan jaringan saat mengosongkan data RT 08.');
    } finally {
      setClearRt08Loading(false);
    }
  };

  // --- HAPUS SEMUA WARGA PERMANEN STATE ---
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [clearAllLoading, setClearAllLoading] = useState(false);

  const handleExecuteClearAllCitizens = async () => {
    if (clearAllConfirmText.trim().toUpperCase() !== 'HAPUS SEMUA') {
      setResetError('Silakan ketik "HAPUS SEMUA" dengan huruf kapital untuk mengonfirmasi penghapusan permanen.');
      return;
    }
    setClearAllLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/admin/clear-all-citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedBy: currentUser.name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(data.message || 'Semua warga berhasil dihapus secara permanen.');
        setShowClearAllModal(false);
        setClearAllConfirmText('');
        onRefresh();
        setTimeout(() => setResetSuccess(''), 7000);
      } else {
        setResetError(data.error || 'Gagal menghapus warga.');
      }
    } catch (err) {
      setResetError('Terjadi kesalahan jaringan saat menghapus data warga.');
    } finally {
      setClearAllLoading(false);
    }
  };

  const handleBackupData = () => {
    const backupData = {
      metadata: {
        appName: settingsForm.namaKegiatan,
        backupDate: getCurrentIndonesianTime(),
        backupBy: currentUser.name,
        period: activePeriodLabel,
        version: '1.0'
      },
      data: {
        citizens,
        wargaPayments,
        sukarelaPayments,
        pengeluaranList,
        accounts,
        targetPerPerson,
        auditLogs,
        committeeSettings,
        paymentSettings,
        transferConfirmations,
        proposalData,
        visitorStats
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `backup_phbi_${dateStr}_${currentUser.username}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyWa = () => {
    navigator.clipboard.writeText(settingsForm.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4');
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  // --- BUAT AKUN STATE ---
  const [accName, setAccName] = useState('');
  const [accUsername, setAccUsername] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accRole, setAccRole] = useState<UserRole>('usser1');
  const [showAccPassword, setShowAccPassword] = useState(false);
  const [accError, setAccError] = useState('');
  const [accSuccess, setAccSuccess] = useState('');
  const [accLoading, setAccLoading] = useState(false);

  // --- SET TARGET STATE ---
  const [targetInput, setTargetInput] = useState(formatRupiah(targetPerPerson));
  const [targetSearch, setTargetSearch] = useState('');
  const [targetMsg, setTargetMsg] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);

  useEffect(() => {
    setTargetInput(formatRupiah(targetPerPerson));
  }, [targetPerPerson]);

  // --- UNIVERSAL EDIT MODAL FOR ADMIN ---
  const [editUniversalModal, setEditUniversalModal] = useState<{
    type: 'warga' | 'sukarela' | 'pengeluaran';
    id: string;
    oldName?: string;
    title: string;
    field1Label: string;
    field1Value: string;
    field2Label: string;
    field2Value: string;
  } | null>(null);
  const [universalLoading, setUniversalLoading] = useState(false);

  // Financial calculations (excluding payments marked excludedFromTotal)
  const totalWarga = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );
  const totalWargaExcluded = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? (Number(p.amount) || 0) : 0),
    0
  );
  const totalSukarela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalMasuk = totalWarga + totalSukarela;
  const totalKeluar = pengeluaranList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const sisaSaldo = totalMasuk - totalKeluar;

  const [togglingPaymentId, setTogglingPaymentId] = useState<string | null>(null);

  const handleTogglePaymentExclude = async (p: DonasiWargaPayment) => {
    setTogglingPaymentId(p.id);
    try {
      const res = await fetch('/api/warga/toggle-exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: p.id,
          citizenId: p.citizenId,
          week: p.week,
          excluded: !p.excludedFromTotal,
          updatedBy: `Admin (${currentUser.name})`
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

  // SUBMIT BUAT AKUN
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setAccError('');
    setAccSuccess('');

    if (!accName.trim() || !accUsername.trim() || !accPassword.trim()) {
      setAccError('Semua kolom akun harus diisi!');
      return;
    }

    setAccLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accName.trim(),
          username: accUsername.trim(),
          password: accPassword.trim(),
          role: accRole,
          createdBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAccError(data.error || 'Gagal membuat akun');
        return;
      }

      setAccSuccess(`Akun ${data.account.name} (${data.account.role}) berhasil dibuat!`);
      setAccName('');
      setAccUsername('');
      setAccPassword('');
      onRefresh();
    } catch (err) {
      console.error(err);
      setAccError('Terjadi kesalahan saat membuat akun');
    } finally {
      setAccLoading(false);
    }
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = async (acc: UserAccount) => {
    if (acc.username === 'riyan') {
      alert('Akun admin utama "riyan" tidak dapat dihapus!');
      return;
    }
    const confirm = window.confirm(`Hapus akun "${acc.name}" (${acc.username})?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/accounts/${acc.id}?user=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus akun');
        return;
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus akun');
    }
  };

  // SUBMIT SET TARGET PER ORANG
  const handleSaveTarget = async (e: FormEvent) => {
    e.preventDefault();
    setTargetMsg('');
    const val = parseRupiah(targetInput);
    if (val <= 0) {
      setTargetMsg('Target iuran per orang harus lebih besar dari 0!');
      return;
    }

    setTargetLoading(true);
    try {
      const res = await fetch('/api/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: val,
          updatedBy: currentUser.name
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTargetMsg(data.error || 'Gagal mengatur target');
        return;
      }

      setTargetMsg(`Target iuran per orang berhasil diatur menjadi Rp ${formatRupiah(val)}!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      setTargetMsg('Gagal mengatur target');
    } finally {
      setTargetLoading(false);
    }
  };

  // SUBMIT UNIVERSAL ADMIN EDIT
  const handleSaveUniversalEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editUniversalModal) return;

    setUniversalLoading(true);
    try {
      let payloadData: any = {};
      if (editUniversalModal.type === 'warga') {
        payloadData = {
          name: editUniversalModal.field1Value,
          oldName: editUniversalModal.oldName
        };
      } else if (editUniversalModal.type === 'sukarela') {
        payloadData = {
          donorName: editUniversalModal.field1Value,
          amount: parseRupiah(editUniversalModal.field2Value)
        };
      } else if (editUniversalModal.type === 'pengeluaran') {
        payloadData = {
          description: editUniversalModal.field1Value,
          amount: parseRupiah(editUniversalModal.field2Value)
        };
      }

      const res = await fetch('/api/admin/edit-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editUniversalModal.type,
          id: editUniversalModal.id,
          data: payloadData,
          editedBy: `Admin (${currentUser.name})`
        })
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Gagal menyimpan perubahan data');
        return;
      }

      setEditUniversalModal(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan');
    } finally {
      setUniversalLoading(false);
    }
  };

  // Filter citizens for target view (only main citizens, excluding Ngontrak, sorted A-Z)
  const wargaUtama = [...citizens]
    .filter(c => !c.isNgontrak)
    .sort((a, b) =>
      a.name.trim().replace(/\s+/g, ' ').localeCompare(
        b.name.trim().replace(/\s+/g, ' '),
        'id',
        { sensitivity: 'base', numeric: true }
      )
    );
  const filteredTargetCitizens = wargaUtama.filter(c =>
    c.name.toLowerCase().includes(targetSearch.toLowerCase().trim())
  );

  // --- STATISTIK PENGUNJUNG LINK STATE & METRICS ---
  const [visitorFilterDevice, setVisitorFilterDevice] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [showResetVisitorModal, setShowResetVisitorModal] = useState(false);
  const [resetVisitorConfirmText, setResetVisitorConfirmText] = useState('');
  const [resetVisitorLoading, setResetVisitorLoading] = useState(false);
  const [copiedVisitorReport, setCopiedVisitorReport] = useState(false);

  const totalLogs = visitorStats?.recentVisits?.length || 0;
  const mobileCount = visitorStats?.recentVisits?.filter(v => v.deviceType === 'mobile').length || 0;
  const desktopCount = visitorStats?.recentVisits?.filter(v => v.deviceType === 'desktop').length || 0;
  const tabletCount = visitorStats?.recentVisits?.filter(v => v.deviceType === 'tablet').length || 0;

  const mobilePct = totalLogs > 0 ? Math.round((mobileCount / totalLogs) * 100) : 0;
  const desktopPct = totalLogs > 0 ? Math.round((desktopCount / totalLogs) * 100) : 0;
  const tabletPct = totalLogs > 0 ? Math.round((tabletCount / totalLogs) * 100) : 0;

  const filteredVisitorLogs = (visitorStats?.recentVisits || []).filter(log => {
    const matchDevice = visitorFilterDevice === 'all' || log.deviceType === visitorFilterDevice;
    const matchSearch = visitorSearch === '' || 
      log.formattedTime.toLowerCase().includes(visitorSearch.toLowerCase()) ||
      (log.roleViewed || '').toLowerCase().includes(visitorSearch.toLowerCase()) ||
      (log.pageVisited || '').toLowerCase().includes(visitorSearch.toLowerCase()) ||
      (log.userAgent || '').toLowerCase().includes(visitorSearch.toLowerCase());
    return matchDevice && matchSearch;
  });

  const handleCopyVisitorReport = () => {
    const stats = visitorStats || {
      totalVisits: 0,
      todayVisits: 0,
      weekVisits: 0,
      uniqueVisitors: 0,
      lastVisitedAt: getCurrentIndonesianTime()
    };
    const now = getCurrentIndonesianTime();
    const text = `📊 *LAPORAN STATISTIK PENGUNJUNG LINK APLIKASI PHBI*
*Peringatan Isra Mi'raj Nabi Muhammad SAW*
*Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten*

🌐 *Total Akses Link:* ${stats.totalVisits.toLocaleString('id-ID')} kali
📅 *Pengunjung Hari Ini:* ${stats.todayVisits.toLocaleString('id-ID')} orang
📆 *Pengunjung 7 Hari Terakhir:* ${stats.weekVisits.toLocaleString('id-ID')} orang
📱 *Perangkat Unik (Device):* ${stats.uniqueVisitors.toLocaleString('id-ID')} perangkat
⏰ *Kunjungan Terakhir:* ${stats.lastVisitedAt || now}

📌 *Status Sistem:* Real-Time Multi-Device Sync Online
🔗 *Akses Link:* ${window.location.origin}
_Laporan otomatis diperbarui dari Sistem Informasi Kas & Iuran PHBI._`;

    navigator.clipboard.writeText(text);
    setCopiedVisitorReport(true);
    setTimeout(() => setCopiedVisitorReport(false), 2500);
  };

  const handleResetVisitors = async () => {
    if (resetVisitorConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('Ketik kata "RESET" dengan huruf kapital untuk mengonfirmasi.');
      return;
    }
    setResetVisitorLoading(true);
    try {
      const res = await fetch('/api/visitors/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: `Admin (${currentUser.name})` })
      });
      if (res.ok) {
        setShowResetVisitorModal(false);
        setResetVisitorConfirmText('');
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal mereset statistik pengunjung');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat mereset statistik');
    } finally {
      setResetVisitorLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation Buttons Grid */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-300 p-2.5 sm:p-3 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-1.5 sm:gap-2">
          {/* 1. Tampilkan Sisa Saldo */}
          <button
            type="button"
            id="btn-admin-tab-saldo"
            onClick={() => setActiveTab('saldo')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'saldo'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Wallet className="w-4 h-4 text-amber-300" />
            <span className="leading-tight">Sisa Saldo Kas</span>
          </button>

          {/* 2. Set Target Per Orang */}
          <button
            type="button"
            id="btn-admin-tab-target"
            onClick={() => setActiveTab('target')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'target'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Target className="w-4 h-4 text-rose-600" />
            <span className="leading-tight">Set Target</span>
          </button>

          {/* 3. Buat Akun */}
          <button
            type="button"
            id="btn-admin-tab-buat-akun"
            onClick={() => setActiveTab('buat_akun')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'buat_akun'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span className="leading-tight">Buat Akun</span>
          </button>

          {/* 4. Donasi Warga */}
          <button
            type="button"
            id="btn-admin-tab-donasi-warga"
            onClick={() => setActiveTab('donasi_warga')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'donasi_warga'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-teal-600" />
            <span className="leading-tight">Donasi Warga</span>
          </button>

          {/* 5. Donasi Suka Rela */}
          <button
            type="button"
            id="btn-admin-tab-donasi-sukarela"
            onClick={() => setActiveTab('donasi_sukarela')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'donasi_sukarela'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-600" />
            <span className="leading-tight">Donasi Sukarela</span>
          </button>

          {/* 6. Bendahara (Pengeluaran) */}
          <button
            type="button"
            id="btn-admin-tab-bendahara"
            onClick={() => setActiveTab('bendahara')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'bendahara'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Wallet className="w-4 h-4 text-rose-600" />
            <span className="leading-tight">Pengeluaran</span>
          </button>

          {/* 7. Rekapitulasi 12 Minggu */}
          <button
            type="button"
            id="btn-admin-tab-rekap-mingguan"
            onClick={() => setActiveTab('rekap_mingguan')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'rekap_mingguan'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="leading-tight">Rekap 12 Minggu</span>
          </button>

          {/* 8. Perubahan Data */}
          <button
            type="button"
            id="btn-admin-tab-perubahan-data"
            onClick={() => setActiveTab('perubahan_data')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'perubahan_data'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <History className="w-4 h-4 text-cyan-600" />
            <span className="leading-tight">Perubahan Data</span>
          </button>

          {/* 9. Pengaturan */}
          <button
            type="button"
            id="btn-admin-tab-pengaturan"
            onClick={() => setActiveTab('pengaturan')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'pengaturan'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Settings className="w-4 h-4 text-rose-600" />
            <span className="leading-tight">Pengaturan</span>
          </button>

          {/* 10. Struktur Panitia */}
          <button
            type="button"
            id="btn-admin-tab-struktur"
            onClick={() => setActiveTab('struktur')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'struktur'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span className="leading-tight">Struktur Panitia</span>
          </button>

          {/* 11. Proposal Kegiatan */}
          <button
            type="button"
            id="btn-admin-tab-proposal"
            onClick={() => setActiveTab('proposal')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'proposal'
                ? 'bg-rose-800 text-white font-black shadow-md border-2 border-rose-950 ring-2 ring-rose-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-600" />
            <span className="leading-tight">Proposal Kegiatan</span>
          </button>

          {/* 12. Arsip Multi-Tahun (Antar-Periode) */}
          <button
            type="button"
            id="btn-admin-tab-arsip-periode"
            onClick={() => setActiveTab('arsip_periode')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center relative ${
              activeTab === 'arsip_periode'
                ? 'bg-indigo-900 text-white font-black shadow-md border-2 border-indigo-950 ring-2 ring-indigo-300'
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 border-2 border-indigo-300 font-bold'
            }`}
          >
            <Archive className={`w-4 h-4 ${activeTab === 'arsip_periode' ? 'text-amber-300' : 'text-indigo-700'}`} />
            <span className="leading-tight">Arsip Periode</span>
            {periodArchives.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                {periodArchives.length}
              </span>
            )}
          </button>

          {/* 13. Statistik Pengunjung Link */}
          <button
            type="button"
            id="btn-admin-tab-pengunjung"
            onClick={() => setActiveTab('pengunjung')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center relative ${
              activeTab === 'pengunjung'
                ? 'bg-blue-900 text-white font-black shadow-md border-2 border-blue-950 ring-2 ring-blue-300'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-950 border-2 border-blue-300 font-bold'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'pengunjung' ? 'text-cyan-300' : 'text-blue-700'}`} />
            <span className="leading-tight">Akses Link</span>
            {visitorStats && visitorStats.todayVisits > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-700 text-white">
                {visitorStats.todayVisits}
              </span>
            )}
          </button>

          {/* 14. Menu Catatan Panitia */}
          <button
            type="button"
            id="btn-admin-tab-catatan"
            onClick={() => setActiveTab('catatan')}
            className={`p-2 sm:p-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center relative ${
              activeTab === 'catatan'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md border-2 border-amber-600 ring-2 ring-amber-300'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-300 font-bold'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${activeTab === 'catatan' ? 'text-slate-950' : 'text-amber-700'}`} />
            <span className="leading-tight">Catatan</span>
          </button>
        </div>
      </div>

      {/* 1. TAMPILKAN SISA SALDO TAB */}
      {activeTab === 'saldo' && (
        <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          {/* Quick Live Visitor Counter Card */}
          <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-blue-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-400 text-slate-950 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Live Counter Pengunjung Link
                </span>
                <span className="text-blue-300 text-xs hidden sm:inline">•</span>
                <span className="text-blue-200 text-xs font-semibold hidden sm:inline">
                  Real-time Multi-Perangkat
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Statistik Akses Link Aplikasi oleh Warga & Jamaah
              </h3>
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Globe className="w-3.5 h-3.5" />
                  {(visitorStats?.totalVisits || 0).toLocaleString('id-ID')} Total Akses
                </span>
                <span className="text-blue-400">·</span>
                <span className="inline-flex items-center gap-1 text-rose-300">
                  <Calendar className="w-3.5 h-3.5" />
                  {(visitorStats?.todayVisits || 0).toLocaleString('id-ID')} Hari Ini
                </span>
                <span className="text-blue-400">·</span>
                <span className="inline-flex items-center gap-1 text-cyan-300">
                  <Activity className="w-3.5 h-3.5" />
                  {(visitorStats?.weekVisits || 0).toLocaleString('id-ID')} 7 Hari Terakhir
                </span>
                <span className="text-blue-400">·</span>
                <span className="inline-flex items-center gap-1 text-purple-300">
                  <Smartphone className="w-3.5 h-3.5" />
                  {(visitorStats?.uniqueVisitors || 0).toLocaleString('id-ID')} Perangkat Unik
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('pengunjung')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>Buka Rincian Pengunjung</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Total Donasi Warga ({wargaUtama.length} Warga)
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900 mt-2">
                Rp {formatRupiah(totalWarga)}
              </p>
              <p className="text-[11px] text-rose-700 mt-2">
                {wargaUtama.length} Warga • {wargaPayments.length} Pembayaran Terdata
              </p>
              {totalWargaExcluded > 0 && (
                <p className="text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 rounded-lg px-2 py-0.5 mt-1.5 inline-block font-mono">
                  Ditahan Sementara: Rp {formatRupiah(totalWargaExcluded)}
                </p>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Total Donasi Suka Rela
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-amber-900 mt-2">
                Rp {formatRupiah(totalSukarela)}
              </p>
              <p className="text-[11px] text-amber-700 mt-2">{sukarelaPayments.length} Donatur Terdata</p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Total Pengeluaran Kas
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900 mt-2">
                Rp {formatRupiah(totalKeluar)}
              </p>
              <p className="text-[11px] text-rose-700 mt-2">{pengeluaranList.length} Transaksi Keluar</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950 via-slate-900 to-teal-950 text-white shadow-lg">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
                SISA SALDO KAS BERSIH
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-2">
                Rp {formatRupiah(sisaSaldo)}
              </p>
              <p className="text-[11px] text-rose-200 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                Uang Masuk - Pengeluaran
              </p>
            </div>
          </div>

          {/* Master PDF Download Buttons Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileDown className="w-5 h-5 text-rose-700" />
              Ekspor Laporan Master Panitia Isra Miraj (PDF)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Cetak laporan resmi bertanda tangan sah <strong>Ketua Panitia (Sahroji)</strong> dan <strong>Admin (Riyan)</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Download Laporan Kolom Mingguan */}
              <button
                type="button"
                id="btn-admin-download-kolom-mingguan"
                onClick={() => generatePdfKolomMingguanAdmin(citizens, totalSukarela, totalKeluar)}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md cursor-pointer transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-600/30 text-rose-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">DOWNLOAD LAPORAN KOLOM MINGGUAN</p>
                    <p className="text-[11px] text-slate-300 font-normal">
                      Rekapitulasi 12 Minggu + Suka Rela - Pengeluaran Bendahara
                    </p>
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-amber-300 flex-shrink-0" />
              </button>

              {/* Download Laporan Keseluruhan */}
              <button
                type="button"
                id="btn-admin-download-keseluruhan"
                onClick={() => generatePdfLaporanKeseluruhanAdmin(
                  totalWarga, totalSukarela, totalKeluar,
                  wargaPayments.length, wargaUtama.length,
                  sukarelaPayments.length, pengeluaranList.length,
                  pengeluaranList, citizens, committeeSettings
                )}
                className="p-4 rounded-xl bg-gradient-to-r from-rose-800 to-teal-800 hover:from-rose-900 hover:to-teal-900 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md cursor-pointer transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">DOWNLOAD LAPORAN KESELURUHAN</p>
                    <p className="text-[11px] text-rose-200 font-normal">
                      Master Financial Audit: Donasi Warga + Suka Rela - Kas Bendahara
                    </p>
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-amber-300 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SET TARGET PER ORANG TAB */}
      {activeTab === 'target' && (
        <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          {/* Target Config Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Set Target Iuran Per Orang
                </h3>
                <p className="text-xs text-slate-500">
                  Di setiap usser 1, usser 2 jika nama warga membayar di minggu pertama dan minggu kedua maka target per orang akan berkurang secara otomatis.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTarget} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-xl">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Target Iuran Per Orang (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="text"
                    required
                    id="input-set-target-nominal"
                    value={targetInput}
                    onChange={(e) => setTargetInput(formatInputNumber(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold font-mono text-rose-900 focus:bg-white focus:border-rose-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-simpan-target"
                disabled={targetLoading}
                className="py-2.5 px-6 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {targetLoading ? 'Menyimpan...' : 'Terapkan Target'}
              </button>
            </form>

            {targetMsg && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600" />
                <span>{targetMsg}</span>
              </div>
            )}
          </div>

          {/* Citizen Target Tracking List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                  Status Capaian Target Tiap Warga ({wargaUtama.length} Warga)
                </h4>
                <p className="text-xs text-slate-500">
                  Target: <strong>Rp {formatRupiah(targetPerPerson)}</strong> per orang
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari warga..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border rounded-lg text-xs w-full sm:w-64 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
              {filteredTargetCitizens.length === 0 ? (
                <div className="col-span-full p-6 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
                  <p className="font-bold text-xs text-rose-900">Peringatan: Nama Tidak Cocok!</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Tidak ditemukan warga bernama &ldquo;{targetSearch}&rdquo; dalam daftar target.
                  </p>
                </div>
              ) : (
                filteredTargetCitizens.map((citizen) => {
                const sisa = Math.max(0, targetPerPerson - citizen.totalPaid);
                const percent = targetPerPerson > 0 ? Math.min(100, Math.round((citizen.totalPaid / targetPerPerson) * 100)) : 0;
                const isLunas = citizen.totalPaid >= targetPerPerson;

                return (
                  <div
                    key={citizen.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isLunas
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {citizen.name}
                      </span>
                      {isLunas ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                          LUNAS
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {percent}%
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 ${isLunas ? 'bg-rose-600' : 'bg-rose-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-600">
                        Terbayar: <strong>Rp {formatRupiah(citizen.totalPaid)}</strong>
                      </span>
                      <span className={sisa === 0 ? 'text-rose-700 font-bold' : 'text-rose-600 font-bold'}>
                        {sisa === 0 ? 'Tuntas' : `Kurang: Rp ${formatRupiah(sisa)}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}

      {/* 3. BUAT AKUN TAB */}
      {activeTab === 'buat_akun' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form Buat Akun */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-rose-100 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-50">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Buat Akun Petugas Baru</h3>
                <p className="text-xs text-slate-500">Pilihan: Usser 1, Usser 2, Bendahara</p>
              </div>
            </div>

            {accError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{accError}</span>
              </div>
            )}

            {accSuccess && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{accSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  NAMA LENGKAP
                </label>
                <input
                  type="text"
                  required
                  id="input-buat-nama"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Contoh: Bpk. Rohman (Petugas Lapangan)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-rose-600"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  USERNAME LOGIN
                </label>
                <input
                  type="text"
                  required
                  id="input-buat-username"
                  value={accUsername}
                  onChange={(e) => setAccUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: usser3 / bendahara2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-rose-600 font-mono"
                />
              </div>

              {/* Password with Eye Button */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showAccPassword ? 'text' : 'password'}
                    required
                    id="input-buat-password"
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-rose-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccPassword(!showAccPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-rose-700 cursor-pointer"
                  >
                    {showAccPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Pilihan 4 Role: Usser 1, Usser 2, BENDAHARA, WARGA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  PILIHAN PERAN (ROLE)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccRole('usser1')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      accRole === 'usser1'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Usser 1
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccRole('usser2')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      accRole === 'usser2'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Usser 2
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccRole('bendahara')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      accRole === 'bendahara'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    BENDAHARA
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccRole('warga')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      accRole === 'warga'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    WARGA
                  </button>
                </div>
              </div>

              {/* Buat Akun Button */}
              <button
                type="submit"
                id="btn-submit-buat-akun"
                disabled={accLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-700 to-teal-700 hover:from-rose-800 hover:to-teal-800 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-rose-700/20 flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{accLoading ? 'Menyimpan Akun...' : 'Buat Akun Sekarang'}</span>
              </button>
            </form>
          </div>

          {/* List Akun Terdaftar */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
            <h4 className="font-bold text-slate-900 text-base mb-1">
              Daftar Akun Pengguna Aktif ({accounts.length})
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Semua akun dapat login melalui menu awal portal
            </p>

            <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1 flex-1">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{acc.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                        {acc.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                      <span>Username: <strong>{acc.username}</strong></span>
                      <span>•</span>
                      <span>Password: <strong>{acc.password || '******'}</strong></span>
                    </div>
                  </div>

                  {acc.username !== 'riyan' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc)}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      Admin Utama
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 4. DONASI WARGA TAB (ADMIN) */}
      {activeTab === 'donasi_warga' && (
        <div className="space-y-4">
          {/* Panel Kontrol Jadwal Pembayaran Mingguan Otomatis (Admin) */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-700 text-amber-300 text-xs font-black tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  MINGGU AKTIF BERJALAN: MINGGU KE-{activeSystemWeek}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  Periode: {weeklySchedule.currentWeekRangeLabel}
                </span>
                <button
                  type="button"
                  disabled={updatingWeekSchedule}
                  onClick={() => handleAdminChangeActiveWeek(activeSystemWeek, !weeklySchedule.autoRotateWeekly)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                    weeklySchedule.autoRotateWeekly
                      ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${updatingWeekSchedule ? 'animate-spin' : ''}`} />
                  <span>
                    {weeklySchedule.autoRotateWeekly
                      ? `Rotasi Otomatis Aktif (${weeklySchedule.daysUntilNextWeek} hari ke M-${Math.min(12, activeSystemWeek + 1)})`
                      : 'Rotasi Otomatis Nonaktif'}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Setiap pergantian minggu, form input pembayaran petugas &amp; warga otomatis dialihkan ke minggu berjalan dan riwayat minggu sebelumnya tersimpan rapi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={updatingWeekSchedule || activeSystemWeek <= 1}
                onClick={() => handleAdminChangeActiveWeek(activeSystemWeek - 1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>M-{Math.max(1, activeSystemWeek - 1)}</span>
              </button>
              <select
                value={activeSystemWeek}
                disabled={updatingWeekSchedule}
                onChange={(e) => handleAdminChangeActiveWeek(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 font-black text-xs cursor-pointer focus:outline-none"
              >
                {weeklySchedule.weeks.map((s) => (
                  <option key={s.week} value={s.week}>
                    Minggu ke-{s.week} ({s.shortRangeLabel})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={updatingWeekSchedule || activeSystemWeek >= 12}
                onClick={() => handleAdminChangeActiveWeek(activeSystemWeek + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>M-{Math.min(12, activeSystemWeek + 1)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-rose-700" />
                  <span>Cek Data &amp; Arsip Mingguan Donasi Warga ({wargaPayments.length} Data)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data penerimaan iuran warga mingguan • Masuk Total Kas: <strong className="text-rose-700 font-mono">Rp {formatRupiah(totalWarga)}</strong>
                  {totalWargaExcluded > 0 && (
                    <span className="ml-2 text-amber-700 font-semibold">
                      • Ditahan Sementara: <strong className="font-mono">Rp {formatRupiah(totalWargaExcluded)}</strong>
                    </span>
                  )}
                </p>
              </div>

              {/* Button Download PDF Lampiran Copysurat */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-xl p-1">
                  <select
                    value={adminPdfWeek}
                    onChange={(e) => setAdminPdfWeek(Number(e.target.value))}
                    className="bg-white text-rose-950 font-bold text-xs py-1.5 px-2 rounded-lg border border-rose-200 cursor-pointer focus:outline-none"
                    title="Pilih minggu laporan"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Minggu {w} {w === activeSystemWeek ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    id="btn-admin-pdf-mingguan"
                    onClick={() => generatePdfLaporanMingguanUsser(adminPdfWeek, citizens, wargaPayments, 'Admin')}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title={`Download PDF Resmi Minggu Ke-${adminPdfWeek}`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-300" />
                    <span>PDF M-{adminPdfWeek}</span>
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-admin-pdf-donasi-warga"
                  onClick={() => generatePdfDonasiWargaAdmin(wargaPayments)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <FileDown className="w-4 h-4 text-rose-400" />
                  <span>Download Semua (PDF)</span>
                </button>
              </div>
            </div>

            {/* Filter Riwayat Per Minggu (Minggu 1 s/d 12) */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-100 rounded-2xl border-2 border-slate-300 relative z-10">
              <span className="text-[11px] font-extrabold text-slate-800 mr-1">Filter Arsip Minggu:</span>
              <button
                type="button"
                onClick={() => setAdminWargaFilterWeek('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                  adminWargaFilterWeek === 'all'
                    ? 'bg-slate-900 text-white border-2 border-slate-950 shadow-md'
                    : 'bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-200'
                }`}
              >
                Semua Minggu ({wargaPayments.length})
              </button>
              {weeklyDonationSummaries.map((s) => {
                const count = s.wargaPayments.length;
                const isSelected = adminWargaFilterWeek === s.week;
                return (
                  <button
                    key={s.week}
                    type="button"
                    onClick={() => setAdminWargaFilterWeek(s.week)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 border-2 ${
                      isSelected
                        ? 'bg-rose-800 text-white border-rose-950 shadow-md ring-2 ring-rose-300'
                        : s.week === activeSystemWeek
                        ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                        : count > 0
                        ? 'bg-white text-rose-950 border-rose-300 hover:bg-rose-100'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>M-{s.week}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          isSelected ? 'bg-rose-950 text-amber-300' : 'bg-rose-200 text-rose-950'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3">Nama Warga</th>
                    <th className="py-2.5 px-3">Pembayaran</th>
                    <th className="py-2.5 px-3">Waktu Input Real-time</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-center">Status Total Kas</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(() => {
                    const filteredList =
                      adminWargaFilterWeek === 'all'
                        ? wargaPayments
                        : wargaPayments.filter((p) => Number(p.week) === adminWargaFilterWeek);
                    if (filteredList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Belum ada data donasi warga pada filter minggu ini.
                          </td>
                        </tr>
                      );
                    }
                    return filteredList.map((p, idx) => {
                      const isExcl = Boolean(p.excludedFromTotal);
                      const isBusy = togglingPaymentId === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isExcl ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-rose-50/50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {citizens.find(c => c.id === p.citizenId)?.rt === '08' ? 'Warga (Identitas Terhapus)' : p.citizenName}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-rose-800">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[11px] font-bold">
                              Minggu ke-{p.week}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{p.timestamp}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${isExcl ? 'text-amber-800 line-through' : 'text-rose-700'}`}>
                            Rp {formatRupiah(p.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleTogglePaymentExclude(p)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                isExcl
                                  ? 'bg-amber-200 hover:bg-amber-300 text-amber-950'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                              }`}
                              title={
                                isExcl
                                  ? 'Pembayaran ini sedang TIDAK dihitung ke Total Uang Masuk. Klik untuk memasukkan kembali.'
                                  : 'Pembayaran ini dihitung ke Total Uang Masuk. Klik untuk menahan/mengecualikan sementara.'
                              }
                            >
                              {isBusy ? 'Memproses...' : isExcl ? 'Ditahan (Klik u/ Masukkan)' : 'Masuk Total Kas'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{p.recordedBy}</td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => setEditUniversalModal({
                                type: 'warga',
                                id: p.citizenId,
                                oldName: p.citizenName,
                                title: `Edit Nama Warga (${p.citizenName})`,
                                field1Label: 'Nama Warga',
                                field1Value: p.citizenName,
                                field2Label: '',
                                field2Value: ''
                              })}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                              title="Admin Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. DONASI SUKA RELA TAB (ADMIN) */}
      {activeTab === 'donasi_sukarela' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Cek Data Uang Masuk Donasi Suka Rela ({sukarelaPayments.length} Donatur)
              </h3>
              <p className="text-xs text-slate-500">
                Penerimaan donasi suka rela &amp; infak masyarakat (Tersimpan rapi per minggu)
              </p>
            </div>

            {/* Button Download PDF */}
            <button
              type="button"
              id="btn-admin-pdf-donasi-sukarela"
              onClick={() => generatePdfDonasiSukarelaAdmin(sukarelaPayments)}
              className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Download PDF Donasi Suka Rela (Kop Resmi)</span>
            </button>
          </div>

          {/* Filter Minggu Donasi Sukarela */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-900 mr-1">Filter Arsip Minggu:</span>
            <button
              type="button"
              onClick={() => setAdminSukarelaFilterWeek('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                adminSukarelaFilterWeek === 'all'
                  ? 'bg-amber-800 text-white'
                  : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Semua Minggu ({sukarelaPayments.length})
            </button>
            {weeklyDonationSummaries.map((s) => {
              const count = s.sukarelaPayments.length;
              const isSelected = adminSukarelaFilterWeek === s.week;
              return (
                <button
                  key={s.week}
                  type="button"
                  onClick={() => setAdminSukarelaFilterWeek(s.week)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-xs'
                      : count > 0
                      ? 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>M-{s.week}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        isSelected ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">Nama Donatur</th>
                  <th className="py-2.5 px-3">Minggu</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-3">Waktu Real-time</th>
                  <th className="py-2.5 px-3 text-right">Uang Masuk</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(() => {
                  const filteredSukarelaList =
                    adminSukarelaFilterWeek === 'all'
                      ? sukarelaPayments
                      : weeklyDonationSummaries.find((w) => w.week === adminSukarelaFilterWeek)?.sukarelaPayments || [];
                  if (filteredSukarelaList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Belum ada data donasi suka rela pada filter minggu ini.
                        </td>
                      </tr>
                    );
                  }
                  return filteredSukarelaList.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{s.donorName}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                          Minggu ke-{s.week || activeSystemWeek}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.keterangan || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.timestamp}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                        Rp {formatRupiah(s.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.recordedBy}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEditUniversalModal({
                            type: 'sukarela',
                            id: s.id,
                            title: `Edit Donasi Suka Rela (${s.donorName})`,
                            field1Label: 'Nama Donatur',
                            field1Value: s.donorName,
                            field2Label: 'Uang Masuk (Rp)',
                            field2Value: formatRupiah(s.amount)
                          })}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                          title="Admin Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. BENDAHARA TAB (ADMIN) */}
      {activeTab === 'bendahara' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Cek Data Uang Keluar Bendahara ({pengeluaranList.length} Transaksi)
              </h3>
              <p className="text-xs text-slate-500">
                Pengeluaran kas operasional dan logistik panitia
              </p>
            </div>

            {/* Button Download PDF Pengeluaran Bendahara */}
            <button
              type="button"
              id="btn-admin-pdf-pengeluaran-bendahara"
              onClick={() => generatePdfPengeluaranAdmin(pengeluaranList)}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Download PDF Pengeluaran (Kop Resmi)</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">Uraian / Keperluan</th>
                  <th className="py-2.5 px-3">Penerima</th>
                  <th className="py-2.5 px-3">Waktu Real-time</th>
                  <th className="py-2.5 px-3 text-right">Uang Keluar</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pengeluaranList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada catatan pengeluaran kas.
                    </td>
                  </tr>
                ) : (
                  pengeluaranList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-rose-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{item.description}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.recipient}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.timestamp}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        Rp {formatRupiah(item.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.recordedBy}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEditUniversalModal({
                            type: 'pengeluaran',
                            id: item.id,
                            title: `Edit Pengeluaran (${item.description})`,
                            field1Label: 'Uraian Keperluan',
                            field1Value: item.description,
                            field2Label: 'Nominal Pengeluaran (Rp)',
                            field2Value: formatRupiah(item.amount)
                          })}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                          title="Admin Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. REKAPITULASI 12 MINGGU TAB (ADMIN) */}
      {activeTab === 'rekap_mingguan' && (
        <RekapitulasiTable
          citizens={citizens}
          currentUser={currentUser}
          totalSukarela={totalSukarela}
          totalKeluar={totalKeluar}
          activeWeek={activeSystemWeek}
          onRefresh={onRefresh}
        />
      )}

      {/* 8. PERUBAHAN DATA TAB (ADMIN) */}
      {activeTab === 'perubahan_data' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Catatan Perubahan Data & Audit Trail Real-time
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan data hari, tanggal, tahun dirubah dengan waktu secara real-time dan akun yang merubahnya.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Total {auditLogs.length} Aktivitas Terekam
            </span>
          </div>

          <div className="overflow-y-auto max-h-[520px] space-y-2 pr-1">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Belum ada aktivitas perubahan data.</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'TAMBAH'
                          ? 'bg-rose-100 text-rose-800'
                          : log.action === 'EDIT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-700">
                        [{log.category}]
                      </span>
                      <span className="text-slate-900 font-bold">
                        {log.details}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {log.timestamp}
                      </span>
                      <span>•</span>
                      <span>
                        Akun yang merubah: <strong className="text-indigo-900">{log.accountName}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. PENGATURAN TAB */}
      {activeTab === 'pengaturan' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-600" />
                  Pengaturan Sistem & Identitas Panitia
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola konfigurasi kepanitiaan, nomor kontak pengaduan, target iuran, dan pengaturan lanjutan data sistem.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Otoritas Administrator</span>
              </div>
            </div>
          </div>

          {/* Feedback Notifications */}
          {settingsSuccess && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          {settingsError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* Card 1: Identitas Kepanitiaan & Pengaturan (Bisa Diedit Admin) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900">
                    Identitas Organisasi & Kepanitiaan
                  </h4>
                  <p className="text-xs text-slate-500">
                    Data ini menjadi rujukan resmi pada Kop Surat, footer cetak dokumen PDF, serta modal Hotline Warga.
                  </p>
                </div>
              </div>

              {!isEditingSettings ? (
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah / Edit Pengaturan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Batal Edit
                </button>
              )}
            </div>

            {/* Editable Form vs View Display */}
            {isEditingSettings ? (
              <form onSubmit={handleSaveSettings} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Kegiatan / Acara
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.namaKegiatan}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, namaKegiatan: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    placeholder="Contoh: Peringatan Hari Besar Islam (PHBI) Isra Miraj Nabi Muhammad SAW 1448 H / 2027 M"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Wilayah / Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.wilayah}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, wilayah: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    placeholder="Contoh: Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Ketua Panitia
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.ketuaPanitia}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, ketuaPanitia: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Wakil Ketua
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.wakilKetua}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, wakilKetua: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sekretaris
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.sekretaris}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, sekretaris: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Administrator Sistem
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.adminSistem}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, adminSistem: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Bendahara Kas
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.bendahara}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, bendahara: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                      Link Undangan Grup WhatsApp Warga & Panitia
                    </label>
                    <input
                      type="url"
                      required
                      value={settingsForm.waGroupLink}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, waGroupLink: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-rose-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                      placeholder="https://chat.whatsapp.com/..."
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Link ini otomatis terhubung pada tombol Grup WA di header atas serta informasi untuk seluruh warga.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-rose-600" />
                      Target Iuran (Rp)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                        Rp
                      </div>
                      <input
                        type="text"
                        required
                        value={settingsForm.targetPerPerson}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          targetPerPerson: formatInputNumber(e.target.value)
                        }))}
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Standar target per warga (default: Rp 250.000).
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Catatan Admin (Untuk Internal Bendahara/Admin)
                  </label>
                  <textarea
                    value={settingsForm.adminNote}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, adminNote: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                    placeholder="Tulis catatan internal untuk keperluan panitia..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{settingsLoading ? 'Menyimpan Pengaturan...' : 'Simpan Perubahan Pengaturan'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingSettings(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Nama Kegiatan</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {settingsForm.namaKegiatan}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Wilayah / Alamat</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                      {settingsForm.wilayah}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Ketua Panitia</span>
                    <span className="font-bold text-rose-900 text-xs sm:text-sm">{settingsForm.ketuaPanitia}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Wakil Ketua</span>
                    <span className="font-bold text-rose-800 text-xs sm:text-sm">{settingsForm.wakilKetua}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Sekretaris</span>
                    <span className="font-bold text-teal-900 text-xs sm:text-sm">{settingsForm.sekretaris}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Administrator Sistem</span>
                    <span className="font-bold text-indigo-900 text-xs sm:text-sm">{settingsForm.adminSistem}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Bendahara Kas</span>
                    <span className="font-bold text-amber-900 text-xs sm:text-sm">{settingsForm.bendahara}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Target Iuran</span>
                    <span className="font-black text-rose-800 font-mono text-xs sm:text-sm">Rp {settingsForm.targetPerPerson}</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="space-y-0.5 flex-1 min-w-[240px]">
                    <span className="text-rose-700 font-semibold uppercase text-[10px] block flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Link Undangan Grup WhatsApp Warga & Panitia
                    </span>
                    <span className="font-bold text-rose-950 font-mono text-xs sm:text-sm break-all">
                      {settingsForm.waGroupLink}
                    </span>
                    <span className="text-[10px] text-rose-700 block">
                      Grup resmi ini dapat langsung diakses oleh warga melalui tombol &quot;Grup WA Panitia &amp; Warga&quot; di header aplikasi.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={settingsForm.waGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Grup</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyWa}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {waCopied ? <Check className="w-3.5 h-3.5 text-rose-600" /> : <Copy className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{waCopied ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Pengaturan Kata Sambutan (Tampilan Awal Link) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-700" />
                  <span>Ubah Kata Sambutan (Tampilan Awal Saat Masuk Link)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih salah satu dari 5 contoh kata sambutan di bawah atau sesuaikan langsung teks sambutan Portal Resmi PHBI.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyWelcomeText}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {welcomeCopied ? <Check className="w-3.5 h-3.5 text-rose-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{welcomeCopied ? 'Teks Tersalin' : 'Salin Kata Sambutan'}</span>
              </button>
            </div>

            {welcomeSavedMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{welcomeSavedMsg}</span>
              </div>
            )}

            {/* 5 Contoh Pilihan Kata Sambutan */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">
                Pilih Contoh Kata Sambutan (5 Template Siap Pakai):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {WELCOME_GREETING_OPTIONS.map((option) => {
                  const isSelected = welcomeForm.welcomeGreetingId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectWelcomePreset(option)}
                      className={`text-left p-3 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-rose-900 border-rose-700 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-semibold ${isSelected ? 'text-amber-300' : 'text-rose-700'}`}>
                            {option.category}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                        </div>
                        <p className="text-xs font-bold leading-snug">{option.label}</p>
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                        {option.headline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Edit Teks Kata Sambutan */}
            <form onSubmit={handleSaveWelcomeGreeting} className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Salam Pembuka
                  </label>
                  <input
                    type="text"
                    required
                    value={welcomeForm.welcomeSalam}
                    onChange={(e) => setWelcomeForm(prev => ({ ...prev, welcomeSalam: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Salam / Kalimat Penutup
                  </label>
                  <input
                    type="text"
                    required
                    value={welcomeForm.welcomeClosing}
                    onChange={(e) => setWelcomeForm(prev => ({ ...prev, welcomeClosing: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Utama Sambutan
                </label>
                <input
                  type="text"
                  required
                  value={welcomeForm.welcomeHeadline}
                  onChange={(e) => setWelcomeForm(prev => ({ ...prev, welcomeHeadline: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Ucapan Selamat Datang
                </label>
                <textarea
                  rows={3}
                  required
                  value={welcomeForm.welcomeBody}
                  onChange={(e) => setWelcomeForm(prev => ({ ...prev, welcomeBody: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed focus:bg-white focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={welcomeSaving}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{welcomeSaving ? 'Menyimpan Kata Sambutan...' : 'Simpan Kata Sambutan Tampilan Awal'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Grid Configuration Cards (PDF & Manajemen) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card: Pengaturan Unduhan PDF & Kerapian Dokumen */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-600" />
                Standar Kerapian Dokumen PDF
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    <span>Terbaca Tuntas dari Atas Sampai Bawah</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Seluruh berkas laporan PDF di dashboard Admin, Bendahara, Usser, dan Warga telah dikonfigurasi dengan margin terukur (18mm) dan pembagian halaman dinamis agar tidak terpotong.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Ukuran Kertas</span>
                    <span className="font-bold text-slate-800 text-xs">A4 Resmi (ISO 216)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Tabel Multi-Halaman</span>
                    <span className="font-bold text-slate-800 text-xs">Header Berulang (Setiap Hal)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">Kelengkapan Otomatis</span>
                  <span className="text-slate-700 text-[11px] block mt-0.5">
                    • Kop Surat Resmi Panitia PHBI Isra Miraj Kp Kedung Sapi<br />
                    • Kontak WhatsApp Pengaduan Warga ({settingsForm.nomorWa})<br />
                    • Nomor Halaman Otomatis & Tanggal Cetak Real-Time<br />
                    • Tanda Tangan Resmi Ketua Panitia & Pengurus
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Status Manajemen Akun & Sinkronisasi */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" />
                Manajemen Akun Petugas & Sistem
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Total Akun Terdaftar</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {accounts.length} Akun Pengguna Aktif
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('buat_akun')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    + Buat Akun Baru
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">Sinkronisasi Real-Time</span>
                  <span className="font-semibold text-rose-700 text-xs flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Server-Sent Events (SSE) Aktif Multi-Device
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">Hak Akses Sistem</span>
                  <span className="text-slate-700 text-[11px] block mt-0.5">
                    Admin (Kontrol Penuh), Bendahara (Kelola Kas Keluar), Usser 1 & 2 (Pengutip Iuran), Warga (Akses Transparansi Publik)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pratinjau Lengkap Struktur Panitia */}
          <div className="pt-2">
            <StrukturPanitiaCard 
              committeeSettings={committeeSettings} 
              canEdit={true}
              currentUser={currentUser}
              onRefresh={onRefresh}
            />
          </div>

          {/* Pintasan Arsip Multi-Tahun (Antar-Periode) sebelum Reset */}
          <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-700 text-white rounded-xl shadow-xs shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm sm:text-base text-indigo-950">
                    Penyimpanan Multi-Tahun (Arsip Antar-Periode)
                  </h4>
                  <span className="px-2.5 py-0.5 bg-indigo-200/80 text-indigo-900 rounded-full text-[10px] font-extrabold uppercase">
                    {periodArchives.length} Periode Tersimpan
                  </span>
                </div>
                <p className="text-xs text-indigo-900/90 mt-1 leading-relaxed max-w-2xl">
                  Ingin berganti ke tahun/periode berikutnya (mis. <strong>1449 H / 2028 M</strong>) tanpa kehilangan data tahun <strong>{activePeriodLabel}</strong>? Gunakan menu <strong>Arsip Multi-Tahun</strong> untuk menyimpan arsip lengkap periode berjalan sekaligus memulai tahun baru secara otomatis.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('arsip_periode')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Archive className="w-4 h-4 text-amber-300" />
              <span>Buka Arsip Multi-Tahun</span>
            </button>
          </div>

          {/* Card: Backup Data (Offline Protection) */}
          <div className="bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-blue-950">
                    Backup Data Keamanan (Offline)
                  </h4>
                  <p className="text-xs text-blue-800/90 mt-0.5">
                    Unduh seluruh data database aplikasi dalam format JSON sebagai bentuk pengamanan tambahan data offline.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackupData}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0 hover:shadow-blue-300/50"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh Backup JSON</span>
              </button>
            </div>
            <div className="p-3 bg-white/80 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
              <strong>Info Keamanan:</strong> File backup ini berisi seluruh data sensitif termasuk riwayat iuran, pengeluaran, dan daftar akun. Simpan file ini di tempat yang aman sebagai cadangan jika sewaktu-waktu dibutuhkan pemulihan data manual.
            </div>
          </div>

          {/* 10. ZONA PENGATURAN LANJUTAN: RESET DATA AWAL */}
          <div className="bg-rose-50/60 border-2 border-rose-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-rose-950">
                    Zona Pengaturan Lanjutan (Reset Data Awal)
                  </h4>
                  <p className="text-xs text-rose-800/90 mt-0.5">
                    Pemulihan sistem ke kondisi awal siap pakai sebelum periode kegiatan dimulai.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-rose-200/70 border border-rose-300 text-rose-950 font-bold text-[11px] rounded-full uppercase tracking-wider">
                Tindakan Berisiko Tinggi
              </span>
            </div>

            <div className="p-4 bg-white/90 border border-rose-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-rose-950 text-xs">
                Fungsi Reset Data Awal akan melakukan hal-hal berikut:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                <li>
                  <strong className="text-slate-900">Mengembalikan daftar warga ({wargaUtama.length} warga tercatat)</strong> ke kondisi awal dengan <strong>kolom iuran minggu ke-1 sampai minggu ke-12 kosong (Rp 0)</strong> serta total bayar kembali ke nol.
                </li>
                <li>
                  <strong className="text-slate-900">Mereset & mengosongkan seluruh riwayat pembayaran iuran warga</strong> dan riwayat donasi suka rela.
                </li>
                <li>
                  <strong className="text-slate-900">Mereset seluruh pengeluaran kas panitia ke Rp 0</strong> (menghapus catatan belanja barang dan sewa fasilitas kas bendahara).
                </li>
                <li>
                  <strong className="text-rose-700">Akun pengguna sistem petugas (Admin, Bendahara, Usser 1 & 2) tetap aman</strong> dan tidak akan terhapus.
                </li>
              </ul>
            </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pt-2">
                <p className="text-[11px] text-rose-900 sm:mr-auto">
                  ⚠️ Pastikan Anda telah mengunduh laporan rekapitulasi PDF terbaru sebelum menjalankan tindakan ini.
                </p>



                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearAllModal(true);
                      setClearAllConfirmText('');
                      setResetError('');
                    }}
                    className="px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua Warga (0 Warga)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(true);
                      setResetConfirmText('');
                      setResetError('');
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0 hover:shadow-rose-300/50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Seluruh Data Awal</span>
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* 10. STRUKTUR PANITIA TAB */}
      {activeTab === 'struktur' && (
        <StrukturPanitiaCard 
          committeeSettings={committeeSettings} 
          canEdit={true}
          currentUser={currentUser}
          onRefresh={onRefresh}
        />
      )}

      {/* 11. PROPOSAL KEGIATAN TAB */}
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
          canEdit={true}
          onRefresh={onRefresh}
        />
      )}

      {/* 12. ARSIP MULTI-TAHUN (ANTAR-PERIODE) TAB */}
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

      {/* 13. STATISTIK PENGUNJUNG LINK TAB */}
      {activeTab === 'pengunjung' && (
        <div className="space-y-4">
          {/* Top Banner Card */}
          <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-400 text-slate-950 flex items-center gap-1 shadow-xs">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Live Counter Real-Time
                  </span>
                  <span className="text-blue-300 text-xs">•</span>
                  <span className="text-blue-200 text-xs font-semibold">Otomatis Terhubung Multi-Perangkat</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  Statistik & Pemantau Pengunjung Link Aplikasi
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Lacak jumlah warga, jamaah, donatur, dan panitia yang mengakses link web aplikasi ini. Data tercatat otomatis setiap kali link dibuka secara real-time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3.5 py-2 bg-blue-700/80 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs border border-blue-500/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Segarkan data statistik"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyVisitorReport}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Salin laporan statistik untuk WhatsApp Panitia"
                >
                  {copiedVisitorReport ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedVisitorReport ? 'Tersalin!' : 'Salin Laporan WA'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetVisitorConfirmText('');
                    setShowResetVisitorModal(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs border border-rose-400/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Reset hitungan statistik pengunjung"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Hitungan</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Kunjungan */}
            <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Total Akses Link
                </span>
                <p className="text-3xl font-black font-mono text-slate-900 mt-1">
                  {(visitorStats?.totalVisits || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Total seluruh kali link ini dibuka
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Globe className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Hari Ini */}
            <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Kunjungan Hari Ini
                </span>
                <p className="text-3xl font-black font-mono text-rose-700 mt-1">
                  {(visitorStats?.todayVisits || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akses link sepanjang hari ini (WIB)
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Minggu Ini */}
            <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  7 Hari Terakhir
                </span>
                <p className="text-3xl font-black font-mono text-indigo-700 mt-1">
                  {(visitorStats?.weekVisits || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akumulasi kunjungan 1 pekan terakhir
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Perangkat Unik */}
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Pengunjung Unik
                </span>
                <p className="text-3xl font-black font-mono text-purple-700 mt-1">
                  {(visitorStats?.uniqueVisitors || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Jumlah perangkat / browser berbeda
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Device Breakdown & Link Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Breakdown */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Distribusi Perangkat Pengakses
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Sampel {totalLogs} data terkini
                </span>
              </div>

              <div className="space-y-3">
                {/* Mobile */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      Smartphone / HP Mobile
                    </span>
                    <span className="font-bold text-slate-800">
                      {mobileCount} ({mobilePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${mobilePct}%` }}
                    />
                  </div>
                </div>

                {/* Desktop */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                      Komputer / Laptop (Desktop)
                    </span>
                    <span className="font-bold text-slate-800">
                      {desktopCount} ({desktopPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${desktopPct}%` }}
                    />
                  </div>
                </div>

                {/* Tablet */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Tablet className="w-3.5 h-3.5 text-rose-600" />
                      Tablet / iPad
                    </span>
                    <span className="font-bold text-slate-800">
                      {tabletCount} ({tabletPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-rose-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${tabletPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Link Info & Last Visit */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Informasi Tautan & Akses Terakhir
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  Aktif
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Tautan Resmi Aplikasi</span>
                  <p className="font-mono font-semibold text-slate-800 break-all select-all">
                    {window.location.origin}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="font-medium text-slate-600">Akses Terakhir Tercatat:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {visitorStats?.lastVisitedAt || 'Belum ada kunjungan'}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  💡 <strong>Info Transparansi:</strong> Jumlah total pengunjung juga ditampilkan secara otomatis di bagian paling bawah (Footer) dan di Halaman Tampilan Awal (Welcome Screen) agar seluruh warga mengetahui link ini aktif diakses.
                </div>
              </div>
            </div>
          </div>

          {/* Table: 50 Recent Visits Log */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Riwayat 50 Kunjungan Terkini</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan waktu, tipe perangkat, dan halaman yang dibuka setiap pengunjung
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border-2 border-slate-300 text-xs font-semibold relative z-10">
                  <button
                    type="button"
                    onClick={() => setVisitorFilterDevice('all')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      visitorFilterDevice === 'all'
                        ? 'bg-blue-800 text-white font-black shadow-md border-2 border-blue-950'
                        : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorFilterDevice('mobile')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      visitorFilterDevice === 'mobile'
                        ? 'bg-blue-800 text-white font-black shadow-md border-2 border-blue-950'
                        : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                    }`}
                  >
                    📱 Ponsel
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorFilterDevice('desktop')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      visitorFilterDevice === 'desktop'
                        ? 'bg-blue-800 text-white font-black shadow-md border-2 border-blue-950'
                        : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-bold'
                    }`}
                  >
                    💻 Desktop
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Cari waktu / info..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Waktu & Jam Akses (WIB)</th>
                    <th className="py-2.5 px-3">Perangkat</th>
                    <th className="py-2.5 px-3">Halaman / Bagian</th>
                    <th className="py-2.5 px-3">Hak Akses / Peran</th>
                    <th className="py-2.5 px-3">Info Browser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisitorLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        {visitorSearch || visitorFilterDevice !== 'all'
                          ? 'Tidak ada data kunjungan yang cocok dengan filter pencarian.'
                          : 'Belum ada catatan pengunjung. Statistik akan otomatis bertambah saat link dibuka.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVisitorLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {log.formattedTime}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.deviceType === 'desktop'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : log.deviceType === 'tablet'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {log.deviceType === 'desktop' ? (
                              <Monitor className="w-3 h-3" />
                            ) : log.deviceType === 'tablet' ? (
                              <Tablet className="w-3 h-3" />
                            ) : (
                              <Smartphone className="w-3 h-3" />
                            )}
                            {log.deviceType === 'desktop'
                              ? 'Komputer'
                              : log.deviceType === 'tablet'
                              ? 'Tablet'
                              : 'Ponsel (HP)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {log.pageVisited || '/'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.roleViewed === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : log.roleViewed === 'bendahara'
                              ? 'bg-amber-100 text-amber-800'
                              : log.roleViewed === 'warga'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.roleViewed || 'tamu'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={log.userAgent}>
                          {log.userAgent || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 14. TAB CATATAN & AGENDA PANITIA (ADMIN) */}
      {activeTab === 'catatan' && (
        <div className="space-y-4">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-rose-950 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-amber-700/60 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                    Buku Catatan & Agenda Resmi
                  </span>
                  <span className="text-[11px] text-amber-200 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-600/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-rose-400" />
                    Tersinkronisasi Cloud Database
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                  CATATAN & AGENDA PANITIA PHBI ISRA MI'RAJ
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
                  Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
                </p>
              </div>

              {/* Action Buttons in Banner */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-admin-save-catatan-top"
                  onClick={handleSaveNote}
                  disabled={noteSaving}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Simpan catatan ke Google Cloud Firestore"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>{noteSaving ? 'Menyimpan...' : 'Simpan Catatan'}</span>
                </button>

                <button
                  type="button"
                  id="btn-admin-copy-catatan-wa"
                  onClick={handleCopyNoteToWa}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Salin isi catatan dengan format rapi ke WhatsApp"
                >
                  {copiedNote ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{copiedNote ? 'Tersalin!' : 'Salin ke WhatsApp'}</span>
                </button>
              </div>
            </div>

            {noteSavedMsg && (
              <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-400/50 rounded-xl text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-rose-300 shrink-0" />
                <span>{noteSavedMsg}</span>
              </div>
            )}
          </div>

          {/* Editor & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Editor Card */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Tulis & Kelola Catatan Panitia</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catat notulensi rapat, daftar rencana, checklist perlengkapan, atau instruksi kerja
                  </p>
                </div>

                <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {noteContent.length} karakter • {noteContent.split(/\s+/).filter(Boolean).length} kata
                </div>
              </div>

              {/* Template Cepat */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Template Catatan Cepat (Klik untuk menyisipkan):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: '📋 Agenda Rapat PHBI',
                      template: `*AGENDA RAPAT PANITIA PHBI ISRA MI'RAJ*\nTanggal: \nTempat: Majelis Kp. Kedung Sapi\nPembahasan:\n1. Penetapan tanggal & penceramah Tabligh Akbar\n2. Evaluasi progres iuran warga pekan berjalan\n3. Pembagian tugas seksi perlengkapan & konsumsi\n4. Lain-lain`
                    },
                    {
                      label: '📦 Checklist Perlengkapan',
                      template: `*CHECKLIST PERLENGKAPAN & LOGISTIK ACARA*\n- Panggung utama & backdrop spanduk\n- Sound system, mic wireless, & genset cadangan\n- Tenda terpal & karpet jamaah\n- Lampu penerangan lapangan\n- Tempat wudhu & kebersihan`
                    },
                    {
                      label: '🕌 Mubaligh & Susunan Acara',
                      template: `*JADWAL MUBALIGH & KONSULTASI ACARA*\n- Mubaligh Utama: KH. [Nama Mubaligh]\n- Qori Tilawah: Ust. [Nama Qori]\n- Waktu Acara: Minggu, 17 Januari 2027 (Ba'da Isya 19.30 WIB)\n- Petugas Sambutan: Ketua Panitia, Ketua RT, Kepala Desa Kp. Baru`
                    },
                    {
                      label: '📢 Pengumuman Warga',
                      template: `*PENGUMUMAN UNTUK WARGA KP. KEDUNG SAPI*\nAssalamu'alaikum Wr. Wb.\nDiberitahukan kepada seluruh warga Kp. Kedung Sapi bahwa gotong royong kebersihan dan pemasangan tenda PHBI Isra Mi'raj akan dilaksanakan pada:\nHari/Tgl: Sabtu\nWaktu: 08.00 WIB s/d selesai\nMohon partisipasi dan kehadirannya. Terima kasih.`
                    }
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const newText = noteContent ? `${noteContent}\n\n${tpl.template}` : tpl.template;
                        setNoteContent(newText);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-700 border border-slate-200 hover:border-amber-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <textarea
                  rows={14}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Ketik catatan, notulensi rapat, daftar belanja, nomor kontak penting, atau agenda panitia di sini..."
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-sans text-slate-900 leading-relaxed focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Bottom Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Bersihkan seluruh isi catatan? Tindakan ini akan mengosongkan teks di layar.')) {
                      setNoteContent('');
                    }
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Bersihkan Teks
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyNoteToWa}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                    <span>Salin Format WA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={noteSaving}
                    className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{noteSaving ? 'Menyimpan...' : 'Simpan Catatan'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Pratinjau Tampilan Catatan */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    Pratinjau Catatan Panitia
                  </span>
                  <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                    Otoritas: Admin ({currentUser.name})
                  </span>
                </div>

                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/80 space-y-2 min-h-[300px]">
                  <div className="border-b border-amber-200/60 pb-2">
                    <h4 className="font-bold text-xs text-amber-950 uppercase">
                      Panitia PHBI Isra Mi'raj 1448 H / 2027 M
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
                    </p>
                  </div>

                  {noteContent ? (
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                      {noteContent}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 italic text-xs">
                      Belum ada catatan yang ditulis. Gunakan kolom editor di sebelah kiri untuk menulis catatan atau memilih template cepat.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Penyimpanan Aman & Tersinkronisasi</span>
                </div>
                <p className="text-slate-500">
                  Catatan ini tersimpan di Google Cloud Firestore dan dapat diakses kembali kapan saja oleh Admin saat login dari HP, laptop, atau komputer mana pun.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET STATISTIK PENGUNJUNG */}
      {showResetVisitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Reset Statistik Pengunjung
                  </h3>
                  <span className="text-[11px] text-rose-600 font-semibold">
                    Tindakan ini akan mengosongkan riwayat kunjungan ke 0
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetVisitorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                Anda akan mereset hitungan seluruh statistik pengunjung link aplikasi (Total Akses, Kunjungan Hari Ini, Mingguan, dan Riwayat 50 Kunjungan Terkini) kembali ke <strong>angka 0</strong>.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                Ketik kata <strong className="font-mono font-bold text-rose-700">RESET</strong> di bawah ini untuk mengonfirmasi tindakan:
              </div>
            </div>

            <input
              type="text"
              placeholder='Ketik "RESET"'
              value={resetVisitorConfirmText}
              onChange={(e) => setResetVisitorConfirmText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider focus:border-rose-500 focus:outline-hidden text-center"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetVisitorModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetVisitorConfirmText.trim().toUpperCase() !== 'RESET' || resetVisitorLoading}
                onClick={handleResetVisitors}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                {resetVisitorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{resetVisitorLoading ? 'Mereset...' : 'Ya, Reset Hitungan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET DATA AWAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Konfirmasi Reset Data Awal
                  </h3>
                  <span className="text-[11px] text-rose-600 font-semibold">
                    Tindakan ini tidak dapat dibatalkan
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="leading-relaxed">
                Anda akan mengosongkan seluruh kolom iuran dari <strong className="text-slate-900">{wargaUtama.length} warga</strong> dan mereset pengeluaran kas bendahara ke <strong className="text-slate-900">Rp 0</strong>.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
                Ketik kata <strong className="text-rose-950 font-black">RESET</strong> dengan huruf kapital pada kolom di bawah ini untuk melanjutkan:
              </div>
            </div>

            <div>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Ketik RESET"
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-rose-600 rounded-xl text-center font-mono font-bold text-sm tracking-widest text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            {resetError && (
              <p className="text-xs font-semibold text-rose-600 text-center">
                {resetError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET' || resetLoading}
                onClick={handleExecuteReset}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resetLoading ? 'Mereset Data...' : 'Ya, Reset Seluruh Data Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SEMUA WARGA PERMANEN */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-300 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-900 text-white rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Hapus Seluruh Data Warga Permanen
                  </h3>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    Daftar warga akan dikosongkan (0 Warga)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="leading-relaxed">
                Tindakan ini akan menghapus <strong className="text-slate-900">seluruh daftar nama warga</strong> secara permanen sehingga jumlah warga menjadi 0.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
                Ketik kata <strong className="text-rose-950 font-black">HAPUS SEMUA</strong> dengan huruf kapital pada kolom di bawah ini untuk mengonfirmasi:
              </div>
            </div>

            <div>
              <input
                type="text"
                value={clearAllConfirmText}
                onChange={(e) => setClearAllConfirmText(e.target.value)}
                placeholder="Ketik HAPUS SEMUA"
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-rose-900 rounded-xl text-center font-mono font-bold text-sm tracking-widest text-slate-900 focus:bg-white focus:outline-none uppercase"
              />
            </div>

            {resetError && (
              <p className="text-xs font-semibold text-rose-600 text-center">
                {resetError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={clearAllConfirmText.trim().toUpperCase() !== 'HAPUS SEMUA' || clearAllLoading}
                onClick={handleExecuteClearAllCitizens}
                className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearAllLoading ? 'Menghapus...' : 'Ya, Hapus Semua Warga Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* UNIVERSAL ADMIN EDIT MODAL */}
      {editUniversalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                {editUniversalModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditUniversalModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUniversalEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {editUniversalModal.field1Label}
                </label>
                <input
                  type="text"
                  required
                  value={editUniversalModal.field1Value}
                  onChange={(e) => setEditUniversalModal({
                    ...editUniversalModal,
                    field1Value: e.target.value
                  })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-rose-600"
                />
              </div>

              {editUniversalModal.field2Label && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {editUniversalModal.field2Label}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      Rp
                    </div>
                    <input
                      type="text"
                      required
                      value={editUniversalModal.field2Value}
                      onChange={(e) => setEditUniversalModal({
                        ...editUniversalModal,
                        field2Value: formatInputNumber(e.target.value)
                      })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono focus:bg-white focus:border-rose-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Otoritas: <strong>Admin ({currentUser.name})</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditUniversalModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={universalLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {universalLoading ? 'Menyimpan...' : 'Simpan Perubahan Data'}
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
