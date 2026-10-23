import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import type { 
  AppState, 
  Citizen, 
  DonasiWargaPayment, 
  DonasiSukarela, 
  Pengeluaran, 
  UserAccount, 
  AuditLog, 
  CommitteeSettings, 
  CommitteeSection,
  PaymentSettings,
  TransferConfirmation,
  ProposalData,
  PeriodArchive,
  VisitorLog,
  VisitorStats
} from './src/types.ts';
import { createInitialCitizens } from './src/data/initialCitizens.ts';
import { getDefaultProposalData } from './src/data/defaultProposal.ts';
import {
  DEFAULT_WEEK1_START_DATE,
  getWeeklyScheduleInfo,
  computeWeek1StartDateForTargetWeek,
  getJakartaDateIso
} from './src/utils/weeklySchedule.ts';

import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

process.on('uncaughtException', (err) => {
  console.error('[Process UncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process UnhandledRejection]', reason);
});

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Initialize Google Gemini AI for smart voice recognition parsing
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.warn('Gagal inisialisasi Gemini AI:', err);
  }
}

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Enable CORS so a separate external input link/app can send and sync iuran data to this server in real-time
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'isra_miraj_db.json');

// Initialize Firebase Firestore for persistent cloud data
let firestoreDb: Firestore | null = null;
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fbApp = initializeApp(fbConfig);
    firestoreDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId);
    console.log('[Firebase] Firestore initialized successfully with database:', fbConfig.firestoreDatabaseId);
  } catch (err) {
    console.error('[Firebase] Error initializing Firestore:', err);
  }
}

export const defaultCommitteeSections: CommitteeSection[] = [];

export const defaultCommitteeSettings: CommitteeSettings = {
  namaKegiatan: 'Peringatan Hari Besar Islam (PHBI) Isra Miraj Nabi Muhammad SAW 1448 H / 2027 M',
  wilayah: 'Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten',
  ketuaPanitia: '',
  wakilKetua: '',
  sekretaris: '',
  adminSistem: '',
  bendahara: '',
  waGroupLink: 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4',
  nomorWa: '081414033436',
  targetPerPerson: 250000,
  pelindung: [],
  penasehat: [],
  penanggungJawab: [],
  sections: [],
  activeWeek: 1,
  week1StartDate: DEFAULT_WEEK1_START_DATE,
  autoRotateWeekly: true,
  adminNote: ''
};

export const defaultPaymentSettings: PaymentSettings = {
  bankAccounts: [
    {
      id: 'bank-bri-1',
      bankName: 'Bank BRI',
      accountNumber: '0123-01-045678-50-9',
      accountHolder: 'Alwi (Bendahara PHBI)',
      catatan: 'Dapat transfer dari ATM BRI, BRImo, atau transfer Antar-Bank (Kode: 002)'
    },
    {
      id: 'bank-bca-1',
      bankName: 'Bank BCA',
      accountNumber: '7890-1234-56',
      accountHolder: 'Alwi',
      catatan: 'Transfer via BCA Mobile, KlikBCA, atau ATM BCA (Kode: 014)'
    },
    {
      id: 'bank-bsi-1',
      bankName: 'Bank BSI',
      accountNumber: '719-8765-432',
      accountHolder: 'Panitia Isra Miraj Kp Kedung Sapi',
      catatan: 'Bank Syariah Indonesia (Kode: 451) / Rekening Panitia'
    }
  ],
  eWallets: [
    {
      id: 'ewallet-dana-1',
      walletName: 'DANA',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Bendahara / PHBI Kedung Sapi',
      catatan: 'Transfer saldo via aplikasi DANA (Bebas biaya admin)'
    },
    {
      id: 'ewallet-gopay-1',
      walletName: 'GoPay',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Alwi (Bendahara)',
      catatan: 'Transfer via Gojek / GoPay ke nomor HP'
    },
    {
      id: 'ewallet-ovo-1',
      walletName: 'OVO',
      accountNumber: '0857-1234-5678',
      accountHolder: 'Alwi',
      catatan: 'Transfer antar akun OVO'
    }
  ],
  qris: {
    qrisName: 'PHBI ISRA MI\'RAJ KP BARANI',
    qrisNmid: 'ID1024356789012',
    qrisImageUrl: '',
    qrisPayloadString: '00020101021126590014ID.GO.QRIS.WWW01189360099900000000000209ID10243567890120303UMI51440014ID.CO.QRIS.WWW02150000000000000000303UMI5204541153033605802ID5927PHBI ISRA MIRAJ KP BARANI6007SERANG61054217762070703A0163041A2B',
    instructions: 'Scan QRIS ini menggunakan m-Banking (BCA, BRImo, Livin Mandiri, BSI, BNI, Jago, dll) atau E-Wallet (DANA, GoPay, OVO, ShopeePay, LinkAja).'
  }
};

// Helper to get formatted realtime timestamp in Indonesian (Real-Time WIB / Asia/Jakarta)
export function getIndonesianDateTime(dateObj?: Date): string {
  const d = dateObj || new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(d);
  let weekday = '';
  let day = '';
  let month = '';
  let year = '';
  let hour = '';
  let minute = '';
  let second = '';

  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
    else if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
    else if (part.type === 'second') second = part.value;
  }
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  return `${cap(weekday)}, ${day} ${cap(month)} ${year} ${hour}:${minute}:${second} WIB`;
}

// Initial DB state generator
function getInitialDbState(): AppState {
  const citizens = createInitialCitizens();
  const accounts: UserAccount[] = [
    {
      id: 'acc-admin',
      username: 'riyan',
      password: '123456',
      name: 'Riyan (Admin PHBI)',
      role: 'admin',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-bendahara',
      username: 'bendahara',
      password: '123456',
      name: 'Alwi (Bendahara PHBI)',
      role: 'bendahara',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt08',
      username: 'rt08',
      password: '123456',
      name: 'Petugas RT 08',
      role: 'usser1',
      assignedRt: '08',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt09',
      username: 'rt09',
      password: '123456',
      name: 'Petugas RT 09',
      role: 'usser2',
      assignedRt: '09',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt10',
      username: 'rt10',
      password: '123456',
      name: 'Petugas RT 10',
      role: 'usser3',
      assignedRt: '10',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-warga',
      username: 'warga',
      password: '123',
      name: 'Warga Kp Kedung Sapi',
      role: 'warga',
      createdAt: getIndonesianDateTime()
    }
  ];

  return {
    version: 1,
    activePeriodLabel: '1448 H / 2027 M',
    periodArchives: [],
    citizens,
    wargaPayments: [],
    sukarelaPayments: [],
    pengeluaranList: [],
    accounts,
    targetPerPerson: 250000, // Default target Rp 250.000 per person
    committeeSettings: { ...defaultCommitteeSettings },
    paymentSettings: { ...defaultPaymentSettings },
    transferConfirmations: [],
    proposalData: getDefaultProposalData(defaultCommitteeSettings, 250000, 132),
    auditLogs: [
      {
        id: 'log-init',
        timestamp: getIndonesianDateTime(),
        category: 'REKAPITULASI',
        action: 'TAMBAH',
        accountName: 'Sistem',
        details: 'Inisialisasi sistem panitia Isra Miraj Kp Kedung Sapi.'
      }
    ]
  };
}

function ensureDefaultAccountsExist(state: AppState): boolean {
  if (!Array.isArray(state.accounts)) {
    state.accounts = [];
  }

  const defaultAccounts: UserAccount[] = [
    {
      id: 'acc-admin',
      username: 'riyan',
      password: '123456',
      name: 'Riyan (Admin PHBI)',
      role: 'admin',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-bendahara',
      username: 'bendahara',
      password: '123456',
      name: 'Alwi (Bendahara PHBI)',
      role: 'bendahara',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt08',
      username: 'rt08',
      password: '123456',
      name: 'Petugas RT 08',
      role: 'usser1',
      assignedRt: '08',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt09',
      username: 'rt09',
      password: '123456',
      name: 'Petugas RT 09',
      role: 'usser2',
      assignedRt: '09',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-rt10',
      username: 'rt10',
      password: '123456',
      name: 'Petugas RT 10',
      role: 'usser3',
      assignedRt: '10',
      createdAt: getIndonesianDateTime()
    },
    {
      id: 'acc-warga',
      username: 'warga',
      password: '123',
      name: 'Warga Kp Kedung Sapi',
      role: 'warga',
      createdAt: getIndonesianDateTime()
    }
  ];

  let changed = false;
  for (const defAcc of defaultAccounts) {
    const existingIdx = state.accounts.findIndex(
      a => a.id === defAcc.id || a.username.toLowerCase() === defAcc.username.toLowerCase()
    );
    if (existingIdx === -1) {
      state.accounts.push(defAcc);
      changed = true;
    } else {
      const existing = state.accounts[existingIdx];
      if (!existing.password) {
        existing.password = defAcc.password;
        changed = true;
      }
      if (!existing.assignedRt && defAcc.assignedRt) {
        existing.assignedRt = defAcc.assignedRt;
        changed = true;
      }
    }
  }

  return changed;
}

// Helper to migrate any legacy 1447 H / 2026 M text in state to 1448 H / 2027 M
function replaceYearString(val: string | undefined): string {
  if (!val || typeof val !== 'string') return val || '';
  return val
    .replace(/1447\s*H\s*\/\s*2026\s*M/gi, '1448 H / 2027 M')
    .replace(/1447\s*H/gi, '1448 H / 2027 M')
    .replace(/1448\s*H\s*\/\s*2027\s*M\s*\/\s*2027\s*M/gi, '1448 H / 2027 M')
    .replace(/\/I\/2026/g, '/I/2027')
    .replace(/Januari\s+2026/gi, 'Januari 2027')
    .replace(/Tahun\s+2026/gi, 'Tahun 2027')
    .replace(/2026\s*M/gi, '2027 M');
}

export function replaceAddressString(val: string | undefined): string {
  if (!val || typeof val !== 'string') return val || '';
  return val
    .replace(/Kp\.?\s*Barani\s*RT\s*011\s*\/?\s*RW\s*04\s*Desa\s*Sangiang[,\s]*Kec(?:amatan)?\.?\s*Pamarayan(?:[,\s–-]*Kab(?:upaten)?\.?\s*Serang)?(?:[,\s–-]*Banten)?/gi, 'Kp Kedung Sapi Desa Kp Baru Kec Pamarayan Serang-BANTEN')
    .replace(/KP\.?\s*BARANI\s*RT\s*011\s*\/?\s*RW\s*04\s*DESA\s*SANGIANG[,\s]*KEC(?:AMATAN)?\.?\s*PAMARAYAN(?:[,\s–-]*KAB(?:UPATEN)?\.?\s*SERANG)?(?:[,\s–-]*BANTEN)?/gi, 'KP KEDUNG SAPI DESA KP BARU KEC PAMARAYAN SERANG-BANTEN')
    .replace(/Kp\.?\s*Barani\s*RT\s*011\s*\/?\s*RW\s*04/gi, 'Kp. Kedung Sapi')
    .replace(/KP\.?\s*BARANI\s*RT\s*011\s*\/?\s*RW\s*04/gi, 'KP. KEDUNG SAPI')
    .replace(/Kp\.?\s*Barani/gi, 'Kp. Kedung Sapi')
    .replace(/KP\.?\s*BARANI/gi, 'KP. KEDUNG SAPI')
    .replace(/Desa\s*Sangiang/gi, 'Desa Kp Baru')
    .replace(/DESA\s*SANGIANG/gi, 'DESA KP BARU')
    .replace(/RT\s*011\s*\/?\s*RW\s*04/gi, '');
}

export function cleanupCommitteeStructureAndAddress(state: AppState): boolean {
  let changed = false;

  // 1. Committee Settings
  if (state.committeeSettings) {
    const cs = state.committeeSettings;
    const targetWilayah = 'Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten';
    if (cs.wilayah !== targetWilayah) {
      cs.wilayah = targetWilayah;
      changed = true;
    }

    if (cs.pelindung && cs.pelindung.some((p: string) => p.includes('Sugeng'))) {
      cs.pelindung = [];
      changed = true;
    }
    if (cs.penasehat && cs.penasehat.some((p: string) => p.includes('Marta') || p.includes('Apipi'))) {
      cs.penasehat = [];
      changed = true;
    }
    if (cs.penanggungJawab && cs.penanggungJawab.some((p: string) => p.includes('Salaman') || p.includes('Suadi'))) {
      cs.penanggungJawab = [];
      changed = true;
    }
  }

  // 2. Proposal Data
  if (state.proposalData) {
    const p = state.proposalData;
    p.coverWilayah = 'KP KEDUNG SAPI DESA KP BARU KEC PAMARAYAN SERANG-BANTEN';
    p.kopAlamat = 'Lingkungan Kp Kedung Sapi Desa Kp Baru Kec Pamarayan Serang-BANTEN';

    const strKeys: (keyof ProposalData)[] = [
      'kopBaris1', 'kopBaris2', 'kopAlamat', 'kopSekretariat', 'nomorProposal',
      'perihal', 'kepadaYth', 'judulProposal', 'temaKegiatan', 'tanggalSurat',
      'coverJudul', 'coverSubjudul', 'coverInstansi', 'coverWilayah', 'kataPengantar',
      'maksudKegiatan', 'bentukKegiatanDeskripsi', 'tempatPelaksanaan', 'sumberDanaDeskripsi',
      'penutup'
    ];
    for (const k of strKeys) {
      const val = p[k];
      if (typeof val === 'string') {
        const nextVal = replaceAddressString(val);
        if (nextVal !== val) {
          (p as any)[k] = nextVal;
          changed = true;
        }
      }
    }
    if (Array.isArray(p.tujuanKegiatan)) {
      p.tujuanKegiatan = p.tujuanKegiatan.map(item => replaceAddressString(item));
    }
    if (Array.isArray(p.bentukKegiatanList)) {
      p.bentukKegiatanList = p.bentukKegiatanList.map(item => replaceAddressString(item));
    }
    if (Array.isArray(p.rundownAcara)) {
      p.rundownAcara.forEach(rd => {
        rd.kegiatan = replaceAddressString(rd.kegiatan);
        rd.pengisi = replaceAddressString(rd.pengisi);
      });
    }
    if (Array.isArray(p.sumberDanaList)) {
      p.sumberDanaList.forEach(sd => {
        sd.sumber = replaceAddressString(sd.sumber);
        sd.uraian = replaceAddressString(sd.uraian);
      });
    }

    if (p.signers) {
      const s = p.signers;
      if (s.kepalaDesa && s.kepalaDesa.includes('Sugeng')) { s.kepalaDesa = ''; changed = true; }
      if (s.tokohPenanggungJawab && (s.tokohPenanggungJawab.includes('Marta') || s.tokohPenanggungJawab.includes('Apipi'))) { s.tokohPenanggungJawab = ''; changed = true; }
      if (s.ketuaRt && s.ketuaRt.includes('Salaman')) { s.ketuaRt = ''; changed = true; }
      if (s.ketuaPemuda && (s.ketuaPemuda.includes('Suadi') || s.ketuaPemuda.includes('Barani'))) { s.ketuaPemuda = ''; changed = true; }
    }
    if (p.sections && p.sections.some((s: any) => s.coordinator === 'Imat' || s.coordinator === 'Feby')) {
      p.sections = [];
      changed = true;
    }
    if (p.pelindung && p.pelindung.includes('Sugeng')) { p.pelindung = ''; changed = true; }
    if (p.penasehat && (p.penasehat.includes('Marta') || p.penasehat.includes('Apipi'))) { p.penasehat = ''; changed = true; }
    if (p.penanggungJawab && (p.penanggungJawab.includes('Salaman') || p.penanggungJawab.includes('Suadi'))) { p.penanggungJawab = ''; changed = true; }
  }

  // 3. User Accounts
  if (Array.isArray(state.accounts)) {
    state.accounts.forEach(acc => {
      if (acc.name && acc.name.includes('Barani')) {
        acc.name = acc.name.replace(/Barani/gi, 'Kedung Sapi');
        changed = true;
      }
    });
  }

  // 4. Payment Settings
  if (state.paymentSettings && Array.isArray(state.paymentSettings.bankAccounts)) {
    state.paymentSettings.bankAccounts.forEach(b => {
      if (b.accountHolder && b.accountHolder.includes('Barani')) {
        b.accountHolder = b.accountHolder.replace(/Barani/gi, 'Kedung Sapi');
        changed = true;
      }
    });
  }
  if (state.paymentSettings && Array.isArray(state.paymentSettings.eWallets)) {
    state.paymentSettings.eWallets.forEach(w => {
      if (w.accountHolder && w.accountHolder.includes('Barani')) {
        w.accountHolder = w.accountHolder.replace(/Barani/gi, 'Kedung Sapi');
        changed = true;
      }
    });
  }

  return changed;
}

