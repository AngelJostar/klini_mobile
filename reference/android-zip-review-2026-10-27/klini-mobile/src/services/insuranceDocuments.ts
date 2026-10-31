// Use the CommonJS entry: Metro otherwise selects tslib's incompatible legacy ESM export.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib/cjs';
import type { Policy } from '../domain/types';
import { insurancePlanName } from '../domain/insurancePresentation';

export type InsuranceDocumentKind = 'credential' | 'policy' | 'conditions' | 'receipts';

const titles: Record<InsuranceDocumentKind, string> = {
  credential: 'Credencial de seguro',
  policy: 'Póliza de seguro',
  conditions: 'Condiciones generales',
  receipts: 'Recibos de seguro',
};
const filenames: Record<InsuranceDocumentKind, string> = {
  credential: 'credencial', policy: 'poliza', conditions: 'condiciones', receipts: 'recibos',
};
const navy = rgb(0.031, 0.141, 0.255);
const teal = rgb(0, 0.56, 0.55);
const muted = rgb(0.39, 0.47, 0.56);
const pale = rgb(0.92, 0.97, 0.97);

// Standard PDF fonts cover Spanish. Preserve supported characters and replace
// unsupported symbols rather than failing an otherwise valid local export.
function printable(value: string, font: PDFFont): string {
  return Array.from(value.normalize('NFC')).map(character => {
    if (/\s/.test(character)) return character === '\n' ? '\n' : ' ';
    try { font.encodeText(character); return character; } catch { return '?'; }
  }).join('');
}

function localDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** Creates an offline example PDF from the currently selected policy. */
export async function createInsuranceDocument(
  policy: Policy,
  kind: InsuranceDocumentKind,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const left = 46;
  const contentWidth = pageWidth - left * 2;
  let page: PDFPage;
  let y = 0;

  document.setTitle(`${titles[kind]} - Datos de ejemplo - Klini`);
  document.setAuthor('Klini - demostración local');
  document.setSubject('Documento ficticio. No acredita cobertura, pagos ni autorización.');
  document.setLanguage('es-MX');

  function newPage() {
    page = document.addPage([pageWidth, pageHeight]);
    page.drawText('klini', { x: left, y: pageHeight - 60, size: 29, font: bold, color: navy });
    page.drawText('SEGURO MÉDICO / DEMOSTRACIÓN', {
      x: left, y: pageHeight - 83, size: 9, font: regular, color: muted,
    });
    page.drawLine({ start: { x: left, y: 64 }, end: { x: pageWidth - left, y: 64 }, thickness: 0.6, color: pale });
    page.drawText('Datos ficticios de ejemplo. No es un documento emitido por una aseguradora.', {
      x: left, y: 45, size: 8, font: regular, color: muted,
    });
    page.drawText(String(document.getPageCount()), {
      x: pageWidth - left - 6, y: 45, size: 8, font: regular, color: muted,
    });
    y = pageHeight - 125;
  }

  function ensureSpace(height: number) {
    if (y - height < 90) newPage();
  }

  function lines(text: string, font: PDFFont, size: number): string[] {
    const result: string[] = [];
    for (const paragraph of printable(text, font).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= contentWidth) { line = candidate; continue; }
        if (line) result.push(line);
        line = '';
        for (const character of word) {
          if (font.widthOfTextAtSize(line + character, size) > contentWidth) {
            result.push(line); line = '';
          }
          line += character;
        }
      }
      result.push(line);
    }
    return result;
  }

  function paragraph(text: string, options: { heading?: boolean; small?: boolean } = {}) {
    const font = options.heading ? bold : regular;
    const size = options.heading ? 12 : options.small ? 10 : 11;
    const leading = options.heading ? 18 : 16;
    const wrapped = lines(text, font, size);
    ensureSpace(leading * Math.min(wrapped.length, 3) + 8);
    for (const line of wrapped) {
      ensureSpace(leading);
      page.drawText(line, { x: left, y, size, font, color: options.small ? muted : navy });
      y -= leading;
    }
    y -= 9;
  }

  function field(label: string, value: string) {
    paragraph(label, { heading: true });
    paragraph(value.trim() || 'No registrado');
  }

  newPage();
  page!.drawText(titles[kind], { x: left, y, size: 23, font: bold, color: navy });
  y -= 38;
  page!.drawRectangle({ x: left, y: y - 25, width: contentWidth, height: 37, color: pale });
  page!.drawText('DATOS DE EJEMPLO - SIN COBERTURA VERIFICADA', {
    x: left + 12, y: y - 10, size: 10, font: bold, color: teal,
  });
  y -= 58;

  field('Plan', insurancePlanName(policy));
  field('Aseguradora', policy.insurer);
  field('Titular', policy.holder);
  field('Número de póliza', policy.number);
  field('Vigencia registrada', `${localDate(policy.startDate)} al ${localDate(policy.endDate)}`);

  if (kind === 'credential') {
    paragraph('Credencial de demostración', { heading: true });
    paragraph('Esta credencial reproduce únicamente los datos guardados en Klini. No identifica a una persona asegurada ni sustituye una credencial oficial.');
    paragraph('La vigencia registrada no acredita elegibilidad, cobertura ni autorización de atención.', { small: true });
  } else if (kind === 'policy') {
    field('Cobertura registrada', policy.coverage);
    if (policy.notes.trim()) field('Notas registradas', policy.notes);
    paragraph('Este resumen local no es una póliza contractual. Los beneficios, exclusiones, deducibles y límites deben confirmarse con la aseguradora.', { small: true });
  } else if (kind === 'conditions') {
    paragraph('Condiciones de la demostración', { heading: true });
    paragraph('Hospitalización, urgencias y consultas médicas se muestran como categorías de ejemplo. Su aparición no significa que estén cubiertas.');
    paragraph('La aseguradora debe confirmar la red disponible, elegibilidad, autorizaciones, deducibles, coaseguro, exclusiones y límites aplicables.');
    paragraph('Este archivo no contiene condiciones contractuales oficiales. Consulta la póliza y la documentación emitida por tu aseguradora.', { small: true });
  } else {
    paragraph('Estado de pagos', { heading: true });
    paragraph('Klini no procesa cobros de primas ni recibe confirmaciones de pago de aseguradoras en esta demostración.');
    paragraph('No hay recibos oficiales asociados. Este documento de ejemplo no acredita un pago, un saldo ni una obligación de pago.');
    paragraph('Solicita los comprobantes válidos directamente a tu aseguradora.', { small: true });
  }

  return document.save();
}

export async function downloadInsuranceDocument(
  policy: Policy,
  kind: InsuranceDocumentKind,
): Promise<void> {
  const bytes = await createInsuranceDocument(policy, kind);
  const safeNumber = policy.number.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'ejemplo';
  const filename = `Klini-${filenames[kind]}-${safeNumber}.pdf`;
  const { Platform } = await import('react-native');

  if (Platform.OS === 'web') {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    return;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'), import('expo-sharing'),
  ]);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('No está disponible la opción de guardar o compartir archivos en este dispositivo.');
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  await file.write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Guardar ${titles[kind].toLowerCase()}`,
  });
}
