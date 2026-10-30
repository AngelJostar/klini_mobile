import { createServer } from 'node:http';
import { extractDocumentFields } from '../src/domain/transcription';

// Development bridge only: loopback binding, no stored photos or document logs.
const origin = process.env.OCR_WEB_ORIGIN || 'http://127.0.0.1:8096';
let busy = false;
createServer(async (req, res) => {
  const reply = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  if (req.headers.origin && req.headers.origin !== origin) { reply(403, { error: 'Origin rejected' }); return; }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/transcribe' || req.method !== 'POST') { reply(404, {}); return; }
  if (!process.env.GOOGLE_VISION_API_KEY) { reply(503, { error: 'OCR not configured' }); return; }
  if (busy) { reply(429, { error: 'Try again shortly' }); return; }
  busy = true;
  try {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2900000) { reply(413, {}); return; }
      chunks.push(Buffer.from(chunk));
    }
    let image: unknown;
    try { image = JSON.parse(Buffer.concat(chunks).toString()).image; } catch { reply(400, {}); return; }
    if (typeof image !== 'string' || !image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length % 4 !== 0 || Buffer.from(image, 'base64').length > 2 * 1024 * 1024) { reply(400, {}); return; }
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_VISION_API_KEY },
      body: JSON.stringify({ requests: [{ image: { content: image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }),
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      // Log only Google's status/reason codes, never keys, photos or error messages.
      const reasons = (failure.error?.details ?? []).map((detail: { reason?: string }) => detail.reason).filter((reason: unknown) => typeof reason === 'string' && /^[A-Z_]+$/.test(reason));
      console.error('Vision request rejected', response.status, reasons);
      reply(502, { error: 'Recognition provider rejected the request' }); return;
    }
    const result = await response.json();
    const annotation = result.responses?.[0];
    if (annotation?.error) { reply(502, {}); return; }
    const text = annotation?.fullTextAnnotation?.text;
    if (typeof text !== 'string') { reply(200, { text: '', doctorName: '', institution: '' }); return; }
    reply(200, extractDocumentFields(text));
  } catch { reply(502, { error: 'Recognition failed' }); }
  finally { busy = false; }
}).listen(8097, '127.0.0.1', () => console.log('Klini OCR development bridge: http://127.0.0.1:8097/transcribe'));
