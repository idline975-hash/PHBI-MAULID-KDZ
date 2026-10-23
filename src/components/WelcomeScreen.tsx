import { ArrowRight, Calendar, MapPin, Eye } from 'lucide-react';
import { CommitteeSettings, UserAccount, VisitorStats } from '../types';

export interface WelcomeGreetingOption {
  id: string;
  label: string;
  category: string;
  salam: string;
  headline: string;
  body: string;
  closing: string;
}

export const WELCOME_GREETING_OPTIONS: WelcomeGreetingOption[] = [
  {
    id: 'islami-berkah',
    label: '1. Islami & Penuh Berkah',
    category: 'Rekomendasi Utama',
    salam: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    headline: 'Selamat Datang di Portal Resmi Iuran & Kas PHBI Isra Mi’raj Nabi Muhammad SAW',
    body: 'Marhaban yaa Dhiyafurrahman. Terima kasih atas kehadiran dan partisipasi Bapak, Ibu, serta Saudara/i warga Kp. Kedung Sapi. Melalui aplikasi ini, mari bersama-sama kita sukseskan syiar Peringatan Hari Besar Islam (PHBI) Isra Mi’raj Nabi Muhammad SAW dengan semangat kebersamaan, keterbukaan, dan keikhlasan. Semoga setiap rupiah yang kita infakkan menjadi amal jariyah yang melipatgandakan keberkahan bagi keluarga dan lingkungan kita.',
    closing: 'Wassalamu’alaikum Warahmatullahi Wabarakatuh'
  },
  {
    id: 'transparan-amanah',
    label: '2. Transparan & Amanah',
    category: 'Fokus Keterbukaan Kas',
    salam: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    headline: 'Selamat Datang di Sistem Informasi Transparansi Kas & Iuran Warga Kp. Kedung Sapi',
    body: 'Kami menyambut hangat seluruh warga Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten. Aplikasi ini dihadirkan oleh Panitia PHBI sebagai wujud komitmen amanah dan keterbukaan informasi keuangan. Di halaman berikutnya, seluruh warga dapat memantau secara langsung (real-time) perkembangan saldo kas, capaian target iuran, donasi sukarela, hingga rincian penggunaan dana kegiatan.',
    closing: 'Amanah dalam Pengelolaan • Terbuka untuk Seluruh Warga'
  },
  {
    id: 'gotong-royong',
    label: '3. Kekeluargaan & Gotong Royong',
    category: 'Semangat Warga',
    salam: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    headline: 'Ahlan wa Sahlan, Keluarga Besar Warga Kp. Kedung Sapi',
    body: 'Selamat datang di pusat informasi kegiatan peringatan Isra Mi’raj Nabi Muhammad SAW. Acara kita adalah dari warga, oleh warga, dan untuk keberkahan seluruh warga. Mari kita jaga kekompakan dan gotong royong lingkungan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten dengan mendukung jalannya kegiatan keagamaan ini. Dukungan dan doa restu dari Bapak/Ibu sekalian adalah kunci kesuksesan acara kita bersama.',
    closing: 'Salam Hangat & Ukhuwah — Panitia PHBI Kp. Kedung Sapi'
  },
  {
    id: 'singkat-modern',
    label: '4. Singkat, Padat & Jelas',
    category: 'Gaya Ringkas',
    salam: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    headline: 'Selamat Datang di Portal Digital PHBI Isra Mi’raj Kp. Kedung Sapi',
    body: 'Selamat datang di layanan informasi kas dan iuran warga Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten. Silakan tekan tombol navigasi di bawah untuk melihat ringkasan saldo kas terkini, rincian pemasukan, pengeluaran kepanitiaan, serta layanan konfirmasi pembayaran online.',
    closing: 'Terima kasih atas partisipasi dan dukungan seluruh warga.'
  },
  {
    id: 'resmi-panitia',
    label: '5. Sambutan Resmi Panitia',
    category: 'Formal Kepanitiaan',
    salam: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    headline: 'Sambutan Panitia Pelaksana PHBI Isra Mi’raj Nabi Muhammad SAW',
    body: 'Puji syukur ke hadirat Allah SWT serta shalawat dan salam semoga senantiasa tercurah kepada Baginda Nabi Muhammad SAW. Atas nama Panitia Pelaksana PHBI Kp. Kedung Sapi, kami mengucapkan selamat datang dan terima kasih yang sebesar-besarnya kepada seluruh warga dan donatur atas kepercayaan serta kontribusinya dalam mendukung terselenggaranya peringatan Isra Mi’raj tahun ini.',
    closing: 'Hormat Kami, Panitia Pelaksana PHBI Isra Mi’raj Kp. Kedung Sapi'
  }
];