function migrateStateTo1448H(state: AppState): boolean {
  let changed = false;
  if (state.committeeSettings && state.committeeSettings.namaKegiatan) {
    const nextNama = replaceYearString(state.committeeSettings.namaKegiatan);
    if (nextNama !== state.committeeSettings.namaKegiatan) {
      state.committeeSettings.namaKegiatan = nextNama;
      changed = true;
    }
  }
  if (state.proposalData) {
    const p = state.proposalData;
    const strKeys: (keyof ProposalData)[] = [
      'kopBaris1',
      'kopBaris2',
      'kopAlamat',
      'kopSekretariat',
      'nomorProposal',
      'perihal',
      'judulProposal',
      'temaKegiatan',
      'tanggalSurat',
      'kataPengantar',
      'maksudKegiatan',
      'tujuanKegiatan',
      'bentukKegiatanDeskripsi',
      'namaKegiatan',
      'hariTanggal',
      'waktuPelaksanaan',
      'tempatPelaksanaan',
      'sumberDanaDeskripsi',
      'penutup'
    ];
    for (const k of strKeys) {
      const val = p[k];
      if (typeof val === 'string') {
        const nextVal = replaceYearString(val);
        if (nextVal !== val) {
          (p as any)[k] = nextVal;
          changed = true;
        }
      }
    }
    if (Array.isArray(p.tujuanKegiatan)) {
      const nextTujuan = p.tujuanKegiatan.map(item => replaceYearString(item));
      if (JSON.stringify(nextTujuan) !== JSON.stringify(p.tujuanKegiatan)) {
        p.tujuanKegiatan = nextTujuan;
        changed = true;
      }
    }
    if (Array.isArray(p.bentukKegiatanList)) {
      const nextList = p.bentukKegiatanList.map(item => replaceYearString(item));
      if (JSON.stringify(nextList) !== JSON.stringify(p.bentukKegiatanList)) {
        p.bentukKegiatanList = nextList;
        changed = true;
      }
    }
    if (Array.isArray(p.rundownAcara)) {
      p.rundownAcara.forEach(rd => {
        const nextKeg = replaceYearString(rd.kegiatan);
        if (nextKeg !== rd.kegiatan) {
          rd.kegiatan = nextKeg;
          changed = true;
        }
      });
    }
    if (Array.isArray(p.sumberDanaList)) {
      p.sumberDanaList.forEach(sd => {
        const nextUr = replaceYearString(sd.uraian);
        if (nextUr !== sd.uraian) {
          sd.uraian = nextUr;
          changed = true;
        }
      });
    }
  }
  return changed;
}

// Load DB from file or init
function loadDb(): AppState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure targetPerPerson and versions are present, update 100000 to 250000
      if (!parsed.targetPerPerson || parsed.targetPerPerson === 100000) {
        parsed.targetPerPerson = 250000;
        saveDb(parsed);
      }
      if (!parsed.paymentSettings) {
        parsed.paymentSettings = { ...defaultPaymentSettings };
        saveDb(parsed);
      }
      if (!parsed.transferConfirmations) {
        parsed.transferConfirmations = [];
        saveDb(parsed);
      }
      if (!parsed.committeeSettings) {
        parsed.committeeSettings = { ...defaultCommitteeSettings, targetPerPerson: parsed.targetPerPerson || 250000 };
      }
      if (!parsed.auditLogs) parsed.auditLogs = [];
      if (!parsed.proposalData) {
        parsed.proposalData = getDefaultProposalData(parsed.committeeSettings, parsed.targetPerPerson || 250000, 132);
      }
      if (!parsed.activePeriodLabel) {
        parsed.activePeriodLabel = '1448 H / 2027 M';
      }

      let stateNeedsSave = false;
      if (migrateStateTo1448H(parsed)) stateNeedsSave = true;
      if (cleanupCommitteeStructureAndAddress(parsed)) stateNeedsSave = true;

      const sched = getWeeklyScheduleInfo(parsed.committeeSettings);
      if (parsed.committeeSettings.activeWeek !== sched.activeWeek) {
        parsed.committeeSettings.activeWeek = sched.activeWeek;
        stateNeedsSave = true;
      }
      if (stateNeedsSave) {
        parsed.version = (parsed.version || 1) + 1;
        saveDb(parsed);
      }
      if (!Array.isArray(parsed.periodArchives)) {
        parsed.periodArchives = [];
      }
      if (!Array.isArray(parsed.citizens)) {
        parsed.citizens = [];
      }
      // Ensure all default officer & citizen accounts exist
      let accsChanged = ensureDefaultAccountsExist(parsed);
      if (accsChanged) {
        saveDb(parsed);
      }
      // Normalize, deduplicate, sort A-Z, and renumber citizens
      normalizeAndSortCitizens(parsed);


      return parsed;
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }
  const initialState = getInitialDbState();
  initialState.targetPerPerson = 250000;
  normalizeAndSortCitizens(initialState);
  saveDb(initialState);
  return initialState;
}

export function normalizeAndSortCitizens(state: AppState) {
  if (!state || !Array.isArray(state.citizens)) return;

  const byNameMap = new Map<string, Citizen>();
  const usedIds = new Set<string>();

  for (const raw of state.citizens) {
    if (!raw) continue;
    const cleanName = String(raw.name || '').trim().replace(/\s+/g, ' ');
    if (!cleanName) continue;

    const key = cleanName.toLowerCase();
    const weeks: { [w: number]: number } = {};
    const excludedWeeks: { [w: number]: boolean } = {};
    for (let w = 1; w <= 12; w++) {
      weeks[w] = Number(raw.weeks?.[w]) || 0;
      excludedWeeks[w] = weeks[w] > 0 ? Boolean(raw.excludedWeeks?.[w]) : false;
    }

    const rt = raw.rt || '00';
    if (['08', '09', '10'].includes(rt)) continue; // Strictly ignore RT 08, 09, 10 identitas

    const existing = byNameMap.get(key);
    if (existing) {
      if (!existing.excludedWeeks) existing.excludedWeeks = {};
      // Merge weeks so no payment is ever lost when deduplicating
      for (let w = 1; w <= 12; w++) {
        existing.weeks[w] = Math.max(Number(existing.weeks[w]) || 0, weeks[w]);
        if (excludedWeeks[w] && existing.weeks[w] > 0) {
          existing.excludedWeeks[w] = true;
        }
      }
      if (raw.rt) existing.rt = raw.rt;
      if (raw.isNgontrak !== undefined) existing.isNgontrak = raw.isNgontrak;
      // Repoint any payments referencing duplicate citizen's id to existing.id
      if (Array.isArray(state.wargaPayments) && raw.id && raw.id !== existing.id) {
        state.wargaPayments.forEach(p => {
          if (p.citizenId === raw.id) {
            p.citizenId = existing.id;
            p.citizenName = existing.name;
          }
        });
      }
    } else {
      let cid = String(raw.id || '').trim();
      if (!cid || usedIds.has(cid)) {
        cid = 'citizen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      }
      usedIds.add(cid);

      const citizenObj: Citizen = {
        ...raw,
        id: cid,
        name: cleanName,
        rt,
        isNgontrak: Boolean(raw.isNgontrak),
        weeks,
        excludedWeeks,
        totalPaid: 0,
        totalExcluded: 0
      };
      byNameMap.set(key, citizenObj);
    }
  }

  const deduped = Array.from(byNameMap.values());
  deduped.sort((a, b) =>
    a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true })
  );

  let no = 1;
  for (const c of deduped) {
    c.no = no++;
  }

  state.citizens = deduped;

  // Ensure wargaPayments citizenId, citizenName, and excludedFromTotal stay aligned with citizens
  if (Array.isArray(state.wargaPayments)) {
    state.wargaPayments.forEach(p => {
      const cleanPayName = String(p.citizenName || '').trim().replace(/\s+/g, ' ');
      const byName = state.citizens.find(c => c.name.toLowerCase() === cleanPayName.toLowerCase());
      const byId = state.citizens.find(c => c.id === p.citizenId);
      const matchedCitizen = (byName && (!byId || byId.id !== byName.id)) ? byName : byId;
      if (matchedCitizen) {
        p.citizenId = matchedCitizen.id;
        p.citizenName = matchedCitizen.name;
        if (!matchedCitizen.excludedWeeks) matchedCitizen.excludedWeeks = {};
        if (matchedCitizen.excludedWeeks[p.week] !== undefined) {
          p.excludedFromTotal = Boolean(matchedCitizen.excludedWeeks[p.week]);
        } else if (p.excludedFromTotal !== undefined) {
          matchedCitizen.excludedWeeks[p.week] = Boolean(p.excludedFromTotal);
        }
      }
    });
  }

  // Recompute totalPaid (included in kas) and totalExcluded (held/excluded) for every citizen
  for (const c of state.citizens) {
    if (!c.excludedWeeks) c.excludedWeeks = {};
    let paidIncluded = 0;
    let paidExcluded = 0;
    for (let w = 1; w <= 12; w++) {
      const val = Number(c.weeks?.[w]) || 0;
      if (val <= 0) {
        c.excludedWeeks[w] = false;
      } else if (c.excludedWeeks[w]) {
        paidExcluded += val;
      } else {
        paidIncluded += val;
      }
    }
    c.totalPaid = paidIncluded;
    c.totalExcluded = paidExcluded;
  }
}

let pendingCloudWrites = 0;
let lastLocalMutationAt = 0;

function saveDbLocal(state: AppState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Atomic write to prevent file corruption during concurrent operations
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db file atomically, falling back to direct write:', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (errDirect) {
      console.error('Fatal error writing db file:', errDirect);
    }
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: Record<string, unknown>;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('[Firebase Error]', JSON.stringify(errInfo));
}

async function saveDb(state: AppState) {
  lastLocalMutationAt = Date.now();
  // 1. Always normalize and sort citizens before persisting
  normalizeAndSortCitizens(state);

  // 2. Strip any undefined properties so Firestore setDoc never rejects the payload
  const cleanState: AppState = JSON.parse(JSON.stringify(state));

  // 3. Local disk persistence
  saveDbLocal(cleanState);

  // 4. Cloud Firestore persistence (Paten, tahan reload, sync multi-perangkat)
  if (firestoreDb) {
    pendingCloudWrites += 1;
    try {
      const ref = doc(firestoreDb, 'appState', 'main');
      await setDoc(ref, cleanState);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'appState/main');
    } finally {
      pendingCloudWrites = Math.max(0, pendingCloudWrites - 1);
    }
  }
}

let db: AppState = loadDb();

// Hydrate state from Cloud Firestore and maintain real-time sync across instances
async function initFirestoreSync() {
  if (!firestoreDb) return;
  try {
    const ref = doc(firestoreDb, 'appState', 'main');
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'appState/main');
      return;
    }
    if (snap && snap.exists()) {
      const cloudState = snap.data() as AppState;
      if (cloudState && Array.isArray(cloudState.citizens)) {
        if (cloudState.version >= db.version) {
          db = cloudState;
          if (!db.committeeSettings) {
            db.committeeSettings = { ...defaultCommitteeSettings };
          }
          if (!db.activePeriodLabel) {
            db.activePeriodLabel = '1448 H / 2027 M';
          }
          if (!Array.isArray(db.periodArchives)) {
            db.periodArchives = [];
          }

          let cloudNeedsSave = false;
          if (ensureDefaultAccountsExist(db)) cloudNeedsSave = true;
          if (migrateStateTo1448H(db)) cloudNeedsSave = true;
          if (cleanupCommitteeStructureAndAddress(db)) cloudNeedsSave = true;

          const cloudSched = getWeeklyScheduleInfo(db.committeeSettings);
          if (db.committeeSettings.activeWeek !== cloudSched.activeWeek) {
            db.committeeSettings.activeWeek = cloudSched.activeWeek;
            cloudNeedsSave = true;
          }
          if (cloudNeedsSave) {
            db.version = (db.version || 1) + 1;
            await saveDb(db);
          } else {
            normalizeAndSortCitizens(db);
            saveDbLocal(db);
          }
          console.log(`[Firebase] Loaded cloud database (v${db.version}, ${db.citizens.length} warga)`);
        } else {
          // Local db has newer version than cloud: push local db to cloud
          cleanupCommitteeStructureAndAddress(db);
          await saveDb(db);
        }
      }
      if (!db.paymentSettings) {
        db.paymentSettings = { ...defaultPaymentSettings };
      }
      if (!db.transferConfirmations) {
        db.transferConfirmations = [];
      }
    } else {
      console.log('[Firebase] No existing cloud database found, seeding initial state...');
      await saveDb(db);
    }

    // Subscribe to live cloud updates across all instances and published links
    onSnapshot(ref, (docSnap) => {
      if (pendingCloudWrites > 0 || Date.now() - lastLocalMutationAt < 4000) {
        return;
      }
      if (docSnap.exists()) {
        const cloudState = docSnap.data() as AppState;
        if (cloudState && cloudState.version > db.version) {
          console.log(`[Firebase] Live cloud sync: v${cloudState.version} (local was v${db.version})`);
          db = cloudState;
          if (!db.paymentSettings) {
            db.paymentSettings = { ...defaultPaymentSettings };
          }
          if (!db.transferConfirmations) {
            db.transferConfirmations = [];
          }
          if (!db.committeeSettings) {
            db.committeeSettings = { ...defaultCommitteeSettings };
          }
          cleanupCommitteeStructureAndAddress(db);
          normalizeAndSortCitizens(db);
          saveDbLocal(db);
          const message = `data: ${JSON.stringify({ version: db.version, timestamp: Date.now() })}\n\n`;
          for (const client of sseClients) {
            try {
              client.write(message);
            } catch {
              sseClients.delete(client);
            }
          }
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'appState/main');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'appState/main');
  }
}

