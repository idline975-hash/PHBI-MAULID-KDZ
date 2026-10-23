import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, Award, FileDown, Check, Copy, 
  MapPin, CheckCircle2, UserCheck, Heart, Sparkles,
  Edit3, Plus, Trash2, RotateCcw, Save, X, AlertCircle, Loader2,
  GitFork, LayoutGrid
} from 'lucide-react';
import { CommitteeSettings, CommitteeSection, UserAccount } from '../types';
import { generatePdfStrukturPanitia } from '../utils/pdfGenerator';
import BaganStrukturOrganisasi from './BaganStrukturOrganisasi';

interface StrukturPanitiaCardProps {
  committeeSettings?: CommitteeSettings;
  canEdit?: boolean;
  currentUser?: UserAccount | null;
  onRefresh?: () => void;
}

const DEFAULT_SECTIONS_FALLBACK: CommitteeSection[] = [];

export default function StrukturPanitiaCard({ 
  committeeSettings,
  canEdit = true,
  currentUser = null,
  onRefresh
}: StrukturPanitiaCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'bagan' | 'kartu'>('bagan');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Editable states
  const [editSections, setEditSections] = useState<CommitteeSection[]>([]);
  const [editPelindung, setEditPelindung] = useState<string>('');
  const [editPenasehat, setEditPenasehat] = useState<string>('');
  const [editPenanggungJawab, setEditPenanggungJawab] = useState<string>('');
  const [newMemberInputs, setNewMemberInputs] = useState<{ [secIdx: number]: string }>({});

  const ketuaName = committeeSettings?.ketuaPanitia || '';
  const wakilKetuaName = committeeSettings?.wakilKetua || '';
  const sekretarisName = committeeSettings?.sekretaris || '';
  const bendaharaName = committeeSettings?.bendahara || '';
  const adminName = committeeSettings?.adminSistem || '';
  const pelindungList = committeeSettings?.pelindung || [];
  const penasehatList = committeeSettings?.penasehat || [];
  const penanggungJawabList = committeeSettings?.penanggungJawab || [];
  const sections = committeeSettings?.sections || [];

  // Initialize edit form when starting editing or when committeeSettings change
  useEffect(() => {
    if (!isEditing) {
      setEditSections(JSON.parse(JSON.stringify(sections)));
      setEditPelindung(pelindungList.join(', '));
      setEditPenasehat(penasehatList.join(' & '));
      setEditPenanggungJawab(penanggungJawabList.join(' & '));
    }
  }, [committeeSettings, isEditing]);

  const handleStartEdit = () => {
    setEditSections(JSON.parse(JSON.stringify(sections)));
    setEditPelindung(pelindungList.join(', '));
    setEditPenasehat(penasehatList.join(' & '));
    setEditPenanggungJawab(penanggungJawabList.join(' & '));
    setSaveSuccess('');
    setSaveError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditSections(JSON.parse(JSON.stringify(sections)));
    setSaveSuccess('');
    setSaveError('');
    setIsEditing(false);
  };

  // Section & Member mutations
  const handleEditSectionName = (secIdx: number, val: string) => {
    const updated = [...editSections];
    updated[secIdx].name = val;
    setEditSections(updated);
  };

  const handleEditCoordinator = (secIdx: number, val: string) => {
    const updated = [...editSections];
    updated[secIdx].coordinator = val;
    setEditSections(updated);
  };

  const handleEditMember = (secIdx: number, memberIdx: number, val: string) => {
    const updated = [...editSections];
    const members = [...(Array.isArray(updated[secIdx].members) ? updated[secIdx].members : [updated[secIdx].members])];
    members[memberIdx] = val;
    updated[secIdx].members = members;
    setEditSections(updated);
  };

  const handleDeleteMember = (secIdx: number, memberIdx: number) => {
    const updated = [...editSections];
    const members = [...(Array.isArray(updated[secIdx].members) ? updated[secIdx].members : [updated[secIdx].members])];
    members.splice(memberIdx, 1);
    updated[secIdx].members = members;
    setEditSections(updated);
  };

  const handleAddMember = (secIdx: number) => {
    const nameToAdd = (newMemberInputs[secIdx] || '').trim();
    if (!nameToAdd) return;

    const updated = [...editSections];
    const members = [...(Array.isArray(updated[secIdx].members) ? updated[secIdx].members : [updated[secIdx].members])];
    members.push(nameToAdd);
    updated[secIdx].members = members;
    setEditSections(updated);

    // Clear input
    setNewMemberInputs(prev => ({ ...prev, [secIdx]: '' }));
  };

  const handleAddSection = () => {
    const newSection: CommitteeSection = {
      name: `Seksi Baru ${editSections.length + 1}`,
      coordinator: 'Nama Koordinator',
      members: []
    };
    setEditSections([...editSections, newSection]);
  };

  const handleDeleteSection = (secIdx: number) => {
    if (confirm(`Yakin ingin menghapus seksi "${editSections[secIdx].name}"?`)) {
      const updated = editSections.filter((_, idx) => idx !== secIdx);
      setEditSections(updated);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Kosongkan susunan kepanitiaan agar bersih?')) {
      setEditSections([]);
      setEditPelindung('');
      setEditPenasehat('');
      setEditPenanggungJawab('');
    }
  };

  // Save to Google Cloud Firestore & local database
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      // Parse pelindung, penasehat & penanggung jawab
      const pelindungArr = editPelindung
        .split(/[,&]/)
        .map(p => p.trim())
        .filter(Boolean);

      const penasehatArr = editPenasehat
        .split(/[,&]/)
        .map(p => p.trim())
        .filter(Boolean);

      const penanggungJawabArr = editPenanggungJawab
        .split(/[,&]/)
        .map(p => p.trim())
        .filter(Boolean);

      // Clean sections
      const cleaned = editSections.map(s => ({
        name: s.name.trim() || 'Seksi',
        coordinator: s.coordinator.trim() || '-',
        members: (Array.isArray(s.members) ? s.members : [s.members])
          .map(m => String(m).trim())
          .filter(Boolean)
      }));

      const res = await fetch('/api/committee/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: cleaned,
          pelindung: pelindungArr,
          penasehat: penasehatArr,
          penanggungJawab: penanggungJawabArr,
          updatedBy: currentUser?.name || 'Admin',
          details: `Pembaruan susunan panitia: Pelindung, Penasehat, Penanggung Jawab & anggota seksi diperbarui (${cleaned.length} Seksi).`
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan perubahan ke server');
      }

      setSaveSuccess('Susunan kepanitiaan berhasil disimpan di Google Cloud Firestore dan tersinkronisasi otomatis!');
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSaveError(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = () => {
    let text = `*SUSUNAN PANITIA ISRA MI'RAJ 1448 H / 2027 M*\n`;
    text += `*Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten*\n\n`;
    text += `*Pelindung:* ${pelindungList.join(', ')}\n`;
    text += `*Penasehat:* ${penasehatList.join(' & ')}\n`;
    text += `*Penanggung Jawab:* ${penanggungJawabList.join(' & ')}\n\n`;
    text += `*Ketua Pelaksana:* ${ketuaName}\n`;
    text += `*Wakil Ketua Pelaksana:* ${wakilKetuaName}\n`;
    text += `*Sekretaris:* ${sekretarisName}\n`;
    text += `*Bendahara:* ${bendaharaName}\n\n`;
    text += `*SEKSI - SEKSI BIDANG PELAKSANA:*\n`;

    sections.forEach((sec, idx) => {
      text += `\n${idx + 1}. *${sec.name}*\n`;
      text += `   • Koordinator: ${sec.coordinator}\n`;
      text += `   • Anggota: ${Array.isArray(sec.members) ? sec.members.join(', ') : sec.members}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-teal-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-rose-700/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                <Award className="w-3 h-3" />
                SK Kepanitiaan Resmi
              </span>
              <span className="text-[11px] text-rose-200 bg-rose-950/70 px-2 py-0.5 rounded-full border border-rose-600/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-rose-400" />
                Tersinkronisasi Cloud Firestore
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              SUSUNAN PANITIA ISRA MI'RAJ 1448 H / 2027 M
            </h2>
            <p className="text-xs sm:text-sm text-rose-100/90 font-medium">
              Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2 w-full lg:w-auto">
            {!isEditing && canEdit && (
              <button
                type="button"
                id="btn-edit-struktur-panitia"
                onClick={handleStartEdit}
                className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all border-2 border-rose-400 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                title="Edit, Tambah, atau Hapus Anggota Seksi"
              >
                <Edit3 className="w-4 h-4 text-slate-950" />
                <span>Kelola & Edit Anggota</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => generatePdfStrukturPanitia(committeeSettings)}
              className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all border-2 border-amber-600 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <FileDown className="w-4 h-4 text-slate-950" />
              <span>Cetak SK Panitia (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-rose-300" />
                  <span className="text-rose-200 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-rose-300" />
                  <span>Salin Teks WA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ===================== MODE EDIT AKTIF ===================== */}
      {isEditing ? (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-rose-500 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase rounded-full">
                  Mode Edit Aktif
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Perubahan akan langsung disimpan ke Cloud Firestore & Lokal
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                Kelola Anggota, Koordinator & Seksi Kepanitiaan
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Kembalikan ke susunan dokumen SK resmi awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke SK Awal</span>
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan ke Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Edit Pelindung, Penasehat & Penanggung Jawab */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Pelindung
              </label>
              <input
                type="text"
                value={editPelindung}
                onChange={(e) => setEditPelindung(e.target.value)}
                placeholder="Nama Pelindung (opsional)"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:outline-rose-600"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Penasehat
              </label>
              <input
                type="text"
                value={editPenasehat}
                onChange={(e) => setEditPenasehat(e.target.value)}
                placeholder="Nama Penasehat (opsional)"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:outline-rose-600"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Penanggung Jawab (RT & Lingkungan)
              </label>
              <input
                type="text"
                value={editPenanggungJawab}
                onChange={(e) => setEditPenanggungJawab(e.target.value)}
                placeholder="Nama Penanggung Jawab (opsional)"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:outline-rose-600"
              />
            </div>
          </div>

          {/* Edit Seksi - Seksi */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-700" />
                <span>Daftar Seksi & Anggota ({editSections.length} Seksi)</span>
              </h4>

              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-rose-700" />
                <span>+ Tambah Seksi Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {editSections.map((section, secIdx) => {
                const membersArr = Array.isArray(section.members) ? section.members : [section.members];

                return (
                  <div
                    key={secIdx}
                    className="bg-white rounded-xl p-4 border border-slate-300 shadow-sm flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="space-y-3">
                      {/* Section Title & Delete Section */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                            {secIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => handleEditSectionName(secIdx, e.target.value)}
                            placeholder="Nama Seksi..."
                            className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-rose-600 rounded px-2 py-1 transition-all"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSection(secIdx)}
                          title="Hapus seksi ini"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Coordinator Input */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-800">
                          Koordinator Seksi
                        </label>
                        <input
                          type="text"
                          value={section.coordinator}
                          onChange={(e) => handleEditCoordinator(secIdx, e.target.value)}
                          placeholder="Nama koordinator..."
                          className="w-full px-2.5 py-1.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs font-bold text-rose-950 focus:bg-white focus:outline-rose-600"
                        />
                      </div>

                      {/* Members List with Edit & Delete */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>Anggota ({membersArr.length})</span>
                          <span>Hapus / Ubah</span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {membersArr.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1">Belum ada anggota di seksi ini</p>
                          ) : (
                            membersArr.map((member, memberIdx) => (
                              <div
                                key={memberIdx}
                                className="flex items-center gap-1.5 p-1 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                              >
                                <input
                                  type="text"
                                  value={member}
                                  onChange={(e) => handleEditMember(secIdx, memberIdx, e.target.value)}
                                  placeholder="Nama anggota..."
                                  className="w-full text-xs font-medium text-slate-800 bg-transparent focus:bg-white focus:outline-rose-500 rounded px-1.5 py-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(secIdx, memberIdx)}
                                  title="Hapus anggota ini"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Add New Member Input */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Tambah nama anggota..."
                            value={newMemberInputs[secIdx] || ''}
                            onChange={(e) => setNewMemberInputs({ ...newMemberInputs, [secIdx]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMember(secIdx);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-rose-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMember(secIdx)}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                            title="Tambah anggota baru"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              💡 Tekan <strong>Simpan Perubahan ke Cloud</strong> untuk memperbarui data di seluruh perangkat secara langsung.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan ke Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Tab Pengalih Tampilan: Bagan vs Kartu */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                type="button"
                id="btn-view-bagan"
                onClick={() => setViewMode('bagan')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-2 min-h-[38px] ${
                  viewMode === 'bagan'
                    ? 'bg-rose-700 text-white border-rose-950 shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
                }`}
              >
                <GitFork className="w-4 h-4" />
                <span>Bagan Organisasi</span>
              </button>

              <button
                type="button"
                id="btn-view-kartu"
                onClick={() => setViewMode('kartu')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-2 min-h-[38px] ${
                  viewMode === 'kartu'
                    ? 'bg-rose-700 text-white border-rose-950 shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Daftar Seksi & Anggota</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium px-1 sm:px-0">
              {viewMode === 'bagan' ? (
                <span className="flex items-center gap-1.5 text-rose-800 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Diagram Pohon Hierarki Komando & Koordinasi
                </span>
              ) : (
                <span className="text-slate-600 font-medium">
                  Daftar Rinci 9 Seksi & Personel
                </span>
              )}
            </div>
          </div>

          {viewMode === 'bagan' ? (
            /* TAMPILAN 1: BAGAN STRUKTUR ORGANISASI */
            <BaganStrukturOrganisasi committeeSettings={committeeSettings} />
          ) : (
            /* TAMPILAN 2: DAFTAR KARTU DETAIL */
            <div className="space-y-6">
              {/* 1. Pelindung, Penasehat & Penanggung Jawab */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-amber-200/90 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">
                    Pelindung
                  </span>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-base sm:text-lg">
                    <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span>{pelindungList.length > 0 ? pelindungList.join(', ') : '—'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Kepala Desa Kp Baru & Pelindung Kegiatan PHBI</p>
                </div>

                <div className="bg-white rounded-xl p-4 sm:p-5 border border-rose-200/90 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-teal-500"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block mb-1">
                    Penasehat
                  </span>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-base sm:text-lg">
                    <Heart className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>{penasehatList.length > 0 ? penasehatList.join(' & ') : '—'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Tokoh Masyarakat Kp. Kedung Sapi & Penasehat PHBI</p>
                </div>

                <div className="bg-white rounded-xl p-4 sm:p-5 border border-teal-200/90 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-rose-600"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block mb-1">
                    Penanggung Jawab
                  </span>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-base sm:text-lg">
                    <UserCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <span>{penanggungJawabList.length > 0 ? penanggungJawabList.join(' & ') : '—'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Aparatur RT 011 / RW 04 & Tokoh Lingkungan</p>
                </div>
              </div>

              {/* 2. Pengurus Inti Pelaksana */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-rose-700" />
                    <span>Pengurus Inti Pelaksana</span>
                  </h3>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Pimpinan Harian
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold uppercase text-rose-700 block">Ketua Pelaksana</span>
                    <span className="text-sm sm:text-base font-black text-rose-950 mt-0.5 block">{ketuaName || '—'}</span>
                  </div>

                  <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100">
                    <span className="text-[10px] font-bold uppercase text-teal-700 block">Wakil Ketua</span>
                    <span className="text-sm sm:text-base font-black text-teal-950 mt-0.5 block">{wakilKetuaName || '—'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Sekretaris</span>
                    <span className="text-sm sm:text-base font-black text-slate-900 mt-0.5 block">{sekretarisName || '—'}</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">Bendahara</span>
                    <span className="text-sm sm:text-base font-black text-amber-950 mt-0.5 block">{bendaharaName || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Seksi - Seksi Bidang Pelaksana */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-700" />
                    <span>Seksi – Seksi Bidang Pelaksana ({sections.length} Seksi)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="px-2.5 py-1 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Anggota</span>
                      </button>
                    )}
                    <span className="text-xs text-slate-500 font-medium">Koordinator & Anggota Bidang</span>
                  </div>
                </div>

                {sections.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                    Belum ada seksi bidang pelaksana. Gunakan tombol &quot;Kelola &amp; Edit Anggota&quot; untuk menambahkan seksi dan anggota baru.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {sections.map((section, idx) => {
                      const membersArr = Array.isArray(section.members) ? section.members : [section.members];
                      return (
                        <div 
                          key={idx}
                          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-rose-500 hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{section.name}</span>
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {membersArr.length} Anggota
                              </span>
                            </div>

                            <div className="bg-rose-50 rounded-lg p-2.5 border border-rose-100 mb-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                                Koordinator
                              </span>
                              <span className="font-extrabold text-xs sm:text-sm text-rose-950">
                                {section.coordinator}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Anggota
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {membersArr.length === 0 ? (
                                  <span className="text-xs text-slate-400 italic">Belum ada anggota</span>
                                ) : (
                                  membersArr.map((member, mIdx) => (
                                    <span 
                                      key={mIdx}
                                      className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      {member}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

