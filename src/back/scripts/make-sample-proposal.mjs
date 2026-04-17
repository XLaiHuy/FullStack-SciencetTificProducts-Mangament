/**
 * make-sample-proposal.mjs
 * Generates a sample .docx proposal file for testing contract recognition.
 * Usage:  node scripts/make-sample-proposal.mjs
 *
 * A valid .docx is a ZIP archive containing specific XML files.
 * We use Node's built-in `zlib` + manual ZIP construction to avoid
 * needing an external package.  The file is written to:
 *   uploads/contracts/MauDeXuat_Thu_Nghiem.docx
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'uploads', 'contracts');
const outFile = path.join(outDir, 'MauDeXuat_Thu_Nghiem.docx');

// ─── Minimal Open XML content ────────────────────────────────────────────────

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>

    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>ĐỀ XUẤT NGHIÊN CỨU KHOA HỌC</w:t>
      </w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Mã đề tài: </w:t></w:r>
      <w:r><w:t>DT-2024-CNTT-001</w:t></w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Tên đề tài: </w:t></w:r>
      <w:r><w:t>Nghiên cứu ứng dụng trí tuệ nhân tạo trong quản lý đề tài khoa học</w:t></w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Chủ nhiệm đề tài: </w:t></w:r>
      <w:r><w:t>TS. Nguyễn Văn An</w:t></w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Email: </w:t></w:r>
      <w:r><w:t>nguyen.vanan@university.edu.vn</w:t></w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Đơn vị thực hiện: </w:t></w:r>
      <w:r><w:t>Khoa Công nghệ Thông tin - Đại học Mở TP. Hồ Chí Minh</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Kinh phí dự kiến: </w:t></w:r>
      <w:r><w:t>120.000.000 VNĐ</w:t></w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Thời gian thực hiện: </w:t></w:r>
      <w:r><w:t>24 tháng (01/2024 - 12/2025)</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>I. MỤC TIÊU ĐỀ TÀI</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Xây dựng hệ thống quản lý đề tài nghiên cứu khoa học tích hợp AI để tự động nhận diện hợp đồng, trích xuất thông tin và đề xuất kết nối với đề tài phù hợp trong cơ sở dữ liệu.</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>II. TỔNG QUAN NGHIÊN CỨU</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Hiện nay, việc quản lý các hợp đồng nghiên cứu khoa học tại các trường đại học vẫn còn nhiều bất cập. Hệ thống đề xuất sẽ ứng dụng các kỹ thuật NLP để nhận diện tự động từ tài liệu PDF và Word.</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Bên B (Chủ nhiệm đề tài): TS. Nguyễn Văn An</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Ngân sách: </w:t></w:r>
      <w:r><w:t>120,000,000 VND</w:t></w:r>
    </w:p>

    <w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:t>TP. Hồ Chí Minh, ngày 01 tháng 01 năm 2024</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Chủ nhiệm đề tài</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:t>(Ký và ghi rõ họ tên)</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>TS. Nguyễn Văn An</w:t></w:r>
    </w:p>

  </w:body>
</w:document>`;

// ─── Minimal ZIP writer (pure Node, no extra deps) ────────────────────────────
// We use the fact that a DOCX is just a ZIP file.
// Node doesn't bundle a ZIP writer, but we can use the 'archiver' package
// which is already present as a transitive dependency in many Node projects,
// or fall back to writing a valid DOCX using a pre-built minimal binary template.
// Here we take the simplest path: write a node script that uses only built-in
// modules by creating the ZIP using zlib-compressed store entries manually.
// However that's complex, so we use `npm exec` with the `jszip` CLI.
// Simpler: just install `archiver` temporarily.

// Actually - let's use the `docx` package that mamoth can read.
// We'll generate a zip manually using Node's built-in module.

// We implement a tiny MS-Open-XML ZIP ourselves using CRC32 + deflate.
import zlib from 'zlib';
import { promisify } from 'util';

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

    // Local file header
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);  // signature
    lh.writeUInt16LE(20, 4);          // version needed
    lh.writeUInt16LE(0, 6);           // flags
    lh.writeUInt16LE(8, 8);           // compression (deflate)
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(rawBuf.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);

    // Central dir entry
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);  // signature
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

// ─── Main ────────────────────────────────────────────────────────────────────

fs.mkdirSync(outDir, { recursive: true });

const docxBuf = await buildZip([
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels',         data: rootRels },
  { name: 'word/document.xml',   data: documentXml },
  { name: 'word/_rels/document.xml.rels', data: wordRels },
]);

fs.writeFileSync(outFile, docxBuf);
console.log('✅ File created:', outFile);
console.log('   Size:', docxBuf.length, 'bytes');
console.log('');
console.log('Upload this file via the "Nhận diện Đề xuất" feature to test recognition.');
console.log('Expected recognition results:');
console.log('  - Mã đề tài:   DT-2024-CNTT-001');
console.log('  - Chủ nhiệm:   TS. Nguyen Van An');
console.log('  - Email:       nguyen.vanan@university.edu.vn');
console.log('  - Kinh phí:    120,000,000 VND');
