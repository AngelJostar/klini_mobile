import test from 'node:test';
import assert from 'node:assert/strict';
import type { AiMessage, KliniAiContext } from '../src/domain/kliniAi';
import { selectKliniAiContext, selectKliniAiHistory, shouldReadKliniAiRecordFiles } from '../src/domain/kliniAiContext';

const context: KliniAiContext = {
  today: '2026-11-01', localTime: '12:30', profile: { name: 'Sofía Ejemplo' },
  appointments: [{ id: 'next', date: '2026-11-02', time: '09:00', mode: 'Teleconsulta', doctorName: 'Dra. Elena Ejemplo', specialty: 'Medicina general' }],
  records: [
    { id: 'allergy', title: 'Consulta de alergología', date: '2026-10-31', type: 'Consulta', doctorName: 'Dra. A', institution: 'Ejemplo', text: 'Síntomas tras contacto con perro. Revisión de alergia.' },
    { id: 'glucose', title: 'Glucosa en ayuno', date: '2026-10-30', type: 'Estudio', doctorName: 'Dra. B', institution: 'Ejemplo', text: 'Glucosa: 100 mg/dL.' },
    { id: 'blood', title: 'Biometría hemática', date: '2026-10-29', type: 'Estudio', doctorName: 'Dra. C', institution: 'Ejemplo', text: 'Hemoglobina: 13 g/dL.' },
    { id: 'note', title: 'Revisión dental', date: '2026-10-28', type: 'Consulta', doctorName: 'Dra. D', institution: 'Ejemplo', text: 'Revisión de encías.' },
  ],
  medications: [
    { name: 'Loratadina', dose: 'Dato ficticio A', frequency: 'Dato ficticio A' },
    { name: 'Metformina', dose: 'Dato ficticio B', frequency: 'Dato ficticio B' },
  ],
  totals: { records: 31, activeMedications: 4 },
};
const user = (text: string): Pick<AiMessage, 'role' | 'text'> => ({ role: 'user', text });
const assistant = (text: string): Pick<AiMessage, 'role' | 'text'> => ({ role: 'assistant', text });
const select = (question: string, history: Pick<AiMessage, 'role' | 'text'>[] = []) => selectKliniAiContext(question, history, context);

function assertNoChart(value: KliniAiContext) {
  assert.deepEqual(value, { today: context.today, localTime: context.localTime, profile: { name: '' }, appointments: [], records: [], medications: [], totals: { records: 0, activeMedications: 0 } });
}

test('general questions omit identifiers, clinical data and totals even if their topic matches a stored record', () => {
  for (const question of ['¿Qué es la alergia al perro?', '¿Cuánto es 2+2?', '¿Para qué sirve la loratadina?', '¿Me puedes explicar qué es la glucosa?', '¿Qué es un expediente clínico?', '¿Cómo funciona una cita médica?']) assertNoChart(select(question));
});

test('personal condition selects related records without disclosing unrelated chart data', () => {
  const value = select('Tengo alergia al pelo de perro. ¿Existe una vacuna para humanos?');
  assert.deepEqual(value.records.map(record => record.id), ['allergy']);
  assert.equal(value.profile.name, context.profile.name);
  assert.deepEqual(value.appointments, []);
  assert.deepEqual(value.medications, []);
  assert.deepEqual(value.totals, { records: 31, activeMedications: 0 });
});

test('a condition absent from the chart does not receive unrelated records or invent personal findings', () => {
  assertNoChart(select('Tengo migraña, ¿qué puedo hacer?'));
  assertNoChart(selectKliniAiContext('Tengo alergia al pelo de perro, ¿existe una vacuna para humanos?', [], { ...context, records: [], medications: [] }));
});

