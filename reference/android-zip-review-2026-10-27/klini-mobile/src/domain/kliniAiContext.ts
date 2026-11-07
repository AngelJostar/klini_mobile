import type { AiMessage, KliniAiContext } from './kliniAi';

type History = Pick<AiMessage, 'role' | 'text'>[];

const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\b(?:expedinete|expedinete|expedinte)\b/g, 'expediente')
  .replace(/\b(?:proixma|proixmo|proxma|proxmo)\b/g, 'proxima')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const words = (value: string): string[] => normalize(value).split(' ').filter(Boolean);
const anotherPerson = /\b(?:mi|mis) (?:hijo|hija|hijos|hijas|nino|nina|bebe|esposo|esposa|pareja|mama|papa|madre|padre|hermano|hermana|abuelo|abuela|amigo|amiga|familiar|sobrino|sobrina|paciente|pacientes)\b|\b(?:otra persona|otro paciente|su expediente|sus resultados)\b/;
const ownInformation = /\b(?:mi|mis|tengo|tomo|tomando|padezco|sufro|conmigo)\b|\bme (?:diagnosticaron|recetaron|salio|salieron|indicaron|detectaron)\b/;
const agendaWords = /\b(?:cita|citas|agenda|horario|teleconsulta|consulta presencial)\b/;
const recordWords = /\b(?:expediente|historial|archivo|archivos|registro|registros|resultado|resultados|estudio|estudios|analisis|laboratorio|documento|documentos|receta|recetas)\b/;
const medicationWords = /\b(?:medicamento|medicamentos|medicacion|medicina|medicinas|pastilla|pastillas|dosis|tratamiento|tratamientos)\b/;
const collectiveMedications = /\b(?:mis (?:medicamentos|medicinas|pastillas|tratamientos)|mi (?:tratamiento|medicacion)|(?:lo que|los que) (?:tomo|estoy tomando)|(?:medicamentos|medicinas|pastillas) que (?:tomo|estoy tomando))\b/;
const readRecord = /\b(?:resume|resumen|resumeme|revisa|revisar|interpreta|interpretar|lee|leeme|abre|abrir|muestra|muestrame|consulta|compara|explica|explicame)\b/;
const withoutChart = /\bno (?:uses|utilices|consultes|revises|incluyas|tomes en cuenta) (?:mi |mis |el |los )?(?:expediente|historial|archivo|datos|registros)\b|\bsin (?:usar |consultar |revisar )?(?:mi |mis |el |los )?(?:expediente|historial|archivo|datos|registros)\b/;
const labResult = /\b(?:ldl|hdl|colesterol|trigliceridos|lipidos|lipidico|lipidica|quimica sanguinea|perfil metabolico|glucosa|glucemia|hba1c|biometria|hemograma|hemoglobina|hematocrito|leucocitos|plaquetas|eritrocitos|creatinina|urea|bun)\b/;
const newTopic = /^(?:ahora |bien |ok )?(?:cambiando de tema|cambiemos de tema|otro tema|otra pregunta|empecemos de nuevo|olvida (?:todo lo anterior|lo anterior|la pregunta anterior|la conversacion anterior))(?: |$)/;
const genericFileReference = /\b(?:revisa|revisar|lee|leeme|abre|abrir|interpreta|interpretar|explica|explicame|muestra|muestrame|consulta) (?:(?:el|la|los|las) )?(?:archivo|archivos|documento|documentos|imagen|imagenes|foto|fotos)(?: (?:adjunto|adjunta|adjuntos|adjuntas|original|originales))?\b/;

function isGenericFileReference(value: string): boolean {
  // Explicit ownership supplies its own subject ("el archivo de mi estudio").
  // Otherwise allow extra instructions such as "y consulta fuentes actuales".
  return genericFileReference.test(value) && !ownInformation.test(value);
}

