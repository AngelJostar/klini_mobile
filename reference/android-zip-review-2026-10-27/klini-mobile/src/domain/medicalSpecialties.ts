// Mexico reference catalogue: CONACEM certification areas, reviewed 2026-10-29.
// https://conacem.org.mx/documentos/listado-especialidades-medicas.pdf
// https://conacem.org.mx/descarga-listado
// Includes general medicine for existing patient records; not a certification claim.
export const medicalSpecialties = `Medicina general
Anestesiología
Anestesiología Pediátrica
Anestesiólogo para los Servicios Rurales de la Salud
Algología
Cuidados Paliativos
Neuroanestesiología
Angiología, Cirugía Vascular y Endovascular
Anatomía Patológica
Neuropatología
Patología Pediátrica
Comunicación, Audiología, Otoneurología y Foniatría
Cardiología Clínica
Cardiología Pediátrica
Cardiología Intervencionista
Cardiología Intervencionista en Cardiopatías Congénitas
Ecocardiografía Adultos
Ecocardiografía Pediátrica
Electrofisiología
Rehabilitación Cardiaca y Prevención Secundaria
Cirugía General
Cirugía Bariátrica
Cirugía para los Servicios Rurales de Salud
Cirugía de Trasplantes
Endoscopia Gastrointestinal
Cirugía Oral y Maxilofacial
Cirugía Neurológica
Neurocirugía Pediátrica
Terapia Endovascular Neurológica
Cirugía Pediátrica
Cirugía Plástica, Estética y Reconstructiva
Cirugía Cardiaca en Adultos
Cirugía Cardiaca en Pediatría
Cirugía Cardiotorácica
Cirugía Torácica no Cardiaca
Cirugía de Tórax Pediátrica No Cardiaca
Dermatología
Dermatología Pediátrica
Dermatopatología
Endocrinología
Endocrinología Pediátrica
Coloproctología
Gastroenterología
Gastroenterología Pediátrica
Cirugía del Aparato Digestivo
Genética Médica
Genética Molecular
Citogenética
Geriatría
Ginecología y Obstetricia
Biología de la Reproducción Humana
Medicina Materno Fetal
Urología Ginecológica
Hematología
Hematología Pediátrica
Infectología Adultos
Infectología Pediátrica
Inmunología Clínica y Alergia
Medicina Aeroespacial
Medicina Crítica
Medicina Crítica en Obstetricia
Medicina del Deporte
Medicina Familiar
Medicina del Niño y del Adulto para los Servicios Rurales de Salud
Medicina Integrada
Medicina Interna
Medicina Legal y Forense
Medicina de Rehabilitación
Rehabilitación Cardiaca
Medicina del Trabajo
Medicina del Trabajo y Ambiental
Medicina de Urgencias
Urgencias Pediátricas
Medicina Nuclear
Medicina Nuclear Cardiológica
Medicina Nuclear Oncológica, Molecular y Terapéutica
Nefrología
Nefrología Pediátrica
Neumología
Neumología Pediátrica
Medicina del Sueño
Broncoscopía Intervencionista
Broncoscopía Intervencionista Pediátrica
Fisiología Respiratoria
Endoscopía Torácica
Neurofisiología Clínica
Neurología Adultos
Neurología Pediátrica
Oftalmología
Oncología Médica
Oncología Pediátrica
Cirugía Oncológica
Cirugía Oncológica Pediátrica
Ginecología Oncológica
Ortopedia y Traumatología
Otorrinolaringología y Cirugía de Cabeza y Cuello
Otorrinolaringología Pediátrica
Neuro-Otología
Patología Clínica
Pediatría
Neonatología
Medicina del Enfermo Pediátrico en Estado Crítico
Psiquiatría
Psiquiatría Infantil y de la Adolescencia
Radiología e Imagen
Radiología Pediátrica
Radiología Vascular e Intervencionista
Imagen de la mama
Neurorradiología
Imagen del Sistema Musculoesquelético
Radio-Oncología
Reumatología
Reumatología Pediátrica
Salud Pública
Epidemiología
Medicina Preventiva
Calidad de la Atención Clínica
Urología
Trasplante Renal`.split('\n').sort((a, b) => a.localeCompare(b, 'es'));

export const specialtySearchKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function specialtyOptions(saved: string[]) {
  const options = new Map<string, string>();
  // Saved labels take precedence so selecting them still matches existing records.
  for (const label of [...saved, ...medicalSpecialties]) {
    const key = specialtySearchKey(label);
    if (key && !options.has(key)) options.set(key, label);
  }
  return [...options.values()].sort((a, b) => a.localeCompare(b, 'es'));
}