interface WelcomeScreenProps {
  activePeriodLabel: string;
  committeeSettings?: CommitteeSettings;
  currentUser: UserAccount | null;
  visitorStats?: VisitorStats;
  onContinue: () => void;
}

export default function WelcomeScreen({
  activePeriodLabel,
  committeeSettings,
  currentUser,
  visitorStats,
  onContinue
}: WelcomeScreenProps) {
  const preset =
    WELCOME_GREETING_OPTIONS.find((item) => item.id === committeeSettings?.welcomeGreetingId) ||
    WELCOME_GREETING_OPTIONS[0];

  const salam = committeeSettings?.welcomeSalam || preset.salam;
  const headline = committeeSettings?.welcomeHeadline || preset.headline;
  const body = committeeSettings?.welcomeBody || preset.body;
  const closing = committeeSettings?.welcomeClosing || preset.closing;

  const namaKegiatan =
    committeeSettings?.namaKegiatan ||
    'PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MIRAJ NABI MUHAMMAD SAW';
  const wilayah =
    committeeSettings?.wilayah ||
    'Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten';

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-8">
      {/* Hanya Bagian Portal Resmi PHBI */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white shadow-xl border border-emerald-800/80">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-8">
          {/* Top Metadata Line */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-800/80 pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-200/90 font-medium">
              <span className="text-amber-300 font-semibold">Portal Resmi PHBI</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>Periode {activePeriodLabel}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span>Kp. Kedung Sapi</span>
              </span>
            </div>

            {visitorStats && visitorStats.totalVisits > 0 && (
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs text-emerald-200 font-medium shadow-xs"
                title={`Total ${visitorStats.totalVisits} kali link diakses oleh warga`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>{visitorStats.totalVisits.toLocaleString('id-ID')} Kali Diakses</span>
                {visitorStats.todayVisits > 0 && (
                  <span className="text-emerald-300 text-[11px]">({visitorStats.todayVisits} hari ini)</span>
                )}
              </div>
            )}
          </div>

          {/* Brand Logo & Arabic Calligraphy Opening */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">

            <div className="space-y-1">
              <p className="text-amber-300 font-serif text-xl sm:text-2xl tracking-wide">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
              <p className="text-emerald-200 text-xs sm:text-sm font-semibold italic">
                {salam}
              </p>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">

            <h1
              className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {headline}
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-emerald-200/95 tracking-wide">
              {namaKegiatan} — {wilayah}
            </p>
          </div>

          {/* Main Welcome Message Body */}
          <div className="bg-emerald-950/50 border border-emerald-800/80 rounded-xl p-5 sm:p-6 space-y-3 max-w-4xl">
            <p className="text-sm sm:text-base text-emerald-50/95 leading-relaxed">
              {body}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-amber-300 pt-1">
              {closing}
            </p>
          </div>

          {/* Primary Navigation CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-emerald-800/80">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                id="btn-continue-to-dashboard"
                onClick={onContinue}
                className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all border-2 border-amber-600 flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>
                  {currentUser && currentUser.role !== 'warga'
                    ? `Lanjutkan ke Dashboard ${currentUser.name}`
                    : 'Lanjutkan ke Halaman Berikutnya'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>

              </div>

            <p className="text-xs text-emerald-200/90 text-center sm:text-right">
              Klik tombol untuk masuk ke dasbor transparansi kas.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