function referential(value: string): boolean {
  return isGenericFileReference(value)
    || /\b(?:eso|esa|esos|esas|esto|este|estos|estas|aquello|anterior|mismo|misma)\b/.test(value)
    || /\b(?:tomarla|tomarlo|tomarlos|tomarlas|combinarlo|combinarla|tratarla|tratarlo|tratarles|tratarlos|tratarlas|puedo tomar|puedo combinar)\b/.test(value)
    || /\b(?:la|lo|las|los) (?:puedo|consigo|encuentro|aplico|uso|tomo|compro)\b/.test(value)
    || (/^y (?:(?:el|la|los|las) )?[a-z0-9 ]{2,70}$/.test(value) && labResult.test(value))
    || /^(?:y )?(?:con que (?:medico|medica|doctor|doctora)|a que hora|donde es|cuanto dura|para que sirve|que (?:es|son|significa))$/.test(value)
    || (/^(?:y )?(?:que (?:efectos|riesgos|sintomas)|cuanto dura|donde es|para que sirve)(?: |$)/.test(value) && !referenceTerms(value).length)
    || (/^y (?:cuando|donde|como|por que|cuanto|puedo)(?: |$)/.test(value) && !referenceTerms(value).length)
    || /^(?:y )?(?:hay|existe|existen) (?:una |algun |alguna |un )?(?:vacuna|vacunas|tratamiento|cura|alternativa|alternativas)(?: para (?:humanos|personas|adultos))?$/.test(value);
}

function newGeneralQuestion(value: string): boolean {
  return !ownInformation.test(value) && !/\b(?:eso|esa|esto|este|anterior)\b/.test(value)
    && !/^(?:y )?(?:que (?:es|son|significa)|como (?:funciona|funcionan)|para que (?:sirve|sirven))$/.test(value)
    && /^(?:y )?(?:que (?:es|son|significa)|como (?:funciona|funcionan)|cuanto es|cual es la capital|quien (?:es|fue)|para que (?:sirve|sirven) .+)\b/.test(value);
}

/** Retain the user's relevant thread, rather than every earlier assistant answer. */
export function selectKliniAiHistory(question: string, history: History): History {
  const current = normalize(question);
  if (newTopic.test(current) || withoutChart.test(current) || newGeneralQuestion(current)) return [];
  const turns: { messages: History; topic: string }[] = [];
  for (const message of history) {
    if (message.role === 'user') turns.push({ messages: [message], topic: normalize(message.text) });
    else turns.at(-1)?.messages.push(message);
  }
  if (!turns.length) return [];
  // An explicit restart also prevents a later matching word from reviving data
  // the user asked the conversation to leave behind.
  let start = 0;
  turns.forEach((turn, index) => { if (newTopic.test(turn.topic)) start = index; });
  const selected = new Set<number>();
  const continuation = referential(current) && !newGeneralQuestion(current);
  const samePerson = (topic: string) => anotherPerson.test(current) === anotherPerson.test(topic);
  const include = (index: number) => {
    if (index < start || selected.has(index)) return;
    selected.add(index);
    const topic = turns[index].topic;
    if (newTopic.test(topic)) return;
    if (referential(topic) && !newGeneralQuestion(topic)) include(index - 1);
    const terms = topicTerms(topic);
    for (let earlier = start; earlier < index; earlier += 1) {
      if (anotherPerson.test(topic) === anotherPerson.test(turns[earlier].topic)
        && !withoutChart.test(turns[earlier].topic) && matchesTopic(turns[earlier].topic, terms)) include(earlier);
    }
  };
  if (continuation) include(turns.length - 1);
  const terms = topicTerms(current);
  for (let index = start; index < turns.length; index += 1) {
    if (samePerson(turns[index].topic) && !withoutChart.test(turns[index].topic) && matchesTopic(turns[index].topic, terms)) include(index);
  }
  return turns.flatMap((turn, index) => selected.has(index) ? turn.messages : []);
}

/** Inherit only user-supplied subjects; assistant prose can never authorize chart access. */
function questionTopic(question: string, history: History): string {
  let topic = normalize(question);
  if (newTopic.test(topic) || !referential(topic) || newGeneralQuestion(topic)) return topic;
  if (isGenericFileReference(topic)) topic = 'revisa el archivo';
  const users = selectKliniAiHistory(question, history).filter(message => message.role === 'user').slice(-8);
  for (let index = users.length - 1; index >= 0; index -= 1) {
    const earlier = normalize(users[index].text);
    topic = `${isGenericFileReference(earlier) ? 'revisa el archivo' : earlier} ${topic}`;
    if (newTopic.test(earlier) || !referential(earlier) || newGeneralQuestion(earlier)) break;
  }
  return topic;
}

/** An unqualified original refers to a user's chart question, never to a title
 * or clinical subject introduced only by the assistant. */
