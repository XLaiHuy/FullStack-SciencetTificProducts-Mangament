import fs from 'fs';
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';

export interface AutoFillData {
  project_name: string;
  project_code: string;
  owner_name: string;
  department: string;
  field: string;
  budget: string;
  duration: string;
  start_date: string;
  end_date: string;
  [key: string]: any;
}

/**
 * Generates a simple fallback DOCX when the original template file is missing
 * (e.g., after Render ephemeral filesystem reset)
 */
const generateFallbackDocx = (data: AutoFillData): Buffer => {
  // Minimal valid DOCX built from scratch using PizZip
  const lines = [
    `PHIEU NHAN XET - MA DE TAI: ${data.project_code}`,
    ``,
    `Ten de tai: ${data.project_name}`,
    `Chu nhiem: ${data.owner_name}`,
    `Don vi: ${data.department}`,
    `Linh vuc: ${data.field}`,
    `Kinh phi: ${data.budget}`,
    `Thoi gian: ${data.duration} (${data.start_date} - ${data.end_date})`,
    ``,
    `I. NHAN XET TONG QUAT:`,
    `   ............................................................`,
    ``,
    `II. DIEM CHUYEN MON (0-100): ..........`,
    ``,
    `III. KET LUAN:`,
    `   [ ] Dat yeu cau`,
    `   [ ] Can chinh sua bo sung`,
    `   [ ] Khong dat`,
    ``,
    `Ngay ......... thang ......... nam .........`,
    ``,
    `Nguoi nhan xet`,
    `(Ky va ghi ro ho ten)`,
  ];

  const xmlBody = lines
    .map(
      (line) =>
        `<w:p><w:r><w:t xml:space="preserve">${line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</w:t></w:r></w:p>`,
    )
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:mv="urn:schemas-microsoft-com:mac:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>${xmlBody}</w:body>
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
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};

/**
 * processTemplate
 * @param templatePath Path to the .docx template file
 * @param data Data object containing values to replace placeholders
 * @returns Buffer containing the generated .docx file
 */
export const processTemplate = (templatePath: string, data: AutoFillData): Buffer => {
  // Fallback: if file missing (e.g., Render ephemeral filesystem reset), generate a simple DOCX
  if (!fs.existsSync(templatePath)) {
    console.warn(`[TEMPLATE ENGINE] File not found: ${templatePath}. Generating fallback DOCX.`);
    return generateFallbackDocx(data);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
  } catch (error) {
    throw new Error(`Failed to initialize docxtemplater: ${(error as Error).message}`);
  }

  doc.render(data);

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
};
