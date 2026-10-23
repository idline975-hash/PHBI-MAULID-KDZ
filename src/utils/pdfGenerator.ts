import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Citizen, DonasiWargaPayment, DonasiSukarela, Pengeluaran, CommitteeSettings, ProposalData } from '../types';
import { formatRupiah, getShortDate, getCurrentIndonesianTime } from './formatters';

interface Signer {
  title: string;
  name: string;
}

// Draw official KOP SURAT PHBI Isra Miraj (with automatic multi-line wrapping so nothing is cut off)
function addKopSurat(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  customKop?: {
    baris1?: string;
    baris2?: string;
    alamat?: string;
    sekretariat?: string;
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxTextWidth = pageWidth - 28;

  // Top header green accent
  doc.setFillColor(15, 118, 54); // Emerald Islamic Green
  doc.rect(14, 8, pageWidth - 28, 2.5, 'F');

  let y = 16.5;

  // Baris 1: Title PHBI
  const baris1 = (customKop?.baris1 || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 81, 40);
  const b1Lines = doc.splitTextToSize(baris1, maxTextWidth);
  doc.text(b1Lines, pageWidth / 2, y, { align: 'center' });
  y += b1Lines.length * 5.2 + 0.8;

  // Baris 2: Event Name & Year
  const baris2 = (customKop?.baris2 || 'ISRA MIRAJ NABI MUHAMMAD SAW 1448 H / 2027 M').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(17, 24, 39);
  const b2Lines = doc.splitTextToSize(baris2, maxTextWidth);
  doc.text(b2Lines, pageWidth / 2, y, { align: 'center' });
  y += b2Lines.length * 5.5 + 0.5;

  // Address & Hotline
  const addressLine = customKop?.alamat
    ? `${customKop.alamat}${customKop.sekretariat ? ' • ' + customKop.sekretariat : ''}`
    : 'Alamat: Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten | WA: 081414033436';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const addrLines = doc.splitTextToSize(addressLine, maxTextWidth);
  doc.text(addrLines, pageWidth / 2, y, { align: 'center' });
  y += addrLines.length * 3.8 + 1.5;

  // Elegant divider lines (Emerald thick line + Amber thin line)
  doc.setDrawColor(15, 118, 54);
  doc.setLineWidth(1.0);
  doc.line(14, y, pageWidth - 14, y);

  doc.setDrawColor(217, 119, 6); // Amber gold
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.6, pageWidth - 14, y + 1.6);

  // Document Title (wrapped cleanly so long titles never get cut off)
  let currentY = y + 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), maxTextWidth);
  doc.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += (titleLines.length - 1) * 4.6;

  if (subtitle) {
    currentY += 4.8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    const subLines = doc.splitTextToSize(subtitle, maxTextWidth);
    doc.text(subLines, pageWidth / 2, currentY, { align: 'center' });
    currentY += (subLines.length - 1) * 4.0;
  }

  return currentY + 6;
}

// Add official signatures supporting 2, 3, or 4 signers with automatic page-break detection
function addSignatures(
  doc: jsPDF,
  first: Signer[] | Signer,
  second?: Signer,
  third?: Signer,
  fourth?: Signer
) {
  let signers: Signer[] = [];
  if (Array.isArray(first)) {
    signers = first;
  } else {
    if (first) signers.push(first);
    if (second) signers.push(second);
    if (third) signers.push(third);
    if (fourth) signers.push(fourth);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isLandscape = pageWidth > 250;

  let startY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 210;

  // We need at least 48mm for the signature block to avoid bumping into the footer (footer is at pageHeight - 10)
  if (startY > pageHeight - 48) {
    doc.addPage();
    startY = 24;
  }

  const currentDate = getShortDate();
  const dateText = `Serang, ${currentDate}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);

  if (signers.length <= 2) {
    const leftSigner = signers[0] || { title: 'Ketua Panitia', name: '' };
    const rightSigner = signers[1] || { title: 'Bendahara PHBI', name: '' };

    const leftX = isLandscape ? 60 : 46;
    const rightX = pageWidth - (isLandscape ? 60 : 46);

    doc.text('Mengetahui / Menyetujui,', leftX, startY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(leftSigner.title, leftX, startY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(dateText, rightX, startY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(rightSigner.title, rightX, startY + 5, { align: 'center' });

    const signLineY = startY + 23;
    doc.setLineWidth(0.4);
    doc.setDrawColor(100, 116, 139);

    doc.line(leftX - 25, signLineY, leftX + 25, signLineY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(`( ${leftSigner.name} )`, leftX, signLineY + 4.5, { align: 'center' });

    doc.line(rightX - 25, signLineY, rightX + 25, signLineY);
    doc.text(`( ${rightSigner.name} )`, rightX, signLineY + 4.5, { align: 'center' });
  } else if (signers.length === 3) {
    // 3 Signers: Left (Ketua), Center (Sekretaris / Petugas / Admin), Right (Bendahara with Date)
    const leftSigner = signers[0];
    const centerSigner = signers[1];
    const rightSigner = signers[2];

    const leftX = isLandscape ? 50 : 38;
    const centerX = pageWidth / 2;
    const rightX = pageWidth - (isLandscape ? 50 : 38);

    doc.text('Mengetahui,', leftX, startY, { align: 'center' });
    doc.text('Memverifikasi,', centerX, startY, { align: 'center' });
    doc.text(dateText, rightX, startY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(leftSigner.title, leftX, startY + 5, { align: 'center' });
    doc.text(centerSigner.title, centerX, startY + 5, { align: 'center' });
    doc.text(rightSigner.title, rightX, startY + 5, { align: 'center' });

    const signLineY = startY + 23;
    doc.setLineWidth(0.4);
    doc.setDrawColor(100, 116, 139);

    doc.line(leftX - 22, signLineY, leftX + 22, signLineY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(`( ${leftSigner.name} )`, leftX, signLineY + 4.5, { align: 'center' });

    doc.line(centerX - 22, signLineY, centerX + 22, signLineY);
    doc.text(`( ${centerSigner.name} )`, centerX, signLineY + 4.5, { align: 'center' });

    doc.line(rightX - 22, signLineY, rightX + 22, signLineY);
    doc.text(`( ${rightSigner.name} )`, rightX, signLineY + 4.5, { align: 'center' });
  } else if (signers.length >= 4) {
    // 4 Signers (distributed across page)
    const colWidth = (pageWidth - 28) / signers.length;
    const signLineY = startY + 23;
    doc.setLineWidth(0.4);
    doc.setDrawColor(100, 116, 139);

    signers.forEach((s, idx) => {
      const colX = 14 + colWidth * idx + colWidth / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      if (idx === signers.length - 1) {
        doc.text(dateText, colX, startY, { align: 'center' });
      } else {
        doc.text(idx === 0 ? 'Mengetahui,' : 'Pengurus PHBI,', colX, startY, { align: 'center' });
      }

      doc.setFont('helvetica', 'bold');
      doc.text(s.title, colX, startY + 5, { align: 'center' });

      doc.line(colX - 20, signLineY, colX + 20, signLineY);
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(`( ${s.name} )`, colX, signLineY + 4.5, { align: 'center' });
    });
  }
}

// Add neat running headers (pages 2+) and page footers across all pages (Halaman X dari Y)
function addPageFooters(
  doc: jsPDF,
  reportTitle: string = 'Laporan Keuangan PHBI',
  options?: { hasCoverPage?: boolean }
) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isLandscape = pageWidth > 250;
  const sideMargin = isLandscape ? 12 : 14;
  const hasCover = Boolean(options?.hasCoverPage);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // If the document has a Cover Page, skip running header and footer on Page 1 (Sampul)
    if (hasCover && i === 1) {
      continue;
    }

    // Page 2+ Running Header at the top (neatly positioned above table margin)
    if (i > (hasCover ? 2 : 1)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 81, 40);
      doc.text('PANITIA PHBI ISRA MIRAJ 1448 H / 2027 M • KP BARANI RT 011 / RW 04', sideMargin, 10);

      const pageNumStr = hasCover ? `${i - 1} dari ${totalPages - 1}` : `${i} dari ${totalPages}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`${reportTitle} — Halaman ${pageNumStr}`, pageWidth - sideMargin, 10, { align: 'right' });

      doc.setDrawColor(15, 118, 54);
      doc.setLineWidth(0.3);
      doc.line(sideMargin, 12, pageWidth - sideMargin, 12);
    }

    // Bottom Footer on all pages (except cover)
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(sideMargin, pageHeight - 10, pageWidth - sideMargin, pageHeight - 10);

    const pageDisplay = hasCover
      ? `Halaman ${i - 1} dari ${totalPages - 1}`
      : `Halaman ${i} dari ${totalPages}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi PHBI Isra Miraj 1448 H / 2027 M • WA Info & Pengaduan: 081414033436 • ${pageDisplay}`,
      pageWidth / 2,
      pageHeight - 5.5,
      { align: 'center' }
    );
  }
}

// ==========================================
// 1. USSER: Laporan PDF Per Minggu (Permintaan Khusus)
// ==========================================
export function generatePdfLaporanMingguanUsser(
  weekNumber: number,
  citizens: Citizen[],
  payments: DonasiWargaPayment[],
  usserName: string = 'Petugas Usser'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    `Laporan Penerimaan Iuran Warga - Minggu Ke-${weekNumber}`,
    `Dicetak oleh: ${usserName} • Sistem Daring PHBI Isra Miraj Kp Kedung Sapi`
  );

  // Pisahkan Warga Utama vs Warga Ngontrak (Hanya jumlah warga utama yang dihitung di jumlah warga)
  const wargaUtama = [...citizens]
    .filter(c => !c.isNgontrak)
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  const wargaNgontrak = [...citizens]
    .filter(c => Boolean(c.isNgontrak))
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  const totalPaidWeek = citizens.reduce(
    (sum, c) => sum + (c.excludedWeeks?.[weekNumber] ? 0 : (Number(c.weeks?.[weekNumber]) || 0)),
    0
  );
  let countPaid = 0;

  const rows = wargaUtama.map((c, idx) => {
    const amount = Number(c.weeks?.[weekNumber]) || 0;
    const isExcl = Boolean(c.excludedWeeks?.[weekNumber]);
    if (amount > 0) {
      countPaid += 1;
    }

    // Find specific payment log for date / officer if available
    const paymentLog = payments.find(p => p.citizenId === c.id && p.week === weekNumber);
    const dateStr = paymentLog ? paymentLog.timestamp.split(' ').slice(0, 4).join(' ') : (amount > 0 ? (c.lastEditedAt ? c.lastEditedAt.split(' ').slice(0, 4).join(' ') : '-') : '-');
    const officerStr = paymentLog ? paymentLog.recordedBy : (amount > 0 ? (c.lastEditedBy || usserName) : '-');

    return [
      idx + 1,
      c.rt === '08' ? 'Warga (Identitas Terhapus)' : c.name,
      amount > 0 ? `Rp ${formatRupiah(amount)}${isExcl ? ' (Ditahan)' : ''}` : '-',
      amount > 0 ? (isExcl ? 'DITAHAN' : 'LUNAS') : 'BELUM BAYAR',
      dateStr,
      officerStr
    ];
  });

  const countUnpaid = wargaUtama.length - countPaid;
  const percentage = wargaUtama.length > 0 ? Math.round((countPaid / wargaUtama.length) * 100) : 0;

  // Summary box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`RINGKASAN IURAN MINGGU KE-${weekNumber}:`, 18, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`• Total Uang Masuk: Rp ${formatRupiah(totalPaidWeek)}`, 18, startY + 11);
  doc.text(`• Warga Bayar: ${countPaid} orang (${percentage}%)`, 18, startY + 16);

  doc.text(`• Warga Belum Bayar: ${countUnpaid} orang`, 105, startY + 11);
  doc.text(`• Total Warga Terdaftar: ${wargaUtama.length} orang`, 105, startY + 16);

  // Table Warga Utama
  autoTable(doc, {
    startY: startY + 24,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Nama Warga', `Iuran M-${weekNumber}`, 'Status', 'Tanggal Bayar', 'Petugas']],
    body: rows,
    foot: [
      ['', 'TOTAL UANG MASUK MINGGU KE-' + weekNumber, `Rp ${formatRupiah(totalPaidWeek)}`, `${countPaid} Warga Lunas`, '', '']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 54],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [15, 81, 40],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      valign: 'middle',
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 34 },
      5: { cellWidth: 28 }
    },
    didParseCell: function (data) {
      // Highlight status
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'LUNAS') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [156, 163, 175];
        }
      }
    }
  });

  // Tabel terpisah untuk Warga Ngontrak
  if (wargaNgontrak.length > 0) {
    let ngontrakY = (doc as any).lastAutoTable.finalY + 8;
    if (ngontrakY > doc.internal.pageSize.getHeight() - 55) {
      doc.addPage();
      ngontrakY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text(`DAFTAR IURAN WARGA NGONTRAK - MINGGU KE-${weekNumber} (TERPISAH)`, 14, ngontrakY);

    let totalNgontrakWeek = 0;
    const ngontrakRows = wargaNgontrak.map((c, idx) => {
      const amount = Number(c.weeks?.[weekNumber]) || 0;
      const isExcl = Boolean(c.excludedWeeks?.[weekNumber]);
      if (!isExcl) {
        totalNgontrakWeek += amount;
      }
      const paymentLog = payments.find(p => p.citizenId === c.id && p.week === weekNumber);
      const dateStr = paymentLog ? paymentLog.timestamp.split(' ').slice(0, 4).join(' ') : (amount > 0 ? (c.lastEditedAt ? c.lastEditedAt.split(' ').slice(0, 4).join(' ') : '-') : '-');
      const officerStr = paymentLog ? paymentLog.recordedBy : (amount > 0 ? (c.lastEditedBy || usserName) : '-');

      return [
        idx + 1,
        c.rt === '08' ? 'Warga (Identitas Terhapus)' : c.name,
        amount > 0 ? `Rp ${formatRupiah(amount)}${isExcl ? ' (Ditahan)' : ''}` : '-',
        amount > 0 ? (isExcl ? 'DITAHAN' : 'LUNAS') : 'BELUM BAYAR',
        dateStr,
        officerStr
      ];
    });

    autoTable(doc, {
      startY: ngontrakY + 3,
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      showHead: 'everyPage',
      head: [['No', 'Nama (Ngontrak)', `Iuran M-${weekNumber}`, 'Status', 'Tanggal Bayar', 'Petugas']],
      body: ngontrakRows,
      foot: [
        ['', 'SUBTOTAL NGONTRAK MINGGU KE-' + weekNumber, `Rp ${formatRupiah(totalNgontrakWeek)}`, '', '', '']
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8.5
      },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: [120, 53, 15],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        valign: 'middle',
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { halign: 'right', cellWidth: 32 },
        3: { halign: 'center', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 34 },
        5: { cellWidth: 28 }
      }
    });
  }

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Petugas Pelapor', name: usserName },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, `Laporan Iuran Minggu Ke-${weekNumber}`);
  doc.save(`Laporan_Iuran_Minggu_${weekNumber}_${Date.now()}.pdf`);
}

