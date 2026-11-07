import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { createKliniAiService } from '../src/services/kliniAi';

// Explicit opt-in: uses the configured local bridge and makes billable requests.
// All chart information is generated here and is fictitious.
async function main() {
  if (process.env.KLINI_AI_LIVE_TEST !== '1') throw new Error('Activa KLINI_AI_LIVE_TEST=1 para probar el proveedor real con datos ficticios.');
  const state = createDemoState(new Date());
  state.records = [{ id: 'fictitious-glucose-test', type: 'Estudio', title: 'Glucosa en ayuno — ejemplo ficticio', date: '2026-11-01', doctorName: 'Profesional de ejemplo', description: 'Documento ficticio para prueba: glucosa en ayuno 100 mg/dL. No corresponde a una persona real.' }];
  state.medications = [];
  const ask = createKliniAiService({ endpoint: 'http://127.0.0.1:8098/chat', development: true });
  const report: { label: string; elapsedMs: number; text: string; sources: unknown }[] = [];
  for (const [label, question] of [
    ['general', '¿Qué es una alergia? Explícalo de forma general.'],
    ['web', 'Tengo alergia al pelo de perro. ¿Existe una vacuna para humanos que me ayude a prevenir la alergia? Consulta fuentes médicas actuales.'],
    ['mixed', 'Explica mi resultado de glucosa en ayuno y cómo se interpreta en general. Consulta fuentes médicas actuales.'],
  ] as const) {
    const started = Date.now();
    const answer = await ask({ question, history: [], state });
    assert.equal(answer.source, 'openai');
    assert.ok(answer.text.length > 60);
    if (label !== 'general') {
      assert.ok(answer.sources?.length, 'La respuesta debe mostrar fuentes verificadas');
      assert.match(answer.text, /\[\d+\]/);
    }
    if (label === 'mixed') assert.match(answer.text, /100/);
    report.push({ label, elapsedMs: Date.now() - started, text: answer.text, sources: answer.sources || [] });
    console.log(JSON.stringify({ label, elapsedMs: Date.now() - started, source: answer.source, sourceCount: answer.sources?.length || 0, text: answer.text.slice(0, 250) }));
  }
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/klini-ai-general-web-live.json', JSON.stringify(report, null, 2));
  console.log('Klini IA: tres consultas reales verificadas con datos ficticios.');
}
void main().catch(cause => { console.error(cause instanceof Error ? cause.message : 'Falló la prueba real de Klini IA.'); process.exitCode = 1; });