function hasFileReferenceSubject(question: string, history: History): boolean {
  if (!isGenericFileReference(normalize(question))) return true;
  const selected = selectKliniAiHistory(question, history);
  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const message = selected[index];
    if (message.role !== 'user' || isGenericFileReference(normalize(message.text))) continue;
    const topic = questionTopic(message.text, selected.slice(0, index));
    return !newGeneralQuestion(topic) && !withoutChart.test(topic) && !anotherPerson.test(topic)
      && (ownInformation.test(topic) || readRecord.test(topic)) && (recordWords.test(topic) || labResult.test(topic));
  }
  return false;
}

/** Listing chart metadata does not authorize opening the underlying files. */
export function shouldReadKliniAiRecordFiles(question: string, history: History): boolean {
  const current = normalize(question), topic = questionTopic(question, history);
  if (!hasFileReferenceSubject(question, history) || withoutChart.test(topic) || anotherPerson.test(topic) || newGeneralQuestion(current)) return false;
  if (/\b(?:cuantos|cuantas|cantidad de|numero de)\b/.test(current)) return false;
  const metadataList = /\b(?:lista|listado|listame|enumera|nombres|titulos)\b/.test(current)
    && recordWords.test(current) && !/\b(?:resultado|resultados|valores|contenido|lee|leeme|interpreta|revisa|compara)\b/.test(current);
  const metadataQuestion = /\b(?:que|cual|cuales) (?:es |son )?(?:mi |mis |el |la |los |las )?(?:ultimo |ultimos |ultima |ultimas )?(?:estudio|estudios|registro|registros|archivo|archivos|documento|documentos|receta|recetas) (?:tengo|hay|es|son)\b/.test(current);
  const showList = /^(?:muestra|muestrame) (?:mis|los) (?:estudios|registros|archivos|documentos|recetas)(?: (?:guardados|registrados|recientes))?$/.test(current);
  if (metadataList || metadataQuestion || showList) return false;
  return (readRecord.test(topic) && (recordWords.test(topic) || labResult.test(topic)))
    || (ownInformation.test(topic) && (labResult.test(topic) || /\b(?:resultado|resultados)\b/.test(topic)));
}

const stopWords = new Set(`a al algo algun alguna algunos algunas alla aqui asi aunque bajo bien cada caso casi como con cual cuales cuando cuanto cuanta cuantos cuantas de del desde dice dicen dicho dicha donde el ella ellos ellas en entre era eres es esa esas ese esos esta estas este estos esto estoy existe existen fue ha hacia hasta hay hoy incluso informacion interpretar interpreta le la las lo los me mejor mi mis mismo mucha mucho muy nada ni no nos o otro otra otros otras para pero por porque propia propio puede pueden puedo que quien quiero saber se sea ser si sin sino sobre soy su sus tal tambien te tengo tiene tienen toda todas todo todos tu tus un una unas unos usted ver vez ya y yo ayuda ayudar puedes podria favor explicar explicame explica significa significado sirve tomar toma registrado registrada registrados registradas guardado guardada guardados guardadas activo activa activos activas expediente historial archivo archivos registro registros resultado resultados estudio estudios analisis laboratorio documento documentos receta recetas medicamento medicamentos medicina medicinas pastilla pastillas dosis tratamiento tratamientos cita citas agenda horario proxima proximo proximas proximos ultima ultimo ultimas ultimos reciente recientes mas resume resumen resumeme revisa revisar lee leeme abre abrir muestra muestrame consulta compara completo completa entero entera texto padezco sufro salio salieron diagnosticaron recetaron indicaron detectaron medica medico doctor doctora sintomas riesgos efectos secundarios normal normales alto alta bajos baja datos clinico clinica clinicos clinicas adjunto adjunta adjuntos adjuntas original originales imagen imagenes foto fotos`.split(' '));

function stem(word: string): string {
  if (word.length < 5) return word;
  return word.replace(/(?:aciones|acion|icos|icas|ico|ica|ias|ia|es|os|as|o|a|s)$/, '');
}

function topicTerms(topic: string): string[] {
  return [...new Set(words(topic).filter(word => word.length >= 3 && !/^\d+$/.test(word) && !stopWords.has(word)).map(stem))];
}

/** Verbs and generic follow-up nouns do not identify a new medical subject. */
function referenceTerms(topic: string): string[] {
  const generic = new Set(['causar', 'causa', 'producir', 'provocar', 'dar', 'hacer', 'hacerlo', 'funciona', 'funcionan', 'dura', 'duracion', 'conseguir', 'consigo', 'encuentro', 'encontrar', 'comprar', 'aplicar', 'seguir', 'dejarlo', 'vacuna', 'vacunas'].map(stem));
  return topicTerms(topic).filter(term => !generic.has(term));
}