test('personal agenda requests and referential followups share appointments only', () => {
  for (const question of ['¿Cuándo es mi próxima cita?', '¿Cuándo es la próxima cita?', 'cuando es mi proxma cita']) {
    const value = select(question);
    assert.deepEqual(value.appointments, context.appointments);
    assert.deepEqual(value.records, []);
    assert.deepEqual(value.medications, []);
    assert.deepEqual(value.totals, { records: 0, activeMedications: 0 });
  }
  const history = [user('¿Cuándo es mi próxima cita?'), assistant('Con una doctora. Mis análisis dicen glucosa.'), user('¿Y a qué hora?')];
  assert.deepEqual(select('¿Y con qué médica?', history).appointments, context.appointments);
  assert.deepEqual(select('¿Y con qué médica?', history).records, []);
});

test('new general questions reset a prior personal topic, including explicitly starting with y', () => {
  const history = [user('Resume mi expediente clínico'), assistant('Hay estudios de glucosa.')];
  for (const question of ['¿Qué es la glucosa?', '¿Y qué es la alergia?', '¿Cuánto es 2+2?', '¿Qué es una cita?']) assertNoChart(select(question, history));
  assertNoChart(select('¿Y con qué médica?', [assistant('Tu próxima cita está en la agenda.') ]));
});

test('new general questions omit clinical conversation history while referential followups retain it', () => {
  const history = [user('Interpreta mi análisis de glucosa'), assistant('Tu estudio registrado tiene una cifra ficticia.')];
  assert.deepEqual(selectKliniAiHistory('¿Qué es una alergia?', history), []);
  assert.deepEqual(selectKliniAiHistory('¿Y eso qué significa?', history), history);
  assert.equal(history.length, 2);
  assert.match(history[1].text, /cifra ficticia/);
});

test('an explicit new subject does not inherit the previous clinical question or answer', () => {
  const history = [user('Tengo alergia al pelo de perro'), assistant('Precauciones sobre el tratamiento de alergia al perro.')];
  for (const question of ['¿Qué efectos tiene la metformina?', '¿Qué síntomas tiene la migraña?', '¿Qué riesgos causa el ibuprofeno?', '¿Y cómo se previene la migraña?', '¿Dónde consigo una vacuna contra influenza?']) {
    assert.deepEqual(selectKliniAiHistory(question, history), [], question);
    assertNoChart(select(question, history));
    assert.equal(shouldReadKliniAiRecordFiles(question, history), false, question);
  }
});

test('a standalone definition omits clinical history even when its topic matches the earlier personal question', () => {
  const history = [user('Tengo alergia al pelo de perro y tomo loratadina.'), assistant('Información personal de la consulta anterior.')];
  for (const question of ['¿Qué es una alergia?', '¿Cómo funciona la loratadina?', '¿Para qué sirve la loratadina?']) {
    assert.deepEqual(selectKliniAiHistory(question, history), [], question);
    assertNoChart(select(question, history));
  }
});

test('different intentions about the same subject retain facts the user already supplied', () => {
  const history = [user('Tengo alergia al pelo de perro y tomo montelukast y levocetirizina.'), assistant('Precauciones generales sobre esos medicamentos.')];
  for (const question of ['¿Existe una vacuna para la alergia al perro?', '¿Cuánto dura el tratamiento de alergia al perro?', '¿Hay alternativas a montelukast para la alergia?']) {
    assert.deepEqual(selectKliniAiHistory(question, history), history, question);
  }
  // A new named medicine in a personalized safety question can depend on an
  // earlier condition or medication, even without repeating its name.
  assert.deepEqual(selectKliniAiHistory('¿Puedo tomar ibuprofeno?', history), history);
});

test('returning to a named topic omits unrelated intervening user and assistant messages', () => {
  const allergy = [user('Tengo alergia al perro y tomo loratadina.'), assistant('Respuesta sobre la alergia.')];
  const history = [...allergy, user('Tengo migraña.'), assistant('Respuesta sobre la migraña.')];
  const serialized = JSON.stringify(history);
  const selected = selectKliniAiHistory('¿Hay vacuna para la alergia al perro?', history);
  assert.deepEqual(selected, allergy);
  assert.doesNotMatch(JSON.stringify(selected), /migraña/);
  assert.equal(JSON.stringify(history), serialized);
  assert.deepEqual(selectKliniAiHistory('¿Hay vacuna para la alergia al perro?', selected), selected);
});

