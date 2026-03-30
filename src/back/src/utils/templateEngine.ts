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
  [key: string]: any; // Allow any other dynamic fields
}

/**
 * processTemplate
 * @param templatePath Path to the .docx template file
 * @param data Data object containing values to replace placeholders
 * @returns Buffer containing the generated .docx file
 */
export const processTemplate = (templatePath: string, data: AutoFillData): Buffer => {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at path: ${templatePath}`);
  }

  // Read the template file into a binary string
  const content = fs.readFileSync(templatePath, 'binary');

  // Load the content into PizZip
  const zip = new PizZip(content);

  // Initialize Docxtemplater
  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
  } catch (error) {
    throw new Error(`Failed to initialize docxtemplater: ${(error as Error).message}`);
  }

  // Set the data for template replacement
  doc.render(data);

  // Generate the new document as a Node.js Buffer
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf;
};
