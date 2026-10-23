export type UserRole = 'admin' | 'bendahara' | 'usser1' | 'usser2' | 'usser3' | 'rt08' | 'rt09' | 'rt10' | 'warga';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  assignedRt?: string;
}

export interface Citizen {
  id: string;
  no?: number;
  name: string;
  rt?: string; // e.g. "08", "09", "10" or others
  isNgontrak?: boolean;
  weeks: { [weekNumber: number]: number }; // week 1 to 12
  excludedWeeks?: { [weekNumber: number]: boolean }; // true if week payment is excluded from total uang masuk
  totalPaid: number;
  totalExcluded?: number;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface DonasiWargaPayment {
  id: string;
  citizenId: string;
  citizenName: string;
  week: number;
  amount: number;
  excludedFromTotal?: boolean;
  timestamp: string;
  dateIso: string;
  recordedBy: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface DonasiSukarela {
  id: string;
  donorName: string;
  amount: number;
  week?: number;
  timestamp: string;
  dateIso: string;
  keterangan?: string;
  recordedBy: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface Pengeluaran {
  id: string;
  description: string;
  amount: number;
  timestamp: string;
  dateIso: string;
  recipient: string;
  recordedBy: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  category: 'DONASI WARGA' | 'DONASI SUKA RELA' | 'BENDAHARA' | 'REKAPITULASI' | 'TARGET' | 'AKUN' | 'PENGATURAN' | 'PEMBAYARAN' | 'PROPOSAL' | 'ARSIP PERIODE';
  action: 'TAMBAH' | 'EDIT' | 'HAPUS';
  accountName: string;
  details: string;
}

export interface ProposalRundownItem {
  id: string;
  waktu: string;
  kegiatan: string;
  pengisi: string;
  keterangan: string;
}

export interface ProposalBudgetItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: string;
  jumlah: number;
}

export interface ProposalSourceItem {
  id: string;
  sumber: string;
  uraian: string;
  estimasi: number;
}

export interface ProposalSigners {
  ketuaPanitia: string;
  wakilKetua: string;
  sekretaris: string;
  bendahara: string;
  ketuaRt: string;
  ketuaPemuda: string;
  tokohPenanggungJawab: string;
  kepalaDesa: string;
}

export interface ProposalSignerRoles {
  ketuaPanitia?: string;
  wakilKetua?: string;
  sekretaris?: string;
  bendahara?: string;
  ketuaRt?: string;
  ketuaPemuda?: string;
  tokohPenanggungJawab?: string;
  kepalaDesa?: string;
}

export interface ProposalData {
  kopBaris1?: string;
  kopBaris2?: string;
  kopAlamat?: string;
  kopSekretariat?: string;
  namaKegiatan?: string;
  nomorProposal: string;
  lampiran: string;
  perihal: string;
  kepadaYth: string;
  judulProposal: string;
  temaKegiatan: string;
  tanggalSurat: string;
  // Sampul Depan / Cover Proposal
  coverJudul?: string;
  coverSubjudul?: string;
  coverInstansi?: string;
  coverTahun?: string;
  coverWilayah?: string;
  // A. Kata Pengantar
  kataPengantar: string;
  // B. Maksud dan Tujuan
  maksudKegiatan: string;
  tujuanKegiatan: string[];
  // C. Bentuk Kegiatan
  bentukKegiatanDeskripsi: string;
  bentukKegiatanList: string[];
  // D. Waktu dan Tempat
  hariTanggal: string;
  waktuPelaksanaan: string;
  tempatPelaksanaan: string;
  penceramah: string;
  qori: string;
  // E. Susunan Acara & Rundown Acara
  rundownAcara: ProposalRundownItem[];
  // F. Anggaran Dana
  anggaranDana: ProposalBudgetItem[];
  // G. Sumber Dana
  sumberDanaDeskripsi: string;
  sumberDanaList: ProposalSourceItem[];
  // H. Susunan Panitia (Editable inside Proposal)
  pelindung?: string;
  penasehat?: string;
  penanggungJawab?: string;
  adminSistem?: string;
  sections?: CommitteeSection[];
  // I. Penutup
  penutup: string;
  // Tanda Tangan / Pengesahan (8 Penandatangan)
  signers: ProposalSigners;
  signerRoles?: ProposalSignerRoles;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface CommitteeSection {
  name: string;
  coordinator: string;
  members: string[];
}

export interface CommitteeSettings {
  namaKegiatan: string;
  wilayah: string;
  ketuaPanitia: string;
  wakilKetua: string;
  sekretaris: string;
  adminSistem: string;
  bendahara: string;
  waGroupLink: string;
  nomorWa?: string;
  targetPerPerson: number;
  pelindung?: string[];
  penasehat?: string[];
  penanggungJawab?: string[];
  sections?: CommitteeSection[];
  welcomeGreetingId?: string;
  welcomeSalam?: string;
  welcomeHeadline?: string;
  welcomeBody?: string;
  welcomeClosing?: string;
  activeWeek?: number;
  week1StartDate?: string; // YYYY-MM-DD start of Minggu ke-1
  autoRotateWeekly?: boolean; // Automatically advance week every 7 days
  adminNote?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  catatan?: string;
}

export interface EWalletAccount {
  id: string;
  walletName: string; // e.g. DANA, GoPay, OVO, ShopeePay
  accountNumber: string;
  accountHolder: string;
  catatan?: string;
}

export interface QrisConfig {
  qrisName: string;
  qrisNmid?: string;
  qrisImageUrl?: string; // Base64 data URL or external image URL
  qrisPayloadString?: string; // QR code text payload or dynamic string
  instructions?: string;
}

export interface PaymentSettings {
  bankAccounts: BankAccount[];
  eWallets: EWalletAccount[];
  qris: QrisConfig;
}

export interface TransferConfirmation {
  id: string;
  tanggal: string; // YYYY-MM-DD
  timestamp: number;
  citizenId?: string;
  citizenName: string;
  tipePembayaran: 'iuran_pekanan' | 'donasi_sukarela';
  mingguKe?: number[]; // list of week numbers paid, e.g. [1] or [1, 2]
  metode: 'bank_transfer' | 'ewallet' | 'qris';
  tujuanNama: string;
  pengirimNama: string;
  pengirimBankAtauWallet?: string;
  nomorWa?: string; // Nomor WhatsApp aktif pengirim
  nominal: number;
  buktiUrl?: string; // Base64 image
  catatan?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectReason?: string;
}

export interface PeriodArchiveSummary {
  totalCitizens: number;
  wargaUtamaCount: number;
  targetPerPerson: number;
  totalTargetWarga: number;
  totalWargaPaid: number;
  totalSukarela: number;
  totalMasuk: number;
  totalKeluar: number;
  sisaSaldo: number;
  wargaLunasCount: number;
  sukarelaCount: number;
  pengeluaranCount: number;
  ketuaPanitia: string;
  wakilKetua: string;
  sekretaris: string;
  bendahara: string;
}

export interface PeriodArchiveSnapshot {
  citizens: Citizen[];
  wargaPayments: DonasiWargaPayment[];
  sukarelaPayments: DonasiSukarela[];
  pengeluaranList: Pengeluaran[];
  targetPerPerson: number;
  committeeSettings?: CommitteeSettings;
  proposalData?: ProposalData;
}

export interface PeriodArchive {
  id: string;
  periodLabel: string; // e.g., "1448 H / 2027 M"
  hijriYear: string;   // e.g., "1448 H"
  masehiYear: string;  // e.g., "2027 M"
  namaKegiatan: string;
  archivedAt: string;
  archivedBy: string;
  catatan?: string;
  summary: PeriodArchiveSummary;
  snapshot: PeriodArchiveSnapshot;
}

export interface VisitorLog {
  id: string;
  timestamp: string;
  formattedTime: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  pageVisited: string;
  roleViewed?: string;
  userAgent?: string;
}

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  weekVisits: number;
  lastVisitedAt: string;
  recentVisits: VisitorLog[];
  dailyCounts?: Record<string, number>;
  uniqueVisitorIds?: string[];
}

export interface AppState {
  version: number;
  activePeriodLabel?: string;
  periodArchives?: PeriodArchive[];
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
  visitorStats?: VisitorStats;
}