function matchesTopic(text: string, terms: string[]): boolean {
  const available = new Set(words(text).map(stem));
  return terms.some(term => available.has(term));
}

type RecordContext = KliniAiContext['records'][number];
const recordMetadata = (record: RecordContext): string => `${record.title} ${record.type} ${record.attachmentName || ''}`;
const labGroups = [
  { question: /\b(?:ldl|hdl|colesterol|trigliceridos|lipidos)\b/, record: /\b(?:ldl|hdl|colesterol|trigliceridos|lipidos|lipidico|lipidica|quimica sanguinea)\b/ },
  { question: /\b(?:biometria|hemograma|hemoglobina|hematocrito|leucocitos|plaquetas|eritrocitos)\b/, record: /\b(?:biometria|hemograma|hematica|hematico|hemoglobina|hematocrito|leucocitos|plaquetas|eritrocitos)\b/ },
  { question: /\b(?:glucosa|glucemia|hba1c|glucosilada|glucada)\b/, record: /\b(?:glucosa|glucemia|hba1c|glucosilada|glucada|quimica sanguinea|perfil metabolico)\b/ },
  { question: /\b(?:creatinina|urea|bun)\b/, record: /\b(?:creatinina|urea|bun|renal|quimica sanguinea|perfil metabolico)\b/ },
];
const namedPanels = [
  { question: /\b(?:biometria|hemograma)\b/, record: /\b(?:biometria|hemograma|hematica|hematico)\b/ },
  { question: /\bperfil (?:de )?(?:lipidos|lipidico)|\bpanel (?:de )?lipidos\b/, record: /\b(?:lipidos|lipidico|lipidica)\b/ },
  { question: /\bquimica sanguinea\b/, record: /\bquimica sanguinea\b/ },
];

function matchingLabMetadata(topic: string, record: RecordContext): boolean {
  const metadata = normalize(recordMetadata(record));
  return labGroups.some(group => group.question.test(topic) && group.record.test(metadata));
}

function identifiesGeneralLabRecord(record: RecordContext): boolean {
  const metadata = normalize(recordMetadata(record)), text = normalize(record.text);
  return /\b(?:analisis|estudio|estudios|laboratorio)\b/.test(metadata)
    || /\b(?:analisis(?: clinicos)?|resultados? (?:de )?laboratorio|estudios? (?:de )?laboratorio)\b/.test(text)
    || labGroups.some(group => group.record.test(`${metadata} ${text}`));
}

function isUnclassifiedOriginal(record: RecordContext): boolean {
  return !!record.attachmentName && /^(?:consulta|nota)$/.test(normalize(record.type))
    && /^(?:foto|imagen|archivo|documento|registro)(?: original| adjunto| adjunta)?$/.test(normalize(record.title))
    && !topicTerms(record.text).length;
}

function matchingRecords(topic: string, terms: string[], records: RecordContext[]): RecordContext[] {
  // An explicitly named panel takes precedence over a constituent result. A
  // request for LDL in a named blood count must inspect that document first.
  const panels = namedPanels.filter(panel => panel.question.test(topic));
  return records.filter(record => {
    const metadata = normalize(recordMetadata(record));
    if (panels.length) return panels.some(panel => panel.record.test(`${metadata} ${normalize(record.text)}`));
    return matchesTopic(`${recordMetadata(record)} ${record.text}`, terms)
      || matchingLabMetadata(topic, record);
  });
}

function requestedDates(topic: string): string[] {
  return [...topic.matchAll(/\b(?:(20\d{2}) (\d{1,2}) (\d{1,2})|(\d{1,2}) (\d{1,2}) (20\d{2}))\b/g)].map(match => {
    const [, isoYear, isoMonth, isoDay, localDay, localMonth, localYear] = match;
    return `${isoYear || localYear}-${(isoMonth || localMonth).padStart(2, '0')}-${(isoDay || localDay).padStart(2, '0')}`;
  });
}

/**
 * Select chart data before transport. Empty arrays mean data was not requested;
 * they do not mean the patient has no records. Clock fields are nonclinical.
 * Generic knowledge questions never receive a chart just because words match it.
 */