// ==========================================
// 2. USSER: Laporan Total Donasi Warga & Suka Rela
// ==========================================
export function generatePdfLaporanUsser(
  wargaPayments: DonasiWargaPayment[],
  sukarelaPayments: DonasiSukarela[],
  usserName: string = 'Petugas Usser'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Resmi Penerimaan Donasi Warga & Suka Rela',
    `Dicetak oleh: ${usserName} • Sistem Daring Panitia Isra Miraj 1448 H / 2027 M`
  );

  const totalWarga = wargaPayments.reduce(
    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );
  const totalSukarela = sukarelaPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const grandTotal = totalWarga + totalSukarela;

  // Summary box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text('RINGKASAN TOTAL PENERIMAAN DANA MASUK:', 18, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`1. Total Donasi Warga (Mingguan): Rp ${formatRupiah(totalWarga)}`, 20, startY + 11);
  doc.text(`2. Total Donasi Suka Rela: Rp ${formatRupiah(totalSukarela)}`, 20, startY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 81, 40);
  doc.text(`TOTAL KESELURUHAN: Rp ${formatRupiah(grandTotal)}`, 112, startY + 13.5);

  // Table Donasi Warga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('A. Rincian Donasi Warga (Mingguan)', 14, startY + 27);

  // Sort warga payments by citizen name A-Z
  const sortedWargaPayments = [...wargaPayments].sort((a, b) =>
    a.citizenName.localeCompare(b.citizenName, 'id', { sensitivity: 'base' })
  );

  const wargaRows = sortedWargaPayments.map((p, idx) => [
    idx + 1,
    p.citizenName,
    `Minggu ke-${p.week}`,
    p.timestamp.split(' ').slice(0, 4).join(' '),
    `Rp ${formatRupiah(p.amount)}${p.excludedFromTotal ? ' (Ditahan)' : ''}`,
    p.recordedBy
  ]);

  autoTable(doc, {
    startY: startY + 30,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Nama Warga', 'Pembayaran', 'Tanggal', 'Jumlah (Rp)', 'Petugas']],
    body: wargaRows.length > 0 ? wargaRows : [['-', 'Belum ada data donasi warga', '-', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL DONASI WARGA', '', '', `Rp ${formatRupiah(totalWarga)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 54], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [240, 253, 244], textColor: [15, 81, 40], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 34 },
      5: { cellWidth: 28 }
    }
  });

  // Table Donasi Suka Rela
  let nextY = (doc as any).lastAutoTable.finalY + 8;
  if (nextY > doc.internal.pageSize.getHeight() - 55) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('B. Rincian Donasi Suka Rela', 14, nextY);

  const sortedSukarela = [...sukarelaPayments].sort((a, b) =>
    a.donorName.localeCompare(b.donorName, 'id', { sensitivity: 'base' })
  );

  const sukaRelaRows = sortedSukarela.map((s, idx) => [
    idx + 1,
    s.donorName,
    s.keterangan || 'Donasi Sukarela',
    s.timestamp.split(' ').slice(0, 4).join(' '),
    `Rp ${formatRupiah(s.amount)}`,
    s.recordedBy
  ]);

  autoTable(doc, {
    startY: nextY + 3,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Nama Donatur', 'Keterangan', 'Tanggal', 'Jumlah (Rp)', 'Petugas']],
    body: sukaRelaRows.length > 0 ? sukaRelaRows : [['-', 'Belum ada data donasi suka rela', '-', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL DONASI SUKA RELA', '', '', `Rp ${formatRupiah(totalSukarela)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [180, 115, 10], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 252, 232], textColor: [161, 98, 7], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { cellWidth: 38 },
      3: { halign: 'center', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 32 },
      5: { cellWidth: 20 }
    }
  });

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Petugas Pelapor', name: usserName },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Laporan Donasi Warga & Suka Rela');
  doc.save(`Laporan_Penerimaan_Donasi_Usser_${Date.now()}.pdf`);
}

// ==========================================
// 3. BENDAHARA: Laporan Kas & Pengeluaran
// ==========================================
export function generatePdfLaporanBendahara(
  totalMasuk: number,
  pengeluaranList: Pengeluaran[],
  bendaharaName: string = 'Alwi'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Pertanggungjawaban Kas & Pengeluaran Bendahara',
    'Panitia Peringatan Hari Besar Islam (PHBI) Isra Miraj 1448 H / 2027 M'
  );

  const totalKeluar = pengeluaranList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const sisaSaldo = totalMasuk - totalKeluar;

  // Balance highlights
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('STATUS KEUANGAN KAS PANITIA:', 18, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`• Total Uang Masuk Tersedia (Donasi Warga + Suka Rela):`, 20, startY + 11);
  doc.text(`• Total Pengeluaran Kas (Biaya Operasional & Acara):`, 20, startY + 16.5);
  doc.text(`• SISA SALDO KAS TERSEDIA:`, 20, startY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 54);
  doc.text(`Rp ${formatRupiah(totalMasuk)}`, 130, startY + 11);

  doc.setTextColor(220, 38, 38);
  doc.text(`Rp ${formatRupiah(totalKeluar)}`, 130, startY + 16.5);

  doc.setTextColor(2, 132, 199);
  doc.text(`Rp ${formatRupiah(sisaSaldo)}`, 130, startY + 22);

  // Table
  const rows = pengeluaranList.map((p, idx) => [
    idx + 1,
    p.timestamp.split(' ').slice(0, 4).join(' '),
    p.description,
    p.recipient,
    `Rp ${formatRupiah(p.amount)}`,
    p.recordedBy
  ]);

  autoTable(doc, {
    startY: startY + 29,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Tanggal', 'Keperluan / Uraian Pengeluaran', 'Penerima', 'Jumlah (Rp)', 'Petugas']],
    body: rows.length > 0 ? rows : [['-', '-', 'Belum ada data pengeluaran', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL PENGELUARAN KAS', '', '', `Rp ${formatRupiah(totalKeluar)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32 },
      2: { cellWidth: 58 },
      3: { cellWidth: 34 },
      4: { halign: 'right', cellWidth: 30 },
      5: { cellWidth: 18 }
    }
  });

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Sekretaris PHBI', name: '' },
    { title: 'Bendahara PHBI', name: bendaharaName || '' }
  ]);

  addPageFooters(doc, 'Laporan Kas Bendahara');
  doc.save(`Laporan_Kas_Bendahara_Isra_Miraj_${Date.now()}.pdf`);
}

// ==========================================
// 4. ADMIN: Laporan Donasi Warga
// ==========================================
export function generatePdfDonasiWargaAdmin(payments: DonasiWargaPayment[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Data Pemasukan Donasi Warga (Mingguan)',
    'Lampiran Arsip Resmi Panitia Isra Miraj 1448 H / 2027 M'
  );

  const total = payments.reduce(
    (s, p) => s + (p.excludedFromTotal ? 0 : (Number(p.amount) || 0)),
    0
  );

  // Sorted by citizen name A-Z
  const sorted = [...payments].sort((a, b) =>
    a.citizenName.localeCompare(b.citizenName, 'id', { sensitivity: 'base' })
  );

  const rows = sorted.map((p, idx) => [
    idx + 1,
    p.citizenName,
    `Minggu ke-${p.week}`,
    p.timestamp,
    `Rp ${formatRupiah(p.amount)}${p.excludedFromTotal ? ' (Ditahan)' : ''}`,
    p.recordedBy
  ]);

  autoTable(doc, {
    startY: startY + 4,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Nama Warga', 'Minggu', 'Waktu Pembayaran', 'Jumlah (Rp)', 'Input By']],
    body: rows.length > 0 ? rows : [['-', 'Belum ada data', '-', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL KESELURUHAN DONASI WARGA', '', '', `Rp ${formatRupiah(total)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 54], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [240, 253, 244], textColor: [15, 81, 40], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 32 },
      5: { cellWidth: 28 }
    }
  });

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Administrator', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Pemasukan Donasi Warga');
  doc.save(`Laporan_Admin_Donasi_Warga_${Date.now()}.pdf`);
}

// ==========================================
// 5. ADMIN: Laporan Donasi Suka Rela
// ==========================================
export function generatePdfDonasiSukarelaAdmin(payments: DonasiSukarela[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Data Pemasukan Donasi Suka Rela',
    'Lampiran Arsip Resmi Panitia Isra Miraj 1448 H / 2027 M'
  );

  const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const sorted = [...payments].sort((a, b) =>
    a.donorName.localeCompare(b.donorName, 'id', { sensitivity: 'base' })
  );

  const rows = sorted.map((p, idx) => [
    idx + 1,
    p.donorName,
    p.keterangan || '-',
    p.timestamp,
    `Rp ${formatRupiah(p.amount)}`,
    p.recordedBy
  ]);

  autoTable(doc, {
    startY: startY + 4,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Nama Donatur', 'Keterangan', 'Waktu Pembayaran', 'Jumlah (Rp)', 'Input By']],
    body: rows.length > 0 ? rows : [['-', 'Belum ada data', '-', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL DONASI SUKA RELA', '', '', `Rp ${formatRupiah(total)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [180, 115, 10], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 252, 232], textColor: [161, 98, 7], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { cellWidth: 38 },
      3: { halign: 'center', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 30 },
      5: { cellWidth: 20 }
    }
  });

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Administrator', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Pemasukan Donasi Suka Rela');
  doc.save(`Laporan_Admin_Donasi_Sukarela_${Date.now()}.pdf`);
}