// Calculate total available funds: Donasi Warga (yang tidak dikecualikan) + Donasi Suka Rela - Pengeluaran
function calculateFinancials(state: AppState) {
  const totalWarga = state.wargaPayments.reduce(
    (sum, p) => sum + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );
  const totalSukarela = state.sukarelaPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalMasuk = totalWarga + totalSukarela;
  const totalKeluar = state.pengeluaranList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const sisaSaldo = totalMasuk - totalKeluar;
  return { totalWarga, totalSukarela, totalMasuk, totalKeluar, sisaSaldo };
}

// SSE Clients for instant real-time sync across all devices
const sseClients = new Set<express.Response>();

function broadcastState() {
  lastLocalMutationAt = Date.now();
  db.version = (Number(db.version) || 1) + 1;
  normalizeAndSortCitizens(db);
  saveDb(db);
  const message = `data: ${JSON.stringify({ version: db.version, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ version: db.version })}\n\n`);

  // Heartbeat to keep connection alive and detect closed sockets
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(res);
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    sseClients.delete(res);
    clearInterval(heartbeat);
  });
});

// Helper to synchronize automatic weekly rotation before serving state
function syncWeeklyRotationInMemory(state: AppState): boolean {
  if (!state.committeeSettings) {
    state.committeeSettings = { ...defaultCommitteeSettings };
  }
  let changed = false;
  if (!state.committeeSettings.week1StartDate || state.committeeSettings.week1StartDate === '2026-10-03') {
    state.committeeSettings.week1StartDate = DEFAULT_WEEK1_START_DATE;
    changed = true;
  }
  if (state.committeeSettings.autoRotateWeekly !== true) {
    state.committeeSettings.autoRotateWeekly = true;
    changed = true;
  }
  const sched = getWeeklyScheduleInfo(state.committeeSettings);
  if (state.committeeSettings.activeWeek !== sched.activeWeek) {
    const prevWeek = state.committeeSettings.activeWeek || 1;
    state.committeeSettings.activeWeek = sched.activeWeek;
    changed = true;
    if (sched.activeWeek > prevWeek) {
      state.auditLogs.unshift({
        id: 'log-autorotate-' + Date.now(),
        timestamp: getIndonesianDateTime(),
        category: 'PENGATURAN',
        action: 'EDIT',
        accountName: 'Sistem Real-Time',
        details: `PERGANTIAN MINGGU OTOMATIS (REAL-TIME): Pembayaran mingguan otomatis beralih dari Minggu ke-${prevWeek} ke Minggu ke-${sched.activeWeek} (${sched.currentWeekRangeLabel}). Minggu ke-${prevWeek} dikunci & riwayatnya tersimpan rapi.`
      });
    }
  }
  return changed;
}

export function ensureVisitorStats(state: AppState): VisitorStats {
  if (!state.visitorStats) {
    state.visitorStats = {
      totalVisits: 0,
      uniqueVisitors: 0,
      todayVisits: 0,
      weekVisits: 0,
      lastVisitedAt: getIndonesianDateTime(),
      recentVisits: [],
      dailyCounts: {},
      uniqueVisitorIds: []
    };
  }
  if (!Array.isArray(state.visitorStats.recentVisits)) {
    state.visitorStats.recentVisits = [];
  }
  if (!state.visitorStats.dailyCounts) {
    state.visitorStats.dailyCounts = {};
  }
  if (!Array.isArray(state.visitorStats.uniqueVisitorIds)) {
    state.visitorStats.uniqueVisitorIds = [];
  }
  return state.visitorStats;
}

// API Routes
app.get('/api/state', (_req, res) => {
  if (syncWeeklyRotationInMemory(db)) {
    db.version = (Number(db.version) || 1) + 1;
    saveDb(db);
  }
  normalizeAndSortCitizens(db);
  ensureVisitorStats(db);
  const todayIso = getJakartaDateIso();
  if (db.visitorStats) {
    db.visitorStats.todayVisits = Number(db.visitorStats.dailyCounts?.[todayIso]) || 0;
  }
  const financials = calculateFinancials(db);
  const weeklySchedule = getWeeklyScheduleInfo(db.committeeSettings);
  res.json({
    ...db,
    citizens: db.citizens,
    financials,
    weeklySchedule
  });
});

// Rekam data pengunjung / akses link real-time
app.post('/api/visitors/record', async (req, res) => {
  try {
    const { visitorId, pageVisited = '/', deviceType = 'mobile', roleViewed = 'warga', userAgent = '' } = req.body;
    const stats = ensureVisitorStats(db);
    const todayIso = getJakartaDateIso();
    const nowFormatted = getIndonesianDateTime();

    // 1. Total Visits
    stats.totalVisits = (Number(stats.totalVisits) || 0) + 1;

    // 2. Daily Counts
    stats.dailyCounts = stats.dailyCounts || {};
    stats.dailyCounts[todayIso] = (Number(stats.dailyCounts[todayIso]) || 0) + 1;
    stats.todayVisits = stats.dailyCounts[todayIso] || 1;

    // 3. Weekly visits (jumlah 7 hari terakhir)
    const d = new Date();
    let weekSum = 0;
    for (let i = 0; i < 7; i++) {
      const pastD = new Date(d);
      pastD.setDate(d.getDate() - i);
      const pastIso = getJakartaDateIso(pastD);
      weekSum += Number(stats.dailyCounts[pastIso]) || 0;
    }
    stats.weekVisits = weekSum;

    // 4. Unique Visitor calculation
    if (visitorId && typeof visitorId === 'string') {
      stats.uniqueVisitorIds = stats.uniqueVisitorIds || [];
      if (!stats.uniqueVisitorIds.includes(visitorId)) {
        stats.uniqueVisitorIds.push(visitorId);
        if (stats.uniqueVisitorIds.length > 5000) {
          stats.uniqueVisitorIds.shift();
        }
      }
      stats.uniqueVisitors = stats.uniqueVisitorIds.length;
    } else if (stats.uniqueVisitors === 0) {
      stats.uniqueVisitors = 1;
    }

    stats.lastVisitedAt = nowFormatted;

    // 5. Append to recentVisits (simpan 50 kunjungan terakhir)
    const logEntry: VisitorLog = {
      id: `vis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      formattedTime: nowFormatted,
      deviceType: ['mobile', 'desktop', 'tablet'].includes(deviceType) ? deviceType : 'mobile',
      pageVisited: String(pageVisited).slice(0, 50),
      roleViewed: String(roleViewed).slice(0, 30),
      userAgent: String(userAgent || req.headers['user-agent'] || '').slice(0, 100)
    };

    stats.recentVisits.unshift(logEntry);
    if (stats.recentVisits.length > 50) {
      stats.recentVisits = stats.recentVisits.slice(0, 50);
    }

    await saveDb(db);
    res.json({
      success: true,
      stats: {
        totalVisits: stats.totalVisits,
        uniqueVisitors: stats.uniqueVisitors,
        todayVisits: stats.todayVisits,
        weekVisits: stats.weekVisits,
        lastVisitedAt: stats.lastVisitedAt,
        recentVisits: stats.recentVisits.slice(0, 20),
        dailyCounts: stats.dailyCounts
      }
    });
  } catch (err: any) {
    console.error('[Visitor] Error recording visit:', err);
    res.status(500).json({ error: 'Gagal mencatat statistik kunjungan' });
  }
});

// Ambil statistik pengunjung
app.get('/api/visitors/stats', (_req, res) => {
  const stats = ensureVisitorStats(db);
  const todayIso = getJakartaDateIso();
  stats.todayVisits = Number(stats.dailyCounts?.[todayIso]) || 0;
  res.json(stats);
});

// Reset statistik pengunjung oleh Admin (jika panitia ingin memulai hitungan dari 0)
app.post('/api/visitors/reset', async (req, res) => {
  try {
    const { operator = 'Admin' } = req.body;
    db.visitorStats = {
      totalVisits: 0,
      uniqueVisitors: 0,
      todayVisits: 0,
      weekVisits: 0,
      lastVisitedAt: getIndonesianDateTime(),
      recentVisits: [],
      dailyCounts: {},
      uniqueVisitorIds: []
    };
    db.auditLogs.unshift({
      id: `audit-vis-reset-${Date.now()}`,
      action: 'HAPUS',
      category: 'PENGATURAN',
      details: `Reset hitungan data statistik pengunjung link oleh ${operator}`,
      accountName: operator,
      timestamp: getIndonesianDateTime()
    });
    await saveDb(db);
    broadcastState();
    res.json({ success: true, message: 'Statistik pengunjung berhasil di-reset' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mereset statistik pengunjung' });
  }
});

// Update Weekly Schedule & Active Week (Auto or Manual Switch)
app.post('/api/weekly-schedule', (req, res) => {
  const { targetWeek, week1StartDate, autoRotateWeekly, updatedBy } = req.body;
  if (!db.committeeSettings) {
    db.committeeSettings = { ...defaultCommitteeSettings };
  }

  const prevWeek = getWeeklyScheduleInfo(db.committeeSettings).activeWeek;
  let nextAutoRotate =
    autoRotateWeekly !== undefined
      ? Boolean(autoRotateWeekly)
      : (db.committeeSettings.autoRotateWeekly ?? true);

  let nextWeek1Start = db.committeeSettings.week1StartDate || DEFAULT_WEEK1_START_DATE;
  let nextActiveWeek = db.committeeSettings.activeWeek || prevWeek;

  if (week1StartDate && /^\d{4}-\d{2}-\d{2}$/.test(String(week1StartDate).trim())) {
    nextWeek1Start = String(week1StartDate).trim();
  }

  if (targetWeek !== undefined) {
    const parsedTarget = Math.min(12, Math.max(1, parseInt(String(targetWeek), 10) || 1));
    nextActiveWeek = parsedTarget;
    if (!week1StartDate) {
      // Align week1StartDate so that parsedTarget is the active week for the current 7-day cycle
      nextWeek1Start = computeWeek1StartDateForTargetWeek(parsedTarget, nextWeek1Start);
    }
  }

  db.committeeSettings.autoRotateWeekly = nextAutoRotate;
  db.committeeSettings.week1StartDate = nextWeek1Start;

  const updatedSchedule = getWeeklyScheduleInfo({
    ...db.committeeSettings,
    activeWeek: nextActiveWeek,
    week1StartDate: nextWeek1Start,
    autoRotateWeekly: nextAutoRotate
  });

  db.committeeSettings.activeWeek = updatedSchedule.activeWeek;

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PENGATURAN',
    action: 'EDIT',
    accountName: updatedBy || 'Admin / Petugas',
    details: `${updatedBy || 'Petugas'} mengatur Jadwal Pembayaran Mingguan: Minggu Aktif = Minggu ke-${updatedSchedule.activeWeek} (${updatedSchedule.currentWeekRangeLabel}) • Mode Otomatis: ${nextAutoRotate ? 'AKTIF' : 'MANUAL'}.`
  });

  broadcastState();
  res.json({
    success: true,
    committeeSettings: db.committeeSettings,
    weeklySchedule: updatedSchedule
  });
});

// Login check (supports username or active phone number)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const inputIdentifier = String(username || '').toLowerCase().trim();
  const cleanPhone = inputIdentifier.replace(/[^0-9]/g, '');

  const user = db.accounts.find(a => {
    const accUser = a.username.toLowerCase().trim();
    const accPhone = a.phone ? a.phone.replace(/[^0-9]/g, '') : '';
    if (inputIdentifier === 'usser1' && (accUser === 'rt08' || accUser === 'usser1')) return true;
    if (inputIdentifier === 'usser2' && (accUser === 'rt09' || accUser === 'usser2')) return true;
    if (inputIdentifier === 'usser3' && (accUser === 'rt10' || accUser === 'usser3')) return true;
    return accUser === inputIdentifier || (cleanPhone.length >= 8 && accPhone === cleanPhone);
  });

  const inputPassword = String(password || '').trim();
  const isCitizenFlexible = user && user.role === 'warga' && ['123', '123456', 'warga', 'warga123'].includes(inputPassword);
  const isMatch = user && (user.password === inputPassword || isCitizenFlexible);

  if (!user || !isMatch) {
    res.status(401).json({ success: false, message: 'Nomor Handphone / Username atau Kata Sandi salah!' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      assignedRt: user.assignedRt
    }
  });
});

// Register new citizen account using active phone number (Khusus Warga - Hanya masuk Dashboard Warga)
app.post('/api/register-warga', (req, res) => {
  const { name, phone, password } = req.body;
  const trimmedName = String(name || '').trim();
  const rawPhone = String(phone || '').trim();
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const trimmedPassword = String(password || '').trim();

  if (!trimmedName || trimmedName.length < 2) {
    res.status(400).json({ success: false, message: 'Nama lengkap warga wajib diisi (minimal 2 karakter).' });
    return;
  }

  if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 15) {
    res.status(400).json({ success: false, message: 'Nomor handphone tidak valid. Masukkan nomor HP aktif Anda (contoh: 08123456789).' });
    return;
  }

  if (!trimmedPassword || trimmedPassword.length < 3) {
    res.status(400).json({ success: false, message: 'Kata sandi minimal 3 karakter demi keamanan.' });
    return;
  }

  // Check if phone or username already exists
  const existing = db.accounts.find(a => {
    const aPhone = a.phone ? a.phone.replace(/[^0-9]/g, '') : '';
    return (aPhone && aPhone === cleanPhone) || a.username.toLowerCase() === rawPhone.toLowerCase();
  });

  if (existing) {
    res.status(409).json({
      success: false,
      message: `Nomor Handphone ${rawPhone} sudah terdaftar dengan nama "${existing.name}". Silakan langsung gunakan menu Masuk.`
    });
    return;
  }

  const timestamp = getIndonesianDateTime();
  const newAccount: UserAccount = {
    id: 'acc-warga-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    username: rawPhone,
    phone: rawPhone,
    name: trimmedName,
    password: trimmedPassword,
    role: 'warga', // STRICTLY AND PERMANENTLY WARGA (ONLY DASHBOARD WARGA)
    createdAt: timestamp
  };

  db.accounts.push(newAccount);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'AKUN',
    action: 'TAMBAH',
    accountName: trimmedName,
    details: `Warga membuat akun baru mandiri via Nomor HP aktif: ${rawPhone}.`
  });

  broadcastState();

  res.json({
    success: true,
    message: 'Akun warga berhasil dibuat! Selamat datang di Dashboard Warga.',
    user: {
      id: newAccount.id,
      username: newAccount.username,
      name: newAccount.name,
      role: newAccount.role,
      phone: newAccount.phone
    }
  });
});

// Add citizen iuran payment (from Usser or Admin)
app.post('/api/warga/payment', (req, res) => {
  syncWeeklyRotationInMemory(db);
  const currentSched = getWeeklyScheduleInfo(db.committeeSettings);
  const { citizenId, citizenName, week, amount, recordedBy, rt } = req.body;
  const numWeek = parseInt(week, 10);
  const numAmount = parseInt(amount, 10);
  const cleanTargetName = String(citizenName || '').trim().replace(/\s+/g, ' ');

  if ((!citizenId && !cleanTargetName) || isNaN(numWeek) || numWeek < 1 || numWeek > 12 || isNaN(numAmount) || numAmount < 0) {
    res.status(400).json({ error: 'Data pembayaran tidak valid' });
    return;
  }

  if (numWeek < currentSched.activeWeek) {
    res.status(400).json({
      error: `Minggu ke-${numWeek} sudah terlewat dan tidak dapat dipilih lagi. Pembayaran saat ini otomatis berada pada Minggu ke-${currentSched.activeWeek}.`
    });
    return;
  }

  // Match by exact name first if citizenName is provided, or verify citizenId matches citizenName
  let citizen: Citizen | undefined;
  if (cleanTargetName) {
    const byIdAndName = db.citizens.find(
      c => c.id === citizenId && c.name.trim().toLowerCase() === cleanTargetName.toLowerCase()
    );
    const byNameOnly = db.citizens.find(
      c => c.name.trim().toLowerCase() === cleanTargetName.toLowerCase()
    );
    citizen = byIdAndName || byNameOnly;
  }
  if (!citizen && citizenId) {
    citizen = db.citizens.find(c => c.id === citizenId);
  }

  if (!citizen) {
    res.status(404).json({ error: 'Warga tidak ditemukan dalam daftar warga resmi' });
    return;
  }

  if (['08', '09', '10'].includes(rt)) {
    citizen.rt = rt;
  }

  const timestamp = getIndonesianDateTime();
  citizen.weeks[numWeek] = numAmount;
  citizen.totalPaid = Object.values(citizen.weeks).reduce((sum, v) => sum + (Number(v) || 0), 0);
  citizen.lastEditedBy = recordedBy || 'Petugas';
  citizen.lastEditedAt = timestamp;

  // Add or update payment history log for this exact citizen and week
  const existingLogIndex = db.wargaPayments.findIndex(
    p => (p.citizenId === citizen!.id || p.citizenName.toLowerCase() === citizen!.name.toLowerCase()) && p.week === numWeek
  );

  if (existingLogIndex >= 0) {
    db.wargaPayments[existingLogIndex].citizenId = citizen.id;
    db.wargaPayments[existingLogIndex].citizenName = citizen.name;
    db.wargaPayments[existingLogIndex].amount = numAmount;
    db.wargaPayments[existingLogIndex].lastEditedBy = recordedBy || 'Petugas';
    db.wargaPayments[existingLogIndex].lastEditedAt = timestamp;
  } else {
    const paymentRecord: DonasiWargaPayment = {
      id: 'wp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      citizenId: citizen.id,
      citizenName: citizen.name,
      week: numWeek,
      amount: numAmount,
      timestamp,
      dateIso: new Date().toISOString(),
      recordedBy: recordedBy || 'Petugas'
    };
    db.wargaPayments.unshift(paymentRecord);
  }

  // Audit log
  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'DONASI WARGA',
    action: 'TAMBAH',
    accountName: recordedBy || 'Petugas',
    details: `Input iuran ${citizen.name} Minggu ke-${numWeek} sebesar Rp ${numAmount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, citizen });
});

// Edit existing Donasi Warga payment
app.put('/api/warga/payment/:id', (req, res) => {
  const { id } = req.params;
  const { newCitizenId, newCitizenName, amount, week, editedBy } = req.body;
  const numAmount = parseInt(amount, 10);
  const newWeek = week ? parseInt(week, 10) : undefined;
  const timestamp = getIndonesianDateTime();

  const payment = db.wargaPayments.find(p => p.id === id);
  if (!payment) {
    res.status(404).json({ error: 'Data pembayaran tidak ditemukan' });
    return;
  }

  const oldCitizen = db.citizens.find(
    c => c.id === payment.citizenId || c.name.toLowerCase() === payment.citizenName.toLowerCase()
  );
  const oldAmount = payment.amount;
  const oldName = payment.citizenName;
  const oldWeek = payment.week;
  const targetWeek = newWeek && newWeek >= 1 && newWeek <= 12 ? newWeek : oldWeek;

  let targetCitizen = oldCitizen;
  const trimmedNewName = newCitizenName ? String(newCitizenName).trim().replace(/\s+/g, ' ') : '';

  if (newCitizenId && (!oldCitizen || newCitizenId !== oldCitizen.id)) {
    const foundById = db.citizens.find(c => c.id === newCitizenId);
    if (foundById) targetCitizen = foundById;
  } else if (trimmedNewName && trimmedNewName.toLowerCase() !== oldName.toLowerCase()) {
    const existingOther = db.citizens.find(
      c => c.name.toLowerCase() === trimmedNewName.toLowerCase()
    );
    if (existingOther) {
      // User selected a different registered citizen: move payment to that citizen!
      targetCitizen = existingOther;
    } else if (oldCitizen) {
      // User renamed the citizen
      oldCitizen.name = trimmedNewName;
      db.wargaPayments.forEach(p => {
        if (p.citizenId === oldCitizen.id) p.citizenName = trimmedNewName;
      });
      targetCitizen = oldCitizen;
    }
  }

  // Clear old week on oldCitizen if citizen or week changed
  if (oldCitizen && ((targetCitizen && targetCitizen.id !== oldCitizen.id) || targetWeek !== oldWeek)) {
    oldCitizen.weeks[oldWeek] = 0;
    oldCitizen.totalPaid = Object.values(oldCitizen.weeks).reduce((sum, v) => sum + (Number(v) || 0), 0);
    oldCitizen.lastEditedBy = editedBy || 'Petugas';
    oldCitizen.lastEditedAt = timestamp;
  }

  payment.amount = numAmount;
  payment.week = targetWeek;
  if (targetCitizen) {
    payment.citizenId = targetCitizen.id;
    payment.citizenName = targetCitizen.name;
    targetCitizen.weeks[targetWeek] = numAmount;
    targetCitizen.totalPaid = Object.values(targetCitizen.weeks).reduce((sum, v) => sum + (Number(v) || 0), 0);
    targetCitizen.lastEditedBy = editedBy || 'Petugas';
    targetCitizen.lastEditedAt = timestamp;
  } else if (trimmedNewName) {
    payment.citizenName = trimmedNewName;
  }

  payment.lastEditedBy = editedBy || 'Petugas';
  payment.lastEditedAt = timestamp;

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'DONASI WARGA',
    action: 'EDIT',
    accountName: editedBy || 'Petugas',
    details: `Ubah Donasi Warga (${oldName} M-${oldWeek} -> ${payment.citizenName} M-${payment.week}) dari Rp ${oldAmount.toLocaleString('id-ID')} menjadi Rp ${numAmount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, payment });
});

// Delete citizen payment
app.delete('/api/warga/payment/:id', (req, res) => {
  const { id } = req.params;
  const user = req.query.user ? String(req.query.user) : 'Petugas';
  const index = db.wargaPayments.findIndex(p => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Data tidak ditemukan' });
    return;
  }

  const removed = db.wargaPayments[index];
  db.wargaPayments.splice(index, 1);

  // Reset week in citizen (match by id or name)
  const citizen = db.citizens.find(
    c => c.id === removed.citizenId || c.name.toLowerCase() === removed.citizenName.toLowerCase()
  );
  if (citizen) {
    citizen.weeks[removed.week] = 0;
    citizen.totalPaid = Object.values(citizen.weeks).reduce((sum, v) => sum + (Number(v) || 0), 0);
    citizen.lastEditedBy = user;
    citizen.lastEditedAt = getIndonesianDateTime();
  }

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'DONASI WARGA',
    action: 'HAPUS',
    accountName: user,
    details: `Hapus pembayaran ${removed.citizenName} Minggu ke-${removed.week} senilai Rp ${removed.amount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true });
});

