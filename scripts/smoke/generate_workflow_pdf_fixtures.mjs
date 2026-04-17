import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const rootDir = path.resolve(process.cwd(), '..', '..');
const fixturesDir = path.join(rootDir, 'scripts', 'smoke', 'fixtures');
const outDir = path.join(fixturesDir, 'pdf');
const outDocxDir = path.join(fixturesDir, 'docx');
const outZipDir = path.join(fixturesDir, 'zip');
const backendDir = path.join(rootDir, 'src', 'back');
const require = createRequire(path.join(backendDir, 'package.json'));
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const PizZip = require('pizzip');

const specs = [
  {
    fileName: '01_QuyetDinhThanhLapHoiDong.pdf',
    title: 'QUYET DINH THANH LAP HOI DONG',
    lines: [
      'So quyet dinh: QD/2026/005',
      'De tai: AI-2023-V1',
      'Noi dung: Thanh lap hoi dong nghiem thu',
      'Ngay ban hanh: 2026-04-17',
    ],
  },
  {
    fileName: '02_BienBanNghiemThu_DaKy.pdf',
    title: 'BIEN BAN NGHIEM THU DA KY',
    lines: [
      'Ma bien ban: BBNT-2026-005',
      'Hoi dong: QD/2026/005',
      'Ket luan: Dat yeu cau nghiem thu',
      'Trang thai: da ky so',
    ],
  },
  {
    fileName: '03_HoSoQuyetToan_TongHop.pdf',
    title: 'HO SO QUYET TOAN TONG HOP',
    lines: [
      'Ma ho so: QT-2026-005',
      'Tong kinh phi: 650,000,000 VND',
      'Noi dung: Bao cao tong hop quyet toan',
      'Nguoi nop: owner@nckh.edu.vn',
    ],
  },
  {
    fileName: '04_ChungTuChiTieu_HoaDon.pdf',
    title: 'CHUNG TU CHI TIEU HOA DON',
    lines: [
      'Loai tai lieu: hoa don, chung tu',
      'Du an: AI-2023-V1',
      'Gia tri doi chieu: 650,000,000 VND',
      'Tinh trang: day du',
    ],
  },
  {
    fileName: '05_BienBanThanhLy_DaKy.pdf',
    title: 'BIEN BAN THANH LY DA KY',
    lines: [
      'Ma thanh ly: TL-2026-005',
      'Doi tuong: AI-2023-V1',
      'Trang thai: da xac nhan',
      'Ngay thanh ly: 2026-04-17',
    ],
  },
  {
    fileName: '06_DonXinGiaHan_DeTai.pdf',
    title: 'DON XIN GIA HAN DE TAI',
    lines: [
      'De tai: AI-2023-V1',
      'Ly do: Can them thoi gian hoan thien du lieu',
      'So ngay gia han de xuat: 30',
      'Nguoi de xuat: owner@nckh.edu.vn',
    ],
  },
  {
    fileName: '07_PhuLucGiaHan_TienDo.pdf',
    title: 'PHU LUC GIA HAN TIEN DO',
    lines: [
      'Ma phu luc: PLGH-2026-005',
      'Noi dung: cap nhat tien do va moc giao nop',
      'Ngay cap nhat: 2026-04-17',
      'Trang thai: cho phe duyet',
    ],
  },
  {
    fileName: '08_BaoCaoGiuaKy_Mau.pdf',
    title: 'BAO CAO GIUA KY MAU',
    lines: [
      'De tai: AI-2023-V1',
      'Loai bao cao: Midterm',
      'Noi dung: tien do va ket qua tam thoi',
      'Nguoi nop: owner@nckh.edu.vn',
    ],
  },
  {
    fileName: '09_BaoCaoTongKet_Final.pdf',
    title: 'BAO CAO TONG KET FINAL',
    lines: [
      'De tai: AI-2023-V1',
      'Loai bao cao: Final submission',
      'Noi dung: tong hop ket qua nghien cuu',
      'Trang thai: cho nghiem thu',
    ],
  },
  {
    fileName: '10_PhieuNhanXet_PhanBien1.pdf',
    title: 'PHIEU NHAN XET PHAN BIEN 1',
    lines: [
      'Thanh vien: reviewer@demo.com',
      'Diem de xuat: 80/100',
      'Nhan xet: Dat yeu cau, can bo sung minh chung',
      'Tinh trang: da nop',
    ],
  },
  {
    fileName: '11_PhieuNhanXet_PhanBien2.pdf',
    title: 'PHIEU NHAN XET PHAN BIEN 2',
    lines: [
      'Thanh vien: council@nckh.edu.vn',
      'Diem de xuat: 75/100',
      'Nhan xet: Co tinh moi, can chinh sua trinh bay',
      'Tinh trang: da nop',
    ],
  },
  {
    fileName: '12_BienBanHopHoiDong.pdf',
    title: 'BIEN BAN HOP HOI DONG',
    lines: [
      'Ma hop: HOP-2026-005',
      'Thanh phan: Chu tich, Thu ky, 2 Phan bien, Uy vien',
      'Ket qua: thong qua nghiem thu',
      'Trang thai: cho gui chinh thuc',
    ],
  },
  {
    fileName: '13_TemplateHopDong_DeTai.pdf',
    title: 'TEMPLATE HOP DONG DE TAI',
    lines: [
      'Loai: mau hop dong (default template)',
      'Dung cho: Buoc 1 - Upload mau hop dong',
      'Dinh dang: PDF',
      'Chu y: co the upload ban DOCX tu thu muc fixtures/docx',
    ],
  },
  {
    fileName: '14_HopDongNghienCuu_BanNhap.pdf',
    title: 'HOP DONG NGHIEN CUU BAN NHAP',
    lines: [
      'So HD: HD/2026/AI-2023-V1',
      'Ngay ky: 2026-04-17',
      'Gia tri kinh phi: 650,000,000 VND',
      'Dung cho: Buoc 2 - Upload PDF hop dong khi tao moi',
    ],
  },
  {
    fileName: '15_HopDongNghienCuu_DaKyScan.pdf',
    title: 'HOP DONG NGHIEN CUU DA KY (SCAN)',
    lines: [
      'So HD: HD/2026/AI-2023-V1',
      'Trang thai: da ky va dong dau',
      'Dung cho: Buoc 4 - Upload ban scan da ky',
      'Nguon: file demo phuc vu smoke test',
    ],
  },
  {
    fileName: '16_BaoCaoTienDoGiuaKy_Upload.pdf',
    title: 'BAO CAO TIEN DO GIUA KY (UPLOAD)',
    lines: [
      'De tai: AI-2023-V1',
      'Loai: Midterm progress report',
      'Dung cho: Buoc 6 - Nop bao cao giua ky',
      'Trang thai mong doi: da bao cao giua ky',
    ],
  },
  {
    fileName: '17_BaoCaoTongKetDeTai_Upload.pdf',
    title: 'BAO CAO TONG KET DE TAI (UPLOAD)',
    lines: [
      'De tai: AI-2023-V1',
      'Loai: Final report PDF',
      'Dung cho: Buoc 7 - Tai lieu 1/3',
      'Trang thai mong doi: da nop ket qua',
    ],
  },
  {
    fileName: '18_BienBanChuTich_DaKy.pdf',
    title: 'BIEN BAN CHU TICH DA KY',
    lines: [
      'Hoi dong: QD/2026/005',
      'Dung cho: Buoc 14 - Upload bien ban da ky',
      'Nguoi ky: Chu tich hoi dong',
      'Ket qua: gui ket qua va ket thuc nghiem thu',
    ],
  },
];

