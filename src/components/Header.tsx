/* eslint-disable */
import { useState, useEffect } from 'react';
import { 
  Wifi, 
  ShieldCheck, 
  Wallet, 
  User, 
  Users, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  X,
  CheckCircle2,
  LogIn,
  LogOut
} from 'lucide-react';
import { UserAccount, CommitteeSettings, PaymentSettings, TransferConfirmation, Citizen } from '../types';
import { getCurrentIndonesianTime } from '../utils/formatters';

interface HeaderProps {
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  isLoginOpen?: boolean;
  online?: boolean;
  version?: number;
  committeeSettings?: CommitteeSettings;
  paymentSettings?: PaymentSettings;
  citizens?: Citizen[];
  transferConfirmations?: TransferConfirmation[];
  activePeriodLabel?: string;
  periodArchivesCount?: number;
  onRefresh?: () => void;
  onOpenPayment?: () => void;
}

export default function Header({ 
  currentUser = null, 
  onLogout = () => {}, 
  onOpenLogin = () => {},
  isLoginOpen = false,
  online = true, 
  version = 1,
  committeeSettings,
  activePeriodLabel = '1448 H / 2027 M'
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentIndonesianTime());
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const hijriShort = activePeriodLabel.split('/')[0]?.trim() || '1448 H';

  const waGroupLink = committeeSettings?.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4';
  const ketuaPanitia = committeeSettings?.ketuaPanitia || '';
  const wakilKetua = committeeSettings?.wakilKetua || '';
  const sekretaris = committeeSettings?.sekretaris || '';
  const adminSistem = committeeSettings?.adminSistem || '';
  const bendahara = committeeSettings?.bendahara || '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(waGroupLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentIndonesianTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            ADMINISTRATOR
          </span>
        );
      case 'bendahara':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30">
            <Wallet className="w-3.5 h-3.5" />
            BENDAHARA
          </span>
        );
      case 'usser1':
      case 'usser2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            <User className="w-3.5 h-3.5" />
            {currentUser.role === 'usser1' ? 'USSER 1' : 'USSER 2'}
          </span>
        );
      case 'warga':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
            <Users className="w-3.5 h-3.5" />
            WARGA KP. KEDUNG SAPI
          </span>
        );
    }
  };

  return (
    <header className="bg-gradient-to-r from-rose-950 via-rose-900 to-teal-950 text-white shadow-lg border-b border-rose-800/60 sticky top-0 z-40">
      {/* Running Marquee Banner moving from right to left */}
      <div className="bg-amber-500 text-slate-950 text-[11px] sm:text-xs font-semibold py-1 px-3 sm:px-4 overflow-hidden shadow-inner flex items-center border-b border-amber-600/40">
        <div className="whitespace-nowrap flex items-center gap-3 animate-marquee">
          <span>🕌 <strong>PANITIA PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MIRAJ</strong></span>
          <span className="text-amber-900">•</span>
          <span>💬 <strong>Undangan Grup WhatsApp:</strong> <a href={waGroupLink} target="_blank" rel="noopener noreferrer" className="underline font-bold">Gabung Grup Warga & Panitia</a></span>
          <span className="text-amber-900">•</span>
          <span>📍 <strong>Alamat:</strong> Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten</span>
          <span className="text-amber-900">•</span>
          <span>Ketua: <strong>{ketuaPanitia}</strong></span>
          <span className="text-amber-900">•</span>
          <span>Wk. Ketua: <strong>{wakilKetua}</strong></span>
          <span className="text-amber-900">•</span>
          <span>Sekretaris: <strong>{sekretaris}</strong></span>
          <span className="text-amber-900">•</span>
          <span>Bendahara: <strong>{bendahara}</strong></span>
          <span className="text-amber-900">•</span>
          <span>Admin: <strong>{adminSistem}</strong></span>
          <span className="text-amber-900">•</span>
          <span>✨ <em>Sistem Pencatatan Iuran & Donasi Real-Time Terpadu</em></span>
        </div>
      </div>

      {/* Main Top Navbar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* PHBI Logo Badge - Sleek compact circular emblem */}
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full shadow-md flex items-center justify-center shrink-0 overflow-hidden ring-1.5 ring-amber-400/70 bg-rose-950">
            <img
              src="/src/assets/images/logo_phbi_round_1792427989839.jpg"
              alt="Logo Resmi PHBI Isra Mi'raj"
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
                PANITIA ISRA MIRAJ
              </h1>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider bg-rose-700/60 text-rose-200 px-1.5 py-0.2 rounded border border-rose-600/50 shrink-0">
                Kp. Kedung Sapi
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-rose-200/90 font-medium truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">
              Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
            </p>
          </div>
        </div>

        {/* Right Info: Real-time clock & User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {/* Dedicated Tab Khusus Undangan Grup WhatsApp */}
          <button
            type="button"
            id="tab-header-hotline"
            onClick={() => setShowHotlineModal(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-400 hover:bg-rose-300 text-slate-950 font-black text-xs rounded-xl shadow-md border-2 border-rose-950 transition-all cursor-pointer shrink-0 relative z-10"
            title="Buka Undangan Grup WhatsApp Resmi Warga & Panitia"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="font-black hidden md:inline">Grup WA Panitia & Warga</span>
            <span className="font-black hidden xs:inline md:hidden">Grup WA</span>
            <span className="font-black xs:hidden">WA</span>
          </button>

          {/* Tab Login (Usser, Bendahara & Admin) */}
          <button
            type="button"
            id="tab-header-login"
            onClick={onOpenLogin}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 font-black text-xs rounded-xl shadow-md border-2 transition-all cursor-pointer shrink-0 relative z-10 ${
              isLoginOpen
                ? 'bg-white text-rose-950 border-rose-950 ring-2 ring-amber-400'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-950'
            }`}
            title="Login untuk Usser, Bendahara, dan Admin"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="font-black">Login</span>
          </button>



          {/* Live Clock & Sync indicator */}
          <div className="text-right hidden lg:block">
            <div className="flex items-center justify-end gap-1.5 text-xs text-rose-200 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Online v{version}</span>
            </div>
            <p className="text-[11px] text-rose-300/80 font-mono mt-0.5">{currentTime}</p>
          </div>

          {/* User Profile */}
          {currentUser && currentUser.role !== 'warga' ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[160px]">
                    {currentUser.name}
                  </span>
                </div>
                <div className="mt-0.5">{getRoleBadge()}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold text-rose-200 transition-colors cursor-pointer"
                title="Keluar dan kembali ke Dasbor Warga"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-800/60 border border-rose-600/40 text-xs text-rose-200">
              <Wifi className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Dasbor Warga</span>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL KHUSUS UNDANGAN GRUP WHATSAPP RESMI */}
      {showHotlineModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowHotlineModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-rose-950 via-rose-900 to-teal-950 text-white rounded-2xl border border-rose-600/60 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowHotlineModal(false)}
              className="absolute top-4 right-4 p-1.5 text-rose-300 hover:text-white hover:bg-rose-800/60 rounded-lg transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-400 text-slate-950 font-black text-[10px] uppercase rounded-full shadow-xs">
                  <MessageSquare className="w-3 h-3" />
                  Undangan Resmi WhatsApp
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-rose-300 bg-rose-900/80 px-2 py-0.5 rounded-full border border-rose-700/50">
                  <CheckCircle2 className="w-3 h-3 text-rose-400" />
                  Grup Aktif Terverifikasi
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                Grup WhatsApp Panitia & Warga Kp. Kedung Sapi
              </h3>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Saluran resmi komunikasi, informasi pengumuman, transparansi donasi, dan silaturahmi warga PHBI Isra Miraj 1448 H / 2027 M.
              </p>
            </div>

            {/* WhatsApp Group Link Box */}
            <div className="bg-rose-950/90 rounded-xl p-4 border border-rose-700/70 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs text-rose-300">
                <span className="uppercase tracking-wider font-bold">Link Undangan Grup WhatsApp:</span>
                <span className="px-2 py-0.5 rounded bg-rose-900/80 text-[10px] text-amber-300 font-semibold border border-amber-300/30">
                  Resmi Panitia
                </span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-lg border border-rose-800/80 break-all text-xs font-mono text-rose-100 select-all">
                {waGroupLink}
              </div>

              {/* Susunan Kepanitiaan Inti */}
              <div className="pt-2 border-t border-rose-800/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-rose-200/90">
                <div>Ketua: <strong className="text-white">{ketuaPanitia}</strong></div>
                <div>Wk. Ketua: <strong className="text-white">{wakilKetua}</strong></div>
                <div>Sekretaris: <strong className="text-white">{sekretaris}</strong></div>
                <div>Bendahara: <strong className="text-white">{bendahara}</strong></div>
                <div>Admin: <strong className="text-white">{adminSistem}</strong></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <a
                href={waGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-gradient-to-r from-rose-400 to-teal-400 hover:from-rose-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span>Gabung Grup WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-rose-300" />
                    <span className="text-rose-200 font-bold">Link Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link Grup</span>
                  </>
                )}
              </button>
            </div>

            {/* Benefit / Guidelines */}
            <div className="border-t border-rose-800/60 pt-3 space-y-2">
              <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wide">
                Fasilitas & Informasi di Grup WhatsApp:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-rose-100/90">
                <div className="p-2 bg-rose-950/50 rounded-lg border border-rose-800/40">
                  <strong>1. Laporan Real-Time:</strong> Pembaruan berkala rekapitulasi iuran & donasi warga.
                </div>
                <div className="p-2 bg-rose-950/50 rounded-lg border border-rose-800/40">
                  <strong>2. Konfirmasi Donasi:</strong> Hubungi panitia langsung jika ada kesalahan nama/nominal.
                </div>
                <div className="p-2 bg-rose-950/50 rounded-lg border border-rose-800/40">
                  <strong>3. Jadwal & Rundown:</strong> Agenda dan susunan acara peringatan Isra Miraj.
                </div>
                <div className="p-2 bg-rose-950/50 rounded-lg border border-rose-800/40">
                  <strong>4. Komunikasi Warga:</strong> Diskusi dan musyawarah demi kesuksesan acara.
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="pt-2 text-center border-t border-rose-800/40">
              <button
                type="button"
                onClick={() => setShowHotlineModal(false)}
                className="text-xs text-rose-300/80 hover:text-rose-100 transition-colors underline cursor-pointer"
              >
                Tutup jendela informasi
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