// Toggle exclude/include citizen payment per week (Opsi C)
app.post('/api/warga/toggle-exclude', (req, res) => {
  const { citizenId, paymentId, week, excluded, updatedBy } = req.body;
  const isExcluded = Boolean(excluded);
  const timestamp = getIndonesianDateTime();

  let targetCitizen: Citizen | undefined;
  let targetWeek: number | 'all' = week === 'all' ? 'all' : parseInt(week, 10);

  if (paymentId) {
    const pay = db.wargaPayments.find(p => p.id === paymentId);
    if (pay) {
      targetWeek = pay.week;
      targetCitizen = db.citizens.find(
        c => c.id === pay.citizenId || c.name.toLowerCase() === pay.citizenName.toLowerCase()
      );
      pay.excludedFromTotal = isExcluded;
    }
  }

  if (!targetCitizen && citizenId) {
    targetCitizen = db.citizens.find(c => c.id === citizenId);
  }

  if (!targetCitizen) {
    res.status(404).json({ error: 'Data warga tidak ditemukan' });
    return;
  }

  if (!targetCitizen.excludedWeeks) {
    targetCitizen.excludedWeeks = {};
  }

  if (targetWeek === 'all') {
    for (let w = 1; w <= 12; w++) {
      if ((Number(targetCitizen.weeks?.[w]) || 0) > 0) {
        targetCitizen.excludedWeeks[w] = isExcluded;
      } else {
        targetCitizen.excludedWeeks[w] = false;
      }
    }
    db.wargaPayments.forEach(p => {
      if (p.citizenId === targetCitizen!.id || p.citizenName.toLowerCase() === targetCitizen!.name.toLowerCase()) {
        p.excludedFromTotal = isExcluded;
      }
    });
  } else if (!isNaN(targetWeek) && targetWeek >= 1 && targetWeek <= 12) {
    targetCitizen.excludedWeeks[targetWeek] = isExcluded;
    db.wargaPayments.forEach(p => {
      if (
        (p.citizenId === targetCitizen!.id || p.citizenName.toLowerCase() === targetCitizen!.name.toLowerCase()) &&
        p.week === targetWeek
      ) {
        p.excludedFromTotal = isExcluded;
      }
    });
  } else {
    res.status(400).json({ error: 'Minggu pembayaran tidak valid' });
    return;
  }

  targetCitizen.lastEditedBy = updatedBy || 'Admin';
  targetCitizen.lastEditedAt = timestamp;
  normalizeAndSortCitizens(db);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'DONASI WARGA',
    action: 'EDIT',
    accountName: updatedBy || 'Admin',
    details: `${updatedBy || 'Admin'} mengatur pembayaran ${targetCitizen.name} (${
      targetWeek === 'all' ? 'Semua Minggu' : `Minggu ke-${targetWeek}`
    }): ${isExcluded ? 'Dikecualikan sementara dari Total Uang Masuk' : 'Dimasukkan kembali ke Total Uang Masuk'}`
  });

  broadcastState();
  res.json({ success: true, citizen: targetCitizen });
});

// Add new citizen to rekapitulasi list (with duplicate check!)
app.post('/api/citizens', (req, res) => {
  const { name, recordedBy, rt } = req.body;
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');

  if (!cleanName) {
    res.status(400).json({ error: 'Nama warga tidak boleh kosong!' });
    return;
  }

  const isDuplicate = db.citizens.some(
    c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanName.toLowerCase()
  );

  if (isDuplicate) {
    res.status(400).json({ error: `Nama "${cleanName}" sudah terdaftar dalam daftar warga!` });
    return;
  }

  const weeks: { [w: number]: number } = {};
  for (let w = 1; w <= 12; w++) weeks[w] = 0;

  const citizenRt: '08' | '09' | '10' = ['08', '09', '10'].includes(rt) ? rt : '08';

  const newCitizen: Citizen = {
    id: 'citizen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: cleanName,
    rt: citizenRt,
    weeks,
    totalPaid: 0,
    lastEditedBy: recordedBy || 'Petugas',
    lastEditedAt: getIndonesianDateTime()
  };

  db.citizens.push(newCitizen);
  normalizeAndSortCitizens(db);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'REKAPITULASI',
    action: 'TAMBAH',
    accountName: recordedBy || 'Petugas',
    details: `Menambahkan warga baru: ${cleanName} (RT ${citizenRt})`
  });

  broadcastState();
  res.json({ success: true, citizen: newCitizen });
});