const docxSpecs = [
  {
    fileName: '01_TemplateHopDong_DeTai.docx',
    title: 'TEMPLATE HOP DONG DE TAI',
    lines: [
      'Dung cho Buoc 1 - Upload mau hop dong',
      'Ban DOCX de test upload template',
      'De tai mau: AI-2023-V1',
    ],
  },
  {
    fileName: '02_ThuyetMinhKetQuaNghienCuu.docx',
    title: 'THUYET MINH KET QUA NGHIEN CUU',
    lines: [
      'Dung cho Buoc 7 - Tai lieu 2/3 (.docx)',
      'Noi dung: tom tat ket qua nghien cuu cuoi ky',
      'Nguoi nop: owner@nckh.edu.vn',
    ],
  },
];

const zipSpecs = [
  {
    fileName: '01_PhuLucVaDuLieuGoc_AI2023V1.zip',
    entries: [
      {
        path: 'README.txt',
        content: [
          'PHU LUC VA DU LIEU GOC',
          'Dung cho Buoc 7 - Tai lieu 3/3 (.zip)',
          'De tai: AI-2023-V1',
        ].join('\n'),
      },
      {
        path: 'du_lieu/mau_so_lieu.csv',
        content: [
          'thoi_diem,chi_so_1,chi_so_2',
          '2026-01,78.2,65.1',
          '2026-02,80.4,67.0',
          '2026-03,82.9,70.2',
        ].join('\n'),
      },
      {
        path: 'phu_luc/mo_ta_thi_nghiem.txt',
        content: 'File mo ta thi nghiem va quy trinh thu thap du lieu phuc vu smoke test.',
      },
    ],
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createDocx({ fileName, title, lines }) {
  const textRows = [title, ...lines, `Generated at: ${new Date().toISOString()}`];
  const xmlParagraphs = textRows
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${xmlParagraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

  const bytes = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.writeFile(path.join(outDocxDir, fileName), bytes);
}

async function createZip({ fileName, entries }) {
  const zip = new PizZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.content);
  }
  const bytes = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.writeFile(path.join(outZipDir, fileName), bytes);
}

async function createPdf({ fileName, title, lines }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 790;
  page.drawText(title, {
    x: 50,
    y,
    size: 18,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 38;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: 12,
      font: bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 24;
  }

  page.drawText('Generated for workflow smoke test fixtures', {
    x: 50,
    y: 70,
    size: 10,
    font: bodyFont,
    color: rgb(0.45, 0.45, 0.45),
  });

  const bytes = await pdf.save();
  await fs.writeFile(path.join(outDir, fileName), bytes);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(outDocxDir, { recursive: true });
  await fs.mkdir(outZipDir, { recursive: true });

  for (const spec of specs) {
    await createPdf(spec);
  }
  for (const spec of docxSpecs) {
    await createDocx(spec);
  }
  for (const spec of zipSpecs) {
    await createZip(spec);
  }

  const readmePath = path.join(outDir, 'README.txt');
  const readmeLines = [
    'Workflow PDF fixtures for upload testing',
    '',
    ...specs.map((spec) => `- ${spec.fileName} :: ${spec.title}`),
  ];
  await fs.writeFile(readmePath, readmeLines.join('\n'), 'utf8');

  const workflowReadmePath = path.join(fixturesDir, 'README_WORKFLOW_UPLOADS.txt');
  const workflowReadmeLines = [
    'FULL CHAIN WORKFLOW UPLOAD FIXTURES',
    '',
    '[PHASE 1 - CONTRACT INIT]',
    '- Step 1 (Upload contract template):',
    '  pdf/13_TemplateHopDong_DeTai.pdf',
    '  docx/01_TemplateHopDong_DeTai.docx',
    '- Step 2 (Create contract + upload PDF):',
    '  pdf/14_HopDongNghienCuu_BanNhap.pdf',
    '- Step 4 (Upload signed scan):',
    '  pdf/15_HopDongNghienCuu_DaKyScan.pdf',
    '',
    '[PHASE 2 - EXECUTION]',
    '- Step 6 (Midterm report upload):',
    '  pdf/16_BaoCaoTienDoGiuaKy_Upload.pdf',
    '',
    '[PHASE 3 - FINAL SUBMISSION]',
    '- Step 7 (3 files):',
    '  pdf/17_BaoCaoTongKetDeTai_Upload.pdf',
    '  docx/02_ThuyetMinhKetQuaNghienCuu.docx',
    '  zip/01_PhuLucVaDuLieuGoc_AI2023V1.zip',
    '',
    '[PHASE 4-8 - EXISTING PDFs]',
    '- Decision, council minutes, settlement, liquidation files:',
    '  pdf/01_QuyetDinhThanhLapHoiDong.pdf',
    '  pdf/02_BienBanNghiemThu_DaKy.pdf',
    '  pdf/03_HoSoQuyetToan_TongHop.pdf',
    '  pdf/04_ChungTuChiTieu_HoaDon.pdf',
    '  pdf/05_BienBanThanhLy_DaKy.pdf',
    '  pdf/06_DonXinGiaHan_DeTai.pdf',
    '  pdf/07_PhuLucGiaHan_TienDo.pdf',
    '  pdf/08_BaoCaoGiuaKy_Mau.pdf',
    '  pdf/09_BaoCaoTongKet_Final.pdf',
    '  pdf/10_PhieuNhanXet_PhanBien1.pdf',
    '  pdf/11_PhieuNhanXet_PhanBien2.pdf',
    '  pdf/12_BienBanHopHoiDong.pdf',
    '  pdf/18_BienBanChuTich_DaKy.pdf',
  ];
  await fs.writeFile(workflowReadmePath, workflowReadmeLines.join('\n'), 'utf8');

  console.log(`Created ${specs.length} PDF files at ${outDir}`);
  console.log(`Created ${docxSpecs.length} DOCX files at ${outDocxDir}`);
  console.log(`Created ${zipSpecs.length} ZIP files at ${outZipDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
