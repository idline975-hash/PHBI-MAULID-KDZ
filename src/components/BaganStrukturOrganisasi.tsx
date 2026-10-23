import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, ShieldCheck, Award, FileDown, Search, Check, 
  MapPin, CheckCircle2, UserCheck, Heart, Sparkles,
  Download, ZoomIn, ZoomOut, RotateCcw, ChevronDown, 
  Printer, Crown, Briefcase, FileText, Wallet,
  Laptop, ShieldAlert, Smartphone, Monitor,
  Layers, User
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { CommitteeSettings, CommitteeSection } from '../types';
import { generatePdfStrukturPanitia } from '../utils/pdfGenerator';

interface BaganStrukturOrganisasiProps {
  committeeSettings?: CommitteeSettings;
}

const DEFAULT_SECTIONS_FALLBACK: CommitteeSection[] = [];

export default function BaganStrukturOrganisasi({
  committeeSettings
}: BaganStrukturOrganisasiProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>('mobile');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Auto detect initial layout mode based on device screen width
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setLayoutMode('desktop');
      } else {
        setLayoutMode('mobile');
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const ketuaName = committeeSettings?.ketuaPanitia || '';
  const wakilKetuaName = committeeSettings?.wakilKetua || '';
  const sekretarisName = committeeSettings?.sekretaris || '';
  const bendaharaName = committeeSettings?.bendahara || '';
  const adminName = committeeSettings?.adminSistem || '';
  const pelindungList = committeeSettings?.pelindung || [];
  const penasehatList = committeeSettings?.penasehat || [];
  const penanggungJawabList = committeeSettings?.penanggungJawab || [];
  const sections = committeeSettings?.sections || [];

  const q = searchQuery.toLowerCase().trim();

  // Helper to check if name matches search
  const isMatch = (name: string) => {
    if (!q) return false;
    return name.toLowerCase().includes(q);
  };

  // Helper to count total personnel
  const totalAnggota = sections.reduce((acc, s) => {
    const arr = Array.isArray(s.members) ? s.members : [s.members];
    return acc + arr.length;
  }, 0);
  const totalPersonel = pelindungList.length + penasehatList.length + penanggungJawabList.length + 5 + sections.length + totalAnggota;

  /**
   * Export Bagan to High-Resolution PNG perfectly proportioned for A4 Paper
   * A4 Dimensions at 300 DPI:
   * - Landscape: 3508 x 2480 px (Standard 297mm x 210mm)
   * - Portrait:  2480 x 3508 px (Standard 210mm x 297mm)
   */
  const handleExportA4Image = async (orientation: 'landscape' | 'portrait' = 'landscape') => {
    if (!chartRef.current) return;
    setIsExporting(true);
    setExportStatus(null);
    setShowExportMenu(false);

    try {
      const originalElement = chartRef.current;
      // Capture element at 2.5x scale using html2canvas-pro with oklch support
      const sourceCanvas = await html2canvas(originalElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.transform = 'none';
          clonedElement.style.margin = '0 auto';
        }
      });

      // Target A4 Paper Dimensions (at 300 DPI standard)
      const a4Width = orientation === 'landscape' ? 3508 : 2480;
      const a4Height = orientation === 'landscape' ? 2480 : 3508;

      const a4Canvas = document.createElement('canvas');
      a4Canvas.width = a4Width;
      a4Canvas.height = a4Height;
      const ctx = a4Canvas.getContext('2d');

      if (!ctx) throw new Error('Gagal menginisialisasi canvas context');

      // Pristine white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4Width, a4Height);

      // Margins for printing (60px ≈ 5mm margin on A4)
      const marginX = 70;
      const marginY = 70;
      const availWidth = a4Width - (marginX * 2);
      const availHeight = a4Height - (marginY * 2);

      // Scale to fit inside A4 page preserving aspect ratio
      const scale = Math.min(availWidth / sourceCanvas.width, availHeight / sourceCanvas.height);
      const drawWidth = sourceCanvas.width * scale;
      const drawHeight = sourceCanvas.height * scale;

      // Center the bagan precisely on the A4 paper
      const drawX = marginX + (availWidth - drawWidth) / 2;
      const drawY = marginY + (availHeight - drawHeight) / 2;

      // Render chart
      ctx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);

      // Download PNG
      const a4DataUrl = a4Canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Bagan_Struktur_Panitia_Isra_Miraj_A4_${orientation.toUpperCase()}_${Date.now()}.png`;
      link.href = a4DataUrl;
      link.click();

      setExportStatus({ 
        type: 'success', 
        message: `Bagan berhasil diunduh sebagai Gambar PNG ukuran pas Kertas A4 (${orientation === 'landscape' ? 'Mendatar' : 'Tegak'})!` 
      });
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Gagal mengekspor gambar A4:', err);
      setExportStatus({ 
        type: 'error', 
        message: 'Gagal mengekspor gambar: ' + (err?.message || 'Terjadi kesalahan sistem') 
      });
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export directly to 1-Page A4 PDF
   */
  const handleExportA4PDF = async (orientation: 'landscape' | 'portrait' = 'landscape') => {
    if (!chartRef.current) return;
    setIsExporting(true);
    setExportStatus(null);
    setShowExportMenu(false);

    try {
      const originalElement = chartRef.current;
      const sourceCanvas = await html2canvas(originalElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.transform = 'none';
          clonedElement.style.margin = '0 auto';
        }
      });

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageWidthMm = orientation === 'landscape' ? 297 : 210;
      const pageHeightMm = orientation === 'landscape' ? 210 : 297;
      const marginMm = 8; // 8mm margin
      const availWidthMm = pageWidthMm - (marginMm * 2);
      const availHeightMm = pageHeightMm - (marginMm * 2);

      const imgAspect = sourceCanvas.width / sourceCanvas.height;
      const pageAspect = availWidthMm / availHeightMm;

      let drawWidthMm = availWidthMm;
      let drawHeightMm = availWidthMm / imgAspect;

      if (drawHeightMm > availHeightMm) {
        drawHeightMm = availHeightMm;
        drawWidthMm = availHeightMm * imgAspect;
      }

      const drawX = marginMm + (availWidthMm - drawWidthMm) / 2;
      const drawY = marginMm + (availHeightMm - drawHeightMm) / 2;

      const imgData = sourceCanvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', drawX, drawY, drawWidthMm, drawHeightMm);
      pdf.save(`Bagan_Panitia_Isra_Miraj_A4_${orientation.toUpperCase()}.pdf`);

      setExportStatus({ 
        type: 'success', 
        message: `Berkas PDF Bagan 1 Halaman Pas Kertas A4 (${orientation === 'landscape' ? 'Mendatar' : 'Tegak'}) berhasil diunduh!` 
      });
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Gagal mengekspor PDF A4:', err);
      setExportStatus({ 
        type: 'error', 
        message: 'Gagal mengekspor PDF: ' + (err?.message || 'Terjadi kesalahan sistem') 
      });
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Status Export */}
      {exportStatus && (
        <div 
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            exportStatus.type === 'success' 
              ? 'bg-rose-50 text-rose-900 border border-rose-300' 
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          {exportStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{exportStatus.message}</span>
        </div>
      )}

      {/* Control Toolbar: Optimized for Mobile & Desktop */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Mode Switcher & Export Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Layout Mode Selector (Mobile Vertikal vs Desktop Pohon Meja) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              type="button"
              id="btn-bagan-mobile-mode"
              onClick={() => setLayoutMode('mobile')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'mobile'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="Tampilan Alur Vertikal khusus layar Handphone (Pas 100% tanpa geser kanan-kiri)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mode HP (Pas Layar)</span>
            </button>

            <button
              type="button"
              id="btn-bagan-desktop-mode"
              onClick={() => setLayoutMode('desktop')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'desktop'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="Tampilan Diagram Pohon Lebar / Meja (Format Landscape/Cetak A4)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Diagram Meja / Lebar</span>
            </button>
          </div>

          {/* Action Buttons: A4 Export Menu & SK Panitia */}
          <div className="flex items-center gap-2 w-full sm:w-auto relative" ref={exportDropdownRef}>
            {/* Dropdown Button: Unduh Gambar Pas Ukuran Kertas A4 */}
            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                id="btn-download-a4-menu"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-rose-600 to-teal-700 hover:from-rose-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 min-h-[38px]"
                title="Pilihan Unduh Gambar / PDF Pas Ukuran Kertas A4"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>{isExporting ? 'Memproses A4...' : 'Unduh Pas Ukuran A4'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 animate-in fade-in">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Format Gambar Pas Kertas A4 (PNG)
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleExportA4Image('landscape')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-slate-800 hover:text-rose-900 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>A4 Landscape (Mendatar)</span>
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Rekomendasi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportA4Image('portrait')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-slate-800 hover:text-rose-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>A4 Portrait (Tegak)</span>
                  </button>

                  <div className="border-t border-slate-100 my-1 pt-1">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Format Dokumen PDF Siap Cetak (A4)
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleExportA4PDF('landscape')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cetak PDF A4 (Mendatar)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportA4PDF('portrait')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cetak PDF A4 (Tegak)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Print Official SK PDF */}
            <button
              type="button"
              onClick={() => generatePdfStrukturPanitia(committeeSettings)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[38px]"
              title="Cetak Berkas SK Panitia (PDF Dokumen Resmi)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>SK Resmi</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Box & Zoom (if in desktop mode) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama anggota / koordinator..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-rose-600 focus:border-rose-600 transition-all min-h-[38px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Desktop Zoom Controls */}
          {layoutMode === 'desktop' && (
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-slate-700">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
                className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                title="Perkecil Bagan"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono font-bold text-slate-600 min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.4))}
                className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                title="Perbesar Bagan"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg cursor-pointer transition-colors border-l border-slate-200 ml-0.5"
                title="Reset Skala 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-rose-600 inline-block"></span>
            <span>Garis Komando Resmi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
            <span>Garis Koordinasi</span>
          </div>
        </div>
        <div className="text-slate-500">
          Format Gambar: <strong className="text-rose-700">Pas Kertas A4 (297 x 210 mm)</strong> ({totalPersonel} Personel)
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📱 TAMPILAN 1: MODE HANDPHONE (ALUR VERTIKAL PAS 100% LAYAR TANPA OVERFLOW) */}
      {/* ========================================================================= */}
      {layoutMode === 'mobile' ? (
        <div 
          ref={chartRef}
          className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-300 shadow-md space-y-4 relative w-full overflow-hidden"
        >
          {/* KOP HEADER HANDPHONE */}
          <div className="text-center pb-4 border-b-2 border-rose-700 relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] sm:text-[11px] font-bold uppercase rounded-full mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              BAGAN STRUKTUR ORGANISASI PHBI
            </div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              ISRA MI'RAJ 1448 H / 2027 M
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
            </p>
          </div>

          {/* LEVEL 1: DEWAN PENGARAH (PELINDUNG, PENASEHAT & PENANGGUNG JAWAB) */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Node Pelindung */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs relative text-center ${
                  pelindungList.some(p => isMatch(p))
                    ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
                    : 'bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-300'
                }`}
              >
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs mb-1">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Pelindung</span>
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {pelindungList.length > 0 ? pelindungList.join(', ') : '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Kepala Desa Kp Baru</div>
              </div>

              {/* Node Penasehat */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs relative text-center ${
                  penasehatList.some(p => isMatch(p))
                    ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-400'
                    : 'bg-gradient-to-b from-rose-50 to-rose-100/60 border-rose-300'
                }`}
              >
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-700 text-white font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs mb-1">
                  <Heart className="w-2.5 h-2.5" />
                  <span>Penasehat</span>
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {penasehatList.length > 0 ? penasehatList.join(' & ') : '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tokoh Masyarakat Kp. Kedung Sapi</div>
              </div>

              {/* Node Penanggung Jawab */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs relative text-center ${
                  penanggungJawabList.some(p => isMatch(p))
                    ? 'bg-teal-100 border-teal-500 ring-2 ring-teal-400'
                    : 'bg-gradient-to-b from-teal-50 to-rose-50 border-teal-300'
                }`}
              >
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-600 text-white font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs mb-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Penanggung Jawab</span>
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {penanggungJawabList.length > 0 ? penanggungJawabList.join(' & ') : '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Aparatur RT 011 / RW 04</div>
              </div>
            </div>

            {/* Vertical Flow Connector */}
            <div className="w-0.5 h-5 bg-rose-600 mx-auto relative">
              <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>

          {/* LEVEL 2: PIMPINAN UTAMA (KETUA & WAKIL KETUA) */}
          <div className="space-y-2">
            {/* Ketua Pelaksana Card */}
            <div 
              className={`w-full p-4 rounded-2xl border-2 transition-all shadow-md relative text-center ${
                isMatch(ketuaName)
                  ? 'bg-rose-100 border-rose-600 ring-4 ring-rose-300'
                  : 'bg-gradient-to-br from-rose-900 via-rose-800 to-teal-900 border-amber-400 text-white'
              }`}
            >
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs mb-1">
                <Award className="w-3 h-3 text-slate-950" />
                <span>Pimpinan Utama Harian</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                KETUA PELAKSANA
              </div>
              <div className="text-lg font-black tracking-tight text-white mt-0.5">
                {ketuaName || '—'}
              </div>
              <div className="text-[10px] text-rose-200/90 font-medium mt-0.5">
                Komando & Penanggung Jawab Kegiatan
              </div>
            </div>

            {/* Short Connector */}
            <div className="w-0.5 h-3 bg-rose-600 mx-auto"></div>

            {/* Wakil Ketua Card */}
            <div 
              className={`w-full p-3 rounded-xl border-2 transition-all shadow-sm relative text-center ${
                isMatch(wakilKetuaName)
                  ? 'bg-teal-100 border-teal-600 ring-4 ring-teal-300'
                  : 'bg-gradient-to-br from-teal-800 to-rose-900 border-teal-300 text-white'
              }`}
            >
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-400 text-slate-950 font-black text-[8px] uppercase tracking-wider rounded-full shadow-xs mb-1">
                <UserCheck className="w-2.5 h-2.5" />
                <span>Wakil Pimpinan</span>
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-teal-200">
                WAKIL KETUA
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {wakilKetuaName || '—'}
              </div>
              <div className="text-[10px] text-teal-200/90 font-medium">
                Koordinator Pelaksana Lapangan
              </div>
            </div>

            {/* Vertical Flow Connector */}
            <div className="w-0.5 h-5 bg-rose-600 mx-auto relative">
              <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>

          {/* LEVEL 3: TIGA PILAR ADMINISTRASI & KEUANGAN */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Sekretaris */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs text-center ${
                  isMatch(sekretarisName)
                    ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-400'
                    : 'bg-white border-blue-200'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-1">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="text-[9px] font-extrabold uppercase text-blue-800 tracking-wider">
                  SEKRETARIS
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {sekretarisName || '—'}
                </div>
                <div className="text-[9px] text-slate-500">Administrasi Surat</div>
              </div>

              {/* Bendahara */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs text-center ${
                  isMatch(bendaharaName)
                    ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
                    : 'bg-white border-amber-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-1">
                  <Wallet className="w-3 h-3" />
                </div>
                <div className="text-[9px] font-extrabold uppercase text-amber-800 tracking-wider">
                  BENDAHARA KAS
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {bendaharaName || '—'}
                </div>
                <div className="text-[9px] text-slate-500">Keuangan & Kas</div>
              </div>

              {/* Admin Sistem */}
              <div 
                className={`p-3 rounded-xl border-2 transition-all shadow-xs text-center ${
                  isMatch(adminName)
                    ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400'
                    : 'bg-white border-indigo-200'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-1">
                  <Laptop className="w-3 h-3" />
                </div>
                <div className="text-[9px] font-extrabold uppercase text-indigo-800 tracking-wider">
                  ADMIN SISTEM
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {adminName || '—'}
                </div>
                <div className="text-[9px] text-slate-500">Sinkronisasi Cloud</div>
              </div>
            </div>

            {/* Vertical Flow Connector */}
            <div className="w-0.5 h-5 bg-rose-600 mx-auto relative">
              <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>

          {/* LEVEL 4: 9 SEKSI BIDANG PELAKSANA (LENGKAP DENGAN BAGAN SUB-STRUKTUR INTERNAL) */}
          <div className="space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-900 text-white font-black text-[11px] uppercase tracking-wider rounded-full shadow-xs">
                <Users className="w-3 h-3 text-amber-300" />
                <span>BAGAN SEKSI – SEKSI BIDANG PELAKSANA ({sections.length} DIVISI)</span>
              </span>
            </div>

            {sections.length === 0 ? (
              <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                Belum ada seksi bidang pelaksana yang ditambahkan.
              </div>
            ) : (
              <div className="space-y-3.5">
                {sections.map((section, idx) => {
                const membersArr = Array.isArray(section.members) ? section.members : [section.members];
                const hasMatchingCoord = isMatch(section.coordinator);
                const hasMatchingMember = membersArr.some(m => isMatch(m));
                const isSectionHighlighted = hasMatchingCoord || hasMatchingMember;

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border-2 transition-all p-3.5 sm:p-4 shadow-xs relative ${
                      isSectionHighlighted
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200 hover:border-rose-400'
                    }`}
                  >
                    {/* Header Seksi */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {section.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {membersArr.length} Personel
                      </span>
                    </div>

                    {/* SUB-BAGAN INTERNAL SEKSI (BAGAN POHON ALUR KOORDINATOR -> ANGGOTA) */}
                    <div className="space-y-2">
                      {/* Node Koordinator Seksi */}
                      <div 
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          hasMatchingCoord
                            ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-300 shadow-xs'
                            : 'bg-gradient-to-r from-rose-50 via-teal-50 to-rose-50 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-800">
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span>Koordinator Seksi</span>
                        </div>
                        <div className="font-black text-sm text-rose-950 mt-0.5">
                          {section.coordinator}
                        </div>
                      </div>

                      {/* Garis Komando Alur Seksi ke Bawah */}
                      <div className="w-0.5 h-3 bg-rose-600 mx-auto relative">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-700 absolute -bottom-0.5 left-1/2 -translate-x-1/2"></div>
                      </div>

                      {/* Ranting Pohon Bagan Anggota Seksi */}
                      <div>
                        {membersArr.length === 1 && membersArr[0].toLowerCase().includes('seluruh panitia') ? (
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center text-xs font-bold text-teal-900">
                            🤝 Seluruh Panitia & Warga Kp Kedung Sapi Terlibat
                          </div>
                        ) : (
                          <div className="space-y-1.5 pl-3 border-l-2 border-rose-400 ml-3">
                            {membersArr.map((member, mIdx) => {
                              const match = isMatch(member);
                              return (
                                <div key={mIdx} className="relative flex items-center gap-2">
                                  {/* Branch connector */}
                                  <div className="w-3 h-0.5 bg-rose-400 -ml-3"></div>

                                  {/* Member Node Box */}
                                  <div 
                                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs ${
                                      match
                                        ? 'bg-amber-300 text-slate-950 font-bold border-amber-500 ring-2 ring-amber-300'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                                        {mIdx + 1}
                                      </span>
                                      <span className="truncate">{member}</span>
                                    </span>
                                    <span className="text-[9px] font-medium text-slate-400 uppercase">
                                      Anggota
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* BAGAN FOOTER */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] sm:text-xs text-slate-500 font-medium">
            <span>Diterbitkan resmi oleh <strong>Panitia PHBI Isra Mi'raj 1448 H / 2027 M</strong> – Kp. Kedung Sapi</span>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 🖥️ TAMPILAN 2: MODE MEJA / LEBAR (DIAGRAM POHON ZOOMABLE / FORMAT CETAK A4) */
        /* ========================================================================= */
        <div className="bg-slate-100/70 rounded-2xl border border-slate-200 overflow-x-auto overflow-y-hidden p-3 sm:p-8 shadow-inner">
          <div
            ref={chartRef}
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
            className="min-w-[1060px] mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md transition-transform duration-150 relative"
          >
            {/* BAGAN KOP HEADER */}
            <div className="text-center pb-6 border-b-2 border-rose-700 mb-8 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold uppercase rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                BAGAN STRUKTUR ORGANISASI KEPANITIAAN RESMI
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MI'RAJ 1448 H / 2027 M
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
              </p>
            </div>

            {/* LEVEL 1: DEWAN PENGARAH (PELINDUNG, PENASEHAT & PENANGGUNG JAWAB) */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {/* Node Pelindung */}
                <div 
                  className={`w-64 p-3.5 rounded-xl border-2 transition-all shadow-sm relative text-center ${
                    pelindungList.some(p => isMatch(p))
                      ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
                      : 'bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-300'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Pelindung</span>
                  </div>
                  <div className="text-[11px] font-extrabold text-amber-900 mt-1 uppercase tracking-wide">
                    PELINDUNG
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {pelindungList.length > 0 ? pelindungList.join(', ') : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Kepala Desa Kp Baru
                  </div>
                </div>

                {/* Garis Koordinasi Horizontal 1 */}
                <div className="w-10 border-t-2 border-dashed border-amber-400 relative">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-white text-[8px] font-bold text-amber-700">
                    Koordinasi
                  </span>
                </div>

                {/* Node Penasehat */}
                <div 
                  className={`w-72 p-3.5 rounded-xl border-2 transition-all shadow-sm relative text-center ${
                    penasehatList.some(p => isMatch(p))
                      ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-400'
                      : 'bg-gradient-to-b from-rose-50 to-rose-100/60 border-rose-300'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-rose-700 text-white font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5" />
                    <span>Penasehat</span>
                  </div>
                  <div className="text-[11px] font-extrabold text-rose-900 mt-1 uppercase tracking-wide">
                    DEWAN PENASEHAT
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {penasehatList.length > 0 ? penasehatList.join(' & ') : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Tokoh Masyarakat Kp. Kedung Sapi
                  </div>
                </div>

                {/* Garis Koordinasi Horizontal 2 */}
                <div className="w-10 border-t-2 border-dashed border-rose-400 relative">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-white text-[8px] font-bold text-rose-700">
                    Koordinasi
                  </span>
                </div>

                {/* Node Penanggung Jawab */}
                <div 
                  className={`w-64 p-3.5 rounded-xl border-2 transition-all shadow-sm relative text-center ${
                    penanggungJawabList.some(p => isMatch(p))
                      ? 'bg-teal-100 border-teal-500 ring-2 ring-teal-400'
                      : 'bg-gradient-to-b from-teal-50 to-rose-50 border-teal-300'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-teal-600 text-white font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Penanggung Jawab</span>
                  </div>
                  <div className="text-[11px] font-extrabold text-teal-900 mt-1 uppercase tracking-wide">
                    PENANGGUNG JAWAB
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {penanggungJawabList.length > 0 ? penanggungJawabList.join(' & ') : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Aparatur RT 011 / RW 04
                  </div>
                </div>
              </div>

              {/* Vertical Connector Line from Level 1 to Level 2 */}
              <div className="w-0.5 h-8 bg-rose-600 mx-auto mt-2 relative">
                <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>

            {/* LEVEL 2: KETUA & WAKIL KETUA */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center gap-6 sm:gap-8">
                {/* Node Ketua */}
                <div 
                  className={`w-72 p-4 rounded-2xl border-2 transition-all shadow-md relative text-center ${
                    isMatch(ketuaName)
                      ? 'bg-rose-100 border-rose-600 ring-4 ring-rose-300'
                      : 'bg-gradient-to-br from-rose-900 via-rose-800 to-teal-900 border-amber-400 text-white'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                    <Award className="w-3 h-3 text-slate-950" />
                    <span>Pimpinan Utama</span>
                  </div>

                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-200 mt-1">
                    KETUA PELAKSANA
                  </div>
                  <div className="text-lg font-black tracking-tight text-white mt-0.5">
                    {ketuaName || '—'}
                  </div>
                  <div className="text-[10px] text-rose-200/90 font-medium mt-0.5">
                    Komando & Penanggung Jawab Kegiatan
                  </div>
                </div>

                {/* Horizontal Connector to Wakil */}
                <div className="w-10 border-t-2 border-rose-600 relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 absolute -top-[3px] left-1/2 -translate-x-1/2"></div>
                </div>

                {/* Node Wakil */}
                <div 
                  className={`w-64 p-3.5 rounded-2xl border-2 transition-all shadow-md relative text-center ${
                    isMatch(wakilKetuaName)
                      ? 'bg-teal-100 border-teal-600 ring-4 ring-teal-300'
                      : 'bg-gradient-to-br from-teal-800 to-rose-900 border-teal-300 text-white'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-teal-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" />
                    <span>Wakil Pimpinan</span>
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-200 mt-1">
                    WAKIL KETUA
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {wakilKetuaName || '—'}
                  </div>
                  <div className="text-[10px] text-teal-200/90 font-medium mt-0.5">
                    Koordinator Pelaksana Lapangan
                  </div>
                </div>
              </div>

              {/* Vertical Connector Line from Level 2 to Level 3 */}
              <div className="w-0.5 h-8 bg-rose-600 mx-auto mt-2 relative">
                <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>

            {/* LEVEL 3: TIGA PILAR */}
            <div className="relative mb-10 max-w-4xl mx-auto">
              <div className="relative pb-6">
                <div className="h-0.5 bg-rose-600 w-3/4 mx-auto relative">
                  <div className="absolute top-0 left-0 w-0.5 h-4 bg-rose-600"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-rose-600"></div>
                  <div className="absolute top-0 right-0 w-0.5 h-4 bg-rose-600"></div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  {/* Sekretaris */}
                  <div 
                    className={`p-3.5 rounded-xl border-2 transition-all shadow-xs text-center relative ${
                      isMatch(sekretarisName)
                        ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-400'
                        : 'bg-white border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-1">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[10px] font-extrabold uppercase text-blue-800 tracking-wider">
                      SEKRETARIS
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {sekretarisName || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Administrasi & Surat
                    </div>
                  </div>

                  {/* Bendahara */}
                  <div 
                    className={`p-3.5 rounded-xl border-2 transition-all shadow-xs text-center relative ${
                      isMatch(bendaharaName)
                        ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
                        : 'bg-white border-amber-300 hover:border-amber-400'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-1">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                      BENDAHARA KAS
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {bendaharaName || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Keuangan & Pembukuan
                    </div>
                  </div>

                  {/* Admin Sistem */}
                  <div 
                    className={`p-3.5 rounded-xl border-2 transition-all shadow-xs text-center relative ${
                      isMatch(adminName)
                        ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400'
                        : 'bg-white border-indigo-200 hover:border-indigo-400'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-1">
                      <Laptop className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[10px] font-extrabold uppercase text-indigo-800 tracking-wider">
                      ADMIN SISTEM
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {adminName || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Sinkronisasi Real-Time
                    </div>
                  </div>
                </div>
              </div>

              {/* Central Connector */}
              <div className="w-0.5 h-8 bg-rose-600 mx-auto relative">
                <div className="w-2 h-2 rounded-full bg-rose-700 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>

            {/* LEVEL 4: 9 SEKSI BIDANG PELAKSANA (TREE NODES DENGAN SUB-BAGAN ANGGOTA LENGKAP) */}
            <div className="relative">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-xs">
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span>SEKSI – SEKSI BIDANG PELAKSANA ({sections.length} DIVISI)</span>
                </div>
              </div>

              <div className="h-0.5 bg-rose-600 w-full mb-6 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-700"></div>
              </div>

              {sections.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                  Belum ada seksi bidang pelaksana yang ditambahkan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sections.map((section, idx) => {
                  const membersArr = Array.isArray(section.members) ? section.members : [section.members];
                  const hasMatchingCoord = isMatch(section.coordinator);
                  const hasMatchingMember = membersArr.some(m => isMatch(m));
                  const isSectionHighlighted = hasMatchingCoord || hasMatchingMember;

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border-2 transition-all p-4 flex flex-col justify-between relative shadow-xs ${
                        isSectionHighlighted
                          ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-300'
                          : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-sm'
                      }`}
                    >
                      {/* Top Connector to Main Branch */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-2 bg-rose-600 rounded-t-sm"></div>

                      <div>
                        {/* Section Header */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span>{section.name}</span>
                          </span>
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {membersArr.length} Personel
                          </span>
                        </div>

                        {/* SUB-BAGAN SEKSI: NODE KOORDINATOR */}
                        <div 
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            hasMatchingCoord
                              ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-300'
                              : 'bg-gradient-to-r from-rose-50 via-teal-50 to-rose-50 border-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-800">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Koordinator Seksi</span>
                          </div>
                          <div className="font-black text-sm text-rose-950 mt-0.5">
                            {section.coordinator}
                          </div>
                        </div>

                        {/* Garis Komando Alur Seksi ke Bawah */}
                        <div className="w-0.5 h-3 bg-rose-600 mx-auto relative my-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-700 absolute -bottom-0.5 left-1/2 -translate-x-1/2"></div>
                        </div>

                        {/* SUB-BAGAN SEKSI: GARIS CABANG & NODE ANGGOTA */}
                        <div>
                          {membersArr.length === 1 && membersArr[0].toLowerCase().includes('seluruh panitia') ? (
                            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center text-xs font-bold text-teal-900 shadow-2xs">
                              🤝 Seluruh Panitia & Warga Terlibat (Gotong Royong)
                            </div>
                          ) : (
                            <>
                              {/* Garis Cabang Horizontal Mini */}
                              <div className="h-0.5 bg-rose-400 w-3/4 mx-auto relative mb-2">
                                <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                              </div>

                              {/* Grid Node-Node Anggota Seksi */}
                              <div className="grid grid-cols-2 gap-2">
                                {membersArr.map((member, mIdx) => {
                                  const match = isMatch(member);
                                  return (
                                    <div
                                      key={mIdx}
                                      className={`p-2 rounded-lg border text-center transition-all relative shadow-2xs ${
                                        match
                                          ? 'bg-amber-300 text-slate-950 font-bold border-amber-500 ring-2 ring-amber-300'
                                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                                      }`}
                                    >
                                      {/* Mini Connector to Branch Line */}
                                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-rose-400"></div>

                                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                                        <User className="w-2.5 h-2.5" />
                                        <span>Anggota {mIdx + 1}</span>
                                      </div>
                                      <div className="text-xs font-black text-slate-900 truncate mt-0.5">
                                        {member}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* BAGAN FOOTER */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
                <div>
                  <span>Diterbitkan oleh: <strong>Panitia PHBI Isra Mi'raj 1448 H / 2027 M</strong></span>
                </div>
                <div className="text-right">
                  <span>Dokumen Resmi Kepanitiaan Kp. Kedung Sapi (Format Kertas A4)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
