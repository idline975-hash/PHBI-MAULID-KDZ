import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import DashboardUsser from './components/DashboardUsser';
import DashboardBendahara from './components/DashboardBendahara';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardWarga from './components/DashboardWarga';
import WelcomeScreen from './components/WelcomeScreen';
import { 
  Citizen, 
  DonasiWargaPayment, 
  DonasiSukarela, 
  Pengeluaran, 
  UserAccount, 
  AuditLog,
  CommitteeSettings,
  PaymentSettings,
  TransferConfirmation,
  ProposalData,
  PeriodArchive,
  VisitorStats
} from './types';
import { RefreshCw, Wifi, WifiOff, LogOut, Shield, HeartHandshake, Wallet, Users, Archive, Home, Eye } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      localStorage.removeItem('isra_miraj_user');
    } catch {
      // ignore
    }

    try {
      const saved = sessionStorage.getItem('isra_miraj_user_session');
      if (saved) {
        const parsed = JSON.parse(saved) as UserAccount;
        if (parsed && parsed.role !== 'warga') {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login') === 'true' || window.location.hash === '#login') {
        return true;
      }
    }
    return false;
  });

  // Tampilan Awal (Welcome Screen) saat pertama kali masuk link
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login') === 'true' || window.location.hash === '#login') {
        return false;
      }
    }
    return true;
  });

  // Load offline cached state if available so data is never blank on reload
  const cachedInitial = (() => {
    try {
      const raw = localStorage.getItem('isra_miraj_offline_cache');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [citizens, setCitizens] = useState<Citizen[]>(cachedInitial?.citizens || []);
  const [wargaPayments, setWargaPayments] = useState<DonasiWargaPayment[]>(cachedInitial?.wargaPayments || []);
  const [sukarelaPayments, setSukarelaPayments] = useState<DonasiSukarela[]>(cachedInitial?.sukarelaPayments || []);
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>(cachedInitial?.pengeluaranList || []);
  const [accounts, setAccounts] = useState<UserAccount[]>(cachedInitial?.accounts || []);
  const [targetPerPerson, setTargetPerPerson] = useState<number>(cachedInitial?.targetPerPerson || 250000);
  const [committeeSettings, setCommitteeSettings] = useState<CommitteeSettings | undefined>(cachedInitial?.committeeSettings || undefined);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | undefined>(cachedInitial?.paymentSettings || undefined);
  const [transferConfirmations, setTransferConfirmations] = useState<TransferConfirmation[]>(cachedInitial?.transferConfirmations || []);
  const [proposalData, setProposalData] = useState<ProposalData | undefined>(cachedInitial?.proposalData || undefined);
  const [activePeriodLabel, setActivePeriodLabel] = useState<string>(cachedInitial?.activePeriodLabel || '1448 H / 2027 M');
  const [periodArchives, setPeriodArchives] = useState<PeriodArchive[]>(cachedInitial?.periodArchives || []);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(cachedInitial?.auditLogs || []);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | undefined>(cachedInitial?.visitorStats || undefined);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);


  // Sync state from server (backed by Cloud Firestore)
  const fetchFullState = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setCitizens(data.citizens || []);
        setWargaPayments(data.wargaPayments || []);
        setSukarelaPayments(data.sukarelaPayments || []);
        setPengeluaranList(data.pengeluaranList || []);
        setAccounts(data.accounts || []);
        setTargetPerPerson(data.targetPerPerson || 250000);
        if (data.committeeSettings) {
          setCommitteeSettings(data.committeeSettings);
        }
        if (data.paymentSettings) {
          setPaymentSettings(data.paymentSettings);
        }
        if (data.transferConfirmations) {
          setTransferConfirmations(data.transferConfirmations);
        }
        if (data.proposalData) {
          setProposalData(data.proposalData);
        }
        if (data.visitorStats) {
          setVisitorStats(data.visitorStats);
        }
        setActivePeriodLabel(data.activePeriodLabel || '1448 H / 2027 M');
        setPeriodArchives(data.periodArchives || []);
        setAuditLogs(data.auditLogs || []);
        setIsOnline(true);
        // Persist fresh snapshot to offline cache for permanent protection against reload or sudden shutdown
        try {
          localStorage.setItem('isra_miraj_offline_cache', JSON.stringify({
            citizens: data.citizens,
            wargaPayments: data.wargaPayments,
            sukarelaPayments: data.sukarelaPayments,
            pengeluaranList: data.pengeluaranList,
            accounts: data.accounts,
            targetPerPerson: data.targetPerPerson,
            committeeSettings: data.committeeSettings,
            paymentSettings: data.paymentSettings,
            transferConfirmations: data.transferConfirmations,
            proposalData: data.proposalData,
            activePeriodLabel: data.activePeriodLabel,
            periodArchives: data.periodArchives,
            auditLogs: data.auditLogs,
            visitorStats: data.visitorStats,
          }));
        } catch (e) {
          // ignore cache quota
        }
      }
    } catch (err) {
      console.warn('Sync connection warning:', err);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Record visitor access automatically once per browser session
  useEffect(() => {
    const recordVisit = async () => {
      try {
        let visitorId = localStorage.getItem('isra_miraj_visitor_id');
        if (!visitorId) {
          visitorId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('isra_miraj_visitor_id', visitorId);
        }

        const lastRecorded = sessionStorage.getItem('isra_miraj_visit_recorded_time');
        const now = Date.now();
        // Record visit if first time in session or more than 15 minutes since last recorded
        if (lastRecorded && now - Number(lastRecorded) < 15 * 60 * 1000) {
          return;
        }

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
        const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

        const res = await fetch('/api/visitors/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            deviceType,
            pageVisited: window.location.pathname + (window.location.hash || ''),
            roleViewed: currentUser?.role || 'tamu',
            userAgent: navigator.userAgent
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.stats) {
            setVisitorStats(json.stats);
          }
          sessionStorage.setItem('isra_miraj_visit_recorded_time', String(now));
        }
      } catch {
        // Silently ignore if offline
      }
    };

    recordVisit();
  }, [currentUser]);

  // Initial load + Real-time SSE Connection
  useEffect(() => {
    fetchFullState();

    // SSE Realtime Event Stream for live online multi-device updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsOnline(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // When any mutation occurs, reload full state immediately
          if (parsed.version !== undefined || parsed.data) {
            fetchFullState();
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        setIsOnline(false);
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect:', e);
    }

    // Network online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      fetchFullState();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat sync every 15 seconds
    const interval = setInterval(fetchFullState, 15000);

    return () => {
      if (eventSource) eventSource.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [fetchFullState]);

  // Handle Login Success
  const handleLoginSuccess = (user: UserAccount) => {
    setIsLoginOpen(false);
    setShowWelcome(false);
    if (user.role === 'warga') {
      setCurrentUser(null);
      try {
        sessionStorage.removeItem('isra_miraj_user_session');
        localStorage.removeItem('isra_miraj_user');
      } catch (e) {
        console.error(e);
      }
    } else {
      setCurrentUser(user);
      try {
        sessionStorage.setItem('isra_miraj_user_session', JSON.stringify(user));
        localStorage.removeItem('isra_miraj_user');
      } catch (e) {
        console.error(e);
      }
    }
    fetchFullState();
  };

  // Handle Logout (Kembali ke Dasbor Warga)
  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoginOpen(false);
    try {
      sessionStorage.removeItem('isra_miraj_user_session');
      localStorage.removeItem('isra_miraj_user');
    } catch (e) {
      console.error(e);
    }
  };

  // Default Warga account when no staff is logged in
  const activeUser: UserAccount = currentUser || {
    id: 'acc-warga',
    username: 'warga',
    password: '123',
    role: 'warga',
    name: 'Warga Kp. Kedung Sapi',
  };

  // Calculated totals (excluding payments marked excludedFromTotal)
  const totalDonasiWarga = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );
  const totalDonasiSukaRela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalMasuk = totalDonasiWarga + totalDonasiSukaRela;
  const totalKeluar = pengeluaranList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const sisaSaldo = totalMasuk - totalKeluar;

  return (
    <div className="min-h-screen bg-slate-100 bg-container flex flex-col font-sans selection:bg-rose-200 selection:text-rose-900">
      {/* Header with Islamic Emblem & Animated Running Text Address */}
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => {
          setShowWelcome(false);
          setIsLoginOpen(prev => !prev);
        }}
        isLoginOpen={isLoginOpen}
        online={isOnline}
        version={1}
        committeeSettings={committeeSettings}
        paymentSettings={paymentSettings}
        citizens={citizens}
        transferConfirmations={transferConfirmations}
        activePeriodLabel={activePeriodLabel}
        periodArchivesCount={periodArchives.length}
        onRefresh={fetchFullState}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-4">
        {isLoginOpen ? (
          /* Login Screen (Usser, Bendahara, Admin) opened via Header Login tab */
          <div className="py-2 sm:py-6">
            <LoginScreen 
              accounts={accounts}
              onLoginSuccess={handleLoginSuccess}
              onBackToWarga={() => setIsLoginOpen(false)}
            />
          </div>
        ) : showWelcome ? (
          /* Tampilan Awal (Halaman Sambutan) saat pertama kali masuk link */
          <WelcomeScreen
            activePeriodLabel={activePeriodLabel}
            committeeSettings={committeeSettings}
            currentUser={currentUser}
            visitorStats={visitorStats}
            onContinue={() => {
              setShowWelcome(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          /* Default Dasbor Warga or Authenticated Staff Dashboards */
          <div className="space-y-4">
            {/* Top User Status Bar */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg text-white font-bold ${
                  activeUser.role === 'admin'
                    ? 'bg-purple-700'
                    : activeUser.role === 'bendahara'
                    ? 'bg-amber-600'
                    : activeUser.role === 'warga'
                    ? 'bg-teal-700'
                    : 'bg-rose-700'
                }`}>
                  {activeUser.role === 'admin' ? (
                    <Shield className="w-4 h-4" />
                  ) : activeUser.role === 'bendahara' ? (
                    <Wallet className="w-4 h-4" />
                  ) : activeUser.role === 'warga' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <HeartHandshake className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {activeUser.name}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      activeUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : activeUser.role === 'bendahara'
                        ? 'bg-amber-100 text-amber-800'
                        : activeUser.role === 'warga'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {activeUser.role === 'admin' 
                        ? 'ADMINISTRATOR' 
                        : activeUser.role === 'bendahara' 
                        ? 'BENDAHARA' 
                        : activeUser.role === 'warga'
                        ? 'WARGA KP. KEDUNG SAPI'
                        : 'PETUGAS USSER'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>Aplikasi Iuran Isra Miraj Nabi Muhammad SAW <strong>{activePeriodLabel}</strong></span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                      <Archive className="w-2.5 h-2.5" />
                      {periodArchives.length} Arsip Periode
                    </span>
                  </p>
                </div>
              </div>

              {/* Online indicator, Manual Refresh & Logout */}
              <div className="flex items-center gap-2">
                {/* Real-time Online Sync Badge */}
                <div 
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isOnline 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                  title={isOnline ? 'Terhubung online real-time' : 'Koneksi terputus, mencoba menghubungkan kembali...'}
                >
                  {isOnline ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <Wifi className="w-3 h-3 text-rose-600" />
                      <span className="hidden sm:inline">Online Real-time</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-rose-500" />
                      <span className="hidden sm:inline">Offline</span>
                    </>
                  )}
                </div>

                {/* Button to return to Tampilan Awal (Welcome Screen) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcome(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-1.5 sm:px-2.5 sm:py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Lihat Tampilan Awal / Halaman Sambutan"
                >
                  <Home className="w-3.5 h-3.5 text-rose-700" />
                  <span className="hidden sm:inline">Tampilan Awal</span>
                </button>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={fetchFullState}
                  disabled={isSyncing}
                  className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Sinkronkan data terbaru"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                  <span className="hidden md:inline">Sinkron</span>
                </button>

                {/* Logout Button (Only when logged in as Usser, Bendahara, or Admin) */}
                {currentUser && currentUser.role !== 'warga' && (
                  <button
                    type="button"
                    id="btn-logout"
                    onClick={handleLogout}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Keluar & Kembali ke Dasbor Warga"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Render Dashboard based on Role */}
            {activeUser.role === 'admin' && (
              <DashboardAdmin
                currentUser={activeUser}
                citizens={citizens}
                wargaPayments={wargaPayments}
                sukarelaPayments={sukarelaPayments}
                pengeluaranList={pengeluaranList}
                accounts={accounts}
                targetPerPerson={targetPerPerson}
                auditLogs={auditLogs}
                committeeSettings={committeeSettings}
                paymentSettings={paymentSettings}
                transferConfirmations={transferConfirmations}
                proposalData={proposalData}
                activePeriodLabel={activePeriodLabel}
                periodArchives={periodArchives}
                visitorStats={visitorStats}
                onRefresh={fetchFullState}
              />
            )}

            {activeUser.role === 'bendahara' && (
              <DashboardBendahara
                currentUser={activeUser}
                citizens={citizens}
                wargaPayments={wargaPayments}
                sukarelaPayments={sukarelaPayments}
                pengeluaranList={pengeluaranList}
                totalDonasiWarga={totalDonasiWarga}
                totalDonasiSukaRela={totalDonasiSukaRela}
                targetPerPerson={targetPerPerson}
                committeeSettings={committeeSettings}
                paymentSettings={paymentSettings}
                transferConfirmations={transferConfirmations}
                proposalData={proposalData}
                activePeriodLabel={activePeriodLabel}
                periodArchives={periodArchives}
                onRefresh={fetchFullState}
              />
            )}

            {(activeUser.role === 'usser1' || activeUser.role === 'usser2' || activeUser.role === 'usser3') && (
              <DashboardUsser
                currentUser={activeUser}
                citizens={citizens}
                wargaPayments={wargaPayments}
                sukarelaPayments={sukarelaPayments}
                pengeluaranList={pengeluaranList}
                totalSukarela={totalDonasiSukaRela}
                totalKeluar={totalKeluar}
                targetPerPerson={targetPerPerson}
                committeeSettings={committeeSettings}
                proposalData={proposalData}
                activePeriodLabel={activePeriodLabel}
                periodArchives={periodArchives}
                onRefresh={fetchFullState}
              />
            )}

            {activeUser.role === 'warga' && (
              <DashboardWarga
                currentUser={activeUser}
                citizens={citizens}
                wargaPayments={wargaPayments}
                sukarelaPayments={sukarelaPayments}
                pengeluaranList={pengeluaranList}
                targetPerPerson={targetPerPerson}
                committeeSettings={committeeSettings}
                paymentSettings={paymentSettings}
                transferConfirmations={transferConfirmations}
                proposalData={proposalData}
                activePeriodLabel={activePeriodLabel}
                periodArchives={periodArchives}
                onRefresh={fetchFullState}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          {/* WhatsApp Group Invitation Banner */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-full text-xs font-semibold">
            <span>💬 Undangan Resmi Grup WhatsApp Warga & Panitia:</span>
            <a
              href={committeeSettings?.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4'}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
            >
              Gabung Grup WhatsApp Kp. Kedung Sapi
            </a>
          </div>

          <p className="font-semibold text-slate-700">
            PANITIA PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MIRAJ NABI MUHAMMAD SAW
          </p>
          <p className="text-[11px] text-slate-500">
            Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten
          </p>
          {/* Visitor Counter Transparency Badge */}
          {visitorStats && (
            <div className="flex items-center justify-center gap-2 pt-1 text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-rose-600" />
                <span>Total Akses Link: <strong className="text-slate-800 font-bold">{visitorStats.totalVisits.toLocaleString('id-ID')}</strong> kali</span>
                <span>·</span>
                <span>Hari Ini: <strong className="text-slate-800 font-bold">{visitorStats.todayVisits.toLocaleString('id-ID')}</strong></span>
                <span>·</span>
                <span>Perangkat Unik: <strong className="text-slate-800 font-bold">{visitorStats.uniqueVisitors.toLocaleString('id-ID')}</strong></span>
              </span>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-mono">
            Sistem Informasi Pengelolaan Iuran & Kas Panitia • Real-time Sync Online
          </p>
        </div>
      </footer>
    </div>
  );
}