// ==========================================
// 6. ADMIN: Laporan Pengeluaran Kas
// ==========================================
export function generatePdfPengeluaranAdmin(list: Pengeluaran[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Data Pengeluaran Kas (Bendahara)',
    'Lampiran Arsip Resmi Panitia Isra Miraj 1448 H / 2027 M'
  );

  const total = list.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const rows = list.map((p, idx) => [
    idx + 1,
    p.description,
    p.recipient,
    p.timestamp,
    `Rp ${formatRupiah(p.amount)}`,
    p.recordedBy
  ]);

  autoTable(doc, {
    startY: startY + 4,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Uraian Pengeluaran', 'Penerima', 'Waktu', 'Jumlah (Rp)', 'Petugas']],
    body: rows.length > 0 ? rows : [['-', 'Belum ada data', '-', '-', 'Rp 0', '-']],
    foot: [['', 'TOTAL PENGELUARAN KAS', '', '', `Rp ${formatRupiah(total)}`, '']],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 54 },
      2: { cellWidth: 36 },
      3: { halign: 'center', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 30 },
      5: { cellWidth: 16 }
    }
  });

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Administrator', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Pengeluaran Kas Bendahara');
  doc.save(`Laporan_Admin_Pengeluaran_Bendahara_${Date.now()}.pdf`);
}

