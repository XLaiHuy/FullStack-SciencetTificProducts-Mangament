/**
 * make-council-sample.mjs
 * Generates a .docx file listing 5 council members in the exact format
 * that CouncilService.detectCouncilMembers() can parse.
 *
 * Usage:  node scripts/make-council-sample.mjs
 * Output: uploads/councils/DanhSachHoiDong_Mau.docx  (also copied to project root)
 *
 * Expected detection results (5 members):
 *   1. GS.TS Tran Van Duc        – Chủ tịch   – duc.tv@university.edu.vn
 *   2. PGS.TS Nguyen Thi Lan     – Phản biện 1 – lan.nt@research.vn
 *   3. TS Le Minh Khoa           – Phản biện 2 – khoa.lm@edu.vn
 *   4. ThS Pham Thi Huong        – Thư ký     – huong.pt@university.edu.vn
 *   5. TS Hoang Van Nam          – Ủy viên    – nam.hv@science.org.vn
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'uploads', 'councils');
const outFile = path.join(outDir, 'DanhSachHoiDong_Mau.docx');
const rootCopy = path.resolve(__dirname, '..', '..', '..', 'DanhSachHoiDong_Mau.docx');

// ─── Open XML helpers ─────────────────────────────────────────────────────────

const p = (text) => `
    <w:p>
      <w:r><w:t xml:space="preserve">${text}</w:t></w:r>
    </w:p>`;

const pBold = (text) => `
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>
    </w:p>`;

const pCenter = (text, bold = false) => `
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>${bold ? '<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>' : ''}<w:t>${text}</w:t></w:r>
    </w:p>`;

const blank = () => p(' ');

// One data row per member – these patterns match detectCouncilMembers() regex exactly
const memberRow = ({ name, title, role, email, institution }) =>
  // Format: "Họ và tên: <name> | Vai trò: <role> | Email: <email> | Đơn vị: <institution>"
  // detectCouncilMembers splits on '\n', grabs each field by label regex
  p(`Họ và tên: ${title ? title + '. ' : ''}${name} | Vai trò: ${role} | Email: ${email} | Đơn vị: ${institution}`);

// ─── Document content ─────────────────────────────────────────────────────────

const members = [
  {
    name: 'Tran Van Duc',
    title: 'GS.TS',
    role: 'Chủ tịch hội đồng',
    email: 'duc.tv@university.edu.vn',
    institution: 'Dai hoc Bach Khoa TP.HCM',
  },
  {
    name: 'Nguyen Thi Lan',
    title: 'PGS.TS',
    role: 'Phản biện 1',
    email: 'lan.nt@research.vn',
    institution: 'Vien Nghien cuu Khoa hoc Viet Nam',
  },
  {
    name: 'Le Minh Khoa',
    title: 'TS',
    role: 'Phản biện 2',
    email: 'khoa.lm@edu.vn',
    institution: 'Dai hoc Quoc gia Ha Noi',
  },
  {
    name: 'Pham Thi Huong',
    title: 'ThS',
    role: 'Thư ký',
    email: 'huong.pt@university.edu.vn',
    institution: 'Dai hoc Mo TP.HCM',
  },
  {
    name: 'Hoang Van Nam',
    title: 'TS',
    role: 'Ủy viên',
    email: 'nam.hv@science.org.vn',
    institution: 'So Khoa hoc va Cong nghe TP.HCM',
  },
];

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${pCenter('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', false)}
${pCenter('Độc lập - Tự do - Hạnh phúc', false)}
${blank()}
${pCenter('DANH SÁCH THÀNH VIÊN HỘI ĐỒNG NGHIỆM THU', true)}
${pCenter('ĐỀ TÀI NGHIÊN CỨU KHOA HỌC', false)}
${blank()}
${pBold('Mã đề tài: DT-2024-CNTT-001')}
${p('Tên đề tài: Nghiên cứu ứng dụng trí tuệ nhân tạo trong quản lý đề tài khoa học')}
${p('Ngày thành lập hội đồng: 01/04/2024')}
${blank()}
${pBold('DANH SÁCH THÀNH VIÊN:')}
${blank()}
${members.map(memberRow).join('\n')}
${blank()}
${blank()}
${p('Ghi chú:')}
${p('- Chủ tịch hội đồng chịu trách nhiệm điều hành buổi nghiệm thu.')}
${p('- Phản biện 1 và Phản biện 2 chuẩn bị nhận xét bằng văn bản trước buổi họp.')}
${p('- Thư ký ghi biên bản và lưu trữ hồ sơ nghiệm thu.')}
${p('- Ủy viên tham gia đánh giá và biểu quyết kết quả nghiệm thu.')}
${blank()}
${blank()}
${pCenter('TP. Hồ Chí Minh, ngày 01 tháng 04 năm 2024')}
${pCenter('(Tài liệu mẫu – dùng để kiểm tra chức năng nhận diện thành viên hội đồng)')}
  </w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

// ─── ZIP builder (same pure-Node approach as make-sample-proposal.mjs) ────────

const deflateRaw = promisify(zlib.deflateRaw);

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDate(d) {
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { date, time };
}

async function buildZip(entries) {
  const now = new Date();
  const { date, time } = dosDate(now);
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const rawBuf = Buffer.from(data, 'utf8');
    const compressed = await deflateRaw(rawBuf);
    const crc = crc32(rawBuf);

    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(rawBuf.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(rawBuf.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);

    parts.push(lh, compressed);
    centralDir.push(cd);
    offset += lh.length + compressed.length;
  }

  const cdBuf = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDir.length, 8);
  eocd.writeUInt16LE(centralDir.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdBuf, eocd]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(outDir, { recursive: true });

const docxBuf = await buildZip([
  { name: '[Content_Types].xml',          data: contentTypes },
  { name: '_rels/.rels',                  data: rootRels },
  { name: 'word/document.xml',            data: documentXml },
  { name: 'word/_rels/document.xml.rels', data: wordRels },
]);

fs.writeFileSync(outFile, docxBuf);

// Also copy to project root for easy access
try {
  fs.copyFileSync(outFile, rootCopy);
  console.log('📋 Copied to project root:', rootCopy);
} catch {
  // non-critical
}

console.log('');
console.log('✅ File created:', outFile);
console.log('   Size:', docxBuf.length, 'bytes');
console.log('');
console.log('Upload this file via "Nhận diện thành viên hội đồng" in CouncilCreationPage.');
console.log('');
console.log('Expected detection results (5 members):');
members.forEach((m, i) => {
  console.log(`  ${i + 1}. ${m.title ? m.title + '. ' : ''}${m.name}`);
  console.log(`     Vai trò : ${m.role}`);
  console.log(`     Email   : ${m.email}`);
  console.log(`     Đơn vị  : ${m.institution}`);
  console.log('');
});