test('short follow-up questions keep their user-supplied subject across several turns', () => {
  const firstTurn = [user('Tengo alergia al pelo de perro.'), assistant('Explicación de la alergia.')];
  for (const question of ['¿Existe una vacuna para humanos?', '¿Hay una vacuna para eso?', '¿Qué opciones hay para tratarla?']) {
    assert.deepEqual(selectKliniAiHistory(question, firstTurn), firstTurn, question);
    assert.deepEqual(select(question, firstTurn).records.map(record => record.id), ['allergy'], question);
  }
  const history = [user('Tengo alergia al perro.'), assistant('Explicación de la alergia.'), user('¿Hay una vacuna?'), assistant('Existe inmunoterapia para ciertas personas.')];
  assert.deepEqual(selectKliniAiHistory('¿Dónde la consigo?', history), history);
  assert.deepEqual(select('¿Dónde la consigo?', history).records.map(record => record.id), ['allergy']);
  const medicationHistory = [user('Tomo loratadina.'), assistant('Información educativa sobre ese medicamento.')];
  assert.deepEqual(selectKliniAiHistory('¿Qué efectos causa?', medicationHistory), medicationHistory);
  assert.deepEqual(select('¿Qué efectos causa?', medicationHistory).medications.map(medication => medication.name), ['Loratadina']);
});

test('an explicit topic restart and an exclusion of clinical history omit earlier messages', () => {
  const history = [user('Tengo alergia al perro.'), assistant('Información del turno anterior.')];
  for (const question of ['Cambiando de tema, ¿qué síntomas tiene la migraña?', 'Otra pregunta: ¿qué efectos tiene la metformina?', 'Olvida lo anterior. ¿Qué riesgos tiene el ibuprofeno?', 'Sin consultar mis datos, ¿hay vacuna para la alergia al perro?']) {
    assert.deepEqual(selectKliniAiHistory(question, history), [], question);
    assertNoChart(select(question, history));
  }
  const restarted = [...history, user('Olvida lo anterior. Tengo migraña.'), assistant('Información sobre la migraña.')];
  assert.deepEqual(selectKliniAiHistory('¿Hay vacuna para la alergia al perro?', restarted), []);
});

test('matching a topic cannot carry another person clinical conversation into a new explicit question', () => {
  const ownHistory = [user('Tengo alergia al perro.'), assistant('Respuesta sobre tu alergia.')];
  const otherHistory = [user('Mi esposa tiene alergia al perro.'), assistant('Respuesta sobre la alergia de tu esposa.')];
  assert.deepEqual(selectKliniAiHistory('Mi hijo tiene alergia al perro, ¿hay vacuna?', ownHistory), []);
  assert.deepEqual(selectKliniAiHistory('Tengo alergia al perro, ¿hay vacuna?', otherHistory), []);
  // Referential follow-ups still retain who the preceding user was asking about.
  assert.deepEqual(selectKliniAiHistory('¿Y eso qué significa?', otherHistory), otherHistory);
  assertNoChart(select('¿Y eso qué significa?', otherHistory));
});

test('count questions select the requested record or medication category', () => {
  const studies = select('¿Cuántos estudios tengo?');
  assert.deepEqual(studies.records.map(record => record.id), ['glucose', 'blood']);
  assert.deepEqual(studies.medications, []);
  assert.deepEqual(select('¿Cuántos medicamentos tengo?').medications, context.medications);
});

test('medication list excludes records and named personal medication questions include only matching medicines', () => {
  const list = select('¿Qué medicamentos tengo registrados?');
  assert.deepEqual(list.medications, context.medications);
  assert.deepEqual(list.records, []);
  assert.deepEqual(list.appointments, []);
  assert.deepEqual(list.totals, { records: 0, activeMedications: 4 });
  const named = select('¿Para qué me sirve la loratadina que tomo?');
  assert.deepEqual(named.medications.map(medication => medication.name), ['Loratadina']);
  assert.deepEqual(named.records, []);
  const followup = select('¿La puedo tomar por la noche?', [user('¿Para qué me sirve la loratadina que tomo?'), assistant('Consulta información general sobre ella.')]);
  assert.deepEqual(followup.medications.map(medication => medication.name), ['Loratadina']);
});