// ==========================================
// 7. ADMIN: Laporan Kolom Mingguan (12 Minggu Landscape)
// ==========================================
export function generatePdfKolomMingguanAdmin(
  citizens: Citizen[],
  totalSukarela: number,
  totalKeluar: number
) {
  // Landscape A4: 297mm width x 210mm height
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Rekapitulasi Kolom Mingguan Iuran Warga (Minggu 1 s/d 12)',
    'Panitia PHBI Isra Miraj Kp kedung sapi Desa Kp baru kec Pamarayan serang - banten'
  );

  // Headers: No, Nama Warga, M1..M12, Total
  const head = [
    ['No', 'Nama Warga', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'Total (Rp)']
  ];

  // Strictly sort citizens alphabetically A - Z (Separate Warga Utama & Warga Ngontrak)
  const wargaUtama = [...citizens]
    .filter(c => !c.isNgontrak)
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  const wargaNgontrak = [...citizens]
    .filter(c => Boolean(c.isNgontrak))
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  let sumWargaUtama = 0;
  const colTotalsUtama: { [w: number]: number } = {};
  for (let w = 1; w <= 12; w++) colTotalsUtama[w] = 0;

  const rowsUtama = wargaUtama.map((c, idx) => {
    sumWargaUtama += c.totalPaid;
    for (let w = 1; w <= 12; w++) {
      if (!c.excludedWeeks?.[w]) {
        colTotalsUtama[w] += Number(c.weeks?.[w]) || 0;
      }
    }

    const fmtW = (w: number) => {
      const val = c.weeks?.[w];
      if (!val) return '-';
      return `${formatRupiah(val)}${c.excludedWeeks?.[w] ? '*' : ''}`;
    };

    return [
      idx + 1,
      c.rt === '08' ? 'Warga (Identitas Terhapus)' : c.name,
      fmtW(1),
      fmtW(2),
      fmtW(3),
      fmtW(4),
      fmtW(5),
      fmtW(6),
      fmtW(7),
      fmtW(8),
      fmtW(9),
      fmtW(10),
      fmtW(11),
      fmtW(12),
      formatRupiah(c.totalPaid)
    ];
  });

  const footRowUtama = [
    '',
    'TOTAL WARGA UTAMA',
    formatRupiah(colTotalsUtama[1]),
    formatRupiah(colTotalsUtama[2]),
    formatRupiah(colTotalsUtama[3]),
    formatRupiah(colTotalsUtama[4]),
    formatRupiah(colTotalsUtama[5]),
    formatRupiah(colTotalsUtama[6]),
    formatRupiah(colTotalsUtama[7]),
    formatRupiah(colTotalsUtama[8]),
    formatRupiah(colTotalsUtama[9]),
    formatRupiah(colTotalsUtama[10]),
    formatRupiah(colTotalsUtama[11]),
    formatRupiah(colTotalsUtama[12]),
    formatRupiah(sumWargaUtama)
  ];

  autoTable(doc, {
    startY: startY + 4,
    margin: { top: 18, bottom: 18, left: 12, right: 12 },
    showHead: 'everyPage',
    head,
    body: rowsUtama,
    foot: [footRowUtama],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 54],
      textColor: 255,
      fontSize: 7.5,
      halign: 'center',
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [15, 81, 40],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'right'
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.5,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 45 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', cellWidth: 16 },
      9: { halign: 'right', cellWidth: 16 },
      10: { halign: 'right', cellWidth: 16 },
      11: { halign: 'right', cellWidth: 16 },
      12: { halign: 'right', cellWidth: 16 },
      13: { halign: 'right', cellWidth: 16 },
      14: { halign: 'right', cellWidth: 26, fontStyle: 'bold' }
    }
  });

  let sumWargaNgontrak = 0;
  if (wargaNgontrak.length > 0) {
    let ngontrakStartY = (doc as any).lastAutoTable.finalY + 8;
    if (ngontrakStartY > doc.internal.pageSize.getHeight() - 45) {
      doc.addPage();
      ngontrakStartY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text('II. REKAPITULASI KOLOM 12 MINGGU KHUSUS WARGA NGONTRAK (TERPISAH)', 12, ngontrakStartY);

    const colTotalsNgontrak: { [w: number]: number } = {};
    for (let w = 1; w <= 12; w++) colTotalsNgontrak[w] = 0;

    const rowsNgontrak = wargaNgontrak.map((c, idx) => {
      sumWargaNgontrak += c.totalPaid;
      for (let w = 1; w <= 12; w++) {
        if (!c.excludedWeeks?.[w]) {
          colTotalsNgontrak[w] += Number(c.weeks?.[w]) || 0;
        }
      }

      const fmtW = (w: number) => {
        const val = c.weeks?.[w];
        if (!val) return '-';
        return `${formatRupiah(val)}${c.excludedWeeks?.[w] ? '*' : ''}`;
      };

      return [
        idx + 1,
        c.rt === '08' ? 'Warga (Identitas Terhapus)' : c.name,
        fmtW(1),
        fmtW(2),
        fmtW(3),
        fmtW(4),
        fmtW(5),
        fmtW(6),
        fmtW(7),
        fmtW(8),
        fmtW(9),
        fmtW(10),
        fmtW(11),
        fmtW(12),
        formatRupiah(c.totalPaid)
      ];
    });

    const footRowNgontrak = [
      '',
      'TOTAL WARGA NGONTRAK',
      formatRupiah(colTotalsNgontrak[1]),
      formatRupiah(colTotalsNgontrak[2]),
      formatRupiah(colTotalsNgontrak[3]),
      formatRupiah(colTotalsNgontrak[4]),
      formatRupiah(colTotalsNgontrak[5]),
      formatRupiah(colTotalsNgontrak[6]),
      formatRupiah(colTotalsNgontrak[7]),
      formatRupiah(colTotalsNgontrak[8]),
      formatRupiah(colTotalsNgontrak[9]),
      formatRupiah(colTotalsNgontrak[10]),
      formatRupiah(colTotalsNgontrak[11]),
      formatRupiah(colTotalsNgontrak[12]),
      formatRupiah(sumWargaNgontrak)
    ];

    autoTable(doc, {
      startY: ngontrakStartY + 3,
      margin: { top: 18, bottom: 18, left: 12, right: 12 },
      showHead: 'everyPage',
      head: [['No', 'Nama Warga (Ngontrak)', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'Total (Rp)']],
      body: rowsNgontrak,
      foot: [footRowNgontrak],
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: 255,
        fontSize: 7.5,
        halign: 'center',
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: [120, 53, 15],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'right'
      },
      styles: {
        font: 'helvetica',
        fontSize: 6.8,
        cellPadding: 1.5,
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 16 },
        7: { halign: 'right', cellWidth: 16 },
        8: { halign: 'right', cellWidth: 16 },
        9: { halign: 'right', cellWidth: 16 },
        10: { halign: 'right', cellWidth: 16 },
        11: { halign: 'right', cellWidth: 16 },
        12: { halign: 'right', cellWidth: 16 },
        13: { halign: 'right', cellWidth: 16 },
        14: { halign: 'right', cellWidth: 26, fontStyle: 'bold' }
      }
    });
  }

  const sumWargaTotal = sumWargaUtama + sumWargaNgontrak;

  // Financial summary block after table
  let nextY = (doc as any).lastAutoTable.finalY + 6;
  if (nextY > doc.internal.pageSize.getHeight() - 55) {
    doc.addPage();
    nextY = 20;
  }

  const sisa = (sumWargaTotal + totalSukarela) - totalKeluar;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, nextY, doc.internal.pageSize.getWidth() - 24, 15, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Donasi Warga (12 Minggu): Rp ${formatRupiah(sumWargaTotal)}`, 18, nextY + 5.5);
  doc.text(`Total Donasi Suka Rela: Rp ${formatRupiah(totalSukarela)}`, 115, nextY + 5.5);
  doc.text(`Total Pengeluaran Kas: Rp ${formatRupiah(totalKeluar)}`, 205, nextY + 5.5);

  doc.setTextColor(15, 118, 54);
  doc.text(`SISA SALDO KAS TERSEDIA: Rp ${formatRupiah(sisa)}`, 18, nextY + 11.5);

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Sekretaris PHBI', name: '' },
    { title: 'Administrator', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Rekapitulasi Kolom 12 Minggu Iuran Warga');
  doc.save(`Rekapitulasi_Mingguan_12_Minggu_${Date.now()}.pdf`);
}

// ==========================================
// 8. ADMIN: Laporan Keseluruhan Master
// ==========================================
export function generatePdfLaporanKeseluruhanAdmin(
  totalWarga: number,
  totalSukarela: number,
  totalKeluar: number,
  wargaPaymentsCount: number,
  citizensCount: number,
  sukarelaCount: number,
  pengeluaranCount: number,
  pengeluaranList?: Pengeluaran[],
  citizens?: Citizen[],
  committeeSettings?: CommitteeSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Pertanggungjawaban Keuangan Keseluruhan',
    'Rekapitulasi Lengkap Pemasukan, Pengeluaran & Sisa Saldo Kas PHBI Isra Miraj 1448 H / 2027 M'
  );

  const ketuaName = committeeSettings?.ketuaPanitia || '';
  const wakilKetuaName = committeeSettings?.wakilKetua || '';
  const sekretarisName = committeeSettings?.sekretaris || '';
  const bendaharaName = committeeSettings?.bendahara || '';
  const adminName = committeeSettings?.adminSistem || '';

  const totalMasuk = totalWarga + totalSukarela;
  const sisaSaldo = totalMasuk - totalKeluar;

  // 1. Kotak Informasi & Susunan Pengurus Resmi
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, 182, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Wilayah: Kp kedung sapi Desa Kp baru kec Pamarayan serang - banten', 18, startY + 4.5);
  doc.text(`Waktu Cetak: ${getCurrentIndonesianTime()}`, 192, startY + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 40);
  doc.text(
    `Pengurus PHBI: Ketua (${ketuaName}) • Wk. Ketua (${wakilKetuaName}) • Sekretaris (${sekretarisName}) • Bendahara (${bendaharaName}) • Admin (${adminName})`,
    18,
    startY + 9.5
  );

  // 2. Tiga Kotak Kartu Ringkasan Finansial Eksekutif
  const boxY = startY + 15;
  const boxHeight = 17;
  const boxWidth = 58;

  // Box 1: Total Pemasukan Kas
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(22, 101, 52);
  doc.text('TOTAL PEMASUKAN KAS', 18, boxY + 4.5);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 54);
  doc.text(`Rp ${formatRupiah(totalMasuk)}`, 18, boxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(75, 85, 99);
  doc.text(`${citizensCount} Warga • ${sukarelaCount} Donatur`, 18, boxY + 14.8);

  // Box 2: Total Pengeluaran Kas
  const box2X = 14 + boxWidth + 4; // 76
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(box2X, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(153, 27, 27);
  doc.text('TOTAL PENGELUARAN KAS', box2X + 4, boxY + 4.5);

  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Rp ${formatRupiah(totalKeluar)}`, box2X + 4, boxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(75, 85, 99);
  doc.text(`${pengeluaranCount} Bukti Transaksi Belanja`, box2X + 4, boxY + 14.8);

  // Box 3: Sisa Saldo Kas Bersih
  const box3X = box2X + boxWidth + 4; // 138
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(box3X, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(7, 89, 133);
  doc.text('SISA SALDO KAS BERSIH', box3X + 4, boxY + 4.5);

  doc.setFontSize(10.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`Rp ${formatRupiah(sisaSaldo)}`, box3X + 4, boxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(75, 85, 99);
  doc.text(`Dipertanggungjawabkan: ${bendaharaName}`, box3X + 4, boxY + 14.8);

  // 3. Tabel Neraca Rekapitulasi Kas Utama
  const tableStartY = boxY + boxHeight + 4;

  const financialItems = [
    ['1.1', 'Penerimaan Iuran Donasi Warga Kp Kedung Sapi (12 Minggu)', `${citizensCount} Warga Terdaftar / ${wargaPaymentsCount} Transaksi`, `Rp ${formatRupiah(totalWarga)}`],
    ['1.2', 'Penerimaan Donasi Suka Rela / Dermawan & Donatur', `${sukarelaCount} Donatur Terverifikasi`, `Rp ${formatRupiah(totalSukarela)}`],
    ['[A]', 'TOTAL PENERIMAAN DANA MASUK (1.1 + 1.2)', 'Total Kas Masuk Terkumpul', `Rp ${formatRupiah(totalMasuk)}`],
    ['2.1', 'Realisasi Belanja Operasional, Konsumsi & Acara', `${pengeluaranCount} Bukti Belanja Diverifikasi`, `Rp ${formatRupiah(totalKeluar)}`],
    ['[B]', 'TOTAL PENGELUARAN KAS PANITIA', 'Total Kas Keluar Dibelanjakan', `Rp ${formatRupiah(totalKeluar)}`],
    ['[C]', 'SISA SALDO AKHIR KAS PANITIA (A - B)', 'Saldo Kas Riil Amanah Terjaga', `Rp ${formatRupiah(sisaSaldo)}`]
  ];

  autoTable(doc, {
    startY: tableStartY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No / Kode', 'Uraian Pos Keuangan', 'Volume & Keterangan Rincian', 'Jumlah Nominal (Rp)']],
    body: financialItems,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 54],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.6,
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { cellWidth: 76, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { halign: 'right', cellWidth: 38, fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.row.index === 2) {
        // Baris Total Masuk
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [22, 101, 52];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 4) {
        // Baris Total Keluar
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 5) {
        // Baris Sisa Saldo
        data.cell.styles.fillColor = [224, 242, 254];
        data.cell.styles.textColor = [3, 105, 161];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // 4. Lampiran Rincian Pengeluaran Kas (Bila tersedia)
  if (pengeluaranList && pengeluaranList.length > 0) {
    let currentY = (doc as any).lastAutoTable.finalY + 6;
    const pageHeight = doc.internal.pageSize.getHeight();

    if (currentY > pageHeight - 68) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(`Lampiran Rincian Belanja Kas Bendahara (${pengeluaranList.length} Transaksi Terverifikasi):`, 14, currentY);
    currentY += 3;

    const pengeluaranRows = pengeluaranList.map((p, idx) => [
      (idx + 1).toString(),
      getShortDate(p.timestamp),
      p.description,
      p.recipient || '-',
      p.recordedBy || 'Bendahara',
      `Rp ${formatRupiah(p.amount)}`
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      showHead: 'everyPage',
      head: [['No', 'Tanggal', 'Keperluan Belanja / Uraian', 'Penerima / Toko', 'Petugas', 'Nominal (Rp)']],
      body: pengeluaranRows,
      foot: [['', '', 'TOTAL REALISASI BELANJA KAS', '', '', `Rp ${formatRupiah(totalKeluar)}`]],
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      footStyles: {
        fillColor: [254, 242, 242],
        textColor: [185, 28, 28],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        lineWidth: 0.15,
        lineColor: [226, 232, 240],
        overflow: 'linebreak'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 26 },
        2: { cellWidth: 62 },
        3: { cellWidth: 36 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
      }
    });
  }

  // 5. Catatan Akuntabilitas & Pernyataan Resmi Panitia
  let notesY = (doc as any).lastAutoTable.finalY + 6;
  const pageH = doc.internal.pageSize.getHeight();
  if (notesY > pageH - 58) {
    doc.addPage();
    notesY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, notesY, 182, 17, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  doc.text('CATATAN PENGESAHAN & AKUNTABILITAS PANITIA PHBI:', 18, notesY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Laporan ini merupakan rekapitulasi data resmi yang disinkronkan secara digital dan riil.', 18, notesY + 8);
  doc.text('2. Penerimaan dana donasi warga dan suka rela telah dibukukan secara tertib untuk kegiatan Isra Miraj 1448 H / 2027 M.', 18, notesY + 12);
  doc.text(`3. Seluruh pengeluaran diverifikasi dan dipertanggungjawabkan oleh Bendahara Panitia (${bendaharaName}).`, 18, notesY + 15.5);

  // 6. Pengesahan Pejabat Panitia Inti (Ketua, Wakil Ketua, Sekretaris, Bendahara)
  addSignatures(doc, [
    { title: 'Ketua Panitia', name: ketuaName },
    { title: 'Wakil Ketua PHBI', name: wakilKetuaName },
    { title: 'Sekretaris PHBI', name: sekretarisName },
    { title: 'Bendahara PHBI', name: bendaharaName }
  ]);

  addPageFooters(doc, 'Laporan Pertanggungjawaban Master PHBI');
  doc.save(`Laporan_Keseluruhan_Panitia_Isra_Miraj_${Date.now()}.pdf`);
}

// Laporan Transparansi Khusus Warga Kp Kedung Sapi (Uang Masuk, Uang Keluar, dan Sisa Saldo Kas)
export function generatePdfTransparansiWarga(
  citizens: Citizen[],
  sukarelaPayments: DonasiSukarela[],
  pengeluaranList: Pengeluaran[],
  totalWarga: number,
  totalSukarela: number,
  totalKeluar: number,
  sisaSaldo: number,
  targetPerPerson: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addKopSurat(
    doc,
    'Laporan Transparansi Keuangan Terbuka untuk Warga',
    'Arsip Keterbukaan Uang Masuk, Uang Keluar, dan Sisa Saldo Kas Isra Miraj'
  );

  const totalMasuk = totalWarga + totalSukarela;
  const wargaUtamaCount = citizens.filter(c => !c.isNgontrak).length;

  // 1. Tabel Ringkasan Kas Utama
  const financialSummary = [
    ['A', 'Penerimaan Donasi Warga Kp Kedung Sapi', `${wargaUtamaCount} Warga Terdaftar (Urut A - Z)`, `Rp ${formatRupiah(totalWarga)}`],
    ['B', 'Penerimaan Donasi Suka Rela / Dermawan', `${sukarelaPayments.length} Donatur Terdaftar`, `Rp ${formatRupiah(totalSukarela)}`],
    ['', 'TOTAL UANG MASUK (A + B)', '', `Rp ${formatRupiah(totalMasuk)}`],
    ['C', 'Total Pengeluaran Kas (Belanja & Operasional)', `${pengeluaranList.length} Transaksi Tercatat`, `Rp ${formatRupiah(totalKeluar)}`],
    ['', 'SISA SALDO KAS BERSIH SAAT INI (MASUK - KELUAR)', 'Amanah Kas Terjaga', `Rp ${formatRupiah(sisaSaldo)}`]
  ];

  autoTable(doc, {
    startY: startY + 4,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Uraian Pos Keuangan', 'Keterangan', 'Jumlah (Rp)']],
    body: financialSummary,
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 54], textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 85, fontStyle: 'bold' },
      2: { cellWidth: 47 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [22, 101, 52];
      }
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [254, 240, 138];
        data.cell.styles.textColor = [113, 63, 18];
      }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Tabel Rincian Pengeluaran Kas Transparan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 81, 40);
  doc.text('1. Rincian Pengeluaran Kas (Uang Keluar Terbuka):', 14, currentY);
  currentY += 3;

  if (pengeluaranList.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Belum ada transaksi pengeluaran kas yang dibelanjakan.', 14, currentY + 4);
    currentY += 8;
  } else {
    const pengeluaranRows = pengeluaranList.map((p, idx) => [
      (idx + 1).toString(),
      getShortDate(p.timestamp),
      p.description,
      p.recipient || '-',
      `Rp ${formatRupiah(p.amount)}`
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      showHead: 'everyPage',
      head: [['No', 'Tanggal', 'Keperluan Belanja / Uraian', 'Penerima / Toko', 'Nominal (Rp)']],
      body: pengeluaranRows,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 26 },
        2: { cellWidth: 78 },
        3: { cellWidth: 34 },
        4: { halign: 'right', cellWidth: 34, fontStyle: 'bold' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Check page space for Donasi Suka Rela
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 20;
  }

  // 3. Tabel Donasi Suka Rela
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 81, 40);
  doc.text('2. Rincian Donasi Suka Rela (Dermawan & Donatur):', 14, currentY);
  currentY += 3;

  if (sukarelaPayments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Belum ada data donasi suka rela yang tercatat.', 14, currentY + 4);
    currentY += 8;
  } else {
    const sukarelaRows = sukarelaPayments.map((s, idx) => [
      (idx + 1).toString(),
      getShortDate(s.timestamp),
      s.donorName,
      s.keterangan || 'Infaq / Shodaqoh',
      `Rp ${formatRupiah(s.amount)}`
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      showHead: 'everyPage',
      head: [['No', 'Tanggal', 'Nama Donatur / Dermawan', 'Keterangan Donasi', 'Nominal (Rp)']],
      body: sukarelaRows,
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 26 },
        2: { cellWidth: 65, fontStyle: 'bold' },
        3: { cellWidth: 47 },
        4: { halign: 'right', cellWidth: 34, fontStyle: 'bold' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Official Statement
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'Demikian laporan transparansi ini diterbitkan sebagai wujud akuntabilitas dan keterbukaan publik Panitia PHBI Isra Miraj Kp. Kedung Sapi, Desa Kp. Baru, Kec. Pamarayan, Serang - Banten.',
    14,
    currentY
  );
  doc.text(
    'Jazakumullahu khairan katsiran kepada seluruh warga dan donatur yang telah berpartisipasi dan menyisihkan rezekinya.',
    14,
    currentY + 4
  );

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Sekretaris PHBI', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Laporan Transparansi Kas Warga');
  doc.save(`Laporan_Transparansi_Kas_Warga_Kp_Kedung_Sapi_${Date.now()}.pdf`);
}

// =========================================================================
// 8. WARGA: Laporan Khusus Rincian Uang Masuk (Iuran Warga + Donasi Suka Rela)
// =========================================================================
export function generatePdfRincianUangMasukWarga(
  citizens: Citizen[],
  sukarelaPayments: DonasiSukarela[],
  totalWarga: number,
  totalSukarela: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalMasuk = totalWarga + totalSukarela;
  const wargaUtamaCount = citizens.filter(c => !c.isNgontrak).length;

  let currentY = addKopSurat(
    doc,
    'Laporan Rincian Penerimaan Uang Masuk',
    'Transparansi Iuran Warga 12 Minggu & Donasi Suka Rela PHBI Isra Miraj 1448 H / 2027 M'
  );

  // 1. Ringkasan Kas Masuk
  const summaryRows = [
    ['1', 'Penerimaan Iuran Warga Kp Kedung Sapi', `${wargaUtamaCount} Warga Terdaftar (Urut A-Z)`, `Rp ${formatRupiah(totalWarga)}`],
    ['2', 'Penerimaan Donasi Suka Rela / Dermawan', `${sukarelaPayments.length} Donatur Tercatat`, `Rp ${formatRupiah(totalSukarela)}`],
    ['', 'TOTAL PENERIMAAN UANG MASUK', 'Kas Masuk Bersih Terkumpul', `Rp ${formatRupiah(totalMasuk)}`]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Sumber Pemasukan Kas', 'Keterangan', 'Jumlah (Rp)']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 54], textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.8, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 80, fontStyle: 'bold' },
      2: { cellWidth: 52 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [22, 101, 52];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Rekapitulasi Iuran Warga Per Minggu (1 s/d 12)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 81, 40);
  doc.text('I. Rekapitulasi Penerimaan Iuran Warga Per Minggu (Minggu 1 s/d 12)', 14, currentY);
  currentY += 3;

  const weeklyRows = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const weekSum = citizens.reduce(
      (sum, c) => sum + (c.excludedWeeks?.[w] ? 0 : (Number(c.weeks?.[w]) || 0)),
      0
    );
    const paidCount = citizens.filter(
      c => !c.isNgontrak && !c.excludedWeeks?.[w] && (Number(c.weeks?.[w]) || 0) > 0
    ).length;
    return [
      `Minggu ke-${w}`,
      `${paidCount} Warga Menyetor`,
      `Rp ${formatRupiah(weekSum)}`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['Periode Minggu', 'Jumlah Partisipasi Warga', 'Total Terkumpul']],
    body: weeklyRows,
    foot: [['TOTAL IURAN WARGA (12 MINGGU)', `${wargaUtamaCount} Warga Terdata`, `Rp ${formatRupiah(totalWarga)}`]],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 54], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 62 },
      2: { halign: 'right', cellWidth: 70, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 3. Rincian Donasi Suka Rela / Dermawan
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`II. Daftar Penerimaan Donasi Suka Rela / Dermawan (${sukarelaPayments.length} Donatur)`, 14, currentY);
  currentY += 3;

  const sukarelaSorted = [...sukarelaPayments].sort((a, b) =>
    a.donorName.localeCompare(b.donorName, 'id', { sensitivity: 'base' })
  );

  const sukarelaRows = sukarelaSorted.map((s, idx) => [
    idx + 1,
    getShortDate(s.timestamp),
    s.donorName,
    s.keterangan || 'Donasi Sukarela / Shodaqoh',
    `Rp ${formatRupiah(s.amount)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Tanggal', 'Nama Donatur', 'Keterangan', 'Nominal Donasi']],
    body: sukarelaRows.length > 0 ? sukarelaRows : [['-', '-', 'Belum ada donasi suka rela', '-', 'Rp 0']],
    foot: [['', '', 'TOTAL DONASI SUKA RELA', '', `Rp ${formatRupiah(totalSukarela)}`]],
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 243, 199], textColor: [120, 53, 15], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 28 },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { cellWidth: 48 },
      4: { halign: 'right', cellWidth: 34, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Statement & Doa
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'Demikian rincian penerimaan uang masuk ini disampaikan secara transparan kepada seluruh warga Kp Kedung Sapi.',
    14,
    currentY
  );
  doc.text(
    'Jazakumullahu khairan katsiran atas infaq, shodaqoh, dan keikhlasan warga serta donatur sekalian.',
    14,
    currentY + 4
  );

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Sekretaris PHBI', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Rincian Penerimaan Uang Masuk');
  doc.save(`Laporan_Rincian_Uang_Masuk_${Date.now()}.pdf`);
}

// =========================================================================
// 9. WARGA: Laporan Khusus Rincian Uang Keluar (Belanja & Operasional Kas)
// =========================================================================
export function generatePdfRincianUangKeluarWarga(
  pengeluaranList: Pengeluaran[],
  totalKeluar: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();

  let currentY = addKopSurat(
    doc,
    'Laporan Rincian Pengeluaran Kas',
    'Transparansi Belanja Operasional & Kebutuhan Acara PHBI Isra Miraj 1448 H / 2027 M'
  );

  // 1. Ringkasan Pengeluaran
  const summaryRows = [
    ['Total Frekuensi Belanja Kas', `${pengeluaranList.length} Transaksi Belanja Terverifikasi`],
    ['TOTAL REALISASI PENGELUARAN KAS', `Rp ${formatRupiah(totalKeluar)}`]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['Kategori Pengeluaran', 'Keterangan / Jumlah']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.8, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 82, fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.row.index === 1) {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [185, 28, 28];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Tabel Rincian Belanja Kas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(185, 28, 28);
  doc.text(`Rincian Lengkap Penggunaan Dana Kas (${pengeluaranList.length} Transaksi)`, 14, currentY);
  currentY += 3;

  const rows = pengeluaranList.map((p, idx) => [
    idx + 1,
    getShortDate(p.timestamp),
    p.description,
    p.recipient || '-',
    p.recordedBy || 'Bendahara',
    `Rp ${formatRupiah(p.amount)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    head: [['No', 'Tanggal', 'Uraian Keperluan Belanja', 'Penerima / Toko', 'Petugas', 'Nominal (Rp)']],
    body: rows.length > 0 ? rows : [['-', '-', 'Belum ada data pengeluaran kas', '-', '-', 'Rp 0']],
    foot: [['', '', 'TOTAL PENGELUARAN KAS', '', '', `Rp ${formatRupiah(totalKeluar)}`]],
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { cellWidth: 36 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Statement Akuntabilitas
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'Demikian rincian pengeluaran kas ini diterbitkan secara sah dan bertanggung jawab oleh Bendahara PHBI.',
    14,
    currentY
  );
  doc.text(
    'Seluruh pos belanja telah digunakan sesuai kebutuhan perayaan Hari Besar Islam Isra Miraj Kp Kedung Sapi.',
    14,
    currentY + 4
  );

  addSignatures(doc, [
    { title: 'Ketua Panitia', name: '' },
    { title: 'Sekretaris PHBI', name: '' },
    { title: 'Bendahara PHBI', name: '' }
  ]);

  addPageFooters(doc, 'Rincian Pengeluaran Kas Warga');
  doc.save(`Laporan_Rincian_Uang_Keluar_${Date.now()}.pdf`);
}

// 12. Cetak Dokumen Resmi Susunan Panitia Isra Mi'raj 1448 H / 2027 M
export function generatePdfStrukturPanitia(committeeSettings?: CommitteeSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const ketuaName = committeeSettings?.ketuaPanitia || '';
  const wakilKetuaName = committeeSettings?.wakilKetua || '';
  const sekretarisName = committeeSettings?.sekretaris || '';
  const bendaharaName = committeeSettings?.bendahara || '';
  const pelindungList = committeeSettings?.pelindung || [];
  const penasehatList = committeeSettings?.penasehat || [];
  const penanggungJawabList = committeeSettings?.penanggungJawab || [];
  const sections = committeeSettings?.sections || [];

  let currentY = addKopSurat(
    doc,
    "SURAT KEPUTUSAN SUSUNAN PANITIA PELAKSANA",
    "PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MI'RAJ NABI MUHAMMAD SAW 1448 H / 2027 M"
  );

  // Dewan Pembina & Pengurus Inti Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, currentY, pageWidth - 28, 44, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 81, 40);
  doc.text('I. PELINDUNG, PENASEHAT, PENANGGUNG JAWAB & PENGURUS INTI', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(31, 41, 55);

  const col1X = 18;
  const col2X = pageWidth / 2 + 12;

  // Left Column
  doc.text(`Pelindung`, col1X, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${pelindungList.join(', ')}`, col1X + 34, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.text(`Penasehat`, col1X, currentY + 19);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${penasehatList.join(' & ')}`, col1X + 34, currentY + 19);

  doc.setFont('helvetica', 'normal');
  doc.text(`Penanggung Jawab`, col1X, currentY + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${penanggungJawabList.join(' & ')}`, col1X + 34, currentY + 25);

  doc.setFont('helvetica', 'normal');
  doc.text(`Ketua Pelaksana`, col1X, currentY + 31);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${ketuaName}`, col1X + 34, currentY + 31);

  doc.setFont('helvetica', 'normal');
  doc.text(`Wakil Ketua`, col1X, currentY + 37);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${wakilKetuaName}`, col1X + 34, currentY + 37);

  // Right Column
  doc.setFont('helvetica', 'normal');
  doc.text(`Sekretaris`, col2X, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${sekretarisName}`, col2X + 26, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.text(`Bendahara`, col2X, currentY + 19);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${bendaharaName}`, col2X + 26, currentY + 19);

  doc.setFont('helvetica', 'normal');
  doc.text(`Administrator`, col2X, currentY + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${committeeSettings?.adminSistem || 'Riyan'}`, col2X + 26, currentY + 25);

  doc.setFont('helvetica', 'normal');
  doc.text(`Wilayah`, col2X, currentY + 31);
  doc.setFont('helvetica', 'bold');
  doc.text(`: Kp kedung sapi Desa Kp baru`, col2X + 26, currentY + 31);

  currentY += 50;

  // Header Table Seksi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 81, 40);
  doc.text('II. SEKSI – SEKSI BIDANG PELAKSANA', 14, currentY);
  currentY += 3;

  const tableBody = sections.map((sec, idx) => [
    idx + 1,
    sec.name,
    sec.coordinator,
    Array.isArray(sec.members) ? sec.members.join(', ') : sec.members
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    head: [['No', 'Bidang / Seksi', 'Koordinator', 'Anggota Seksi']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 54],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [15, 81, 40] },
      3: { cellWidth: 92 }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      valign: 'middle',
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Official signatures of 4 key leaders
  addSignatures(doc, [
    { title: 'Ketua Panitia', name: ketuaName },
    { title: 'Wakil Ketua PHBI', name: wakilKetuaName },
    { title: 'Sekretaris PHBI', name: sekretarisName },
    { title: 'Bendahara PHBI', name: bendaharaName }
  ]);

  addPageFooters(doc, 'Susunan Panitia Isra Miraj 1448 H / 2027 M');
  doc.save(`Susunan_Panitia_Isra_Miraj_1448H_2027M_${Date.now()}.pdf`);
}

// Draw official Cover Page (Sampul Depan) for Proposal Kegiatan PHBI Isra Mi'raj
function drawProposalCoverPage(
  doc: jsPDF,
  proposal: ProposalData,
  committeeSettings?: CommitteeSettings
) {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // 1. Double Islamic Decorative Borders
  // Outer deep rose border (1.6mm)
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(1.6);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Inner amber gold border (0.5mm)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // 4 Corner Decorative Accents
  const cornerSize = 4.5;
  const drawCorner = (x: number, y: number) => {
    doc.setFillColor(217, 119, 6);
    doc.rect(x, y, cornerSize, cornerSize, 'F');
    doc.setFillColor(6, 78, 59);
    doc.rect(x + 1, y + 1, cornerSize - 2, cornerSize - 2, 'F');
    doc.setFillColor(254, 243, 199);
    doc.circle(x + cornerSize / 2, y + cornerSize / 2, 0.8, 'F');
  };
  drawCorner(15, 15);
  drawCorner(pageWidth - 15 - cornerSize, 15);
  drawCorner(15, pageHeight - 15 - cornerSize);
  drawCorner(pageWidth - 15 - cornerSize, pageHeight - 15 - cornerSize);

  // 2. Header Ribbon Badge: "PROPOSAL KEGIATAN"
  const badgeW = 106;
  const badgeH = 10.5;
  const badgeX = (pageWidth - badgeW) / 2;
  const badgeY = 24;
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, 'F');
  // Amber accent line under badge
  doc.setFillColor(217, 119, 6);
  doc.rect(badgeX + 10, badgeY + badgeH, badgeW - 20, 0.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  const coverJudulText = (proposal.coverJudul || 'PROPOSAL KEGIATAN').toUpperCase();
  doc.text(coverJudulText, pageWidth / 2, badgeY + 7.0, { align: 'center' });

  // 3. Subtitle: "PERINGATAN HARI BESAR ISLAM (PHBI)"
  let y = 43.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(180, 83, 9); // Amber 700
  const subJudul = (proposal.coverSubjudul || 'PERINGATAN HARI BESAR ISLAM (PHBI)').toUpperCase();
  doc.text(subJudul, pageWidth / 2, y, { align: 'center' });

  // 4. Main Event Title: "ISRA MI'RAJ NABI MUHAMMAD SAW"
  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17.5);
  doc.setTextColor(15, 23, 42);
  const mainTitle = (proposal.namaKegiatan || proposal.judulProposal || "ISRA MI'RAJ NABI MUHAMMAD SAW").toUpperCase();
  const titleLines: string[] = doc.splitTextToSize(mainTitle, pageWidth - 46);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += titleLines.length * 6.8 + 1.2;

  // 5. Year Badge: "1448 H / 2027 M"
  const yearText = proposal.coverTahun || '1448 H / 2027 M';
  const yearW = 56;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.roundedRect((pageWidth - yearW) / 2, y, yearW, 8, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14);
  doc.text(yearText, pageWidth / 2, y + 5.6, { align: 'center' });
  y += 15;

  // 6. Central Islamic Vector Medallion (Center at cx, cy)
  const cx = pageWidth / 2;
  const cy = y + 17;

  // Outer gold ornamental ring
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, 19, 'S');

  // Inner rose ring with tint
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(1.2);
  doc.circle(cx, cy, 16.5, 'FD');

  // 8-Pointed Star (Rub el Hizb via overlapping square & diamond)
  doc.setFillColor(6, 78, 59);
  doc.rect(cx - 9.5, cy - 9.5, 19, 19, 'F');
  doc.triangle(cx, cy - 13.4, cx + 13.4, cy, cx - 13.4, cy, 'F');
  doc.triangle(cx, cy + 13.4, cx + 13.4, cy, cx - 13.4, cy, 'F');

  // Center medallion in amber/gold
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, 7.5, 'FD');

  // Crescent moon & star vector in the center
  doc.setFillColor(217, 119, 6);
  doc.circle(cx - 0.6, cy, 4.0, 'F');
  doc.setFillColor(254, 243, 199);
  doc.circle(cx + 1.2, cy - 0.4, 3.4, 'F');
  doc.setFillColor(217, 119, 6);
  doc.circle(cx + 2.5, cy - 1.4, 0.9, 'F');

  y += 42;

  // 7. Event Theme Box
  const themeBoxW = pageWidth - 44; // 166mm
  const themeBoxX = (pageWidth - themeBoxW) / 2;
  const rawTema =
    proposal.temaKegiatan ||
    'Meneladani Akhlak Mulia Rasulullah SAW serta Memperkokoh Ukhuwah Islamiyah dan Semangat Gotong Royong Warga';
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  const temaLines: string[] = doc.splitTextToSize(`"${rawTema}"`, themeBoxW - 14);
  const themeBoxH = 11 + temaLines.length * 4.6 + 4;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.4);
  doc.roundedRect(themeBoxX, y, themeBoxW, themeBoxH, 2.5, 2.5, 'FD');

  // Mini ribbon at top of theme box
  doc.setFillColor(6, 95, 70);
  doc.roundedRect(pageWidth / 2 - 25, y - 2.8, 50, 5.4, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TEMA KEGIATAN', pageWidth / 2, y + 1.0, { align: 'center' });

  // Theme text inside box
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.2);
  doc.setTextColor(6, 78, 59);
  doc.text(temaLines, pageWidth / 2, y + 8, { align: 'center' });

  y += themeBoxH + 6;

  // 8. Event Schedule & Venue Highlight
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  const schedBoxW = pageWidth - 50;
  const schedBoxX = (pageWidth - schedBoxW) / 2;
  const hariText = proposal.hariTanggal || 'Minggu, 17 Januari 2027 (1448 H)';
  const tempatText = proposal.tempatPelaksanaan || 'Lingkungan Majelis Kp. Kedung Sapi';
  const tempatLines: string[] = doc.splitTextToSize(`Tempat: ${tempatText}`, schedBoxW - 10);
  const schedBoxH = 11 + tempatLines.length * 4.0;

  doc.roundedRect(schedBoxX, y, schedBoxW, schedBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Waktu: ${hariText}`, pageWidth / 2, y + 5.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(tempatLines, pageWidth / 2, y + 9.8, { align: 'center' });

  // 9. Bottom Organizer Block ("Diajukan Oleh:")
  const divLineW = 60;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - divLineW / 2, pageHeight - 57, pageWidth / 2 + divLineW / 2, pageHeight - 57);
  doc.setFillColor(6, 78, 59);
  doc.circle(pageWidth / 2, pageHeight - 57, 1.2, 'F');

  let orgY = pageHeight - 51;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('DIAJUKAN OLEH:', pageWidth / 2, orgY, { align: 'center' });

  orgY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(6, 78, 59);
  doc.text(
    proposal.coverInstansi || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)',
    pageWidth / 2,
    orgY,
    { align: 'center' }
  );

  orgY += 4.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KP. KEDUNG SAPI DESA KP. BARU', pageWidth / 2, orgY, { align: 'center' });

  orgY += 4.4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    proposal.coverWilayah || 'KECAMATAN PAMARAYAN – KABUPATEN SERANG – PROVINSI BANTEN',
    pageWidth / 2,
    orgY,
    { align: 'center' }
  );

  orgY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text(`TAHUN ${yearText}`, pageWidth / 2, orgY, { align: 'center' });

  // Finish cover page and move to document body
  doc.addPage();
}

// 13. Cetak Dokumen Lengkap Proposal Kegiatan PHBI Isra Mi'raj 1448 H / 2027 M (Lengkap Sampul + A s/d I + 8 Tanda Tangan)
export function generatePdfProposalKegiatan(
  proposal: ProposalData,
  committeeSettings?: CommitteeSettings,
  liveRealisasi?: {
    totalRealisasiMasuk?: number;
    totalRealisasiWarga?: number;
    totalRealisasiSukarela?: number;
    targetPerPerson?: number;
    wargaUtamaCount?: number;
  }
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const topSafeY = 18;
  const bottomSafeY = pageHeight - 15; // 282mm (above footer line at 287mm)

  // =========================================================================
  // 0. HALAMAN SAMPUL DEPAN (OFFICIAL COVER PAGE)
  // =========================================================================
  drawProposalCoverPage(doc, proposal, committeeSettings);

  const ensureSpace = (currentY: number, neededHeight: number): number => {
    if (currentY + neededHeight > bottomSafeY) {
      doc.addPage();
      return topSafeY;
    }
    return currentY;
  };

  // Matches the on-screen rose-900 section bar with amber-400 badge box [A]..[I]
  const drawSectionHeader = (y: number, code: string, title: string): number => {
    const nextY = ensureSpace(y, 24);
    // Dark rose-900 bar
    doc.setFillColor(6, 78, 59);
    doc.roundedRect(marginX, nextY, contentWidth, 8.2, 1.8, 1.8, 'F');

    // Amber-400 badge square on the left
    doc.setFillColor(251, 191, 36);
    doc.roundedRect(marginX + 2.5, nextY + 1.3, 5.6, 5.6, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(code, marginX + 5.3, nextY + 5.1, { align: 'center' });

    // Section title in bold white uppercase
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), marginX + 10.5, nextY + 5.4);

    return nextY + 12;
  };

  // Draws paragraphs matching the on-screen spacing and styling
  const drawParagraphs = (y: number, text: string): number => {
    let curY = y;
    const textX = marginX + 1.5;
    const textW = contentWidth - 3;

    const paragraphs = (text || '').split('\n');
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        curY += 2;
        continue;
      }

      const isGreeting =
        /^bismillah/i.test(trimmed) ||
        /^assalamu/i.test(trimmed) ||
        /^wassalamu/i.test(trimmed);

      doc.setFont('helvetica', isGreeting ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(isGreeting ? 6 : 30, isGreeting ? 78 : 41, isGreeting ? 59 : 59);

      const lines: string[] = doc.splitTextToSize(trimmed, textW);

      // Avoid orphan single line at the bottom of a page
      if (curY + Math.min(lines.length, 2) * 4.4 > bottomSafeY) {
        doc.addPage();
        curY = topSafeY;
        doc.setFont('helvetica', isGreeting ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(isGreeting ? 6 : 30, isGreeting ? 78 : 41, isGreeting ? 59 : 59);
      }

      for (let i = 0; i < lines.length; i++) {
        if (curY + 4.4 > bottomSafeY) {
          doc.addPage();
          curY = topSafeY;
          doc.setFont('helvetica', isGreeting ? 'bold' : 'normal');
          doc.setFontSize(9);
          doc.setTextColor(isGreeting ? 6 : 30, isGreeting ? 78 : 41, isGreeting ? 59 : 59);
        }
        doc.text(lines[i], textX, curY);
        curY += 4.4;
      }
      curY += 1.6;
    }
    return curY + 1;
  };

  // =========================================================================
  // 1. KOP SURAT RESMI (4 Baris Terpisah + Garis Ganda, Persis Seperti Layar)
  // =========================================================================
  let currentY = 10;
  doc.setFillColor(6, 95, 70);
  doc.rect(marginX, currentY, contentWidth, 2, 'F');
  currentY += 6.5;

  // Baris Kop 1
  const kopBaris1 = (proposal.kopBaris1 || 'PANITIA PERINGATAN HARI BESAR ISLAM (PHBI)').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70);
  const k1Lines: string[] = doc.splitTextToSize(kopBaris1, contentWidth);
  doc.text(k1Lines, pageWidth / 2, currentY, { align: 'center' });
  currentY += k1Lines.length * 4.5 + 1;

  // Baris Kop 2
  const kopBaris2 = (proposal.kopBaris2 || "ISRA MI'RAJ NABI MUHAMMAD SAW 1448 H / 2027 M").toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  const k2Lines: string[] = doc.splitTextToSize(kopBaris2, contentWidth);
  doc.text(k2Lines, pageWidth / 2, currentY, { align: 'center' });
  currentY += k2Lines.length * 5.2 + 0.5;

  // Baris Kop 3 (Alamat Wilayah)
  const kopAlamat =
    proposal.kopAlamat ||
    'Lingkungan Kp kedung sapi Desa Kp baru kec Pamarayan serang - banten';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  const k3Lines: string[] = doc.splitTextToSize(kopAlamat, contentWidth);
  doc.text(k3Lines, pageWidth / 2, currentY, { align: 'center' });
  currentY += k3Lines.length * 3.8 + 0.5;

  // Baris Kop 4 (Info Sekretariat & Hotline WA)
  const kopSekretariat =
    proposal.kopSekretariat ||
    `Sekretariat: Majelis Kp. Kedung Sapi • Hotline / WhatsApp Resmi: ${committeeSettings?.nomorWa || '081414033436'}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  const k4Lines: string[] = doc.splitTextToSize(kopSekretariat, contentWidth);
  doc.text(k4Lines, pageWidth / 2, currentY, { align: 'center' });
  currentY += k4Lines.length * 3.6 + 1.5;

  // Garis Ganda Kop Surat (Double Border Emerald)
  doc.setDrawColor(6, 95, 70);
  doc.setLineWidth(0.9);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  doc.setLineWidth(0.35);
  doc.line(marginX, currentY + 1.4, pageWidth - marginX, currentY + 1.4);

  currentY += 5.5;

  // =========================================================================
  // 2. KOTAK IDENTITAS SURAT (2 Kolom Kiri & Kanan, Persis Seperti Layar)
  // =========================================================================
  const leftLabelW = 20;
  const leftValW = 84; // Total left col = 104mm
  const rightColW = 66; // Right col = 66mm

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const perihalLines: string[] = doc.splitTextToSize(proposal.perihal || '-', leftValW);
  const kepadaLines: string[] = doc.splitTextToSize(proposal.kepadaYth || '-', rightColW);

  const leftColH = 10.4 + perihalLines.length * 4.0;
  const rightColH = 9.5 + kepadaLines.length * 4.0;
  const metaBoxH = Math.max(leftColH, rightColH) + 6;

  currentY = ensureSpace(currentY, metaBoxH + 16);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, metaBoxH, 2, 2, 'FD');

  // Left Column: Nomor, Lampiran, Perihal
  let leftY = currentY + 5.2;
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Nomor', marginX + 4, leftY);
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${proposal.nomorProposal || '-'}`, marginX + 4 + leftLabelW, leftY);

  leftY += 4.8;
  doc.setTextColor(100, 116, 139);
  doc.text('Lampiran', marginX + 4, leftY);
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${proposal.lampiran || '1 (Satu) Bundel Berkas'}`, marginX + 4 + leftLabelW, leftY);

  leftY += 4.8;
  doc.setTextColor(100, 116, 139);
  doc.text('Perihal', marginX + 4, leftY);
  doc.setTextColor(15, 23, 42);
  doc.text(':', marginX + 4 + leftLabelW, leftY);
  doc.text(perihalLines, marginX + 6.5 + leftLabelW, leftY);

  // Right Column: Tanggal Surat & Kepada Yth. (Right-aligned like on screen)
  const rightEdgeX = pageWidth - marginX - 4;
  let rightY = currentY + 5.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(proposal.tanggalSurat || `Serang, ${getShortDate()}`, rightEdgeX, rightY, { align: 'right' });

  rightY += 4.6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Kepada Yth.:', rightEdgeX, rightY, { align: 'right' });

  rightY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(kepadaLines, rightEdgeX, rightY, { align: 'right' });

  currentY += metaBoxH + 5.5;

  // =========================================================================
  // 3. JUDUL PROPOSAL & TEMA KEGIATAN (Di Bawah Kotak Identitas, Persis Layar)
  // =========================================================================
  const judulText = (
    proposal.judulProposal ||
    "PROPOSAL KEGIATAN PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MI'RAJ NABI MUHAMMAD SAW 1448 H / 2027 M"
  ).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(6, 78, 59);
  const judulLines: string[] = doc.splitTextToSize(judulText, contentWidth - 8);
  currentY = ensureSpace(currentY, judulLines.length * 4.5 + 10);
  doc.text(judulLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += judulLines.length * 4.5 + 1.2;

  if (proposal.temaKegiatan) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const temaLines: string[] = doc.splitTextToSize(`Tema: "${proposal.temaKegiatan}"`, contentWidth - 14);
    doc.text(temaLines, pageWidth / 2, currentY, { align: 'center' });
    currentY += temaLines.length * 4.0 + 4.5;
  } else {
    currentY += 3;
  }

  // =========================================================================
  // A. KATA PENGANTAR
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'A', 'Kata Pengantar');
  currentY = drawParagraphs(currentY, proposal.kataPengantar);

  // =========================================================================
  // B. MAKSUD DAN TUJUAN
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'B', 'Maksud dan Tujuan');
  currentY = ensureSpace(currentY, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('1. Maksud Kegiatan', marginX + 1.5, currentY);
  currentY += 4.6;
  currentY = drawParagraphs(currentY, proposal.maksudKegiatan);

  currentY = ensureSpace(currentY, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('2. Tujuan Kegiatan', marginX + 1.5, currentY);
  currentY += 4.8;

  (proposal.tujuanKegiatan || []).forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines: string[] = doc.splitTextToSize(item, contentWidth - 10);
    currentY = ensureSpace(currentY, lines.length * 4.4 + 1.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text(`${idx + 1}.`, marginX + 2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(lines, marginX + 8, currentY);
    currentY += lines.length * 4.4 + 1.4;
  });
  currentY += 2;

  // =========================================================================
  // C. BENTUK KEGIATAN
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'C', 'Bentuk Kegiatan');
  currentY = drawParagraphs(currentY, proposal.bentukKegiatanDeskripsi);

  (proposal.bentukKegiatanList || []).forEach((item, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    const lines: string[] = doc.splitTextToSize(item, contentWidth - 10);
    currentY = ensureSpace(currentY, lines.length * 4.4 + 1.8);
    doc.setTextColor(6, 78, 59);
    doc.text(`${idx + 1}.`, marginX + 2, currentY);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, marginX + 8, currentY);
    currentY += lines.length * 4.4 + 1.4;
  });
  currentY += 2;

  // =========================================================================
  // D. WAKTU DAN TEMPAT PELAKSANAAN (Kartu Hijau 2 Kolom Persis Seperti Layar)
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'D', 'Waktu dan Tempat Pelaksanaan');

  const halfColW = (contentWidth - 14) / 2; // ~84mm per column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  const hariLines: string[] = doc.splitTextToSize(proposal.hariTanggal || '-', halfColW);
  const waktuLines: string[] = doc.splitTextToSize(proposal.waktuPelaksanaan || '-', halfColW);
  const tempatLines: string[] = doc.splitTextToSize(proposal.tempatPelaksanaan || '-', contentWidth - 10);
  const penceramahLines: string[] = doc.splitTextToSize(proposal.penceramah || '-', halfColW);
  const qoriLines: string[] = doc.splitTextToSize(proposal.qori || '-', halfColW);

  const row1H = 4.2 + Math.max(hariLines.length, waktuLines.length) * 4.1 + 3.2;
  const row2H = 4.2 + tempatLines.length * 4.1 + 3.2;
  const row3H = 4.2 + Math.max(penceramahLines.length, qoriLines.length) * 4.1 + 3.2;
  const cardDH = row1H + row2H + row3H + 4;

  currentY = ensureSpace(currentY, cardDH + 4);
  doc.setFillColor(236, 253, 245); // rose-50
  doc.setDrawColor(167, 243, 208); // rose-200
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, currentY, contentWidth, cardDH, 2, 2, 'FD');

  const dCol1X = marginX + 5;
  const dCol2X = marginX + 5 + halfColW + 4;
  let dY = currentY + 5;

  // Row 1: Hari / Tanggal (Left) & Waktu Pelaksanaan (Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Hari / Tanggal Pelaksanaan:', dCol1X, dY);
  doc.text('Waktu Pelaksanaan:', dCol2X, dY);

  dY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(hariLines, dCol1X, dY);
  doc.text(waktuLines, dCol2X, dY);

  dY += Math.max(hariLines.length, waktuLines.length) * 4.1 + 3.2;

  // Row 2: Tempat / Lokasi (Full Width)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Tempat / Lokasi:', dCol1X, dY);

  dY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(tempatLines, dCol1X, dY);

  dY += tempatLines.length * 4.1 + 3.2;

  // Row 3: Penceramah / Mubaligh (Left) & Qori Tilawah Al-Qur'an (Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Penceramah / Mubaligh:', dCol1X, dY);
  doc.text("Qori Tilawah Al-Qur'an:", dCol2X, dY);

  dY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(6, 78, 59);
  doc.text(penceramahLines, dCol1X, dY);
  doc.text(qoriLines, dCol2X, dY);

  currentY += cardDH + 6;

  // =========================================================================
  // E. SUSUNAN ACARA DAN RUNDOWN ACARA
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'E', 'Susunan Acara dan Rundown Acara');

  const rundownBody = (proposal.rundownAcara || []).map((item, idx) => [
    idx + 1,
    item.waktu,
    item.kegiatan,
    item.pengisi,
    item.keterangan || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: topSafeY, bottom: 18, left: marginX, right: marginX },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    head: [['No', 'Waktu (WIB)', 'Susunan / Mata Acara', 'Pengisi / PJ', 'Keterangan']],
    body: rundownBody,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 29, fontStyle: 'bold', textColor: [6, 78, 59] },
      2: { cellWidth: 64, textColor: [30, 41, 59] },
      3: { cellWidth: 44, fontStyle: 'bold', textColor: [6, 95, 70] },
      4: { cellWidth: 36, textColor: [100, 116, 139] }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6.5;

  // =========================================================================
  // F. ANGGARAN DANA (RENCANA ANGGARAN BIAYA / RAB)
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'F', 'Anggaran Dana (Rencana Anggaran Biaya / RAB)');

  const totalAnggaran = (proposal.anggaranDana || []).reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  const rabBody = (proposal.anggaranDana || []).map((item, idx) => [
    idx + 1,
    item.kategori,
    item.uraian,
    item.volume,
    `Rp ${formatRupiah(Number(item.jumlah) || 0)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: topSafeY, bottom: 18, left: marginX, right: marginX },
    showHead: 'everyPage',
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',
    head: [['No', 'Bidang / Seksi', 'Uraian Kebutuhan Anggaran', 'Volume / Satuan', 'Jumlah Biaya (Rp)']],
    body: rabBody,
    foot: [[
      {
        content: 'TOTAL ESTIMASI KEBUTUHAN ANGGARAN DANA:',
        colSpan: 4,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] }
      },
      {
        content: `Rp ${formatRupiah(totalAnggaran)}`,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [120, 53, 15] }
      }
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 36, fontStyle: 'bold', textColor: [30, 41, 59] },
      2: { cellWidth: 68, textColor: [51, 65, 85] },
      3: { cellWidth: 30, halign: 'center', textColor: [71, 85, 105] },
      4: { cellWidth: 39, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6.5;

  // =========================================================================
  // G. SUMBER DANA (Tabel + Kotak Catatan Realisasi Kas Live Persis Layar)
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'G', 'Sumber Dana');
  currentY = drawParagraphs(currentY, proposal.sumberDanaDeskripsi);

  const totalSumberDana = (proposal.sumberDanaList || []).reduce((sum, item) => sum + (Number(item.estimasi) || 0), 0);
  const sumberBody = (proposal.sumberDanaList || []).map((item, idx) => [
    idx + 1,
    item.sumber,
    item.uraian,
    `Rp ${formatRupiah(Number(item.estimasi) || 0)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: topSafeY, bottom: 18, left: marginX, right: marginX },
    showHead: 'everyPage',
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',
    head: [['No', 'Sumber Pendanaan', 'Keterangan / Rincian', 'Target / Estimasi (Rp)']],
    body: sumberBody,
    foot: [[
      {
        content: 'TOTAL ESTIMASI SUMBER DANA:',
        colSpan: 3,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] }
      },
      {
        content: `Rp ${formatRupiah(totalSumberDana)}`,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] }
      }
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 52, fontStyle: 'bold', textColor: [30, 41, 59] },
      2: { cellWidth: 78, textColor: [51, 65, 85] },
      3: { cellWidth: 43, halign: 'right', fontStyle: 'bold', textColor: [6, 78, 59] }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3.5;

  // Kotak Catatan Realisasi Kas Panitia Saat Ini (Live)
  const realisasiMasuk = liveRealisasi?.totalRealisasiMasuk ?? 0;
  const realisasiWarga = liveRealisasi?.totalRealisasiWarga ?? 0;
  const realisasiSukarela = liveRealisasi?.totalRealisasiSukarela ?? 0;
  const targetWarga = liveRealisasi?.targetPerPerson ?? committeeSettings?.targetPerPerson ?? 250000;
  const countWarga = liveRealisasi?.wargaUtamaCount ?? 132;

  currentY = ensureSpace(currentY, 12);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, 9.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Catatan Realisasi Kas Panitia Saat Ini (Live): Rp ${formatRupiah(realisasiMasuk)} (Iuran Warga: Rp ${formatRupiah(realisasiWarga)} · Donasi Sukarela: Rp ${formatRupiah(realisasiSukarela)})`,
    marginX + 3.5,
    currentY + 6
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(
    `Target Per Warga: Rp ${formatRupiah(targetWarga)} (${countWarga} Warga Utama)`,
    pageWidth - marginX - 3.5,
    currentY + 6,
    { align: 'right' }
  );

  currentY += 14.5;

  // =========================================================================
  // H. SUSUNAN PANITIA PELAKSANA (Grid 9 Kartu Pengurus Inti + Tabel Seksi)
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'H', 'Susunan Panitia Pelaksana');

  const signers = proposal.signers || {
    ketuaPanitia: committeeSettings?.ketuaPanitia || '',
    wakilKetua: committeeSettings?.wakilKetua || '',
    sekretaris: committeeSettings?.sekretaris || '',
    bendahara: committeeSettings?.bendahara || '',
    ketuaRt: committeeSettings?.penanggungJawab?.[0] || '',
    ketuaPemuda: '',
    tokohPenanggungJawab:
      committeeSettings?.penasehat && committeeSettings.penasehat.length > 0
        ? committeeSettings.penasehat.join(' & ')
        : '',
    kepalaDesa: committeeSettings?.pelindung?.[0] || ''
  };

  const signerRoles = proposal.signerRoles || {};

  const pelindungPdf =
    proposal.pelindung ||
    (committeeSettings?.pelindung && committeeSettings.pelindung.length > 0
      ? committeeSettings.pelindung.join(', ')
      : '');
  const penasehatPdf =
    proposal.penasehat ||
    (committeeSettings?.penasehat && committeeSettings.penasehat.length > 0
      ? committeeSettings.penasehat.join(' & ')
      : '');
  const penanggungJawabPdf =
    proposal.penanggungJawab ||
    (committeeSettings?.penanggungJawab && committeeSettings.penanggungJawab.length > 0
      ? committeeSettings.penanggungJawab.join(' & ')
      : '');
  const adminPdf = proposal.adminSistem || committeeSettings?.adminSistem || '';

  // Subheading I
  currentY = ensureSpace(currentY, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(6, 78, 59);
  doc.text('I. PELINDUNG, PENASEHAT, PENANGGUNG JAWAB & PENGURUS INTI PHBI', marginX + 1, currentY);
  currentY += 3.5;

  const corePositions = [
    { label: 'Pelindung', value: pelindungPdf },
    { label: 'Penasehat', value: penasehatPdf },
    { label: 'Penanggung Jawab (RT 011 / RW 04 & Lingkungan)', value: penanggungJawabPdf },
    { label: signerRoles.ketuaPemuda || 'Ketua Pemuda Kp. Kedung Sapi', value: signers.ketuaPemuda },
    { label: signerRoles.ketuaPanitia || 'Ketua Panitia Pelaksana', value: signers.ketuaPanitia },
    { label: signerRoles.wakilKetua || 'Wakil Ketua Panitia', value: signers.wakilKetua },
    { label: signerRoles.sekretaris || 'Sekretaris PHBI', value: signers.sekretaris },
    { label: signerRoles.bendahara || 'Bendahara PHBI', value: signers.bendahara },
    { label: 'Administrator Sistem', value: adminPdf }
  ];

  // Draw 3x3 Grid of Emerald Cards matching the on-screen layout
  const gridGap = 3;
  const gridCardW = (contentWidth - gridGap * 2) / 3; // ~58.6mm per card
  for (let r = 0; r < corePositions.length; r += 3) {
    const rowItems = corePositions.slice(r, r + 3);
    let maxRowH = 13.5;
    const prepared = rowItems.map(item => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const lblLines: string[] = doc.splitTextToSize(item.label, gridCardW - 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      const valLines: string[] = doc.splitTextToSize(item.value || '-', gridCardW - 5);
      const h = 4 + lblLines.length * 3.4 + valLines.length * 4.0 + 2.5;
      if (h > maxRowH) maxRowH = h;
      return { lblLines, valLines };
    });

    currentY = ensureSpace(currentY, maxRowH + 2.5);
    prepared.forEach((prep, cIdx) => {
      const cardX = marginX + cIdx * (gridCardW + gridGap);
      doc.setFillColor(236, 253, 245); // rose-50
      doc.setDrawColor(167, 243, 208); // rose-200
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, currentY, gridCardW, maxRowH, 1.8, 1.8, 'FD');

      let textY = currentY + 4.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(6, 95, 70);
      doc.text(prep.lblLines, cardX + 3, textY);
      textY += prep.lblLines.length * 3.4 + 0.8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      doc.setTextColor(15, 23, 42);
      doc.text(prep.valLines, cardX + 3, textY);
    });

    currentY += maxRowH + 2.5;
  }

  currentY += 3;

  // Subheading II: Seksi-Seksi Bidang Pelaksana
  currentY = ensureSpace(currentY, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(6, 78, 59);
  doc.text('II. SEKSI-SEKSI BIDANG PELAKSANA', marginX + 1, currentY);
  currentY += 3;

  const sections =
    proposal.sections && proposal.sections.length > 0
      ? proposal.sections
      : committeeSettings?.sections || [
          { name: 'Seksi Acara', coordinator: 'Imat', members: ['Yoga', 'Ara', 'Bila', 'Rahma'] },
          { name: 'Logistik', coordinator: 'Darma', members: ['Rangga', 'Imam P', 'Herti', 'Heriah'] },
          { name: 'Seksi Konsumsi', coordinator: 'Feby', members: ['Naya', 'Indah', 'Andre', 'Hendar', 'Ika'] },
          { name: 'Seksi Dekorasi', coordinator: 'Wulan', members: ['Ina', 'Fajri', 'Dimas', 'Siroj'] },
          { name: 'Seksi Dokumentasi', coordinator: 'Lulu', members: ['Hikmat', 'Diah', 'Lee', 'Rijal'] },
          { name: 'Humas', coordinator: 'Anwar', members: ['Odih', 'Sarif', 'Agung', 'Ilham'] },
          { name: 'Seksi Kebersihan', coordinator: 'Halik', members: ['Seluruh Panitia'] },
          { name: 'Sekretariat', coordinator: 'Hopipah', members: ['Reni', 'Erwin', 'Riyan', 'Anas'] },
          { name: 'Keamanan', coordinator: 'Candra', members: ['Egi', 'Mulya', 'Usup', 'Jalu'] }
        ];

  const seksiRows = sections.map((sec, idx) => [
    idx + 1,
    sec.name,
    sec.coordinator,
    Array.isArray(sec.members) ? sec.members.join(', ') : String(sec.members || '-')
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { top: topSafeY, bottom: 18, left: marginX, right: marginX },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    head: [['No', 'Seksi Bidang', 'Koordinator', 'Anggota Pelaksana']],
    body: seksiRows,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 42, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [6, 95, 70] },
      3: { cellWidth: 92, textColor: [51, 65, 85] }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6.5;

  // =========================================================================
  // I. PENUTUP & PENGESAHAN
  // =========================================================================
  currentY = drawSectionHeader(currentY, 'I', 'Penutup & Pengesahan');
  currentY = drawParagraphs(currentY, proposal.penutup);

  // =========================================================================
  // LEMBAR PENGESAHAN PROPOSAL KEGIATAN (8 Kartu Tanda Tangan Persis Layar)
  // =========================================================================
  const pengesahanBoxH = 112;
  currentY = ensureSpace(currentY + 2, pengesahanBoxH);

  // Outer Box Lembar Pengesahan
  doc.setFillColor(243, 250, 246);
  doc.setDrawColor(15, 118, 54);
  doc.setLineWidth(0.45);
  doc.roundedRect(marginX, currentY, contentWidth, pengesahanBoxH, 2.5, 2.5, 'FD');

  // Header Lembar Pengesahan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(6, 95, 70);
  doc.text('LEMBAR PENGESAHAN PROPOSAL KEGIATAN', pageWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    "PANITIA PERINGATAN HARI BESAR ISLAM (PHBI) ISRA MI'RAJ 1448 H / 2027 M",
    pageWidth / 2,
    currentY + 10.2,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Ditetapkan di: Kp kedung sapi Desa Kp baru, Kec. Pamarayan — ${proposal.tanggalSurat || `Serang, ${getShortDate()}`}`,
    pageWidth / 2,
    currentY + 14.5,
    { align: 'center' }
  );

  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.35);
  doc.line(marginX + 5, currentY + 17, pageWidth - marginX - 5, currentY + 17);

  // Helper to draw 4 signature cards in a row matching the on-screen cards
  const drawFourSignerCards = (
    rowStartY: number,
    rowHeader: string,
    borderColor: [number, number, number],
    roleTextColor: [number, number, number],
    rowSigners: { roleTitle: string; name: string }[]
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(6, 95, 70);
    doc.text(rowHeader.toUpperCase(), pageWidth / 2, rowStartY, { align: 'center' });

    const gap = 3;
    const totalInnerW = contentWidth - 10;
    const cardW = (totalInnerW - gap * 3) / 4; // ~40.75mm per card
    const cardTopY = rowStartY + 2.2;
    const cardH = 38;

    rowSigners.forEach((sg, idx) => {
      const cardX = marginX + 5 + idx * (cardW + gap);
      const centerX = cardX + cardW / 2;

      // White card with subtle border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardTopY, cardW, cardH, 2, 2, 'FD');

      // Role Title (uppercase bold, wrapped up to 2 lines)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.1);
      doc.setTextColor(roleTextColor[0], roleTextColor[1], roleTextColor[2]);
      const roleLines: string[] = doc.splitTextToSize((sg.roleTitle || '-').toUpperCase(), cardW - 3);
      doc.text(roleLines.slice(0, 2), centerX, cardTopY + 5, { align: 'center' });

      // Signature line at 4/5 width
      const lineY = cardTopY + 25.5;
      const lineHalfW = (cardW * 0.78) / 2;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(centerX - lineHalfW, lineY, centerX + lineHalfW, lineY);

      // Signer Name in bold parentheses (wrapped up to 2 lines so long names never clip)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(15, 23, 42);
      const nameStr = `( ${sg.name || '................'} )`;
      const nameLines: string[] = doc.splitTextToSize(nameStr, cardW - 2.5);
      doc.text(nameLines.slice(0, 2), centerX, lineY + 4.2, { align: 'center' });
    });
  };

  // BARIS 1: PENGURUS INTI PANITIA (4 Kartu TTD)
  drawFourSignerCards(
    currentY + 21.5,
    "Hormat Kami, Panitia Pelaksana PHBI Isra Mi'raj 1448 H / 2027 M",
    [226, 232, 240],
    [51, 65, 85],
    [
      { roleTitle: signerRoles.ketuaPanitia || 'Ketua Panitia', name: signers.ketuaPanitia },
      { roleTitle: signerRoles.wakilKetua || 'Wakil Ketua', name: signers.wakilKetua },
      { roleTitle: signerRoles.sekretaris || 'Sekretaris', name: signers.sekretaris },
      { roleTitle: signerRoles.bendahara || 'Bendahara', name: signers.bendahara }
    ]
  );

  // Divider between Row 1 and Row 2
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.3);
  doc.line(marginX + 5, currentY + 64.5, pageWidth - marginX - 5, currentY + 64.5);

  // BARIS 2: MENGETAHUI & MENYETUJUI (4 Kartu TTD)
  drawFourSignerCards(
    currentY + 69,
    'Mengetahui & Menyetujui, Pemerintah Desa & Penanggung Jawab Lingkungan',
    [167, 243, 208],
    [6, 78, 59],
    [
      { roleTitle: signerRoles.ketuaRt || 'Ketua RT 011 / RW 04', name: signers.ketuaRt },
      { roleTitle: signerRoles.ketuaPemuda || 'Ketua Pemuda', name: signers.ketuaPemuda },
      { roleTitle: signerRoles.tokohPenanggungJawab || 'Tokoh (Penanggung Jawab)', name: signers.tokohPenanggungJawab },
      { roleTitle: signerRoles.kepalaDesa || 'Kepala Desa Kp Baru', name: signers.kepalaDesa }
    ]
  );

  addPageFooters(doc, 'Proposal Kegiatan PHBI Isra Miraj 1448 H / 2027 M Kp Kedung Sapi', { hasCoverPage: true });
  doc.save(`Proposal_PHBI_Isra_Miraj_Kp_Kedung_Sapi_1448H_2027M_${Date.now()}.pdf`);
}


