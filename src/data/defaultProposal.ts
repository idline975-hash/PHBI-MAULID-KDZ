import type { ProposalData, CommitteeSettings } from '../types.ts';

export function getDefaultProposalData(committeeSettings?: CommitteeSettings, targetPerPerson: number = 250000, wargaCount: number = 132): ProposalData {
  const ketua = committeeSettings?.ketuaPanitia || '';
  const wakil = committeeSettings?.wakilKetua || '';
  const sekretaris = committeeSettings?.sekretaris || '';
  const bendahara = committeeSettings?.bendahara || '';
  const kepalaDesa = (committeeSettings?.pelindung && committeeSettings.pelindung.length > 0) ? committeeSettings.pelindung[0] : '';
  const ketuaRt = (committeeSettings?.penanggungJawab && committeeSettings.penanggungJawab.length > 0) ? committeeSettings.penanggungJawab[0] : '';
  const tokoh = (committeeSettings?.penasehat && committeeSettings.penasehat.length > 0)
    ? committeeSettings.penasehat.join(' & ')
    : '';

  const estimasiWargaUtama = wargaCount * targetPerPerson;
  const pelindungStr = (committeeSettings?.pelindung && committeeSettings.pelindung.length > 0)
    ? committeeSettings.pelindung.join(', ')
    : '';
  const penasehatStr = (committeeSettings?.penasehat && committeeSettings.penasehat.length > 0)
    ? committeeSettings.penasehat.join(' & ')
    : '';
  const penanggungJawabStr = (committeeSettings?.penanggungJawab && committeeSettings.penanggungJawab.length > 0)
    ? committeeSettings.penanggungJawab.join(' & ')
    : '';

  return {
    kopBaris1: 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)',
    kopBaris2: 'MAULID NABI NABI MUHAMMAD SAW 1448 H / 2027 M',
    kopAlamat: 'Lingkungan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten',
    kopSekretariat: `Sekretariat: Majelis Kp. Kedung Sapi • Hotline / WhatsApp Resmi: ${committeeSettings?.nomorWa || '081414033436'}`,
    nomorProposal: '001/PHBI-IM/KP-KDS/I/2027',
    lampiran: '1 (Satu) Bundel Berkas',
    perihal: 'Permohonan Dukungan & Partisipasi Kegiatan PHBI Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M',
    kepadaYth: 'Bapak/Ibu Warga Masyarakat Kp. Kedung Sapi, Para Donatur, Tokoh Masyarakat & Simpatisan',
    judulProposal: 'PROPOSAL KEGIATAN PERINGATAN HARI BESAR ISLAM (PHBI) MAULID NABI NABI MUHAMMAD SAW 1448 H / 2027 M',
    temaKegiatan: 'Meneladani Akhlak Mulia Rasulullah SAW serta Memperkokoh Ukhuwah Islamiyah dan Semangat Gotong Royong Warga Kp. Kedung Sapi melalui Momentum Maulid Nabi 1448 H / 2027 M',
    tanggalSurat: 'Serang, Januari 2027',
    coverJudul: 'PROPOSAL KEGIATAN',
    coverSubjudul: 'PERINGATAN HARI BESAR ISLAM (PHBI)',
    coverInstansi: 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)',
    coverTahun: '1448 H / 2027 M',
    coverWilayah: 'KP. KEDUNG SAPI, DESA KP. BARU, KEC. PAMARAYAN, KAB. SERANG – BANTEN',

    // A. Kata Pengantar
    kataPengantar: `Bismillahirrahmanirrahim.\nAssalamu'alaikum Warahmatullahi Wabarakatuh.\n\nPuji dan syukur marilah senantiasa kita panjatkan ke hadirat Allah SWT yang telah melimpahkan rahmat, taufik, hidayah, serta nikmat kesehatan dan keimanan kepada kita semua. Shalawat serta salam semoga senantiasa tercurah kepada junjungan kita Nabi Agung Muhammad SAW, beserta keluarga, para sahabat, dan seluruh umatnya yang istiqomah menjalankan sunnah-sunnah beliau hingga akhir zaman.\n\nPeristiwa Maulid Nabi Nabi Muhammad SAW merupakan salah satu peristiwa paling agung dalam sejarah umat Islam, di mana Rasulullah SAW menerima perintah langsung dari Allah SWT berupa kewajiban melaksanakan shalat lima waktu sehari semalam sebagai tiang agama dan sarana pembentukan akhlak mulia.\n\nSehubungan dengan hal tersebut, kami selaku Panitia Peringatan Hari Besar Islam (PHBI) Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten bermaksud menyelenggarakan kegiatan Pengajian Akbar dalam rangka memperingati Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M. Penyusunan proposal ini bertujuan sebagai pedoman pelaksanaan kegiatan sekaligus wujud keterbukaan informasi mengenai rencana acara, susunan kepanitiaan, serta rincian kebutuhan anggaran dana kepada seluruh warga masyarakat dan para donatur.`,

    // B. Maksud dan Tujuan
    maksudKegiatan: `Kegiatan Peringatan Hari Besar Islam (PHBI) Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M ini dimaksudkan sebagai wadah syiar Islam, pembinaan mental spiritual, serta sarana mempererat ukhuwah Islamiyah seluruh warga Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten dan sekitarnya.`,
    tujuanKegiatan: [
      'Memperingati peristiwa agung Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M dengan penuh khidmat dan keberkahan.',
      'Meningkatkan kualitas keimanan, ketakwaan, serta kesadaran mengamalkan ibadah shalat lima waktu dalam kehidupan sehari-hari.',
      'Mempererat tali silaturahmi, kerukunan, dan ukhuwah Islamiyah antar warga Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten.',
      'Menumbuhkan semangat kebersamaan, gotong royong, dan kepedulian sosial di lingkungan masyarakat serta generasi muda (pemuda/i).',
      'Menghidupkan syiar dakwah Islam yang menyejukkan, santun, dan membawa manfaat nyata bagi lingkungan Kp. Kedung Sapi.'
    ],

    // C. Bentuk Kegiatan
    bentukKegiatanDeskripsi: `Bentuk kegiatan yang akan dilaksanakan dalam rangka Peringatan Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M di Lingkungan Kp. Kedung Sapi dikemas dalam rangkaian acara keagamaan dan kemasyarakatan sebagai berikut:`,
    bentukKegiatanList: [
      'Tabligh Akbar / Pengajian Umum Peringatan Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M bersama Mubaligh / Penceramah Undangan.',
      'Lantunan Pembacaan Ayat Suci Al-Qur\'an (Tilawah) oleh Qori Undangan.',
      'Gema Shalawat Nabi, Marhaban, dan Penampilan Kreasi Islami Santri / Pemuda-Pemudi Kp. Kedung Sapi.',
      'Kegiatan Pra-Acara & Syiar Lingkungan bersama Warga dan Pemuda Kp. Kedung Sapi.',
      'Doa Bersama untuk Keselamatan, Kerukunan, dan Keberkahan Seluruh Warga Kp. Kedung Sapi Desa Kp Baru.'
    ],

    // D. Waktu dan Tempat Pelaksanaan
    hariTanggal: 'Minggu, 17 Januari 2027 (1448 H)',
    waktuPelaksanaan: 'Pukul 19.30 WIB (Ba\'da Isya) s/d Selesai',
    tempatPelaksanaan: 'Lingkungan Majelis / Lapangan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten',
    penceramah: 'KH. Mubaligh Undangan (Penceramah Tabligh Akbar)',
    qori: 'Ust. Qori Undangan (Qori Tilawah Al-Qur\'an)',

    // E. Susunan Acara & Rundown Acara
    rundownAcara: [
      {
        id: 'rd-1',
        waktu: '19.00 – 19.30 WIB',
        kegiatan: 'Persiapan Panitia, Penyambutan Jamaah & Pra-Acara (Hadroh / Shalawat)',
        pengisi: 'Seksi Acara, Humas & Tim Marhaban',
        keterangan: 'Pengondisian tempat duduk tamu & warga'
      },
      {
        id: 'rd-2',
        waktu: '19.30 – 19.45 WIB',
        kegiatan: 'Pembukaan Acara Resmi (Muqaddimah)',
        pengisi: 'Master of Ceremony (MC)',
        keterangan: 'Pembacaan Ummul Kitab (Al-Fatihah)'
      },
      {
        id: 'rd-3',
        waktu: '19.45 – 20.15 WIB',
        kegiatan: 'Pembacaan Ayat Suci Al-Qur\'an & Tilawah',
        pengisi: 'Qori Undangan',
        keterangan: 'Seksi Acara & Sound System'
      },
      {
        id: 'rd-4',
        waktu: '20.15 – 20.40 WIB',
        kegiatan: 'Lantunan Shalawat Nabi Muhammad SAW / Marhaban',
        pengisi: 'Grup Marhaban / Jamaah Kp. Kedung Sapi',
        keterangan: 'Dipimpin tokoh agama setempat'
      },
      {
        id: 'rd-5',
        waktu: '20.40 – 21.15 WIB',
        kegiatan: 'Sambutan-Sambutan:\n1. Ketua Panitia PHBI Maulid Nabi\n2. Ketua RT / Tokoh Masyarakat\n3. Kepala Desa Kp Baru',
        pengisi: `${ketua}, ${ketuaRt}, ${kepalaDesa}`,
        keterangan: 'Laporan kepanitiaan & sambutan pemerintahan'
      },
      {
        id: 'rd-6',
        waktu: '21.15 – 23.00 WIB',
        kegiatan: 'Acara Inti: Mau\'idhoh Hasanah (Tausiyah Hikmah Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M)',
        pengisi: 'Penceramah / Mubaligh Undangan',
        keterangan: 'Acara inti pengajian akbar'
      },
      {
        id: 'rd-7',
        waktu: '23.00 – 23.15 WIB',
        kegiatan: 'Pembacaan Doa Penutup',
        pengisi: 'Kyai / Tokoh Ulama Setempat',
        keterangan: 'Doa keselamatan & keberkahan warga'
      },
      {
        id: 'rd-8',
        waktu: '23.15 – Selesai',
        kegiatan: 'Penutup, Ramah Tamah & Pembagian Konsumsi',
        pengisi: 'MC, Seksi Konsumsi & Seluruh Panitia',
        keterangan: 'Tertib & kebersihan lokasi'
      }
    ],

    // F. Anggaran Dana (RAB)
    anggaranDana: [
      {
        id: 'rab-1',
        kategori: 'Acara & Mubaligh',
        uraian: 'Bisaroh / Transport Penceramah (Mubaligh Inti)',
        volume: '1 Paket',
        jumlah: 6000000
      },
      {
        id: 'rab-2',
        kategori: 'Acara & Qori',
        uraian: 'Bisaroh / Honor Qori Tilawah Al-Qur\'an & Pengisi Acara',
        volume: '1 Paket',
        jumlah: 2500000
      },
      {
        id: 'rab-3',
        kategori: 'Seksi Konsumsi',
        uraian: 'Konsumsi Jamaah Pengajian, Tamu VIP, Penceramah & Kerja Bakti Panitia',
        volume: '600 Kotak / Paket',
        jumlah: 14000000
      },
      {
        id: 'rab-4',
        kategori: 'Tenda & Venue',
        uraian: 'Sewa Tenda, Panggung Utama, Kursi Tamu & Karpet Jamaah',
        volume: '1 Set Lengkap',
        jumlah: 5500000
      },
      {
        id: 'rab-5',
        kategori: 'Multimedia & Sound',
        uraian: 'Sewa Sound System, Pencahayaan (Lighting) & Dokumentasi',
        volume: '1 Paket',
        jumlah: 3500000
      },
      {
        id: 'rab-6',
        kategori: 'Seksi Dekorasi',
        uraian: 'Dekorasi Panggung, Cetak Banner / Spanduk Utama & Umbul-Umbul',
        volume: '1 Paket',
        jumlah: 1500000
      },
      {
        id: 'rab-7',
        kategori: 'Seksi Logistik',
        uraian: 'Sewa Genset, BBM Solar, Instalasi Listrik & Perlengkapan Lapangan',
        volume: '1 Paket',
        jumlah: 1500000
      },
      {
        id: 'rab-8',
        kategori: 'Kesekretariatan & Humas',
        uraian: 'Cetak Proposal, Surat Undangan, Amplop, ATK & Operasional Humas',
        volume: '1 Paket',
        jumlah: 800000
      },
      {
        id: 'rab-9',
        kategori: 'Keamanan & Kebersihan',
        uraian: 'Operasional Keamanan, Parkir, Plastik Sampah & Kebersihan Lingkungan',
        volume: '1 Paket',
        jumlah: 700000
      }
    ],

    // G. Sumber Dana
    sumberDanaDeskripsi: `Untuk memenuhi kebutuhan anggaran biaya kegiatan Peringatan Hari Besar Islam (PHBI) Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M tersebut, sumber pendanaan diperoleh secara gotong royong, halal, dan tidak mengikat yang berasal dari:`,
    sumberDanaList: [
      {
        id: 'sd-1',
        sumber: 'Iuran Gotong Royong Warga Utama Kp. Kedung Sapi',
        uraian: `Iuran bertahap 12 Minggu (${wargaCount} Warga × Rp ${targetPerPerson.toLocaleString('id-ID')})`,
        estimasi: estimasiWargaUtama
      },
      {
        id: 'sd-2',
        sumber: 'Partisipasi Warga Ngontrak & Kas Pendukung',
        uraian: 'Partisipasi sukarela warga kontrakan di lingkungan Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten',
        estimasi: 1500000
      },
      {
        id: 'sd-3',
        sumber: 'Donasi Sukarela, Donatur & Simpatisan',
        uraian: 'Sumbangan sukarela para dermawan, tokoh masyarakat, pengusaha & instansi yang tidak mengikat',
        estimasi: 3500000
      }
    ],

    // H. Susunan Panitia
    pelindung: pelindungStr,
    penasehat: penasehatStr,
    penanggungJawab: penanggungJawabStr,
    adminSistem: committeeSettings?.adminSistem || '',
    sections: committeeSettings?.sections ? JSON.parse(JSON.stringify(committeeSettings.sections)) : [],

    // I. Penutup
    penutup: `Demikian Proposal Kegiatan Peringatan Hari Besar Islam (PHBI) Maulid Nabi Nabi Muhammad SAW 1448 H / 2027 M Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten ini kami susun sebagai acuan pelaksanaan kegiatan.\n\nKami menyadari sepenuhnya bahwa kesuksesan dan kelancaran acara mulia ini tidak terlepas dari rahmat Allah SWT serta dukungan moril maupun materiil dari seluruh warga masyarakat, tokoh agama, pemuda, pemerintahan desa, serta para donatur yang dermawan. Atas segala perhatian, doa restu, bantuan, dan kerja sama yang diberikan, kami ucapkan terima kasih yang sebesar-besarnya. Semoga Allah SWT mencatat setiap langkah dan infaq terbaik Bapak/Ibu/Saudara/i sebagai amal jariyah yang berlipat ganda. Aamiin Ya Rabbal 'Alamiin.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`,

    // 8 Penandatangan Resmi
    signers: {
      ketuaPanitia: ketua,
      wakilKetua: wakil,
      sekretaris: sekretaris,
      bendahara: bendahara,
      ketuaRt: ketuaRt,
      ketuaPemuda: '',
      tokohPenanggungJawab: tokoh,
      kepalaDesa: kepalaDesa
    },
    signerRoles: {
      ketuaPanitia: 'Ketua Panitia',
      wakilKetua: 'Wakil Ketua',
      sekretaris: 'Sekretaris',
      bendahara: 'Bendahara',
      ketuaRt: 'Ketua RT',
      ketuaPemuda: 'Ketua Pemuda',
      tokohPenanggungJawab: 'Tokoh (Penanggung Jawab)',
      kepalaDesa: 'Kepala Desa Kp Baru'
    }
  };
}