test('personal comparisons retrieve active medicines even when a proposed medicine is absent from the chart', () => {
  for (const question of ['Con mis medicamentos, ¿puedo tomar ibuprofeno?', 'Con mi tratamiento, ¿puedo tomar ibuprofeno?', '¿Mi medicación tiene interacciones con ibuprofeno?', '¿Qué interacciones tiene lo que tomo?', '¿Puedo combinar ibuprofeno con los medicamentos que estoy tomando?']) {
    const value = select(question);
    assert.deepEqual(value.medications, context.medications);
    assert.deepEqual(value.records, []);
    assert.deepEqual(value.appointments, []);
    assert.deepEqual(value.totals, { records: 0, activeMedications: 4 });
    assert.equal(value.medications.some(medication => medication.name === 'Ibuprofeno'), false);
  }
  const topical = select('Con mis medicamentos y mi glucosa, ¿puedo tomar ibuprofeno?');
  assert.deepEqual(topical.medications, context.medications);
  assert.deepEqual(topical.records.map(record => record.id), ['glucose']);
});

test('personal identity requests disclose the current profile name without clinical data', () => {
  for (const question of ['¿Cómo me llamo?', '¿Cuál es mi nombre?', '¿Qué nombre tengo registrado?']) {
    const value = select(question);
    assert.equal(value.profile.name, context.profile.name);
    assert.deepEqual(value.records, []);
    assert.deepEqual(value.medications, []);
    assert.deepEqual(value.appointments, []);
    assert.deepEqual(value.totals, { records: 0, activeMedications: 0 });
  }
});

test('clinical summaries include records and medications while named lab requests select relevant results', () => {
  const summary = select('Resume mi expedinete clínico');
  assert.deepEqual(summary.records, context.records);
  assert.deepEqual(summary.medications, context.medications);
  assert.deepEqual(summary.appointments, []);
  assert.deepEqual(summary.totals, context.totals);
  assert.deepEqual(select('¿Qué significa mi hemoglobina?').records.map(record => record.id), ['blood']);
  assert.deepEqual(select('Interpreta mi análisis de glucosa').records.map(record => record.id), ['glucose']);
  assert.deepEqual(select('Interpreta la biometría hemática').records.map(record => record.id), ['blood']);
  assert.deepEqual(select('¿Qué dice mi último estudio?').records.map(record => record.id), ['glucose']);
});

test('followup matches the prior user subject and not clinical claims introduced by the assistant', () => {
  const value = select('¿Y eso qué significa?', [user('Interpreta mi análisis de glucosa'), assistant('También vi hemoglobina y la loratadina.')]);
  assert.deepEqual(value.records.map(record => record.id), ['glucose']);
  assert.deepEqual(value.medications, []);
});

test('another person never inherits the current profile chart, including followups', () => {
  for (const question of ['Resume el expediente de mi hijo', '¿Qué medicamentos tiene mi esposa?', 'Mi mamá tiene alergia al perro', '¿Cuándo es la próxima cita de mi padre?', 'Interpreta sus resultados', '¿Qué medicamentos tiene mi niña?']) assertNoChart(select(question));
  assertNoChart(select('¿Y eso qué significa?', [user('Mi hijo tiene alergia al perro'), assistant('Pide información.') ]));
});

test('an explicit request to answer without the chart omits it even in a personal followup', () => {
  assertNoChart(select('No uses mi expediente: ¿qué es la glucosa?'));
  assertNoChart(select('¿Y eso qué significa sin consultar mis datos?', [user('Interpreta mi análisis de glucosa')]));
});