// Edit citizen in rekapitulasi (name or weeks)
app.put('/api/citizens/:id', (req, res) => {
  const { id } = req.params;
  const { name, oldName: clientOldName, weeks, excludedWeeks, editedBy, rt } = req.body;
  const cleanOldName = clientOldName ? String(clientOldName).trim().replace(/\s+/g, ' ') : '';

  // Find citizen accurately: verify id + oldName if oldName provided, fallback to oldName, then id
  let citizen: Citizen | undefined;
  if (cleanOldName) {
    citizen = db.citizens.find(
      c => c.id === id && c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanOldName.toLowerCase()
    ) || db.citizens.find(
      c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanOldName.toLowerCase()
    );
  }
  if (!citizen) {
    citizen = db.citizens.find(c => c.id === id);
  }

  if (!citizen) {
    res.status(404).json({ error: 'Warga tidak ditemukan' });
    return;
  }

  const targetId = citizen.id;
  if (['08', '09', '10'].includes(rt)) {
    citizen.rt = rt;
  }

  const oldName = citizen.name;
  const trimmed = name ? String(name).trim().replace(/\s+/g, ' ') : oldName;

  if (trimmed && trimmed.toLowerCase() !== oldName.toLowerCase()) {
    const duplicate = db.citizens.find(
      c => c.id !== targetId && c.name.trim().replace(/\s+/g, ' ').toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      res.status(400).json({ error: `Nama "${trimmed}" sudah terdaftar!` });
      return;
    }
  }

  if (trimmed) {
    citizen.name = trimmed;
    // Remove any accidental duplicate citizen entries that had oldName
    db.citizens = db.citizens.filter(
      c => c.id === targetId || c.name.trim().replace(/\s+/g, ' ').toLowerCase() !== oldName.toLowerCase()
    );
    // Sync payment log names and transfer confirmations
    db.wargaPayments.forEach(p => {
      if (p.citizenId === targetId || p.citizenName.toLowerCase() === oldName.toLowerCase()) {
        p.citizenId = targetId;
        p.citizenName = trimmed;
      }
    });
    if (Array.isArray(db.transferConfirmations)) {
      db.transferConfirmations.forEach(tc => {
        if (tc.citizenId === targetId || (tc.citizenName && tc.citizenName.toLowerCase() === oldName.toLowerCase())) {
          tc.citizenId = targetId;
          tc.citizenName = trimmed;
        }
      });
    }
  }

  if (weeks && typeof weeks === 'object') {
    if (!citizen.excludedWeeks) citizen.excludedWeeks = {};
    for (let w = 1; w <= 12; w++) {
      if (weeks[w] !== undefined) {
        const val = parseInt(weeks[w], 10) || 0;
        citizen.weeks[w] = val;
        const isExcl = val > 0 && excludedWeeks && typeof excludedWeeks === 'object'
          ? Boolean(excludedWeeks[w])
          : (val > 0 ? Boolean(citizen.excludedWeeks[w]) : false);
        citizen.excludedWeeks[w] = isExcl;
        // Sync into wargaPayments
        const existing = db.wargaPayments.find(p => p.citizenId === targetId && p.week === w);
        if (val > 0) {
          if (existing) {
            existing.amount = val;
            existing.citizenName = citizen.name;
            existing.excludedFromTotal = isExcl;
            existing.lastEditedBy = editedBy || 'Petugas';
            existing.lastEditedAt = getIndonesianDateTime();
          } else {
            db.wargaPayments.unshift({
              id: 'wp-' + Date.now() + '-' + w,
              citizenId: citizen.id,
              citizenName: citizen.name,
              week: w,
              amount: val,
              excludedFromTotal: isExcl,
              timestamp: getIndonesianDateTime(),
              dateIso: new Date().toISOString(),
              recordedBy: editedBy || 'Petugas'
            });
          }
        } else if (existing) {
          const idx = db.wargaPayments.indexOf(existing);
          if (idx > -1) db.wargaPayments.splice(idx, 1);
        }
      }
    }
  }

  citizen.lastEditedBy = editedBy || 'Petugas';
  citizen.lastEditedAt = getIndonesianDateTime();
  normalizeAndSortCitizens(db);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'REKAPITULASI',
    action: 'EDIT',
    accountName: editedBy || 'Petugas',
    details: `Edit data warga ${oldName} -> ${citizen.name}. Total iuran sekarang: Rp ${citizen.totalPaid.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, citizen });
});

// Delete citizen from rekapitulasi
app.delete('/api/citizens/:id', (req, res) => {
  const { id } = req.params;
  const user = req.query.user ? String(req.query.user) : 'Petugas';
  const queryName = req.query.name ? String(req.query.name).trim().replace(/\s+/g, ' ') : '';

  let targetCitizen: Citizen | undefined;
  if (queryName) {
    targetCitizen = db.citizens.find(
      c => c.id === id && c.name.trim().replace(/\s+/g, ' ').toLowerCase() === queryName.toLowerCase()
    ) || db.citizens.find(
      c => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === queryName.toLowerCase()
    );
  }
  if (!targetCitizen) {
    targetCitizen = db.citizens.find(c => c.id === id);
  }

  if (!targetCitizen) {
    res.status(404).json({ error: 'Warga tidak ditemukan' });
    return;
  }

  const deletedName = targetCitizen.name;
  const deletedId = targetCitizen.id;

  // Remove all entries matching either deletedId or deletedName so duplicates can never remain
  db.citizens = db.citizens.filter(
    c => c.id !== deletedId && c.name.trim().replace(/\s+/g, ' ').toLowerCase() !== deletedName.toLowerCase()
  );

  // Remove any payments associated with this citizen
  db.wargaPayments = db.wargaPayments.filter(
    p => p.citizenId !== deletedId && p.citizenName.trim().replace(/\s+/g, ' ').toLowerCase() !== deletedName.toLowerCase()
  );

  normalizeAndSortCitizens(db);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'REKAPITULASI',
    action: 'HAPUS',
    accountName: user,
    details: `Menghapus data warga ${deletedName} dari daftar rekapitulasi`
  });

  broadcastState();
  res.json({ success: true, deletedName });
});

// Donasi Sukarela: Add (with duplicate name check)
app.post('/api/sukarela', (req, res) => {
  const { donorName, amount, keterangan, week, recordedBy } = req.body;
  const cleanName = String(donorName || '').trim();
  const numAmount = parseInt(amount, 10);

  if (!cleanName) {
    res.status(400).json({ error: 'Nama donatur tidak boleh kosong!' });
    return;
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Jumlah donasi harus lebih dari 0!' });
    return;
  }

  // Check if donor name already registered in sukarela
  const isDuplicate = db.sukarelaPayments.some(
    s => s.donorName.toLowerCase() === cleanName.toLowerCase()
  );

  if (isDuplicate) {
    res.status(400).json({ error: `Nama donatur "${cleanName}" sudah terdaftar di Donasi Suka Rela!` });
    return;
  }

  syncWeeklyRotationInMemory(db);
  const currentSched = getWeeklyScheduleInfo(db.committeeSettings);
  const parsedWeek = week ? parseInt(String(week), 10) : currentSched.activeWeek;
  if (!isNaN(parsedWeek) && parsedWeek < currentSched.activeWeek) {
    res.status(400).json({
      error: `Minggu ke-${parsedWeek} sudah terlewat dan tidak dapat dipilih lagi. Pencatatan saat ini otomatis berada pada Minggu ke-${currentSched.activeWeek}.`
    });
    return;
  }
  const resolvedWeek = !isNaN(parsedWeek) && parsedWeek >= currentSched.activeWeek && parsedWeek <= 12 ? parsedWeek : currentSched.activeWeek;

  const timestamp = getIndonesianDateTime();
  const item: DonasiSukarela = {
    id: 'ds-' + Date.now(),
    donorName: cleanName,
    amount: numAmount,
    week: resolvedWeek,
    timestamp,
    dateIso: new Date().toISOString(),
    keterangan: keterangan || 'Donasi Sukarela PHBI',
    recordedBy: recordedBy || 'Petugas'
  };

  db.sukarelaPayments.unshift(item);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'DONASI SUKA RELA',
    action: 'TAMBAH',
    accountName: recordedBy || 'Petugas',
    details: `Penerimaan Donasi Suka Rela (Minggu ke-${resolvedWeek}) dari ${cleanName} sebesar Rp ${numAmount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, item });
});

// Donasi Sukarela: Edit
app.put('/api/sukarela/:id', (req, res) => {
  const { id } = req.params;
  const { donorName, amount, keterangan, week, editedBy } = req.body;
  const item = db.sukarelaPayments.find(s => s.id === id);

  if (!item) {
    res.status(404).json({ error: 'Data donasi suka rela tidak ditemukan' });
    return;
  }

  const cleanName = String(donorName || '').trim();
  const numAmount = parseInt(amount, 10);

  if (cleanName && cleanName.toLowerCase() !== item.donorName.toLowerCase()) {
    const isDuplicate = db.sukarelaPayments.some(
      s => s.id !== id && s.donorName.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      res.status(400).json({ error: `Nama donatur "${cleanName}" sudah terdaftar!` });
      return;
    }
  }

  const oldName = item.donorName;
  const oldAmount = item.amount;
  const timestamp = getIndonesianDateTime();

  item.donorName = cleanName || item.donorName;
  item.amount = numAmount || item.amount;
  if (keterangan !== undefined) item.keterangan = keterangan;
  if (week !== undefined) {
    const wNum = parseInt(String(week), 10);
    if (!isNaN(wNum) && wNum >= 1 && wNum <= 12) {
      item.week = wNum;
    }
  }
  item.lastEditedBy = editedBy;
  item.lastEditedAt = timestamp;

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'DONASI SUKA RELA',
    action: 'EDIT',
    accountName: editedBy,
    details: `Edit Donasi Suka Rela: ${oldName} (Rp ${oldAmount.toLocaleString('id-ID')}) -> ${item.donorName} (Rp ${item.amount.toLocaleString('id-ID')})`
  });

  broadcastState();
  res.json({ success: true, item });
});

// Donasi Sukarela: Delete
app.delete('/api/sukarela/:id', (req, res) => {
  const { id } = req.params;
  const user = req.query.user ? String(req.query.user) : 'Petugas';
  const index = db.sukarelaPayments.findIndex(s => s.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Data tidak ditemukan' });
    return;
  }

  const item = db.sukarelaPayments[index];
  db.sukarelaPayments.splice(index, 1);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'DONASI SUKA RELA',
    action: 'HAPUS',
    accountName: user,
    details: `Hapus Donasi Suka Rela ${item.donorName} senilai Rp ${item.amount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true });
});

// Pengeluaran Bendahara: Add
// Strict validation: If expense exceeds available balance, REJECT!
app.post('/api/pengeluaran', (req, res) => {
  const { description, amount, recipient, recordedBy } = req.body;
  const numAmount = parseInt(amount, 10);

  if (!description || !description.trim()) {
    res.status(400).json({ error: 'Keperluan / Keterangan pengeluaran harus diisi!' });
    return;
  }

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Nominal pengeluaran harus lebih besar dari 0!' });
    return;
  }

  const { sisaSaldo } = calculateFinancials(db);
  if (numAmount > sisaSaldo) {
    res.status(400).json({
      error: `Akses ditolak! Pengeluaran (Rp ${numAmount.toLocaleString('id-ID')}) melebihi uang tersedia (Rp ${sisaSaldo.toLocaleString('id-ID')}).`
    });
    return;
  }

  const timestamp = getIndonesianDateTime();
  const item: Pengeluaran = {
    id: 'out-' + Date.now(),
    description: description.trim(),
    amount: numAmount,
    recipient: (recipient || '-').trim(),
    timestamp,
    dateIso: new Date().toISOString(),
    recordedBy: recordedBy || 'Bendahara'
  };

  db.pengeluaranList.unshift(item);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'BENDAHARA',
    action: 'TAMBAH',
    accountName: recordedBy || 'Bendahara',
    details: `Pengeluaran kas untuk "${item.description}" sebesar Rp ${numAmount.toLocaleString('id-ID')} (${item.recipient})`
  });

  broadcastState();
  res.json({ success: true, item });
});

// Pengeluaran Bendahara: Edit
app.put('/api/pengeluaran/:id', (req, res) => {
  const { id } = req.params;
  const { description, amount, recipient, editedBy } = req.body;
  const item = db.pengeluaranList.find(p => p.id === id);

  if (!item) {
    res.status(404).json({ error: 'Data pengeluaran tidak ditemukan' });
    return;
  }

  const numAmount = parseInt(amount, 10);
  const oldAmount = item.amount;

  // Calculate sisa saldo if this item were replaced
  const { sisaSaldo } = calculateFinancials(db);
  const availableBalanceWithoutThis = sisaSaldo + oldAmount;

  if (numAmount > availableBalanceWithoutThis) {
    res.status(400).json({
      error: `Akses ditolak! Pengeluaran baru (Rp ${numAmount.toLocaleString('id-ID')}) melebihi sisa uang tersedia (Rp ${availableBalanceWithoutThis.toLocaleString('id-ID')}).`
    });
    return;
  }

  const timestamp = getIndonesianDateTime();
  item.description = description ? description.trim() : item.description;
  item.amount = numAmount;
  item.recipient = recipient !== undefined ? recipient.trim() : item.recipient;
  item.lastEditedBy = editedBy;
  item.lastEditedAt = timestamp;

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'BENDAHARA',
    action: 'EDIT',
    accountName: editedBy,
    details: `Edit pengeluaran "${item.description}": Rp ${oldAmount.toLocaleString('id-ID')} -> Rp ${numAmount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, item });
});

