import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  FileDown,
  Edit3,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  MapPin,
  Clock,
  Users,
  Wallet,
  BookOpen,
  Target,
  Sparkles,
  Award,
  PenTool,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  ProposalData,
  ProposalRundownItem,
  ProposalBudgetItem,
  ProposalSourceItem,
  CommitteeSettings,
  CommitteeSection,
  Citizen,
  DonasiWargaPayment,
  DonasiSukarela,
  Pengeluaran,
  UserAccount
} from '../types';
import { getDefaultProposalData } from '../data/defaultProposal';
import { formatRupiah, formatInputNumber, parseRupiah } from '../utils/formatters';
import { generatePdfProposalKegiatan } from '../utils/pdfGenerator';

interface ProposalKegiatanProps {
  proposalData?: ProposalData;
  committeeSettings?: CommitteeSettings;
  citizens?: Citizen[];
  wargaPayments?: DonasiWargaPayment[];
  sukarelaPayments?: DonasiSukarela[];
  pengeluaranList?: Pengeluaran[];
  targetPerPerson?: number;
  currentUser?: UserAccount | null;
  canEdit?: boolean;
  onRefresh?: () => void;
}

type SectionFilter = 'all' | 'cover' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

const DEFAULT_SECTIONS_FALLBACK: CommitteeSection[] = [];

function normalizeProposalDateAndYear(val: string | undefined): string {
  if (!val || typeof val !== 'string') return val || '';
  return val
    .replace(/17\s+Januari\s+2026(\s*\([^)]*\))?/gi, '17 Januari 2027 (1448 H)')
    .replace(/14\s+Februari\s+2027(\s*\([^)]*\))?/gi, '17 Januari 2027 (1448 H)')
    .replace(/Sabtu\s+Malam\s+Minggu,\s*17\s+Januari\s+2026(\s*\([^)]*\))?/gi, 'Minggu, 17 Januari 2027 (1448 H)')
    .replace(/Sabtu\s+Malam\s+Minggu,\s*14\s+Februari\s+2027(\s*\([^)]*\))?/gi, 'Minggu, 17 Januari 2027 (1448 H)')
    .replace(/1447\s*H\s*\/\s*2026\s*M(\s*\/\s*2026\s*M)?/gi, '1448 H / 2027 M')
    .replace(/1447\s*H/gi, '1448 H')
    .replace(/\/I\/2026/g, '/I/2027')
    .replace(/Januari\s+2026/gi, 'Januari 2027')
    .replace(/Tahun\s+2026/gi, 'Tahun 2027')
    .replace(/2026\s*M/gi, '2027 M');
}

function normalizeProposalData(raw: ProposalData, fallback: ProposalData): ProposalData {
  const merged: ProposalData = {
    ...fallback,
    ...raw,
    // Sampul Depan / Cover Proposal fields
    coverJudul: normalizeProposalDateAndYear(raw.coverJudul || fallback.coverJudul || 'PROPOSAL KEGIATAN'),
    coverSubjudul: normalizeProposalDateAndYear(raw.coverSubjudul || fallback.coverSubjudul || 'PERINGATAN HARI BESAR ISLAM (PHBI)'),
    coverInstansi: normalizeProposalDateAndYear(raw.coverInstansi || fallback.coverInstansi || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)'),
    coverTahun: normalizeProposalDateAndYear(raw.coverTahun || fallback.coverTahun || '1448 H / 2027 M'),
    coverWilayah: normalizeProposalDateAndYear(raw.coverWilayah || fallback.coverWilayah || 'KP. KEDUNG SAPI, DESA KP. BARU, KEC. PAMARAYAN, KAB. SERANG – BANTEN'),
    kopBaris1: normalizeProposalDateAndYear(raw.kopBaris1 || fallback.kopBaris1),
    kopBaris2: normalizeProposalDateAndYear(raw.kopBaris2 || fallback.kopBaris2),
    kopAlamat: raw.kopAlamat || fallback.kopAlamat,
    kopSekretariat: raw.kopSekretariat || fallback.kopSekretariat,
    nomorProposal: normalizeProposalDateAndYear(raw.nomorProposal || fallback.nomorProposal),
    perihal: normalizeProposalDateAndYear(raw.perihal || fallback.perihal),
    judulProposal: normalizeProposalDateAndYear(raw.judulProposal || fallback.judulProposal),
    temaKegiatan: normalizeProposalDateAndYear(raw.temaKegiatan || fallback.temaKegiatan),
    tanggalSurat: normalizeProposalDateAndYear(raw.tanggalSurat || fallback.tanggalSurat),
    kataPengantar: normalizeProposalDateAndYear(raw.kataPengantar || fallback.kataPengantar),
    maksudKegiatan: normalizeProposalDateAndYear(raw.maksudKegiatan || fallback.maksudKegiatan),
    tujuanKegiatan: (raw.tujuanKegiatan || fallback.tujuanKegiatan || []).map(t => normalizeProposalDateAndYear(t)),
    bentukKegiatanDeskripsi: normalizeProposalDateAndYear(raw.bentukKegiatanDeskripsi || fallback.bentukKegiatanDeskripsi),
    bentukKegiatanList: (raw.bentukKegiatanList || fallback.bentukKegiatanList || []).map(b => normalizeProposalDateAndYear(b)),
    namaKegiatan: normalizeProposalDateAndYear(raw.namaKegiatan || fallback.namaKegiatan),
    hariTanggal: normalizeProposalDateAndYear(raw.hariTanggal || fallback.hariTanggal || 'Minggu, 17 Januari 2027 (1448 H)'),
    sumberDanaDeskripsi: normalizeProposalDateAndYear(raw.sumberDanaDeskripsi || fallback.sumberDanaDeskripsi),
    penutup: normalizeProposalDateAndYear(raw.penutup || fallback.penutup),
    rundownAcara: (raw.rundownAcara || fallback.rundownAcara || []).map(rd => ({
      ...rd,
      kegiatan: normalizeProposalDateAndYear(rd.kegiatan)
    })),
    pelindung: raw.pelindung || fallback.pelindung,
    penasehat: raw.penasehat || fallback.penasehat,
    penanggungJawab: raw.penanggungJawab || fallback.penanggungJawab,
    adminSistem: raw.adminSistem || fallback.adminSistem,
    sections: (raw.sections && raw.sections.length > 0) ? raw.sections : fallback.sections,
    signers: {
      ...fallback.signers,
      ...(raw.signers || {})
    },
    signerRoles: {
      ...fallback.signerRoles,
      ...(raw.signerRoles || {})
    }
  };
  return merged;
}

