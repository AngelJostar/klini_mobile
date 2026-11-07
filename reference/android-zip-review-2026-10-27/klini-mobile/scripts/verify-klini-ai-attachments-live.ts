import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createDemoState } from '../src/domain/seed';
import { createKliniAiService } from '../src/services/kliniAi';
import { parseAiAttachments } from '../src/domain/kliniAiAttachments';

async function main() {
  if (process.env.KLINI_AI_LIVE_TEST !== '1') throw new Error('Activa KLINI_AI_LIVE_TEST=1 para probar adjuntos ficticios con el proveedor real.');
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let image: Buffer;
  try {
    const page = await browser.newPage({ viewport: { width: 500, height: 180 } });
    await page.setContent('<body style="font-family:Arial;background:white;color:#082441;padding:20px"><h2>IMAGEN DE PRUEBA FICTICIA</h2><h1>Codigo visual: AZUL42</h1></body>');
    image = await page.screenshot({ path: 'test-results/ai-attachment-fixture.png' });
  } finally { await browser.close(); }
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([500, 180]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Documento PDF de prueba ficticio', { x: 20, y: 130, size: 19, font });
  page.drawText('Codigo PDF: NARANJA82', { x: 20, y: 70, size: 24, font });
  const pdfBytes = await pdf.save();
  await writeFile('test-results/ai-attachment-fixture.pdf', pdfBytes);
  const attachments = parseAiAttachments([
    { id: 'test-image', name: 'Imagen.png', mimeType: 'image/png', dataUri: `data:image/png;base64,${image!.toString('base64')}` },
    { id: 'test-pdf', name: 'Documento.pdf', mimeType: 'application/pdf', dataUri: `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}` },
    { id: 'test-text', name: 'Nota.txt', mimeType: 'text/plain', dataUri: `data:text/plain;base64,${Buffer.from('Archivo de prueba ficticio. Codigo TXT: VERDE17.').toString('base64')}` },
  ]);
  const ask = createKliniAiService({ endpoint: 'http://127.0.0.1:8098/chat', development: true });
  const started = Date.now();
  const answer = await ask({ question: 'Lee únicamente los archivos adjuntos y dime el código que aparece en cada uno. Son pruebas ficticias y no requieren búsqueda web.', history: [], attachments, state: createDemoState() });
  assert.equal(answer.source, 'openai');
  for (const code of ['AZUL42', 'NARANJA82', 'VERDE17']) assert.ok(answer.text.includes(code), `No identificó ${code}`);
  await writeFile('test-results/klini-ai-attachments-live.json', JSON.stringify({ elapsedMs: Date.now() - started, answer }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', elapsedMs: Date.now() - started, files: 3, answer: answer.text }));
}
void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba de adjuntos.'); process.exitCode = 1; });