// Pengeluaran Bendahara: Delete
app.delete('/api/pengeluaran/:id', (req, res) => {
  const { id } = req.params;
  const user = req.query.user ? String(req.query.user) : 'Bendahara';
  const index = db.pengeluaranList.findIndex(p => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Data tidak ditemukan' });
    return;
  }

  const item = db.pengeluaranList[index];
  db.pengeluaranList.splice(index, 1);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'BENDAHARA',
    action: 'HAPUS',
    accountName: user,
    details: `Hapus pengeluaran "${item.description}" senilai Rp ${item.amount.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true });
});

// Admin: Set Target Per Orang
app.post('/api/target', (req, res) => {
  const { target, updatedBy } = req.body;
  const numTarget = parseInt(target, 10);

  if (isNaN(numTarget) || numTarget <= 0) {
    res.status(400).json({ error: 'Target iuran per orang harus lebih dari 0!' });
    return;
  }

  const oldTarget = db.targetPerPerson;
  db.targetPerPerson = numTarget;

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'TARGET',
    action: 'EDIT',
    accountName: updatedBy || 'Admin',
    details: `Mengubah target iuran per orang dari Rp ${oldTarget.toLocaleString('id-ID')} menjadi Rp ${numTarget.toLocaleString('id-ID')}`
  });

  broadcastState();
  res.json({ success: true, targetPerPerson: db.targetPerPerson });
});

// Admin: Create Account
app.post('/api/accounts', (req, res) => {
  const { username, password, name, role, createdBy } = req.body;
  const cleanUsername = String(username || '').trim().toLowerCase();

  if (!cleanUsername || !password || !name || !role) {
    res.status(400).json({ error: 'Semua kolom pembuatan akun harus diisi lengkap!' });
    return;
  }

  if (db.accounts.some(a => a.username.toLowerCase() === cleanUsername)) {
    res.status(400).json({ error: `Username "${cleanUsername}" sudah digunakan!` });
    return;
  }

  const newAcc: UserAccount = {
    id: 'acc-' + Date.now(),
    username: cleanUsername,
    password: String(password).trim(),
    name: String(name).trim(),
    role,
    createdAt: getIndonesianDateTime()
  };

  db.accounts.push(newAcc);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'AKUN',
    action: 'TAMBAH',
    accountName: createdBy || 'Admin',
    details: `Membuat akun baru: ${newAcc.name} (${newAcc.role}) - Username: ${newAcc.username}`
  });

  broadcastState();
  res.json({ success: true, account: newAcc });
});

// Admin: Delete Account (Admin 'riyan' cannot be deleted)
app.delete('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  const user = req.query.user ? String(req.query.user) : 'Admin';
  const index = db.accounts.findIndex(a => a.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Akun tidak ditemukan' });
    return;
  }

  if (db.accounts[index].username === 'riyan') {
    res.status(400).json({ error: 'Akun utama admin "riyan" tidak dapat dihapus!' });
    return;
  }

  const removed = db.accounts[index];
  db.accounts.splice(index, 1);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'AKUN',
    action: 'HAPUS',
    accountName: user,
    details: `Menghapus akun ${removed.name} (${removed.username})`
  });

  broadcastState();
  res.json({ success: true });
});

// Admin: Edit any data / Perubahan Data
app.post('/api/admin/edit-data', (req, res) => {
  const { type, id, data, editedBy } = req.body;
  const timestamp = getIndonesianDateTime();

  if (type === 'warga') {
    const citizen = db.citizens.find(c => c.id === id) || (data.oldName ? db.citizens.find(c => c.name.toLowerCase() === String(data.oldName).trim().toLowerCase()) : undefined);
    if (!citizen) {
      res.status(404).json({ error: 'Data warga tidak ditemukan' });
      return;
    }
    const oldName = citizen.name;
    if (data.name) {
      const cleanNewName = String(data.name).trim().replace(/\s+/g, ' ');
      if (cleanNewName.toLowerCase() !== oldName.toLowerCase()) {
        const duplicate = db.citizens.find(
          c => c.id !== citizen.id && c.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanNewName.toLowerCase()
        );
        if (duplicate) {
          res.status(400).json({ error: `Nama warga "${cleanNewName}" sudah terdaftar!` });
          return;
        }
      }
      citizen.name = cleanNewName;
      // Sync payment records and transfer confirmations
      db.wargaPayments.forEach(p => {
        if (p.citizenId === citizen.id || p.citizenName.toLowerCase() === oldName.toLowerCase()) {
          p.citizenId = citizen.id;
          p.citizenName = cleanNewName;
        }
      });
      if (Array.isArray(db.transferConfirmations)) {
        db.transferConfirmations.forEach(tc => {
          if (tc.citizenId === citizen.id || (tc.citizenName && tc.citizenName.toLowerCase() === oldName.toLowerCase())) {
            tc.citizenId = citizen.id;
            tc.citizenName = cleanNewName;
          }
        });
      }
    }
    if (data.weeks) {
      citizen.weeks = { ...citizen.weeks, ...data.weeks };
      citizen.totalPaid = Object.values(citizen.weeks).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }
    citizen.lastEditedBy = editedBy || 'Admin';
    citizen.lastEditedAt = timestamp;
    normalizeAndSortCitizens(db);

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'REKAPITULASI',
      action: 'EDIT',
      accountName: editedBy || 'Admin',
      details: `Admin merubah data rekap warga: ${oldName} -> ${citizen.name}`
    });
  } else if (type === 'sukarela') {
    const item = db.sukarelaPayments.find(s => s.id === id);
    if (!item) {
      res.status(404).json({ error: 'Data suka rela tidak ditemukan' });
      return;
    }
    const oldName = item.donorName;
    const oldAmount = item.amount;
    if (data.donorName) item.donorName = data.donorName.trim();
    if (data.amount) item.amount = parseInt(data.amount, 10) || item.amount;
    item.lastEditedBy = editedBy || 'Admin';
    item.lastEditedAt = timestamp;

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'DONASI SUKA RELA',
      action: 'EDIT',
      accountName: editedBy || 'Admin',
      details: `Admin merubah donasi suka rela ${oldName} (Rp ${oldAmount.toLocaleString('id-ID')} -> Rp ${item.amount.toLocaleString('id-ID')})`
    });
  } else if (type === 'pengeluaran') {
    const item = db.pengeluaranList.find(p => p.id === id);
    if (!item) {
      res.status(404).json({ error: 'Data pengeluaran tidak ditemukan' });
      return;
    }
    const oldAmount = item.amount;
    if (data.description) item.description = data.description.trim();
    if (data.amount) item.amount = parseInt(data.amount, 10) || item.amount;
    if (data.recipient) item.recipient = data.recipient.trim();
    item.lastEditedBy = editedBy || 'Admin';
    item.lastEditedAt = timestamp;

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'BENDAHARA',
      action: 'EDIT',
      accountName: editedBy || 'Admin',
      details: `Admin merubah pengeluaran "${item.description}": Rp ${oldAmount.toLocaleString('id-ID')} -> Rp ${item.amount.toLocaleString('id-ID')}`
    });
  }

  broadcastState();
  res.json({ success: true, timestamp, editedBy });
});

// Admin: Update Committee Settings
app.post('/api/admin/settings', (req, res) => {
  const { settings, updatedBy } = req.body;
  if (!settings) {
    res.status(400).json({ error: 'Data pengaturan tidak valid' });
    return;
  }

  const current = db.committeeSettings || defaultCommitteeSettings;
  const targetNum = parseInt(settings.targetPerPerson, 10);

  db.committeeSettings = {
    namaKegiatan: String(settings.namaKegiatan !== undefined ? settings.namaKegiatan : current.namaKegiatan).trim(),
    wilayah: String(settings.wilayah !== undefined ? settings.wilayah : current.wilayah).trim(),
    ketuaPanitia: String(settings.ketuaPanitia !== undefined ? settings.ketuaPanitia : current.ketuaPanitia).trim(),
    wakilKetua: String(settings.wakilKetua !== undefined ? settings.wakilKetua : current.wakilKetua).trim(),
    sekretaris: String(settings.sekretaris !== undefined ? settings.sekretaris : current.sekretaris).trim(),
    adminSistem: String(settings.adminSistem !== undefined ? settings.adminSistem : current.adminSistem).trim(),
    bendahara: String(settings.bendahara !== undefined ? settings.bendahara : current.bendahara).trim(),
    waGroupLink: String(settings.waGroupLink || current.waGroupLink || 'https://chat.whatsapp.com/FTB3kD2JXXNHOxKGj4f5X6?s=cl&p=a&mlu=0&ilr=4').trim(),
    nomorWa: String(settings.nomorWa || current.nomorWa || '081414033436').trim(),
    targetPerPerson: !isNaN(targetNum) && targetNum > 0 ? targetNum : db.targetPerPerson,
    pelindung: Array.isArray(settings.pelindung) ? settings.pelindung : (current.pelindung || []),
    penasehat: Array.isArray(settings.penasehat) ? settings.penasehat : (current.penasehat || []),
    penanggungJawab: Array.isArray(settings.penanggungJawab) ? settings.penanggungJawab : (current.penanggungJawab || []),
    sections: Array.isArray(settings.sections) ? settings.sections : (current.sections || []),
    welcomeGreetingId: settings.welcomeGreetingId !== undefined ? String(settings.welcomeGreetingId).trim() : current.welcomeGreetingId,
    welcomeSalam: settings.welcomeSalam !== undefined ? String(settings.welcomeSalam).trim() : current.welcomeSalam,
    welcomeHeadline: settings.welcomeHeadline !== undefined ? String(settings.welcomeHeadline).trim() : current.welcomeHeadline,
    welcomeBody: settings.welcomeBody !== undefined ? String(settings.welcomeBody).trim() : current.welcomeBody,
    welcomeClosing: settings.welcomeClosing !== undefined ? String(settings.welcomeClosing).trim() : current.welcomeClosing,
    activeWeek: settings.activeWeek !== undefined ? Number(settings.activeWeek) : current.activeWeek,
    week1StartDate: settings.week1StartDate !== undefined ? String(settings.week1StartDate).trim() : (current.week1StartDate || DEFAULT_WEEK1_START_DATE),
    autoRotateWeekly: settings.autoRotateWeekly !== undefined ? Boolean(settings.autoRotateWeekly) : (current.autoRotateWeekly ?? true),
    adminNote: settings.adminNote !== undefined ? String(settings.adminNote) : (current.adminNote || '')
  };

  if (!isNaN(targetNum) && targetNum > 0) {
    db.targetPerPerson = targetNum;
  }

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PENGATURAN',
    action: 'EDIT',
    accountName: updatedBy || 'Admin',
    details: `Admin memperbarui pengaturan panitia & sistem (Ketua: ${db.committeeSettings.ketuaPanitia}, Wk. Ketua: ${db.committeeSettings.wakilKetua}, Sekretaris: ${db.committeeSettings.sekretaris}, Target: Rp ${db.targetPerPerson.toLocaleString('id-ID')}).`
  });

  broadcastState();
  res.json({ success: true, settings: db.committeeSettings });
});

// Update Committee Structure (Anggota, Koordinator, Seksi, Pelindung, Penasehat, Penanggung Jawab)
app.post('/api/committee/structure', (req, res) => {
  const { sections, pelindung, penasehat, penanggungJawab, updatedBy, details } = req.body;
  if (!sections || !Array.isArray(sections)) {
    res.status(400).json({ error: 'Data struktur seksi tidak valid' });
    return;
  }

  if (!db.committeeSettings) {
    db.committeeSettings = { ...defaultCommitteeSettings };
  }

  // Sanitize sections
  const cleanedSections = sections.map((sec: any) => ({
    name: String(sec.name || 'Seksi').trim(),
    coordinator: String(sec.coordinator || '-').trim(),
    members: Array.isArray(sec.members) 
      ? sec.members.map((m: any) => String(m).trim()).filter(Boolean)
      : [String(sec.members || '').trim()].filter(Boolean)
  }));

  db.committeeSettings.sections = cleanedSections;
  if (Array.isArray(pelindung)) {
    db.committeeSettings.pelindung = pelindung.map((p: any) => String(p).trim()).filter(Boolean);
  }
  if (Array.isArray(penasehat)) {
    db.committeeSettings.penasehat = penasehat.map((p: any) => String(p).trim()).filter(Boolean);
  }
  if (Array.isArray(penanggungJawab)) {
    db.committeeSettings.penanggungJawab = penanggungJawab.map((p: any) => String(p).trim()).filter(Boolean);
  }

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PENGATURAN',
    action: 'EDIT',
    accountName: updatedBy || 'Admin',
    details: details || `Pembaruan susunan panitia: anggota & seksi kepanitiaan diperbarui (${cleanedSections.length} Seksi).`
  });

  broadcastState();
  res.json({ success: true, version: db.version, committeeSettings: db.committeeSettings });
});

// ==================== PROPOSAL KEGIATAN ENDPOINTS ====================

app.get('/api/proposal', (_req, res) => {
  const wargaCount = (db.citizens || []).filter(c => !c.isNgontrak).length || 132;
  if (!db.proposalData) {
    db.proposalData = getDefaultProposalData(db.committeeSettings || defaultCommitteeSettings, db.targetPerPerson || 250000, wargaCount);
  }
  res.json({
    success: true,
    proposalData: db.proposalData
  });
});

app.post('/api/proposal', (req, res) => {
  const { proposalData, updatedBy } = req.body;
  if (!proposalData || typeof proposalData !== 'object') {
    res.status(400).json({ error: 'Data proposal tidak valid' });
    return;
  }

  const timestamp = getIndonesianDateTime();
  const wargaCount = (db.citizens || []).filter(c => !c.isNgontrak).length || 132;
  const fallback = getDefaultProposalData(db.committeeSettings || defaultCommitteeSettings, db.targetPerPerson || 250000, wargaCount);

  db.proposalData = {
    ...fallback,
    ...proposalData,
    signers: {
      ...fallback.signers,
      ...(proposalData.signers || {})
    },
    signerRoles: {
      ...fallback.signerRoles,
      ...(proposalData.signerRoles || {})
    },
    lastUpdatedBy: String(updatedBy || 'Admin / Panitia').trim(),
    lastUpdatedAt: timestamp
  };

  // Sync committee structure and core officers if updated in Proposal Section H / Signers
  if (!db.committeeSettings) {
    db.committeeSettings = { ...defaultCommitteeSettings };
  }
  if (db.proposalData.signers) {
    if (db.proposalData.signers.ketuaPanitia) db.committeeSettings.ketuaPanitia = db.proposalData.signers.ketuaPanitia;
    if (db.proposalData.signers.wakilKetua) db.committeeSettings.wakilKetua = db.proposalData.signers.wakilKetua;
    if (db.proposalData.signers.sekretaris) db.committeeSettings.sekretaris = db.proposalData.signers.sekretaris;
    if (db.proposalData.signers.bendahara) db.committeeSettings.bendahara = db.proposalData.signers.bendahara;
  }
  if (db.proposalData.adminSistem) {
    db.committeeSettings.adminSistem = db.proposalData.adminSistem;
  }
  if (db.proposalData.pelindung) {
    db.committeeSettings.pelindung = db.proposalData.pelindung.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (db.proposalData.penasehat) {
    db.committeeSettings.penasehat = db.proposalData.penasehat.split(/[,&]/).map(s => s.trim()).filter(Boolean);
  }
  if (db.proposalData.penanggungJawab) {
    db.committeeSettings.penanggungJawab = db.proposalData.penanggungJawab.split(/[,&]/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(db.proposalData.sections) && db.proposalData.sections.length > 0) {
    db.committeeSettings.sections = db.proposalData.sections.map(sec => ({
      name: String(sec.name || 'Seksi').trim(),
      coordinator: String(sec.coordinator || '-').trim(),
      members: Array.isArray(sec.members)
        ? sec.members.map(m => String(m).trim()).filter(Boolean)
        : String(sec.members || '').split(',').map(m => m.trim()).filter(Boolean)
    }));
  }

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'PROPOSAL',
    action: 'EDIT',
    accountName: String(updatedBy || 'Admin / Panitia').trim(),
    details: `${updatedBy || 'Panitia'} memperbarui dokumen Proposal Kegiatan PHBI Isra Mi'raj (Bagian A s/d I & Lembar Pengesahan).`
  });

  broadcastState();
  res.json({
    success: true,
    version: db.version,
    proposalData: db.proposalData
  });
});

// ==================== PAYMENT & QRIS ENDPOINTS ====================

// 1. Get Payment Settings (Bank, E-Wallet, QRIS)
app.get('/api/payment-settings', (_req, res) => {
  res.json({
    success: true,
    paymentSettings: db.paymentSettings || defaultPaymentSettings
  });
});

// 2. Update Payment Settings (Bank, E-Wallet, QRIS) - Admin / Bendahara
app.post('/api/payment-settings', (req, res) => {
  const { paymentSettings, updatedBy } = req.body;
  if (!paymentSettings) {
    res.status(400).json({ error: 'Data pengaturan pembayaran tidak valid' });
    return;
  }

  db.paymentSettings = {
    bankAccounts: Array.isArray(paymentSettings.bankAccounts) ? paymentSettings.bankAccounts : (db.paymentSettings?.bankAccounts || defaultPaymentSettings.bankAccounts),
    eWallets: Array.isArray(paymentSettings.eWallets) ? paymentSettings.eWallets : (db.paymentSettings?.eWallets || defaultPaymentSettings.eWallets),
    qris: paymentSettings.qris ? {
      qrisName: String(paymentSettings.qris.qrisName || 'PHBI ISRA MI\'RAJ KP BARANI').trim(),
      qrisNmid: String(paymentSettings.qris.qrisNmid || '').trim(),
      qrisImageUrl: String(paymentSettings.qris.qrisImageUrl || '').trim(),
      qrisPayloadString: String(paymentSettings.qris.qrisPayloadString || '').trim(),
      instructions: String(paymentSettings.qris.instructions || defaultPaymentSettings.qris.instructions).trim(),
    } : (db.paymentSettings?.qris || defaultPaymentSettings.qris)
  };

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PEMBAYARAN',
    action: 'EDIT',
    accountName: updatedBy || 'Bendahara',
    details: `${updatedBy || 'Bendahara'} memperbarui data rekening Bank, E-Wallet & Kode QRIS resmi.`
  });

  broadcastState();
  res.json({ success: true, paymentSettings: db.paymentSettings });
});

// 2a. Delete Bank Account Endpoint
app.delete('/api/payment-settings/banks/:id', (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || 'Bendahara';

  if (!db.paymentSettings) db.paymentSettings = { ...defaultPaymentSettings };
  if (!db.paymentSettings.bankAccounts) db.paymentSettings.bankAccounts = [];

  const target = db.paymentSettings.bankAccounts.find(b => b.id === id);
  db.paymentSettings.bankAccounts = db.paymentSettings.bankAccounts.filter(b => b.id !== id);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PEMBAYARAN',
    action: 'HAPUS',
    accountName: deletedBy,
    details: `${deletedBy} menghapus rekening bank: ${target ? target.bankName + ' (' + target.accountNumber + ')' : id}`
  });

  broadcastState();
  res.json({ success: true, paymentSettings: db.paymentSettings });
});

// 2b. Delete E-Wallet Endpoint
app.delete('/api/payment-settings/wallets/:id', (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || 'Bendahara';

  if (!db.paymentSettings) db.paymentSettings = { ...defaultPaymentSettings };
  if (!db.paymentSettings.eWallets) db.paymentSettings.eWallets = [];

  const target = db.paymentSettings.eWallets.find(w => w.id === id);
  db.paymentSettings.eWallets = db.paymentSettings.eWallets.filter(w => w.id !== id);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PEMBAYARAN',
    action: 'HAPUS',
    accountName: deletedBy,
    details: `${deletedBy} menghapus akun e-wallet: ${target ? target.walletName + ' (' + target.accountNumber + ')' : id}`
  });

  broadcastState();
  res.json({ success: true, paymentSettings: db.paymentSettings });
});

