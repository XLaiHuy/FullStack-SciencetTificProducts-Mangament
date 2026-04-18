import prisma from '../prisma';

/**
 * NCKH Auto Code Generator
 * 
 * Formats:
 *  - Project:    ĐT-YYMM-xxxx   (e.g. ĐT-2403-0001)
 *  - Contract:   HĐ-YYMM-xxxx   (e.g. HĐ-2403-0001)
 *  - Council:    QĐ/YYYY/NNN   (e.g. QĐ/2024/001)
 *  - Settlement: QT-YYYY-NNNN  (e.g. QT-2024-0001)
 */

const getYearMonthCode = () => {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
};

const currentYear = () => new Date().getFullYear();

/** Zero-pad a number to given width */
const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Generate next Project code: ĐT-YYMM-nnnn */
export const nextProjectCode = async (): Promise<string> => {
  const ym = getYearMonthCode();
  const prefix = `ĐT-${ym}-`;
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } }, // Using DB to track sequential ID
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  
  const seq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${pad(seq, 4)}`;
};

/** Generate next Contract code: HĐ-YYMM-nnnn */
export const nextContractCode = async (): Promise<string> => {
  const ym = getYearMonthCode();
  const prefix = `HĐ-${ym}-`;
  const last = await prisma.contract.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  
  const seq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${pad(seq, 4)}`;
};

/** Generate next Council decision code: QĐ/YYYY/NNN */
export const nextCouncilCode = async (): Promise<string> => {
  const year = currentYear();
  const prefix = `QĐ/${year}/`;
  const last = await prisma.council.findFirst({
    where: { decisionCode: { startsWith: prefix } },
    orderBy: { decisionCode: 'desc' },
    select: { decisionCode: true },
  });
  const seq = last ? parseInt(last.decisionCode.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${pad(seq, 3)}`;
};

/** Generate next Settlement code: QT-YYYY-NNNN */
export const nextSettlementCode = async (): Promise<string> => {
  const year = currentYear();
  const prefix = `QT-${year}-`;
  const last = await prisma.settlement.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const seq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${pad(seq, 4)}`;
};
