import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const rootDir = path.resolve(process.cwd(), '..', '..');
const backendDir = path.join(rootDir, 'src', 'back');
const require = createRequire(path.join(backendDir, 'package.json'));
const PizZip = require('pizzip');

const sourceTxt = path.join(rootDir, 'docs', 'testing', 'test-quy-trinh-extracted.txt');
const outDocx = path.join(rootDir, 'test-quy-trình.docx');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  const raw = await fs.readFile(sourceTxt, 'utf8');
  const lines = raw.replace(/\r/g, '').split('\n');

  const xmlParagraphs = lines
    .map((line) => {
      if (line.trim().length === 0) {
        return '<w:p/>';
      }
      return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
    })
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
  try {
    await fs.writeFile(outDocx, bytes);
    console.log(`Updated DOCX: ${outDocx}`);
  } catch (error) {
    if (error && error.code === 'EBUSY') {
      const fallback = path.join(rootDir, 'test-quy-trình.updated-2026-04-17.docx');
      await fs.writeFile(fallback, bytes);
      console.log(`Target locked, wrote fallback DOCX: ${fallback}`);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