// 3. Get All Transfer Confirmations
app.get('/api/transfer-confirmations', (_req, res) => {
  res.json({
    success: true,
    transferConfirmations: db.transferConfirmations || []
  });
});

// 4. Submit Transfer Confirmation (Warga / Donatur)
app.post('/api/transfer-confirmations', (req, res) => {
  const {
    citizenId,
    citizenName,
    tipePembayaran,
    mingguKe,
    metode,
    tujuanNama,
    pengirimNama,
    pengirimBankAtauWallet,
    nomorWa,
    nominal,
    buktiUrl,
    catatan
  } = req.body;

  const cleanedWa = String(nomorWa || '').trim();
  if (!cleanedWa) {
    res.status(400).json({ error: 'Nomor WhatsApp yang aktif wajib diisi untuk mengirim bukti transfer' });
    return;
  }

  const amountNum = parseInt(nominal, 10);
  if (!citizenName || isNaN(amountNum) || amountNum <= 0) {
    res.status(400).json({ error: 'Nama dan nominal transfer harus diisi dengan benar' });
    return;
  }

  syncWeeklyRotationInMemory(db);
  const currentSched = getWeeklyScheduleInfo(db.committeeSettings);
  const parsedMingguKe = Array.isArray(mingguKe)
    ? mingguKe.map((w: any) => parseInt(w, 10)).filter((w: number) => w >= 1 && w <= 12)
    : [];

  if (tipePembayaran !== 'donasi_sukarela' && parsedMingguKe.some((w: number) => w < currentSched.activeWeek)) {
    res.status(400).json({
      error: `Minggu yang sudah terlewat tidak dapat dipilih lagi. Pembayaran saat ini mulai dari Minggu ke-${currentSched.activeWeek}.`
    });
    return;
  }

  const realtimeTimestamp = getIndonesianDateTime();
  const newConfirmation: TransferConfirmation = {
    id: 'trf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    tanggal: realtimeTimestamp,
    timestamp: Date.now(),
    citizenId: citizenId || undefined,
    citizenName: String(citizenName).trim(),
    nomorWa: cleanedWa,
    tipePembayaran: tipePembayaran === 'donasi_sukarela' ? 'donasi_sukarela' : 'iuran_pekanan',
    mingguKe: parsedMingguKe,
    metode: metode || 'bank_transfer',
    tujuanNama: String(tujuanNama || 'Rekening Panitia').trim(),
    pengirimNama: String(pengirimNama || citizenName).trim(),
    pengirimBankAtauWallet: pengirimBankAtauWallet ? String(pengirimBankAtauWallet).trim() : undefined,
    nominal: amountNum,
    buktiUrl: buktiUrl ? String(buktiUrl) : undefined,
    catatan: catatan ? String(catatan).trim() : undefined,
    status: 'pending'
  };

  if (!db.transferConfirmations) db.transferConfirmations = [];
  db.transferConfirmations.unshift(newConfirmation);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: realtimeTimestamp,
    category: 'PEMBAYARAN',
    action: 'TAMBAH',
    accountName: pengirimNama || citizenName,
    details: `Pengajuan konfirmasi transfer ${metode.toUpperCase()} sebesar Rp ${amountNum.toLocaleString('id-ID')} atas nama ${citizenName} (${tipePembayaran === 'donasi_sukarela' ? 'Donasi Sukarela' : 'Iuran Pekanan'}). Menunggu verifikasi bendahara.`
  });

  broadcastState();
  res.json({ success: true, confirmation: newConfirmation });
});

// 5. Verify / Approve Transfer Confirmation (Admin / Bendahara)
app.post('/api/transfer-confirmations/:id/verify', (req, res) => {
  const { id } = req.params;
  const { verifiedBy } = req.body;

  if (!db.transferConfirmations) db.transferConfirmations = [];
  const conf = db.transferConfirmations.find(c => c.id === id);
  if (!conf) {
    res.status(404).json({ error: 'Data konfirmasi transfer tidak ditemukan' });
    return;
  }

  if (conf.status === 'verified') {
    res.status(400).json({ error: 'Konfirmasi transfer ini sudah diverifikasi sebelumnya' });
    return;
  }

  // Waktu Real-Time Indonesia (WIB) saat verifikasi bukti transfer disetujui
  const timestamp = getIndonesianDateTime();
  const dateIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  conf.status = 'verified';
  conf.verifiedBy = verifiedBy || 'Bendahara';
  conf.verifiedAt = timestamp;

  // If this was for iuran pekanan, mark the citizen's week(s) as paid
  if (conf.tipePembayaran === 'iuran_pekanan') {
    let citizen: Citizen | undefined;
    if (conf.citizenName) {
      citizen = db.citizens.find(c => c.name.toLowerCase().trim() === conf.citizenName.toLowerCase().trim());
    }
    if (!citizen && conf.citizenId) {
      citizen = db.citizens.find(c => c.id === conf.citizenId);
    }

    if (citizen) {
      conf.citizenId = citizen.id;
      conf.citizenName = citizen.name;
      if (!citizen.weeks) citizen.weeks = {};
      const weeksToMark = (conf.mingguKe && conf.mingguKe.length > 0) 
        ? conf.mingguKe 
        : [1]; // fallback
      const perWeekAmount = Math.round(conf.nominal / weeksToMark.length);

      weeksToMark.forEach(w => {
        citizen!.weeks[w] = perWeekAmount;
        db.wargaPayments.unshift({
          id: 'pay-' + Date.now() + '-' + w,
          citizenId: citizen!.id,
          citizenName: citizen!.name,
          week: w,
          amount: perWeekAmount,
          timestamp,
          dateIso,
          recordedBy: verifiedBy || 'Bendahara (Verifikasi Transfer)'
        });
      });

      // Recalculate citizen total
      citizen.totalPaid = Object.values(citizen.weeks).reduce((a, b) => a + (Number(b) || 0), 0);
      citizen.lastEditedBy = verifiedBy || 'Bendahara';
      citizen.lastEditedAt = timestamp;
    }
  } else {
    // Treat as donasi sukarela / infaq
    db.sukarelaPayments.unshift({
      id: 'don-' + Date.now(),
      donorName: conf.citizenName,
      amount: conf.nominal,
      timestamp,
      dateIso,
      keterangan: `Transfer via ${conf.metode.toUpperCase()} (${conf.tujuanNama})${conf.catatan ? ' - ' + conf.catatan : ''}`,
      recordedBy: verifiedBy || 'Bendahara (Verifikasi Transfer)'
    });
  }

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp,
    category: 'PEMBAYARAN',
    action: 'EDIT',
    accountName: verifiedBy || 'Bendahara',
    details: `${verifiedBy || 'Bendahara'} MENYETUJUI bukti transfer ${conf.metode.toUpperCase()} Rp ${conf.nominal.toLocaleString('id-ID')} dari ${conf.citizenName}. Dana berhasil dibukukan ke kas.`
  });

  broadcastState();
  res.json({ success: true, confirmation: conf });
});

// 6. Reject Transfer Confirmation (Admin / Bendahara)
app.post('/api/transfer-confirmations/:id/reject', (req, res) => {
  const { id } = req.params;
  const { verifiedBy, reason } = req.body;

  if (!db.transferConfirmations) db.transferConfirmations = [];
  const conf = db.transferConfirmations.find(c => c.id === id);
  if (!conf) {
    res.status(404).json({ error: 'Data konfirmasi transfer tidak ditemukan' });
    return;
  }

  conf.status = 'rejected';
  conf.verifiedBy = verifiedBy || 'Bendahara';
  conf.verifiedAt = getIndonesianDateTime();
  conf.rejectReason = reason || 'Bukti transfer tidak sesuai atau dana belum masuk';

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'PEMBAYARAN',
    action: 'EDIT',
    accountName: verifiedBy || 'Bendahara',
    details: `${verifiedBy || 'Bendahara'} MENOLAK konfirmasi transfer Rp ${conf.nominal.toLocaleString('id-ID')} dari ${conf.citizenName}. Alasan: ${conf.rejectReason}`
  });

  broadcastState();
  res.json({ success: true, confirmation: conf });
});

// 7. Delete Transfer Confirmation
app.delete('/api/transfer-confirmations/:id', (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || 'Bendahara';

  if (!db.transferConfirmations) db.transferConfirmations = [];
  const target = db.transferConfirmations.find(c => c.id === id);
  db.transferConfirmations = db.transferConfirmations.filter(c => c.id !== id);

  if (target) {
    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp: getIndonesianDateTime(),
      category: 'PEMBAYARAN',
      action: 'HAPUS',
      accountName: deletedBy,
      details: `${deletedBy} menghapus catatan konfirmasi transfer ${target.metode.toUpperCase()} Rp ${target.nominal.toLocaleString('id-ID')} atas nama ${target.citizenName}.`
    });
  }

  broadcastState();
  res.json({ success: true, message: 'Data konfirmasi transfer berhasil dihapus' });
});

// Admin: Reset Data Awal (preserve current citizen names/edits/deletions, wipe all donation payments & reset cash expenditures)
app.post('/api/admin/reset-data', async (req, res) => {
  try {
    const { confirmedBy } = req.body;
    const timestamp = getIndonesianDateTime();

    const sourceCitizens = (Array.isArray(db.citizens) && db.citizens.length > 0)
      ? db.citizens
      : createInitialCitizens();

    db.citizens = sourceCitizens.map(c => {
      const emptyWeeks: { [w: number]: number } = {};
      for (let w = 1; w <= 12; w++) {
        emptyWeeks[w] = 0;
      }
      return {
        ...c,
        weeks: emptyWeeks,
        excludedWeeks: {},
        totalPaid: 0,
        totalExcluded: 0,
        lastEditedBy: confirmedBy || 'Admin',
        lastEditedAt: timestamp
      };
    });

    normalizeAndSortCitizens(db);

    // Clear all incoming payments, voluntary donations, transfer confirmations, and outgoing expenditures
    db.wargaPayments = [];
    db.sukarelaPayments = [];
    db.pengeluaranList = [];
    db.transferConfirmations = [];

    const wargaUtamaCount = db.citizens.filter(c => !c.isNgontrak).length;

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'PENGATURAN',
      action: 'HAPUS',
      accountName: confirmedBy || 'Admin',
      details: `KOSONGKAN SEMUA DONASI MASUK & KELUAR: Mengosongkan seluruh pembayaran iuran warga, donasi sukarela, konfirmasi transfer, dan pengeluaran kas. Saldo kas kembali Rp 0. Daftar ${wargaUtamaCount} warga siap dengan data bersih.`
    });

    db.version = (Number(db.version) || 1) + 1;
    await saveDb(db);
    broadcastState();
    res.json({ 
      success: true, 
      message: `Semua donasi masuk dan keluar berhasil dikosongkan. Total uang masuk, keluar, dan saldo kas kini Rp 0.` 
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reset-data:', err);
    res.status(500).json({ error: 'Gagal mengosongkan data donasi: ' + err.message });
  }
});

// Admin: Hapus Semua Data Warga Secara Permanen (0 Warga)
app.post('/api/admin/clear-all-citizens', async (req, res) => {
  try {
    const { confirmedBy = 'Admin' } = req.body;
    const timestamp = getIndonesianDateTime();
    const prevCount = Array.isArray(db.citizens) ? db.citizens.length : 0;

    db.citizens = [];
    db.wargaPayments = [];
    db.transferConfirmations = [];

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'PENGATURAN',
      action: 'HAPUS',
      accountName: confirmedBy,
      details: `HAPUS SEMUA DATA WARGA PERMANEN: Menghapus seluruh ${prevCount} nama warga secara permanen. Daftar warga kini bersih (0 warga).`
    });

    db.version = (Number(db.version) || 1) + 1;
    await saveDb(db);
    broadcastState();
    res.json({
      success: true,
      message: `Berhasil menghapus seluruh ${prevCount} nama warga secara permanen.`
    });
  } catch (err: any) {
    console.error('Error in /api/admin/clear-all-citizens:', err);
    res.status(500).json({ error: 'Gagal menghapus warga: ' + err.message });
  }
});

// Admin: Clear RT 08 Data (Specifically for RT 08 citizens)
app.post('/api/admin/clear-rt08', async (req, res) => {
  try {
    const { confirmedBy } = req.body;
    const timestamp = getIndonesianDateTime();

    const rt08CitizenIds = new Set<string>();
    
    // 1. Remove RT 08 Citizens entirely (as requested: "Hapus nama warga pada rekap rt08")
    const initialCitizenCount = db.citizens.length;
    db.citizens = (db.citizens || []).filter(c => {
      if (c.rt === '08') {
        rt08CitizenIds.add(c.id);
        return false;
      }
      // Also remove any "Warga [Number]" globally as requested
      if (/^Warga\s+\d+$/i.test(c.name)) {
        rt08CitizenIds.add(c.id);
        return false;
      }
      return true;
    });
    const removedCitizens = initialCitizenCount - db.citizens.length;

    // 2. Remove related payment records
    const initialPaymentCount = db.wargaPayments.length;
    db.wargaPayments = db.wargaPayments.filter(p => !rt08CitizenIds.has(p.citizenId));
    const removedPayments = initialPaymentCount - db.wargaPayments.length;

    // 3. Remove related transfer confirmations
    if (Array.isArray(db.transferConfirmations)) {
      db.transferConfirmations = db.transferConfirmations.filter(tc => 
        !tc.citizenId || !rt08CitizenIds.has(tc.citizenId)
      );
    }

    db.auditLogs.unshift({
      id: 'log-clear-rt08-' + Date.now(),
      timestamp,
      category: 'PENGATURAN',
      action: 'HAPUS',
      accountName: confirmedBy || 'Admin',
      details: `PEMBERSIHAN DATA RT 08: Seluruh data warga RT 08 dan nama placeholder "Warga X" telah dihapus secara permanen. ${removedCitizens} warga dihapus dan ${removedPayments} catatan pembayaran dibersihkan.`
    });

    normalizeAndSortCitizens(db);
    await saveDb(db);
    broadcastState();

    res.json({
      success: true,
      message: `Berhasil menghapus ${removedCitizens} data warga (RT 08 & Placeholder) dan membersihkan seluruh riwayat pembayarannya.`
    });
  } catch (err: any) {
    console.error('[Admin] Error clearing RT 08 data:', err);
    res.status(500).json({ error: 'Gagal membersihkan data warga RT 08' });
  }
});

// ==================== PENYIMPANAN MULTI-TAHUN (ARSIP ANTAR-PERIODE) ====================