export default function ProposalKegiatan({
  proposalData,
  committeeSettings,
  citizens = [],
  wargaPayments = [],
  sukarelaPayments = [],
  pengeluaranList = [],
  targetPerPerson = 250000,
  currentUser = null,
  canEdit = false,
  onRefresh
}: ProposalKegiatanProps) {
  const isAdminCanEdit = Boolean(canEdit && currentUser?.role === 'admin');
  const wargaUtamaCount = useMemo(
    () => citizens.filter(c => !c.isNgontrak).length || 132,
    [citizens]
  );

  const defaultProposal = useMemo(
    () => getDefaultProposalData(committeeSettings, targetPerPerson, wargaUtamaCount),
    [committeeSettings, targetPerPerson, wargaUtamaCount]
  );

  const [formData, setFormData] = useState<ProposalData>(() => {
    if (proposalData && proposalData.kataPengantar) {
      return normalizeProposalData(proposalData, defaultProposal);
    }
    return defaultProposal;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<SectionFilter>('all');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [copiedWa, setCopiedWa] = useState<boolean>(false);

  // Sync incoming proposalData when not actively editing
  useEffect(() => {
    if (!isEditing && proposalData && proposalData.kataPengantar) {
      setFormData(normalizeProposalData(proposalData, defaultProposal));
    }
  }, [proposalData, isEditing, defaultProposal]);

  // Financial realizations for reference in Sumber Dana & Anggaran
  const totalRealisasiWarga = useMemo(
    () => wargaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [wargaPayments]
  );
  const totalRealisasiSukarela = useMemo(
    () => sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [sukarelaPayments]
  );
  const totalRealisasiMasuk = totalRealisasiWarga + totalRealisasiSukarela;

  const totalAnggaranProposal = useMemo(
    () => (formData.anggaranDana || []).reduce((s, item) => s + (Number(item.jumlah) || 0), 0),
    [formData.anggaranDana]
  );

  const totalSumberDanaProposal = useMemo(
    () => (formData.sumberDanaList || []).reduce((s, item) => s + (Number(item.estimasi) || 0), 0),
    [formData.sumberDanaList]
  );

  const sectionsList = useMemo(() => {
    if (formData.sections && formData.sections.length > 0) {
      return formData.sections;
    }
    return committeeSettings?.sections && committeeSettings.sections.length > 0
      ? committeeSettings.sections
      : DEFAULT_SECTIONS_FALLBACK;
  }, [formData.sections, committeeSettings]);

  // Handlers for Section H (Susunan Panitia) inside Proposal
  const handleAddCommitteeSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...(prev.sections && prev.sections.length > 0 ? prev.sections : sectionsList),
        { name: 'Seksi Baru', coordinator: 'Nama Koordinator', members: ['Anggota 1', 'Anggota 2'] }
      ]
    }));
  };

  const handleUpdateCommitteeSection = (idx: number, field: 'name' | 'coordinator' | 'members', val: string) => {
    setFormData(prev => {
      const currentSecs = [...(prev.sections && prev.sections.length > 0 ? prev.sections : sectionsList)];
      if (field === 'members') {
        currentSecs[idx] = {
          ...currentSecs[idx],
          members: val.split(',').map(s => s.trim())
        };
      } else {
        currentSecs[idx] = {
          ...currentSecs[idx],
          [field]: val
        };
      }
      return { ...prev, sections: currentSecs };
    });
  };

  const handleRemoveCommitteeSection = (idx: number) => {
    setFormData(prev => {
      const currentSecs = [...(prev.sections && prev.sections.length > 0 ? prev.sections : sectionsList)];
      return {
        ...prev,
        sections: currentSecs.filter((_, i) => i !== idx)
      };
    });
  };

  // Handlers for list & table items
  const handleAddTujuan = () => {
    setFormData(prev => ({
      ...prev,
      tujuanKegiatan: [...(prev.tujuanKegiatan || []), 'Tujuan kegiatan baru...']
    }));
  };

  const handleUpdateTujuan = (idx: number, val: string) => {
    setFormData(prev => {
      const next = [...(prev.tujuanKegiatan || [])];
      next[idx] = val;
      return { ...prev, tujuanKegiatan: next };
    });
  };

  const handleRemoveTujuan = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      tujuanKegiatan: (prev.tujuanKegiatan || []).filter((_, i) => i !== idx)
    }));
  };

  const handleAddBentuk = () => {
    setFormData(prev => ({
      ...prev,
      bentukKegiatanList: [...(prev.bentukKegiatanList || []), 'Bentuk kegiatan baru...']
    }));
  };

  const handleUpdateBentuk = (idx: number, val: string) => {
    setFormData(prev => {
      const next = [...(prev.bentukKegiatanList || [])];
      next[idx] = val;
      return { ...prev, bentukKegiatanList: next };
    });
  };

  const handleRemoveBentuk = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      bentukKegiatanList: (prev.bentukKegiatanList || []).filter((_, i) => i !== idx)
    }));
  };

  // Rundown Acara handlers
  const handleAddRundown = () => {
    const newItem: ProposalRundownItem = {
      id: 'rd-' + Date.now(),
      waktu: '20.00 – 20.30 WIB',
      kegiatan: 'Nama Mata Acara',
      pengisi: 'Pengisi Acara / Seksi Acara',
      keterangan: 'Keterangan'
    };
    setFormData(prev => ({
      ...prev,
      rundownAcara: [...(prev.rundownAcara || []), newItem]
    }));
  };

  const handleUpdateRundown = (idx: number, field: keyof ProposalRundownItem, val: string) => {
    setFormData(prev => {
      const next = [...(prev.rundownAcara || [])];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, rundownAcara: next };
    });
  };

  const handleRemoveRundown = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      rundownAcara: (prev.rundownAcara || []).filter((_, i) => i !== idx)
    }));
  };

  // Anggaran Dana (RAB) handlers
  const handleAddAnggaran = () => {
    const newItem: ProposalBudgetItem = {
      id: 'rab-' + Date.now(),
      kategori: 'Kebutuhan Acara',
      uraian: 'Rincian kebutuhan anggaran baru',
      volume: '1 Paket',
      jumlah: 500000
    };
    setFormData(prev => ({
      ...prev,
      anggaranDana: [...(prev.anggaranDana || []), newItem]
    }));
  };

  const handleUpdateAnggaran = (idx: number, field: keyof ProposalBudgetItem, val: string | number) => {
    setFormData(prev => {
      const next = [...(prev.anggaranDana || [])];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, anggaranDana: next };
    });
  };

  const handleRemoveAnggaran = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      anggaranDana: (prev.anggaranDana || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSyncAnggaranFromPengeluaran = () => {
    if (!pengeluaranList || pengeluaranList.length === 0) return;
    const mapped: ProposalBudgetItem[] = pengeluaranList.map((p, idx) => ({
      id: `rab-real-${idx}-${Date.now()}`,
      kategori: p.recipient || 'Realisasi Kas',
      uraian: p.description,
      volume: '1 Paket',
      jumlah: Number(p.amount) || 0
    }));
    setFormData(prev => ({
      ...prev,
      anggaranDana: mapped
    }));
  };

  // Sumber Dana handlers
  const handleAddSumberDana = () => {
    const newItem: ProposalSourceItem = {
      id: 'sd-' + Date.now(),
      sumber: 'Sumber Pendanaan Baru',
      uraian: 'Keterangan sumber pendanaan',
      estimasi: 1000000
    };
    setFormData(prev => ({
      ...prev,
      sumberDanaList: [...(prev.sumberDanaList || []), newItem]
    }));
  };

  const handleUpdateSumberDana = (idx: number, field: keyof ProposalSourceItem, val: string | number) => {
    setFormData(prev => {
      const next = [...(prev.sumberDanaList || [])];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, sumberDanaList: next };
    });
  };

  const handleRemoveSumberDana = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      sumberDanaList: (prev.sumberDanaList || []).filter((_, i) => i !== idx)
    }));
  };

  // Save Proposal to Server & Cloud Firestore
  const handleSaveProposal = async () => {
    setSaving(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalData: formData,
          updatedBy: currentUser?.name || 'Panitia PHBI'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyimpan proposal ke server');
      }

      setSaveSuccess('Proposal Kegiatan PHBI Isra Mi\'raj berhasil disimpan & disinkronkan secara real-time!');
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSaveError(err.message || 'Terjadi kesalahan saat menyimpan proposal');
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = () => {
    const fresh = getDefaultProposalData(committeeSettings, targetPerPerson, wargaUtamaCount);
    setFormData(fresh);
    setSaveSuccess('Template proposal dikembalikan ke format standar PHBI Kp. Kedung Sapi. Klik "Simpan Proposal" untuk menyimpan.');
  };

  const handleCopyProposalText = () => {
    let text = `*📋 ${formData.coverJudul || 'PROPOSAL KEGIATAN'}*\n`;
    text += `_${formData.coverSubjudul || 'PERINGATAN HARI BESAR ISLAM (PHBI)'}_\n`;
    text += `*${formData.judulProposal}*\n`;
    text += `*Tahun:* ${formData.coverTahun || '1448 H / 2027 M'}\n`;
    text += `*Penyelenggara:* ${formData.coverInstansi || 'PANITIA PHBI'} (${formData.coverWilayah || 'KP. KEDUNG SAPI, DESA KP. BARU'})\n`;
    text += `_Tema: "${formData.temaKegiatan}"_\n`;
    text += `Nomor: ${formData.nomorProposal}\n\n`;
    text += `*A. KATA PENGANTAR*\n${formData.kataPengantar}\n\n`;
    text += `*B. MAKSUD DAN TUJUAN*\n${formData.maksudKegiatan}\n`;
    formData.tujuanKegiatan.forEach((t, i) => {
      text += `${i + 1}. ${t}\n`;
    });
    text += `\n*C. BENTUK KEGIATAN*\n${formData.bentukKegiatanDeskripsi}\n`;
    formData.bentukKegiatanList.forEach((b, i) => {
      text += `${i + 1}. ${b}\n`;
    });
    text += `\n*D. WAKTU DAN TEMPAT*\n`;
    text += `• Hari/Tanggal: ${formData.hariTanggal}\n`;
    text += `• Waktu: ${formData.waktuPelaksanaan}\n`;
    text += `• Tempat: ${formData.tempatPelaksanaan}\n`;
    text += `• Penceramah: ${formData.penceramah}\n`;
    text += `• Qori: ${formData.qori}\n\n`;
    text += `*E. SUSUNAN & RUNDOWN ACARA*\n`;
    formData.rundownAcara.forEach((r, i) => {
      text += `${i + 1}. [${r.waktu}] ${r.kegiatan} (${r.pengisi})\n`;
    });
    text += `\n*F. ANGGARAN DANA (RAB)*\n`;
    formData.anggaranDana.forEach((a, i) => {
      text += `${i + 1}. ${a.uraian} (${a.volume}): Rp ${formatRupiah(a.jumlah)}\n`;
    });
    text += `*Total Estimasi Anggaran: Rp ${formatRupiah(totalAnggaranProposal)}*\n\n`;
    text += `*G. SUMBER DANA*\n`;
    formData.sumberDanaList.forEach((s, i) => {
      text += `${i + 1}. ${s.sumber}: Rp ${formatRupiah(s.estimasi)}\n`;
    });
    const pelindungStr = formData.pelindung || (committeeSettings?.pelindung && committeeSettings.pelindung.length > 0
      ? committeeSettings.pelindung.join(', ')
      : '—');
    const penasehatStr = formData.penasehat || (committeeSettings?.penasehat && committeeSettings.penasehat.length > 0
      ? committeeSettings.penasehat.join(' & ')
      : '—');
    text += `\n*H. SUSUNAN PANITIA INTI & PENANGGUNG JAWAB*\n`;
    text += `• Pelindung: ${pelindungStr}\n`;
    text += `• Penasehat: ${penasehatStr}\n`;
    text += `• Ketua RT 011 / RW 04: ${formData.signers.ketuaRt}\n`;
    text += `• Tokoh (Penanggung Jawab): ${formData.signers.tokohPenanggungJawab}\n`;
    text += `• Ketua Pemuda: ${formData.signers.ketuaPemuda}\n`;
    text += `• Ketua Panitia: ${formData.signers.ketuaPanitia}\n`;
    text += `• Wakil Ketua: ${formData.signers.wakilKetua}\n`;
    text += `• Sekretaris: ${formData.signers.sekretaris}\n`;
    text += `• Bendahara: ${formData.signers.bendahara}\n\n`;
    text += `*I. PENUTUP*\n${formData.penutup}`;

    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const showSection = (code: SectionFilter) => activeSection === 'all' || activeSection === code;

  const renderSectionEditButton = (label: string = 'Edit Bagian Ini') => {
    if (!isAdminCanEdit) return null;
    return !isEditing ? (
      <button
        type="button"
        onClick={() => {
          setSaveSuccess('');
          setSaveError('');
          setIsEditing(true);
        }}
        className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0 print:hidden"
      >
        <Edit3 className="w-3.5 h-3.5 text-amber-300" />
        <span>{label}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={handleSaveProposal}
        disabled={saving}
        className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-xs print:hidden"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        <span>Simpan</span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP ACTION & HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-emerald-700/60 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300 font-semibold">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>DOKUMEN RESMI PROPOSAL PHBI ISRA MI'RAJ 1448 H / 2027 M</span>
              <span>·</span>
              <span>
                {isAdminCanEdit
                  ? 'Lengkap Bagian A s/d I & 8 Tanda Tangan (100% Dapat Diedit Admin)'
                  : 'Lengkap Bagian A s/d I & 8 Tanda Tangan Pengesahan'}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {isAdminCanEdit
                ? 'Pembuatan, Edit & Cetak Proposal Kegiatan Lengkap'
                : 'Dokumen & Cetak Proposal Kegiatan Lengkap'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
              {isAdminCanEdit ? (
                <>
                  Dokumen proposal resmi Panitia Peringatan Hari Besar Islam (PHBI) Isra Mi'raj Nabi Muhammad SAW 1448 H / 2027 M Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten. Seluruh isi <strong>Kop Surat, Bagian A sampai I, Struktur Kepanitiaan,</strong> beserta <strong>8 Penandatangan Lembar Pengesahan</strong> dapat diedit sepenuhnya oleh Admin dan diunduh dalam format PDF A4 rapi tanpa terpotong.
                </>
              ) : (
                <>
                  Dokumen proposal resmi Panitia Peringatan Hari Besar Islam (PHBI) Isra Mi'raj Nabi Muhammad SAW 1448 H / 2027 M Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten. Memuat <strong>Kop Surat, Bagian A sampai I, Struktur Kepanitiaan,</strong> beserta <strong>8 Penandatangan Lembar Pengesahan</strong> yang dapat dibaca dan diunduh dalam format PDF A4 rapi.
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-proposal-download-pdf"
              onClick={() => generatePdfProposalKegiatan(formData, committeeSettings)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md border-2 border-amber-600 flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF Proposal (A4)</span>
            </button>

            <button
              type="button"
              id="btn-proposal-copy-wa"
              onClick={handleCopyProposalText}
              className="px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl border-2 border-emerald-600 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedWa ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4 text-emerald-300" />}
              <span>{copiedWa ? 'Tersalin!' : 'Salin Teks WA'}</span>
            </button>

            {isAdminCanEdit && (
              !isEditing ? (
                <button
                  type="button"
                  id="btn-proposal-start-edit"
                  onClick={() => {
                    setSaveSuccess('');
                    setSaveError('');
                    setIsEditing(true);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs sm:text-sm rounded-xl shadow border-2 border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4 text-emerald-700" />
                  <span>Edit / Buat Proposal</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-proposal-save"
                    onClick={handleSaveProposal}
                    disabled={saving}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow border-2 border-emerald-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan Proposal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                    title="Kembalikan isi proposal ke template awal"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Standar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Pratinjau</span>
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Status Feedback */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-800/80 border border-emerald-400/50 text-emerald-100 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-900/80 border border-emerald-400/50 text-emerald-100 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* 2. QUICK SECTION NAVIGATION BAR (A - I) */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-slate-300 p-2.5 flex flex-wrap items-center justify-between gap-2 print:hidden relative z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { code: 'all' as SectionFilter, label: 'Semua Bagian (A–I & Sampul)' },
            { code: 'cover' as SectionFilter, label: 'Sampul Depan (Cover)' },
            { code: 'A' as SectionFilter, label: 'A. Kata Pengantar' },
            { code: 'B' as SectionFilter, label: 'B. Maksud & Tujuan' },
            { code: 'C' as SectionFilter, label: 'C. Bentuk Kegiatan' },
            { code: 'D' as SectionFilter, label: 'D. Waktu & Tempat' },
            { code: 'E' as SectionFilter, label: 'E. Rundown Acara' },
            { code: 'F' as SectionFilter, label: 'F. Anggaran Dana' },
            { code: 'G' as SectionFilter, label: 'G. Sumber Dana' },
            { code: 'H' as SectionFilter, label: 'H. Susunan Panitia' },
            { code: 'I' as SectionFilter, label: 'I. Penutup & 8 TTD' }
          ].map(tab => (
            <button
              key={tab.code}
              type="button"
              onClick={() => setActiveSection(tab.code)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                activeSection === tab.code
                  ? 'bg-emerald-800 text-white font-black shadow-md border-2 border-emerald-950 ring-2 ring-emerald-300'
                  : 'bg-white hover:bg-slate-200 text-slate-800 border-2 border-slate-300 font-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isAdminCanEdit && (
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                handleSaveProposal();
              } else {
                setSaveSuccess('');
                setSaveError('');
                setIsEditing(true);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
            }`}
          >
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Simpan Semua Perubahan' : 'Mode Edit Semua Bagian'}</span>
          </button>
        )}
      </div>

      {/* 3. PROPOSAL DOCUMENT SHEET (PREVIEW & INTERACTIVE EDITOR) */}
      <div id="proposal-printable-sheet" className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 sm:p-8 lg:p-10 space-y-8 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0">
        {/* ==================== HALAMAN SAMPUL DEPAN (COVER PROPOSAL) ==================== */}
        {showSection('cover') && (
          <div className="relative mb-6 rounded-3xl border-4 border-emerald-900 ring-4 ring-amber-400/80 bg-gradient-to-b from-emerald-950/5 via-white to-emerald-900/5 p-6 sm:p-10 shadow-xl overflow-hidden print:border-4 print:p-8">
            {/* Decorative Corner Brackets */}
            <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-amber-500 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-amber-500 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-amber-500 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-amber-500 rounded-br-sm pointer-events-none" />

            {/* Header Badge & Edit Button */}
            <div className="flex items-center justify-between pb-4 border-b border-emerald-800/20 mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-900 text-amber-300 rounded-full text-xs font-black tracking-wide uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Halaman Sampul Depan (Cover Resmi Proposal)</span>
              </div>
              {isAdminCanEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs print:hidden"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit Sampul</span>
                </button>
              )}
            </div>

            {/* Form Editor for Sampul Depan when isEditing is true */}
            {isEditing && (
              <div className="p-4 mb-6 rounded-2xl bg-amber-50/80 border border-amber-300 text-left space-y-3 print:hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-700" />
                    Pengaturan Teks Halaman Sampul Depan
                  </h4>
                  {renderSectionEditButton('Simpan')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Judul Utama Sampul</label>
                    <input
                      type="text"
                      value={formData.coverJudul ?? 'PROPOSAL KEGIATAN'}
                      onChange={e => setFormData({ ...formData, coverJudul: e.target.value })}
                      className="w-full px-3 py-1.5 font-bold bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subjudul / Kategori</label>
                    <input
                      type="text"
                      value={formData.coverSubjudul ?? 'PERINGATAN HARI BESAR ISLAM (PHBI)'}
                      onChange={e => setFormData({ ...formData, coverSubjudul: e.target.value })}
                      className="w-full px-3 py-1.5 font-bold bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tahun Hijriyah & Masehi Sampul</label>
                    <input
                      type="text"
                      value={formData.coverTahun ?? '1448 H / 2027 M'}
                      onChange={e => setFormData({ ...formData, coverTahun: e.target.value })}
                      className="w-full px-3 py-1.5 font-bold bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instansi Penyelenggara (Diajukan Oleh)</label>
                    <input
                      type="text"
                      value={formData.coverInstansi ?? 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)'}
                      onChange={e => setFormData({ ...formData, coverInstansi: e.target.value })}
                      className="w-full px-3 py-1.5 font-bold bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Alamat Wilayah / Kecamatan & Kabupaten</label>
                    <input
                      type="text"
                      value={formData.coverWilayah ?? 'KP. KEDUNG SAPI, DESA KP. BARU, KEC. PAMARAYAN, KAB. SERANG – BANTEN'}
                      onChange={e => setFormData({ ...formData, coverWilayah: e.target.value })}
                      className="w-full px-3 py-1.5 font-bold bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview Display of Cover Page */}
            <div className="text-center space-y-6 max-w-2xl mx-auto py-2">
              {/* Top Header Badge */}
              <div className="inline-block">
                <div className="px-6 py-2 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white font-black text-sm sm:text-base tracking-widest uppercase rounded-xl shadow-md border-b-2 border-amber-400">
                  {formData.coverJudul || 'PROPOSAL KEGIATAN'}
                </div>
              </div>

              {/* Subtitle */}
              <div className="text-amber-700 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                {formData.coverSubjudul || 'PERINGATAN HARI BESAR ISLAM (PHBI)'}
              </div>

              {/* Event Title */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase font-serif">
                  {formData.namaKegiatan || formData.judulProposal || "ISRA MI'RAJ NABI MUHAMMAD SAW"}
                </h1>
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs sm:text-sm shadow-xs">
                  <span>{formData.coverTahun || '1448 H / 2027 M'}</span>
                </div>
              </div>

              {/* Islamic Centerpiece Emblem */}
              <div className="py-2 flex justify-center items-center">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/40 via-emerald-400/30 to-amber-200/40 animate-pulse blur-xs" />
                  <div className="absolute inset-1 rounded-full border-2 border-amber-500 flex items-center justify-center">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-900 bg-emerald-50/80 flex items-center justify-center shadow-inner">
                      <div className="text-center">
                        <div className="relative inline-block">
                          <div className="w-12 h-12 bg-emerald-900 rotate-45 rounded-sm flex items-center justify-center shadow-md">
                            <div className="w-12 h-12 bg-amber-500 rotate-45 rounded-sm absolute opacity-80" />
                            <div className="w-9 h-9 bg-emerald-950 rounded-full relative z-10 flex items-center justify-center border border-amber-300">
                              <Sparkles className="w-5 h-5 text-amber-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 text-emerald-950 shadow-xs relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-800 text-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Tema Kegiatan
                </div>
                <p className="italic text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed max-w-xl mx-auto pt-1">
                  "{formData.temaKegiatan || 'Meneladani Akhlak Mulia Rasulullah SAW serta Memperkokoh Ukhuwah Islamiyah dan Semangat Gotong Royong Warga'}"
                </p>
              </div>

              {/* Summary Time & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-700">
                <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{formData.hariTanggal || 'Minggu, 17 Januari 2027 (1448 H)'}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{formData.tempatPelaksanaan || 'Majelis Kp. Kedung Sapi'}</span>
                </div>
              </div>

              {/* Organizer Block */}
              <div className="pt-4 border-t-2 border-dashed border-emerald-800/30 space-y-1">
                <div className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                  Diajukan Oleh:
                </div>
                <div className="font-black text-sm sm:text-base text-emerald-950 uppercase">
                  {formData.coverInstansi || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)'}
                </div>
                <div className="font-bold text-xs sm:text-sm text-slate-800 uppercase">
                  KP. KEDUNG SAPI DESA KP. BARU
                </div>
                <div className="text-[11px] text-slate-600 uppercase font-medium">
                  {formData.coverWilayah || 'KECAMATAN PAMARAYAN – KABUPATEN SERANG – PROVINSI BANTEN'}
                </div>
                <div className="font-black text-xs text-emerald-800 pt-1">
                  TAHUN {formData.coverTahun || '1448 H / 2027 M'}
                </div>
              </div>

              {/* Quick Actions at bottom of cover */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => generatePdfProposalKegiatan(formData, committeeSettings)}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileDown className="w-4 h-4 text-amber-300" />
                  <span>Download PDF Proposal Lengkap (Termasuk Sampul)</span>
                </button>
                {activeSection === 'cover' && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('all')}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Buka Seluruh Halaman Isi (A–I)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE BREAK INDICATOR WHEN VIEWING ALL SECTIONS */}
        {activeSection === 'all' && (
          <div className="relative py-2 flex items-center justify-center print:hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-emerald-800/30" />
            </div>
            <span className="relative px-4 py-1 bg-white text-[11px] font-bold text-emerald-900 uppercase tracking-widest border border-emerald-300 rounded-full shadow-xs">
              Halaman Isi Dokumen Proposal (Kop Surat & Bagian A s/d I)
            </span>
          </div>
        )}

        {/* OFFICIAL KOP SURAT PHBI & IDENTITAS SURAT (Disembunyikan jika memilih tab Sampul Depan saja) */}
        {activeSection !== 'cover' && (
          <>
            <div className="border-b-4 border-double border-emerald-800 pb-5 text-center space-y-1.5 relative">
          {isAdminCanEdit && !isEditing && (
            <div className="flex justify-end mb-1 print:hidden">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Kop & Identitas Surat</span>
              </button>
            </div>
          )}

          {isEditing ? (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-left space-y-2.5 mb-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  Edit Kop Surat Resmi Proposal
                </h4>
                {renderSectionEditButton()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Baris Kop 1 (Nama Kepanitiaan)</label>
                  <input
                    type="text"
                    value={formData.kopBaris1 ?? 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)'}
                    onChange={e => setFormData({ ...formData, kopBaris1: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Baris Kop 2 (Nama Acara & Tahun H / M)</label>
                  <input
                    type="text"
                    value={formData.kopBaris2 ?? "ISRA MI'RAJ NABI MUHAMMAD SAW 1448 H / 2027 M"}
                    onChange={e => setFormData({ ...formData, kopBaris2: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Wilayah Kop Surat</label>
                  <input
                    type="text"
                    value={formData.kopAlamat ?? 'Lingkungan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten'}
                    onChange={e => setFormData({ ...formData, kopAlamat: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Info Sekretariat & Hotline WA</label>
                  <input
                    type="text"
                    value={formData.kopSekretariat ?? `Sekretariat: Majelis Kp. Kedung Sapi • Hotline / WhatsApp Resmi: ${committeeSettings?.nomorWa || '081414033436'}`}
                    onChange={e => setFormData({ ...formData, kopSekretariat: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-800">
            {formData.kopBaris1 || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)'}
          </p>
          <h1 className="text-lg sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
            {formData.kopBaris2 || "ISRA MI'RAJ NABI MUHAMMAD SAW 1448 H / 2027 M"}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            {formData.kopAlamat || 'Lingkungan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten'}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {formData.kopSekretariat || `Sekretariat: Majelis Kp. Kedung Sapi • Hotline / WhatsApp Resmi: ${committeeSettings?.nomorWa || '081414033436'}`}
          </p>
        </div>

        {/* METADATA SURAT & JUDUL PROPOSAL */}
        <div className="space-y-4">
          {isEditing ? (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-700" />
                Edit Identitas Surat & Tema Proposal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Proposal</label>
                  <input
                    type="text"
                    value={formData.nomorProposal}
                    onChange={e => setFormData({ ...formData, nomorProposal: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tempat & Tanggal Proposal</label>
                  <input
                    type="text"
                    value={formData.tanggalSurat}
                    onChange={e => setFormData({ ...formData, tanggalSurat: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lampiran</label>
                  <input
                    type="text"
                    value={formData.lampiran}
                    onChange={e => setFormData({ ...formData, lampiran: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kepada Yth.</label>
                  <input
                    type="text"
                    value={formData.kepadaYth}
                    onChange={e => setFormData({ ...formData, kepadaYth: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perihal</label>
                  <input
                    type="text"
                    value={formData.perihal}
                    onChange={e => setFormData({ ...formData, perihal: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul Proposal</label>
                  <input
                    type="text"
                    value={formData.judulProposal}
                    onChange={e => setFormData({ ...formData, judulProposal: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tema Kegiatan</label>
                  <textarea
                    rows={2}
                    value={formData.temaKegiatan}
                    onChange={e => setFormData({ ...formData, temaKegiatan: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                <div className="space-y-1">
                  <p><span className="inline-block w-28 font-semibold text-slate-500">Nomor</span>: <strong>{formData.nomorProposal}</strong></p>
                  <p><span className="inline-block w-28 font-semibold text-slate-500">Lampiran</span>: <strong>{formData.lampiran}</strong></p>
                  <p><span className="inline-block w-28 font-semibold text-slate-500">Perihal</span>: <strong>{formData.perihal}</strong></p>
                </div>
                <div className="space-y-1 md:text-right">
                  <p className="font-semibold text-slate-600">{formData.tanggalSurat}</p>
                  <p className="text-xs text-slate-500 mt-1">Kepada Yth.:</p>
                  <p className="font-bold text-slate-800">{formData.kepadaYth}</p>
                </div>
              </div>

              <div className="text-center py-2 space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-emerald-950 uppercase">
                  {formData.judulProposal}
                </h3>
                <p className="text-xs sm:text-sm italic text-slate-600 max-w-3xl mx-auto">
                  Tema: “{formData.temaKegiatan}”
                </p>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {/* ==================== A. KATA PENGANTAR ==================== */}
        {showSection('A') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2.5 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  A
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Kata Pengantar
                </h3>
              </div>
              {renderSectionEditButton('Edit Bagian A')}
            </div>

            {isEditing ? (
              <textarea
                rows={9}
                value={formData.kataPengantar}
                onChange={e => setFormData({ ...formData, kataPengantar: e.target.value })}
                className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                placeholder="Tulis kata pengantar proposal..."
              />
            ) : (
              <div className="px-2 sm:px-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line text-justify">
                {formData.kataPengantar}
              </div>
            )}
          </section>
        )}

        {/* ==================== B. MAKSUD DAN TUJUAN ==================== */}
        {showSection('B') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2.5 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  B
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Maksud dan Tujuan
                </h3>
              </div>
              {renderSectionEditButton('Edit Bagian B')}
            </div>

            {isEditing ? (
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">1. Maksud Kegiatan</label>
                  <textarea
                    rows={3}
                    value={formData.maksudKegiatan}
                    onChange={e => setFormData({ ...formData, maksudKegiatan: e.target.value })}
                    className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">2. Poin-Poin Tujuan Kegiatan</label>
                    <button
                      type="button"
                      onClick={handleAddTujuan}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Tujuan</span>
                    </button>
                  </div>
                  {(formData.tujuanKegiatan || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={e => handleUpdateTujuan(idx, e.target.value)}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTujuan(idx)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        title="Hapus poin tujuan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-2 sm:px-3 space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <div>
                  <h4 className="font-bold text-emerald-900 mb-1">1. Maksud Kegiatan</h4>
                  <p className="text-justify">{formData.maksudKegiatan}</p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 mb-1.5">2. Tujuan Kegiatan</h4>
                  <ol className="list-decimal list-inside space-y-1.5">
                    {(formData.tujuanKegiatan || []).map((tujuan, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {tujuan}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==================== C. BENTUK KEGIATAN ==================== */}
        {showSection('C') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2.5 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  C
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Bentuk Kegiatan
                </h3>
              </div>
              {renderSectionEditButton('Edit Bagian C')}
            </div>

            {isEditing ? (
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Deskripsi Bentuk Kegiatan</label>
                  <textarea
                    rows={2}
                    value={formData.bentukKegiatanDeskripsi}
                    onChange={e => setFormData({ ...formData, bentukKegiatanDeskripsi: e.target.value })}
                    className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Rincian Bentuk Kegiatan</label>
                    <button
                      type="button"
                      onClick={handleAddBentuk}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Kegiatan</span>
                    </button>
                  </div>
                  {(formData.bentukKegiatanList || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={e => handleUpdateBentuk(idx, e.target.value)}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBentuk(idx)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        title="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-2 sm:px-3 space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p className="text-justify">{formData.bentukKegiatanDeskripsi}</p>
                <ol className="list-decimal list-inside space-y-1.5 font-medium text-slate-800">
                  {(formData.bentukKegiatanList || []).map((bentuk, idx) => (
                    <li key={idx}>{bentuk}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {/* ==================== D. WAKTU DAN TEMPAT PELAKSANAAN ==================== */}
        {showSection('D') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2.5 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  D
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Waktu dan Tempat Pelaksanaan
                </h3>
              </div>
              {renderSectionEditButton('Edit Bagian D')}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hari / Tanggal Pelaksanaan</label>
                  <input
                    type="text"
                    value={formData.hariTanggal}
                    onChange={e => setFormData({ ...formData, hariTanggal: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Pelaksanaan (WIB)</label>
                  <input
                    type="text"
                    value={formData.waktuPelaksanaan}
                    onChange={e => setFormData({ ...formData, waktuPelaksanaan: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tempat / Lokasi Acara</label>
                  <input
                    type="text"
                    value={formData.tempatPelaksanaan}
                    onChange={e => setFormData({ ...formData, tempatPelaksanaan: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penceramah / Mubaligh Undangan</label>
                  <input
                    type="text"
                    value={formData.penceramah}
                    onChange={e => setFormData({ ...formData, penceramah: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qori Tilawah Al-Qur'an</label>
                  <input
                    type="text"
                    value={formData.qori}
                    onChange={e => setFormData({ ...formData, qori: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-xs">Hari / Tanggal Pelaksanaan:</span>
                    <strong className="text-slate-900">{formData.hariTanggal}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-xs">Waktu Pelaksanaan:</span>
                    <strong className="text-slate-900">{formData.waktuPelaksanaan}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-xs">Tempat / Lokasi:</span>
                    <strong className="text-slate-900">{formData.tempatPelaksanaan}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-xs">Penceramah / Mubaligh:</span>
                    <strong className="text-emerald-900">{formData.penceramah}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-xs">Qori Tilawah Al-Qur'an:</span>
                    <strong className="text-emerald-900">{formData.qori}</strong>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==================== E. SUSUNAN ACARA DAN RUNDOWN ACARA ==================== */}
        {showSection('E') && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  E
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Susunan Acara dan Rundown Acara
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddRundown}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Rundown</span>
                  </button>
                )}
                {renderSectionEditButton('Edit Bagian E')}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white font-bold">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 w-36">Waktu (WIB)</th>
                    <th className="py-2.5 px-3">Susunan / Mata Acara</th>
                    <th className="py-2.5 px-3 w-48">Pengisi / PJ</th>
                    <th className="py-2.5 px-3 w-44">Keterangan</th>
                    {isEditing && <th className="py-2.5 px-2 text-center w-12">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(formData.rundownAcara || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                      {isEditing ? (
                        <>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.waktu}
                              onChange={e => handleUpdateRundown(idx, 'waktu', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={item.kegiatan}
                              onChange={e => handleUpdateRundown(idx, 'kegiatan', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.pengisi}
                              onChange={e => handleUpdateRundown(idx, 'pengisi', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.keterangan}
                              onChange={e => handleUpdateRundown(idx, 'keterangan', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRundown(idx)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-900 whitespace-nowrap">
                            {item.waktu}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 whitespace-pre-line font-medium">
                            {item.kegiatan}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800">
                            {item.pengisi}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs">
                            {item.keterangan || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================== F. ANGGARAN DANA (RAB) ==================== */}
        {showSection('F') && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  F
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Anggaran Dana (Rencana Anggaran Biaya / RAB)
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isEditing && (
                  <>
                    {pengeluaranList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSyncAnggaranFromPengeluaran}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer border border-emerald-500"
                        title="Salin daftar pengeluaran aktual Bendahara ke tabel anggaran proposal"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Impor dari Data Bendahara</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddAnggaran}
                      className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Anggaran</span>
                    </button>
                  </>
                )}
                {renderSectionEditButton('Edit Bagian F')}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white font-bold">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 w-44">Bidang / Seksi</th>
                    <th className="py-2.5 px-3">Uraian Kebutuhan Anggaran</th>
                    <th className="py-2.5 px-3 w-36 text-center">Volume / Satuan</th>
                    <th className="py-2.5 px-3 w-44 text-right">Jumlah Biaya (Rp)</th>
                    {isEditing && <th className="py-2.5 px-2 text-center w-12">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(formData.anggaranDana || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                      {isEditing ? (
                        <>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.kategori}
                              onChange={e => handleUpdateAnggaran(idx, 'kategori', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.uraian}
                              onChange={e => handleUpdateAnggaran(idx, 'uraian', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.volume}
                              onChange={e => handleUpdateAnggaran(idx, 'volume', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={formatRupiah(item.jumlah)}
                              onChange={e => handleUpdateAnggaran(idx, 'jumlah', parseRupiah(formatInputNumber(e.target.value)))}
                              className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAnggaran(idx)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{item.kategori}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.uraian}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{item.volume}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            Rp {formatRupiah(Number(item.jumlah) || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50 border-t-2 border-amber-200 font-black text-amber-950">
                    <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wide text-xs sm:text-sm">
                      Total Estimasi Kebutuhan Anggaran Dana:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm sm:text-base text-amber-900">
                      Rp {formatRupiah(totalAnggaranProposal)}
                    </td>
                    {isEditing && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* ==================== G. SUMBER DANA ==================== */}
        {showSection('G') && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  G
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Sumber Dana
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddSumberDana}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sumber Dana</span>
                  </button>
                )}
                {renderSectionEditButton('Edit Bagian G')}
              </div>
            </div>

            {isEditing ? (
              <textarea
                rows={2}
                value={formData.sumberDanaDeskripsi}
                onChange={e => setFormData({ ...formData, sumberDanaDeskripsi: e.target.value })}
                className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            ) : (
              <p className="px-2 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                {formData.sumberDanaDeskripsi}
              </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-800 text-white font-bold">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 w-64">Sumber Pendanaan</th>
                    <th className="py-2.5 px-3">Keterangan / Rincian</th>
                    <th className="py-2.5 px-3 w-44 text-right">Target / Estimasi (Rp)</th>
                    {isEditing && <th className="py-2.5 px-2 text-center w-12">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(formData.sumberDanaList || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                      {isEditing ? (
                        <>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.sumber}
                              onChange={e => handleUpdateSumberDana(idx, 'sumber', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.uraian}
                              onChange={e => handleUpdateSumberDana(idx, 'uraian', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={formatRupiah(item.estimasi)}
                              onChange={e => handleUpdateSumberDana(idx, 'estimasi', parseRupiah(formatInputNumber(e.target.value)))}
                              className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSumberDana(idx)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{item.sumber}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.uraian}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900">
                            Rp {formatRupiah(Number(item.estimasi) || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-black text-emerald-950">
                    <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wide text-xs sm:text-sm">
                      Total Estimasi Sumber Dana:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm sm:text-base text-emerald-900">
                      Rp {formatRupiah(totalSumberDanaProposal)}
                    </td>
                    {isEditing && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Real-time Kas Progress Info Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Catatan Realisasi Kas Panitia Saat Ini (Live): <strong>Rp {formatRupiah(totalRealisasiMasuk)}</strong> (Iuran Warga: Rp {formatRupiah(totalRealisasiWarga)} · Donasi Sukarela: Rp {formatRupiah(totalRealisasiSukarela)})
              </span>
              <span className="font-mono font-bold text-emerald-800">
                Target Per Warga: Rp {formatRupiah(targetPerPerson)} ({wargaUtamaCount} Warga Utama)
              </span>
            </div>
          </section>
        )}

        {/* ==================== H. SUSUNAN PANITIA ==================== */}
        {showSection('H') && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  H
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  Susunan Panitia Pelaksana
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddCommitteeSection}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Seksi Bidang</span>
                  </button>
                )}
                {renderSectionEditButton('Edit Bagian H')}
              </div>
            </div>

            {/* Tabel I: Pelindung, Penasehat, Penanggung Jawab & Pengurus Inti */}
            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-black uppercase text-emerald-900 px-1">
                I. Pelindung, Penasehat, Penanggung Jawab & Pengurus Inti PHBI
              </h4>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">1. Pelindung</label>
                    <input
                      type="text"
                      value={formData.pelindung ?? (committeeSettings?.pelindung?.join(', ') || '')}
                      onChange={e => setFormData({
                        ...formData,
                        pelindung: e.target.value,
                        signers: { ...formData.signers, kepalaDesa: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">2. Penasehat</label>
                    <input
                      type="text"
                      value={formData.penasehat ?? (committeeSettings?.penasehat?.join(' & ') || '')}
                      onChange={e => setFormData({
                        ...formData,
                        penasehat: e.target.value,
                        signers: { ...formData.signers, tokohPenanggungJawab: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">3. Penanggung Jawab (RT / RW & Lingkungan)</label>
                    <input
                      type="text"
                      value={formData.penanggungJawab ?? (committeeSettings?.penanggungJawab?.join(' & ') || '')}
                      onChange={e => setFormData({ ...formData, penanggungJawab: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">4. Ketua RT 011 / RW 04</label>
                    <input
                      type="text"
                      value={formData.signers.ketuaRt}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, ketuaRt: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">5. Ketua Pemuda Kp. Kedung Sapi</label>
                    <input
                      type="text"
                      value={formData.signers.ketuaPemuda}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, ketuaPemuda: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">6. Ketua Panitia Pelaksana</label>
                    <input
                      type="text"
                      value={formData.signers.ketuaPanitia}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, ketuaPanitia: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">7. Wakil Ketua Panitia</label>
                    <input
                      type="text"
                      value={formData.signers.wakilKetua}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, wakilKetua: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">8. Sekretaris PHBI</label>
                    <input
                      type="text"
                      value={formData.signers.sekretaris}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, sekretaris: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">9. Bendahara PHBI</label>
                    <input
                      type="text"
                      value={formData.signers.bendahara}
                      onChange={e => setFormData({
                        ...formData,
                        signers: { ...formData.signers, bendahara: e.target.value }
                      })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">10. Administrator Sistem</label>
                    <input
                      type="text"
                      value={formData.adminSistem ?? (committeeSettings?.adminSistem || '')}
                      onChange={e => setFormData({ ...formData, adminSistem: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    {
                      label: 'Pelindung',
                      value: formData.pelindung || (committeeSettings?.pelindung && committeeSettings.pelindung.length > 0
                        ? committeeSettings.pelindung.join(', ')
                        : '')
                    },
                    {
                      label: 'Penasehat',
                      value: formData.penasehat || (committeeSettings?.penasehat && committeeSettings.penasehat.length > 0
                        ? committeeSettings.penasehat.join(' & ')
                        : '')
                    },
                    {
                      label: 'Penanggung Jawab (RT 011 / RW 04 & Lingkungan)',
                      value: formData.penanggungJawab || (committeeSettings?.penanggungJawab && committeeSettings.penanggungJawab.length > 0
                        ? committeeSettings.penanggungJawab.join(' & ')
                        : '')
                    },
                    { label: 'Ketua Pemuda Kp. Kedung Sapi', value: formData.signers.ketuaPemuda },
                    { label: 'Ketua Panitia Pelaksana', value: formData.signers.ketuaPanitia },
                    { label: 'Wakil Ketua Panitia', value: formData.signers.wakilKetua },
                    { label: 'Sekretaris PHBI', value: formData.signers.sekretaris },
                    { label: 'Bendahara PHBI', value: formData.signers.bendahara },
                    { label: 'Administrator Sistem', value: formData.adminSistem || committeeSettings?.adminSistem || '' }
                  ].map((pos, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[11px] font-semibold text-emerald-800 block">{pos.label}</span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">{pos.value || '—'}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabel II: Seksi-Seksi Bidang Pelaksana */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs sm:text-sm font-black uppercase text-emerald-900">
                  II. Seksi-Seksi Bidang Pelaksana
                </h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddCommitteeSection}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Seksi</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-emerald-800 text-white font-bold">
                      <th className="py-2 px-3 text-center w-10">No</th>
                      <th className="py-2 px-3 w-48">Seksi Bidang</th>
                      <th className="py-2 px-3 w-44">Koordinator</th>
                      <th className="py-2 px-3">Anggota Pelaksana (Pisahkan dengan koma)</th>
                      {isEditing && <th className="py-2 px-2 text-center w-12">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sectionsList.map((sec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                        {isEditing ? (
                          <>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sec.name}
                                onChange={e => handleUpdateCommitteeSection(idx, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sec.coordinator}
                                onChange={e => handleUpdateCommitteeSection(idx, 'coordinator', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-white border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={Array.isArray(sec.members) ? sec.members.join(', ') : String(sec.members || '')}
                                onChange={e => handleUpdateCommitteeSection(idx, 'members', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                                placeholder="Contoh: Anggota 1, Anggota 2, Anggota 3"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveCommitteeSection(idx)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Hapus Seksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-bold text-slate-900">{sec.name}</td>
                            <td className="py-2 px-3 font-bold text-emerald-800">{sec.coordinator}</td>
                            <td className="py-2 px-3 text-slate-700">
                              {Array.isArray(sec.members) ? sec.members.join(', ') : sec.members}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================== I. PENUTUP & 8 TANDA TANGAN PENGESAHAN ==================== */}
        {showSection('I') && (
          <section className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2.5 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    I
                  </span>
                  <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                    Penutup & Pengesahan
                  </h3>
                </div>
                {renderSectionEditButton('Edit Bagian I & TTD')}
              </div>

              {isEditing ? (
                <textarea
                  rows={6}
                  value={formData.penutup}
                  onChange={e => setFormData({ ...formData, penutup: e.target.value })}
                  className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              ) : (
                <div className="px-2 sm:px-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line text-justify">
                  {formData.penutup}
                </div>
              )}
            </div>

            {/* LEMBAR PENGESAHAN & 8 TANDA TANGAN LENGKAP */}
            <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-b from-emerald-50/70 to-white border-2 border-emerald-700/40 space-y-6 break-inside-avoid">
              <div className="text-center border-b border-emerald-200 pb-3.5 space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                  <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                  <span>LEMBAR PENGESAHAN PROPOSAL KEGIATAN</span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                  PANITIA PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MI'RAJ 1448 H / 2027 M
                </h4>
                <p className="text-xs text-slate-500">
                  Ditetapkan di: Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan — {formData.tanggalSurat}
                </p>
              </div>

              {/* BARIS 1: PENGURUS INTI PANITIA (4 TTD) */}
              <div className="space-y-3">
                <p className="text-center text-xs font-black uppercase tracking-wider text-emerald-800">
                  Hormat Kami, Panitia Pelaksana PHBI Isra Mi'raj 1448 H / 2027 M
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {([
                    { key: 'ketuaPanitia', defaultRole: 'Ketua Panitia', name: formData.signers.ketuaPanitia },
                    { key: 'wakilKetua', defaultRole: 'Wakil Ketua', name: formData.signers.wakilKetua },
                    { key: 'sekretaris', defaultRole: 'Sekretaris', name: formData.signers.sekretaris },
                    { key: 'bendahara', defaultRole: 'Bendahara', name: formData.signers.bendahara }
                  ] as const).map((sig) => {
                    const roleVal = formData.signerRoles?.[sig.key] ?? sig.defaultRole;
                    return (
                      <div
                        key={sig.key}
                        className="p-4 rounded-xl bg-white border border-slate-200 text-center flex flex-col justify-between min-h-[140px] shadow-2xs"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={roleVal}
                            onChange={e => setFormData({
                              ...formData,
                              signerRoles: { ...(formData.signerRoles || {}), [sig.key]: e.target.value }
                            })}
                            className="w-full px-2 py-1 text-xs font-bold text-center text-slate-800 uppercase bg-slate-50 border border-slate-300 rounded"
                            placeholder="Jabatan"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-700 uppercase">{roleVal}</span>
                        )}
                        <div className="pt-8">
                          <div className="border-b border-slate-400 w-4/5 mx-auto mb-1.5" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={sig.name}
                              onChange={e => setFormData({
                                ...formData,
                                signers: { ...formData.signers, [sig.key]: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-xs font-black text-center text-slate-900 bg-amber-50 border border-amber-300 rounded"
                              placeholder="Nama Penandatangan"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-slate-900 break-words">
                              ( {sig.name || '................'} )
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BARIS 2: MENGETAHUI & MENYETUJUI (Ketua RT, Ketua Pemuda, Tokoh Penanggung Jawab, Kepala Desa) */}
              <div className="space-y-3 pt-2 border-t border-emerald-200/80">
                <p className="text-center text-xs font-black uppercase tracking-wider text-emerald-800">
                  Mengetahui & Menyetujui, Pemerintah Desa & Penanggung Jawab Lingkungan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {([
                    { key: 'ketuaRt', defaultRole: 'Ketua RT 011 / RW 04', name: formData.signers.ketuaRt },
                    { key: 'ketuaPemuda', defaultRole: 'Ketua Pemuda', name: formData.signers.ketuaPemuda },
                    { key: 'tokohPenanggungJawab', defaultRole: 'Tokoh (Penanggung Jawab)', name: formData.signers.tokohPenanggungJawab },
                    { key: 'kepalaDesa', defaultRole: 'Kepala Desa Kp Baru', name: formData.signers.kepalaDesa }
                  ] as const).map((sig) => {
                    const roleVal = formData.signerRoles?.[sig.key] ?? sig.defaultRole;
                    return (
                      <div
                        key={sig.key}
                        className="p-4 rounded-xl bg-white border border-emerald-200 text-center flex flex-col justify-between min-h-[140px] shadow-2xs"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={roleVal}
                            onChange={e => setFormData({
                              ...formData,
                              signerRoles: { ...(formData.signerRoles || {}), [sig.key]: e.target.value }
                            })}
                            className="w-full px-2 py-1 text-xs font-bold text-center text-emerald-950 uppercase bg-emerald-50 border border-emerald-300 rounded"
                            placeholder="Jabatan"
                          />
                        ) : (
                          <span className="text-xs font-bold text-emerald-900 uppercase">{roleVal}</span>
                        )}
                        <div className="pt-8">
                          <div className="border-b border-slate-400 w-4/5 mx-auto mb-1.5" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={sig.name}
                              onChange={e => setFormData({
                                ...formData,
                                signers: { ...formData.signers, [sig.key]: e.target.value }
                              })}
                              className="w-full px-2 py-1 text-xs font-black text-center text-slate-900 bg-amber-50 border border-amber-300 rounded"
                              placeholder="Nama Penandatangan"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-slate-900 break-words">
                              ( {sig.name || '................'} )
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STICKY BOTTOM SAVE BAR WHEN EDITING */}
        {isEditing && (
          <div className="sticky bottom-3 z-30 p-3.5 sm:p-4 rounded-2xl bg-emerald-950/95 backdrop-blur-md text-white shadow-2xl border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>Mode Edit Proposal Aktif — Semua bagian (Kop, A–I, Panitia & 8 TTD) dapat diedit langsung</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveProposal}
                disabled={saving}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Semua Perubahan Proposal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Lihat Pratinjau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