test('selection is pure and matching uses token boundaries', () => {
  const serialized = JSON.stringify(context);
  assertNoChart(select('Tengo costos de atención, ¿qué significan?'));
  assert.equal(JSON.stringify(context), serialized);
  const selected = select('Resume mi expediente');
  assert.notEqual(selected, context);
  assert.notEqual(selected.profile, context.profile);
});

const fileContext: KliniAiContext = {
  ...context,
  records: [
    { ...context.records[3], id: 'unrelated', date: '2026-10-31' },
    { ...context.records[1], id: 'lipids-new', title: 'Perfil de lípidos', date: '2026-10-30', text: 'Resultados en el archivo adjunto.' },
    { ...context.records[2], id: 'blood-new', title: 'Biometría hemática y alergias', date: '2026-10-29', text: 'Documento adjunto.' },
    { ...context.records[1], id: 'lipids-old', title: 'Perfil lipídico', date: '2026-10-28', text: '' },
    { ...context.records[1], id: 'urine', title: 'Examen de orina', date: '2026-10-27', text: '' },
  ],
};
const selectFiles = (question: string, history: Pick<AiMessage, 'role' | 'text'>[] = []) => selectKliniAiContext(question, history, fileContext).records.map(record => record.id);

test('result requests find matching panels when the numeric result is only inside a saved file', () => {
  assert.deepEqual(selectFiles('¿Cómo salió mi LDL?'), ['lipids-new', 'lipids-old']);
  assert.deepEqual(selectFiles('revisa mis ultimos estudios. como salio el ldl?'), ['lipids-new', 'lipids-old']);
  assert.deepEqual(selectFiles('¿Cómo salió mi colesterol?'), ['lipids-new', 'lipids-old']);
  assert.deepEqual(selectFiles('¿Cómo salió mi perfil lipídico?'), ['lipids-new', 'lipids-old']);
  assert.deepEqual(selectFiles('¿Qué significa mi hemoglobina?'), ['blood-new']);
  assert.deepEqual(selectFiles('revisa el ldl del resultado de mi ultima biometria hematica'), ['blood-new']);
  assert.deepEqual(selectFiles('Compara mi biometría con mi perfil de lípidos'), ['lipids-new', 'blood-new', 'lipids-old']);
});

test('optional sanitized attachment names can identify a relevant panel without an informative record title', () => {
  const value: KliniAiContext = { ...fileContext, records: [{ ...fileContext.records[1], title: 'Resultado adjunto', attachmentName: 'Perfil-de-lipidos.pdf' }] };
  assert.deepEqual(selectKliniAiContext('¿Cómo salió mi LDL?', [], value).records.map(record => record.id), ['lipids-new']);
});

test('short result followups inherit only a previous user clinical subject', () => {
  const history = [user('Interpreta mis últimos estudios'), assistant('Encontré datos de orina y otra persona.')];
  assert.deepEqual(selectFiles('¿Y el LDL?', history), ['lipids-new', 'lipids-old']);
  assert.equal(shouldReadKliniAiRecordFiles('¿Y el LDL?', history), true);
  assert.deepEqual(selectFiles('¿Y el LDL?', [assistant('Revisa mis estudios de LDL')]), []);
  assert.deepEqual(selectFiles('¿Y el LDL?', [user('¿Qué es una biometría hemática?')]), []);
  assert.deepEqual(selectFiles('¿Y el LDL?', [user('Revisa los estudios de mi esposa')]), []);
  assert.deepEqual(selectFiles('¿Y el LDL?', [user('No uses mi historial para responder')]), []);
});

test('an explicit numeric study date narrows the records instead of becoming a topical token', () => {
  assert.deepEqual(selectFiles('Interpreta mi estudio del 29/10/2026'), ['blood-new']);
  assert.deepEqual(selectFiles('Interpreta mi estudio del 2026-10-30'), ['lipids-new']);
  assert.deepEqual(selectFiles('Interpreta mis estudios del 30/10/2026 y del 28/10/2026'), ['lipids-new', 'lipids-old']);
  assert.deepEqual(selectFiles('Interpreta mi estudio del 31/02/2026'), []);
});