function buildPeriodArchiveFromState(
  state: AppState,
  opts: {
    id?: string;
    periodLabel?: string;
    hijriYear?: string;
    masehiYear?: string;
    catatan?: string;
    archivedBy?: string;
  }
): PeriodArchive {
  const periodLabel = (opts.periodLabel || state.activePeriodLabel || '1448 H / 2027 M').trim();
  const parts = periodLabel.split('/').map(s => s.trim());
  const hijriYear = (opts.hijriYear || parts[0] || '1448 H').trim();
  const masehiYear = (opts.masehiYear || parts[1] || '2027 M').trim();

  const citizensList = Array.isArray(state.citizens) ? state.citizens : [];
  const wargaUtama = citizensList.filter(c => !c.isNgontrak);
  const targetPerPerson = Number(state.targetPerPerson) || 250000;
  const totalTargetWarga = wargaUtama.length * targetPerPerson;

  const wargaPayments = Array.isArray(state.wargaPayments) ? state.wargaPayments : [];
  const sukarelaPayments = Array.isArray(state.sukarelaPayments) ? state.sukarelaPayments : [];
  const pengeluaranList = Array.isArray(state.pengeluaranList) ? state.pengeluaranList : [];

  const totalWargaPaid = wargaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalSukarela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalMasuk = totalWargaPaid + totalSukarela;
  const totalKeluar = pengeluaranList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const sisaSaldo = totalMasuk - totalKeluar;
  const wargaLunasCount = wargaUtama.filter(c => (Number(c.totalPaid) || 0) >= targetPerPerson).length;

  const cs = state.committeeSettings || defaultCommitteeSettings;

  return {
    id: opts.id || 'arsip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    periodLabel,
    hijriYear,
    masehiYear,
    namaKegiatan: cs.namaKegiatan || `Peringatan Hari Besar Islam (PHBI) Isra Miraj Nabi Muhammad SAW ${periodLabel}`,
    archivedAt: getIndonesianDateTime(),
    archivedBy: String(opts.archivedBy || 'Admin PHBI').trim(),
    catatan: opts.catatan ? String(opts.catatan).trim() : `Arsip resmi laporan keuangan, rekapitulasi 12 minggu, struktur panitia, dan proposal PHBI Isra Mi'raj periode ${periodLabel}.`,
    summary: {
      totalCitizens: citizensList.length,
      wargaUtamaCount: wargaUtama.length,
      targetPerPerson,
      totalTargetWarga,
      totalWargaPaid,
      totalSukarela,
      totalMasuk,
      totalKeluar,
      sisaSaldo,
      wargaLunasCount,
      sukarelaCount: sukarelaPayments.length,
      pengeluaranCount: pengeluaranList.length,
      ketuaPanitia: cs.ketuaPanitia || 'Sahroji',
      wakilKetua: cs.wakilKetua || 'Riki',
      sekretaris: cs.sekretaris || 'Rama',
      bendahara: cs.bendahara || 'Alwi'
    },
    snapshot: JSON.parse(JSON.stringify({
      citizens: citizensList,
      wargaPayments,
      sukarelaPayments,
      pengeluaranList,
      targetPerPerson,
      committeeSettings: cs,
      proposalData: state.proposalData
    }))
  };
}

function updateStateStringsForNewPeriod(
  state: AppState,
  oldPeriodLabel: string,
  newPeriodLabel: string,
  newHijriYear: string,
  newMasehiYear: string
) {
  const oldParts = oldPeriodLabel.split('/').map(s => s.trim());
  const oldHijri = oldParts[0] || '1448 H';
  const oldMasehi = oldParts[1] || '2027 M';
  const oldMasehiNum = oldMasehi.replace(/\D/g, '') || '2027';
  const newMasehiNum = newMasehiYear.replace(/\D/g, '') || '2028';

  const replacePeriodText = (txt: string | undefined): string => {
    if (!txt || typeof txt !== 'string') return txt || '';
    let res = txt;
    if (oldPeriodLabel && res.includes(oldPeriodLabel)) {
      res = res.split(oldPeriodLabel).join(newPeriodLabel);
    }
    res = res.replace(/\d{4}\s*H\s*\/\s*\d{4}\s*M/gi, newPeriodLabel);
    if (oldHijri && res.includes(oldHijri)) {
      res = res.split(oldHijri).join(newHijriYear);
    }
    if (oldMasehi && res.includes(oldMasehi)) {
      res = res.split(oldMasehi).join(newMasehiYear);
    }
    if (oldMasehiNum && newMasehiNum && oldMasehiNum !== newMasehiNum) {
      res = res.split(`/${oldMasehiNum}`).join(`/${newMasehiNum}`);
      res = res.split(` ${oldMasehiNum}`).join(` ${newMasehiNum}`);
    }
    return res;
  };

  if (state.committeeSettings) {
    state.committeeSettings.namaKegiatan = replacePeriodText(state.committeeSettings.namaKegiatan);
  }

  if (state.proposalData) {
    const p = state.proposalData;
    const strKeys: (keyof ProposalData)[] = [
      'kopBaris1',
      'kopBaris2',
      'nomorProposal',
      'perihal',
      'judulProposal',
      'temaKegiatan',
      'tanggalSurat',
      'kataPengantar',
      'maksudKegiatan',
      'bentukKegiatanDeskripsi',
      'hariTanggal',
      'waktuPelaksanaan',
      'tempatPelaksanaan',
      'sumberDanaDeskripsi',
      'penutup'
    ];
    for (const k of strKeys) {
      const val = p[k];
      if (typeof val === 'string') {
        (p as any)[k] = replacePeriodText(val);
      }
    }
    if (Array.isArray(p.tujuanKegiatan)) {
      p.tujuanKegiatan = p.tujuanKegiatan.map(t => replacePeriodText(t));
    }
    if (Array.isArray(p.bentukKegiatanList)) {
      p.bentukKegiatanList = p.bentukKegiatanList.map(b => replacePeriodText(b));
    }
    if (Array.isArray(p.rundownAcara)) {
      p.rundownAcara.forEach(rd => {
        rd.kegiatan = replacePeriodText(rd.kegiatan);
      });
    }
  }
}

// 1. Get all multi-year period archives & active period
app.get('/api/archives', (_req, res) => {
  res.json({
    success: true,
    activePeriodLabel: db.activePeriodLabel || '1448 H / 2027 M',
    periodArchives: db.periodArchives || []
  });
});

// 2. Save current period to archive (and optionally start a new period / year)
app.post('/api/admin/archives/save', async (req, res) => {
  const {
    periodLabel,
    hijriYear,
    masehiYear,
    catatan,
    archivedBy,
    overwriteExistingPeriod,
    startNewPeriod,
    newHijriYear,
    newMasehiYear,
    newTargetPerPerson,
    resetTransactions
  } = req.body;

  if (!Array.isArray(db.periodArchives)) {
    db.periodArchives = [];
  }

  const currentLabel = String(periodLabel || db.activePeriodLabel || '1448 H / 2027 M').trim();
  const existingIdx = db.periodArchives.findIndex(
    a => a.periodLabel.toLowerCase() === currentLabel.toLowerCase()
  );

  const archiveEntry = buildPeriodArchiveFromState(db, {
    id: existingIdx >= 0 && overwriteExistingPeriod ? db.periodArchives[existingIdx].id : undefined,
    periodLabel: currentLabel,
    hijriYear,
    masehiYear,
    catatan,
    archivedBy
  });

  if (existingIdx >= 0 && overwriteExistingPeriod) {
    db.periodArchives[existingIdx] = archiveEntry;
  } else {
    db.periodArchives.unshift(archiveEntry);
  }

  // Persist individual archive document in Cloud Firestore appState collection as well
  if (firestoreDb) {
    try {
      const archiveRef = doc(firestoreDb, 'appState', `archive_${archiveEntry.id}`);
      await setDoc(archiveRef, JSON.parse(JSON.stringify(archiveEntry)));
    } catch (err) {
      console.error('[Firebase] Error saving individual archive doc:', err);
    }
  }

  const timestamp = getIndonesianDateTime();
  let responseMsg = `Periode ${archiveEntry.periodLabel} berhasil disimpan ke Arsip Multi-Tahun.`;

  // If Admin also wants to transition to a new period (e.g. 1449 H / 2028 M)
  if (startNewPeriod && newHijriYear && newMasehiYear) {
    const cleanHijri = String(newHijriYear).trim().toUpperCase().endsWith('H')
      ? String(newHijriYear).trim()
      : `${String(newHijriYear).trim()} H`;
    const cleanMasehi = String(newMasehiYear).trim().toUpperCase().endsWith('M')
      ? String(newMasehiYear).trim()
      : `${String(newMasehiYear).trim()} M`;
    const nextPeriodLabel = `${cleanHijri} / ${cleanMasehi}`;
    const prevPeriodLabel = db.activePeriodLabel || currentLabel;

    db.activePeriodLabel = nextPeriodLabel;

    const targetNum = parseInt(newTargetPerPerson, 10);
    if (!isNaN(targetNum) && targetNum > 0) {
      db.targetPerPerson = targetNum;
      if (db.committeeSettings) {
        db.committeeSettings.targetPerPerson = targetNum;
      }
    }

    updateStateStringsForNewPeriod(db, prevPeriodLabel, nextPeriodLabel, cleanHijri, cleanMasehi);

    if (resetTransactions !== false) {
      db.citizens = (db.citizens || []).map(c => {
        const emptyWeeks: { [w: number]: number } = {};
        for (let w = 1; w <= 12; w++) {
          emptyWeeks[w] = 0;
        }
        return {
          ...c,
          weeks: emptyWeeks,
          totalPaid: 0,
          lastEditedBy: archivedBy || 'Admin',
          lastEditedAt: timestamp
        };
      });
      db.wargaPayments = [];
      db.sukarelaPayments = [];
      db.pengeluaranList = [];
      db.transferConfirmations = [];
    }

    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'ARSIP PERIODE',
      action: 'TAMBAH',
      accountName: archivedBy || 'Admin',
      details: `TUTUP BUKU & PERIODE BARU: Mengarsipkan periode ${archiveEntry.periodLabel} (Saldo Akhir: Rp ${archiveEntry.summary.sisaSaldo.toLocaleString('id-ID')}) dan memulai periode baru ${nextPeriodLabel}.`
    });

    responseMsg = `Periode ${archiveEntry.periodLabel} berhasil diarsipkan dan sistem kini aktif pada periode baru ${nextPeriodLabel}!`;
  } else {
    db.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp,
      category: 'ARSIP PERIODE',
      action: existingIdx >= 0 && overwriteExistingPeriod ? 'EDIT' : 'TAMBAH',
      accountName: archivedBy || 'Admin',
      details: `Menyimpan snapshot Arsip Periode ${archiveEntry.periodLabel} (Total Masuk: Rp ${archiveEntry.summary.totalMasuk.toLocaleString('id-ID')}, Keluar: Rp ${archiveEntry.summary.totalKeluar.toLocaleString('id-ID')}, Sisa Saldo: Rp ${archiveEntry.summary.sisaSaldo.toLocaleString('id-ID')}).`
    });
  }

  broadcastState();
  res.json({
    success: true,
    message: responseMsg,
    archive: archiveEntry,
    activePeriodLabel: db.activePeriodLabel,
    periodArchives: db.periodArchives
  });
});

// 3. Restore / Activate a historical period from archive
app.post('/api/admin/archives/:id/restore', async (req, res) => {
  const { id } = req.params;
  const { restoredBy, autoBackupCurrent } = req.body;

  if (!Array.isArray(db.periodArchives)) {
    db.periodArchives = [];
  }

  const targetArchive = db.periodArchives.find(a => a.id === id);
  if (!targetArchive || !targetArchive.snapshot) {
    res.status(404).json({ error: 'Data arsip periode tidak ditemukan' });
    return;
  }

  // Optionally auto-backup current active state before switching
  if (autoBackupCurrent !== false) {
    const currentLabel = db.activePeriodLabel || '1448 H / 2027 M';
    if (currentLabel.toLowerCase() !== targetArchive.periodLabel.toLowerCase()) {
      const existingCurrIdx = db.periodArchives.findIndex(
        a => a.periodLabel.toLowerCase() === currentLabel.toLowerCase()
      );
      const backupEntry = buildPeriodArchiveFromState(db, {
        id: existingCurrIdx >= 0 ? db.periodArchives[existingCurrIdx].id : undefined,
        periodLabel: currentLabel,
        catatan: `Cadangan otomatis sebelum beralih ke periode ${targetArchive.periodLabel}`,
        archivedBy: restoredBy || 'Admin'
      });
      if (existingCurrIdx >= 0) {
        db.periodArchives[existingCurrIdx] = backupEntry;
      } else {
        db.periodArchives.unshift(backupEntry);
      }
    }
  }

  const snap = JSON.parse(JSON.stringify(targetArchive.snapshot));
  const previousLabel = db.activePeriodLabel || '1448 H / 2027 M';

  db.activePeriodLabel = targetArchive.periodLabel;
  db.citizens = Array.isArray(snap.citizens) && snap.citizens.length > 0 ? snap.citizens : db.citizens;
  db.wargaPayments = Array.isArray(snap.wargaPayments) ? snap.wargaPayments : [];
  db.sukarelaPayments = Array.isArray(snap.sukarelaPayments) ? snap.sukarelaPayments : [];
  db.pengeluaranList = Array.isArray(snap.pengeluaranList) ? snap.pengeluaranList : [];
  if (snap.targetPerPerson) {
    db.targetPerPerson = snap.targetPerPerson;
  }
  if (snap.committeeSettings) {
    db.committeeSettings = snap.committeeSettings;
  }
  if (snap.proposalData) {
    db.proposalData = snap.proposalData;
  }

  normalizeAndSortCitizens(db);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'ARSIP PERIODE',
    action: 'EDIT',
    accountName: restoredBy || 'Admin',
    details: `BERALIH PERIODE AKTIF: Mengaktifkan data periode ${targetArchive.periodLabel} dari Arsip Multi-Tahun (sebelumnya: ${previousLabel}).`
  });

  broadcastState();
  res.json({
    success: true,
    message: `Berhasil mengaktifkan dan memuat seluruh data periode ${targetArchive.periodLabel}!`,
    activePeriodLabel: db.activePeriodLabel
  });
});

// 4. Delete an archive entry
app.delete('/api/admin/archives/:id', (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || 'Admin';

  if (!Array.isArray(db.periodArchives)) {
    db.periodArchives = [];
  }

  const target = db.periodArchives.find(a => a.id === id);
  if (!target) {
    res.status(404).json({ error: 'Arsip periode tidak ditemukan' });
    return;
  }

  db.periodArchives = db.periodArchives.filter(a => a.id !== id);

  db.auditLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: getIndonesianDateTime(),
    category: 'ARSIP PERIODE',
    action: 'HAPUS',
    accountName: deletedBy,
    details: `Menghapus arsip periode ${target.periodLabel} (Diarsipkan pada: ${target.archivedAt}).`
  });

  broadcastState();
  res.json({
    success: true,
    message: `Arsip periode ${target.periodLabel} berhasil dihapus.`,
    periodArchives: db.periodArchives
  });
});



// Vite middleware & Static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return next();
      }
      try {
        // Load the index.html
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        // Transform it via Vite
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server PANITIA ISRA MIRAJ running on port ${PORT}`);
  });

  // Initialize Cloud Firestore synchronization in background so port binds immediately for Cloud Run health check
  initFirestoreSync().catch((err) => {
    console.error('[Firebase] Background Firestore sync init error:', err);
  });

  // Real-time automatic weekly rotation check every 30 seconds (WIB date)
  setInterval(() => {
    if (syncWeeklyRotationInMemory(db)) {
      broadcastState();
    }
  }, 30000);
}

start();