export function selectKliniAiContext(question: string, history: History, context: KliniAiContext): KliniAiContext {
  const selected: KliniAiContext = {
    today: context.today,
    localTime: context.localTime,
    profile: { name: '' },
    appointments: [], records: [], medications: [],
    totals: { records: 0, activeMedications: 0 },
  };
  const current = normalize(question);
  const topic = questionTopic(question, history);
  if (!hasFileReferenceSubject(question, history)) return selected;
  if (withoutChart.test(topic)) return selected;
  if (anotherPerson.test(topic)) return selected;
  if (/^(?:dime )?(?:como me llamo|cual es mi nombre|que nombre tengo registrado)$/.test(current)) {
    selected.profile = { name: context.profile.name };
    return selected;
  }
  const personal = ownInformation.test(topic);
  const terms = topicTerms(topic);
  const namedDocument = /\b(?:interpreta|interpretar|lee|leeme|revisa|revisar|compara)\b/.test(topic)
    && context.records.some(record => matchesTopic(recordMetadata(record), terms));
  const recordRequest = (recordWords.test(topic) && (personal || readRecord.test(topic))) || namedDocument || (personal && labResult.test(topic));
  const agendaRequest = agendaWords.test(topic) && (personal || /\b(?:proxima|proximo|proximas|proximos) (?:cita|citas|consulta)\b/.test(topic));
  const medicationRequest = medicationWords.test(topic) && personal;
  const summary = recordRequest && /\b(?:expediente|historial|archivo)\b/.test(topic)
    && /\b(?:resume|resumen|resumeme|completo|completa|entero|entera|todo|todos)\b/.test(topic);

  // A new explicit general question is an independent turn, even after personal care questions.
  if (newGeneralQuestion(current) && !personal && !recordRequest) return selected;
  if (agendaRequest) selected.appointments = context.appointments;

  const relevantRecords = matchingRecords(topic, terms, context.records);
  const relevantMedications = context.medications.filter(medication => matchesTopic(medication.name, terms));
  if (summary) {
    selected.records = context.records;
    selected.medications = context.medications;
  } else if (recordRequest) {
    // Unqualified archive requests list records; a named topic only includes matches.
    selected.records = terms.length ? relevantRecords : context.records;
    const type = /\b(?:estudio|estudios|analisis|laboratorio)\b/.test(topic) ? 'estudio' : /\b(?:receta|recetas)\b/.test(topic) ? 'receta' : '';
    if (type) {
      const readContents = shouldReadKliniAiRecordFiles(question, history);
      const ownAnalysis = type === 'estudio' && personal && readContents;
      const studyCandidate = (record: RecordContext) => normalize(record.type) === 'estudio' || identifiesGeneralLabRecord(record)
        || (ownAnalysis && isUnclassifiedOriginal(record));
      // Conversational additions ("y dime cómo salí") need not appear in a
      // study's title. Inspect the requested studies, not an unrelated chart.
      if (ownAnalysis && !selected.records.length) selected.records = context.records.filter(studyCandidate);
      selected.records = selected.records.filter(record => normalize(record.type) === type
        // A category chosen while saving does not override an explicitly named
        // result/prescription. Counts and lists retain the strict category.
        || (readContents && (type === 'estudio' ? matchingLabMetadata(topic, record) || identifiesGeneralLabRecord(record) || (ownAnalysis && isUnclassifiedOriginal(record))
          : /\b(?:receta|prescripcion|indicaciones medicas)\b/.test(normalize(recordMetadata(record))))));
    }
    const dates = requestedDates(topic);
    if (dates.length) selected.records = selected.records.filter(record => dates.includes(record.date));
    if (/\b(?:ultimo|ultima|reciente|mas reciente)\b/.test(topic) && !/\b(?:ultimos|ultimas|recientes)\b/.test(topic)) selected.records = selected.records.slice(0, 1);
    selected.medications = relevantMedications;
  } else if (personal && !agendaRequest) {
    selected.records = relevantRecords;
    selected.medications = relevantMedications;
    if (medicationRequest && !terms.length) selected.medications = context.medications;
  }
  // Comparing an unlisted medicine against "my medicines" needs the actual active
  // list. Matching only the proposed medicine would hide possible interactions.
  if (collectiveMedications.test(topic)) selected.medications = context.medications;

  selected.records = selected.records.slice(0, 20);
  if (selected.appointments.length || selected.records.length || selected.medications.length) selected.profile = { name: context.profile.name };
  if (selected.records.length) selected.totals.records = context.totals.records;
  if (selected.medications.length) selected.totals.activeMedications = context.totals.activeMedications;
  return selected;
}