test('new lab aliases cannot select files for general questions, another person or an explicit exclusion', () => {
  for (const question of ['¿Qué es el LDL?', '¿Y qué significa el colesterol?', '¿Para qué sirve la hemoglobina?', '¿Cómo salió el LDL de mi esposa?', 'Revisa mi LDL sin consultar mis datos']) {
    assert.deepEqual(selectFiles(question, [user('Interpreta mis estudios')]), []);
    assert.equal(shouldReadKliniAiRecordFiles(question, [user('Interpreta mis estudios')]), false);
  }
});

test('reading saved file contents requires a content question rather than a metadata list or count', () => {
  for (const question of ['¿Cuántos estudios tengo?', 'Lista mis estudios', 'Muéstrame los nombres de mis archivos', 'Muestra mis estudios', '¿Qué estudios tengo?', '¿Cuál es mi último estudio?']) {
    assert.equal(shouldReadKliniAiRecordFiles(question, []), false, question);
  }
  for (const question of ['revisa el ldl del resultado de mi ultima biometria hematica', '¿Cómo salió mi LDL?', '¿Cómo salió mi perfil lipídico?', 'revisa mis ultimos estudios. como salio el ldl?', 'Interpreta la biometría hemática', 'Resume mi expediente clínico', '¿Qué significan mis resultados?']) {
    assert.equal(shouldReadKliniAiRecordFiles(question, []), true, question);
  }
  assert.equal(shouldReadKliniAiRecordFiles('¿Cómo salió mi LDL?', [user('No uses mi historial')]), true);
  assert.equal(shouldReadKliniAiRecordFiles('¿Y el LDL?', [assistant('Tus estudios tienen información')]), false);
});

test('explicit results and prescriptions remain readable when saved under a different category', () => {
  const value: KliniAiContext = {
    ...fileContext,
    records: [
      { ...fileContext.records[1], id: 'lipids-note', type: 'Nota' },
      { ...fileContext.records[1], id: 'lipids-file', type: 'Consulta', title: 'Archivo adjunto', attachmentName: 'Perfil-de-lipidos.pdf' },
      { ...fileContext.records[2], id: 'blood-note', type: 'Consulta' },
      { ...fileContext.records[0], id: 'unrelated-note', type: 'Nota' },
      { ...fileContext.records[0], id: 'prescription', type: 'Consulta', title: 'Receta de metformina' },
      { ...fileContext.records[0], id: 'prescription-file', type: 'Nota', title: 'Archivo adjunto', attachmentName: 'Receta-metformina.pdf' },
    ],
  };
  const selected = (question: string) => selectKliniAiContext(question, [], value).records.map(record => record.id);
  assert.deepEqual(selected('revisa mis estudios de lípidos'), ['lipids-note', 'lipids-file']);
  assert.deepEqual(selected('¿Cómo salió mi LDL?'), ['lipids-note', 'lipids-file']);
  assert.deepEqual(selected('lee el LDL en mi último estudio de biometría hemática'), ['blood-note']);
  assert.deepEqual(selected('lee mi receta de metformina'), ['prescription', 'prescription-file']);
  assert.deepEqual(selected('lee mi receta'), ['prescription', 'prescription-file']);
  for (const question of ['¿Cuántos estudios tengo?', 'Lista mis estudios de lípidos', '¿Cuántas recetas tengo?', 'Lista mis recetas de metformina']) {
    assert.deepEqual(selected(question), [], question);
    assert.equal(shouldReadKliniAiRecordFiles(question, []), false, question);
  }
});

const genericStudyContext: KliniAiContext = {
  ...context,
  records: [
    { ...context.records[3], id: 'dental-file', title: 'Consulta dental', type: 'Consulta', text: 'Revisa el archivo adjunto.', attachmentName: 'Original.pdf' },
    { ...context.records[2], id: 'photo-study', title: 'Foto original', text: 'Biometría hemática y alergias.', attachmentName: 'Foto-123.png' },
    { ...context.records[2], id: 'analysis-record', title: 'Registro de análisis', text: '', attachmentName: 'Archivo-456.pdf' },
    { ...context.records[2], id: 'analysis-category', type: 'Consulta', title: 'Registro de análisis', text: '', attachmentName: 'Archivo-789.pdf' },
    { ...context.records[2], id: 'analysis-filename', type: 'Nota', title: 'Foto original', text: '', attachmentName: 'Analisis-clinicos.pdf' },
    { ...context.records[2], id: 'analysis-text', type: 'Nota', title: 'Foto original', text: 'Resultados de laboratorio.', attachmentName: 'Original.pdf' },
  ],
};
const genericStudyIds = genericStudyContext.records.slice(1).map(record => record.id);
const selectGenericStudies = (question: string, history: Pick<AiMessage, 'role' | 'text'>[] = []) => selectKliniAiContext(question, history, genericStudyContext);

test('clinical is a generic modifier and does not hide saved originals with uninformative titles', () => {
  for (const question of ['revisa mis últimos análisis clínicos', 'Lee mis análisis clínicos', 'Revisa mis estudios clínicos']) {
    assert.deepEqual(selectGenericStudies(question).records.map(record => record.id), genericStudyIds, question);
    assert.equal(shouldReadKliniAiRecordFiles(question, []), true, question);
  }
  assert.deepEqual(selectGenericStudies('¿Cuántos análisis clínicos tengo?').records.map(record => record.id), ['photo-study', 'analysis-record']);
  assert.equal(shouldReadKliniAiRecordFiles('¿Cuántos análisis clínicos tengo?', []), false);
  assert.deepEqual(selectGenericStudies('Lee mi biometría hemática').records.map(record => record.id), ['photo-study']);
});

test('requests for the saved original retain the preceding user document subject and exclude unrelated attachments', () => {
  const history = [user('revisa mis últimos análisis clínicos'), assistant('El resumen tiene datos. También hay una consulta dental.')];
  for (const question of ['revisa el archivo adjunto', 'lee el documento original', 'abre el archivo original', 'revisa la imagen', 'lee la foto adjunta']) {
    const selectedHistory = selectKliniAiHistory(question, history);
    assert.deepEqual(selectedHistory, history, question);
    const selected = selectGenericStudies(question, selectedHistory);
    assert.deepEqual(selected.records.map(record => record.id), genericStudyIds, question);
    assert.equal(shouldReadKliniAiRecordFiles(question, selectedHistory), true, question);
    assert.deepEqual(selectKliniAiContext(question, selectedHistory, selected), selected, question);
  }
  const chain = [...history, user('revisa el archivo adjunto'), assistant('Respuesta de prueba.')];
  assert.deepEqual(selectGenericStudies('abre la foto original', chain).records.map(record => record.id), genericStudyIds);
});

test('an unqualified original without a valid user chart subject never selects arbitrary saved files', () => {
  for (const history of [
    [], [assistant('Revisa tus análisis clínicos guardados.')],
    [user('Hola'), assistant('Hay un archivo adjunto.')],
    [user('¿Qué es un análisis clínico?'), assistant('Explicación general.')],
    [user('¿Cuándo es mi próxima cita?'), assistant('Tienes una cita.')],
    [user('Revisa los análisis de mi esposa'), assistant('Respuesta sobre otra persona.')],
    [user('No uses mi historial'), assistant('Responderé en general.')],
    [user('revisa el archivo adjunto'), assistant('Falta un documento.'), user('abre el documento original')],
  ]) {
    for (const question of ['revisa el archivo adjunto', 'abre la foto original']) {
      assert.deepEqual(selectGenericStudies(question, history).records, [], JSON.stringify(history));
      assert.equal(shouldReadKliniAiRecordFiles(question, history), false, JSON.stringify(history));
    }
  }
  assert.deepEqual(selectGenericStudies('revisa mis archivos').records, genericStudyContext.records);
  assert.equal(shouldReadKliniAiRecordFiles('revisa mis archivos', []), true);
});

test('a latest plural request filters all local candidates before keeping twenty relevant records', () => {
  const unrelated = Array.from({ length: 25 }, (_, index) => ({ ...genericStudyContext.records[0], id: `unrelated-${index}` }));
  const studies = Array.from({ length: 25 }, (_, index) => ({ ...genericStudyContext.records[1], id: `study-${index}` }));
  const candidates: KliniAiContext = { ...genericStudyContext, records: [...unrelated, ...studies], totals: { ...context.totals, records: 50 } };
  const question = 'revisa mis últimos análisis clínicos';
  const selected = selectKliniAiContext(question, [], candidates);
  assert.deepEqual(selected.records.map(record => record.id), studies.slice(0, 20).map(record => record.id));
  assert.deepEqual(selectKliniAiContext(question, [], selected), selected);
  assert.deepEqual(selectKliniAiContext('revisa mi último análisis clínico', [], candidates).records.map(record => record.id), ['study-0']);
  const history = [user(question), assistant('Respuesta de prueba.')];
  assert.deepEqual(selectKliniAiContext('revisa el archivo adjunto', history, candidates).records, selected.records);
});

test('file references retain their conversation when followed by additional search instructions', () => {
  const question = 'Explica el documento adjunto y consulta fuentes actuales.';
  const chatFileHistory = [user('HISTORY_USER_CANARY: revisa el documento adjunto.'), assistant('Respuesta anterior sobre el archivo del chat.')];
  assert.deepEqual(selectKliniAiHistory(question, chatFileHistory), chatFileHistory);
  assert.equal(shouldReadKliniAiRecordFiles(question, chatFileHistory), false);
  assert.deepEqual(selectGenericStudies(question, chatFileHistory).records, []);
  const chartHistory = [user('Revisa mis últimos análisis clínicos.'), assistant('Resumen de los registros guardados.')];
  assert.deepEqual(selectKliniAiHistory(question, chartHistory), chartHistory);
  assert.equal(shouldReadKliniAiRecordFiles(question, chartHistory), true);
  assert.deepEqual(selectGenericStudies(question, chartHistory).records.map(record => record.id), genericStudyIds);
  assert.deepEqual(selectGenericStudies('Revisa mis análisis clínicos y explica el archivo adjunto.').records.map(record => record.id), genericStudyIds);
});

test('a conversational ending does not suppress the requested studies when no title matches its extra words', () => {
  const question = 'Revisa mis últimos análisis clínicos y dime cómo salí';
  const selected = selectGenericStudies(question);
  assert.deepEqual(selected.records.map(record => record.id), genericStudyIds);
  assert.deepEqual(selectKliniAiContext(question, [], selected), selected);
});

test('own analysis reads can inspect unclassified generic originals without opening clearly unrelated documents', () => {
  const unknown = { ...genericStudyContext.records[1], id: 'unclassified', type: 'Consulta', title: 'Foto original', text: '', attachmentName: 'Opaque-original.pdf' };
  const blankText = { ...unknown, id: 'unclassified-note', type: 'Nota', title: 'Archivo', text: 'Documento adjunto.' };
  const descriptive = { ...unknown, id: 'dental-description', text: 'Consulta dental y revisión de encías.' };
  const value = { ...genericStudyContext, records: [genericStudyContext.records[0], unknown, blankText, descriptive] };
  const question = 'Revisa mis últimos análisis clínicos y dime cómo salí';
  const selected = selectKliniAiContext(question, [], value);
  assert.deepEqual(selected.records.map(record => record.id), ['unclassified', 'unclassified-note']);
  assert.deepEqual(selectKliniAiContext(question, [], selected), selected);
  assert.deepEqual(selectKliniAiContext('¿Cuántos análisis clínicos tengo?', [], value).records, []);
  assert.deepEqual(selectKliniAiContext('Lista mis análisis clínicos', [], value).records, []);
  assert.deepEqual(selectKliniAiContext('¿Qué es un análisis clínico?', [], value).records, []);
});
