export type InsurancePlanId = 'essential' | 'integral' | 'family';
export type EnrollmentDetails = {
  age: string;
  sex: '' | 'Mujer' | 'Hombre';
  smoker: '' | 'Sí' | 'No';
  occupation: string;
};

export const INSURANCE_PLANS: { id: InsurancePlanId; name: string; subtitle: string; icon: string; baseMonthly: number; description: string; benefits: string[] }[] = [
  { id: 'essential', name: 'Esencial', subtitle: 'Protección hospitalaria', icon: 'business-outline', baseMonthly: 650, description: 'Una opción de ejemplo enfocada en atención hospitalaria.', benefits: ['Hospitalización de ejemplo', 'Atención de urgencias de ejemplo'] },
  { id: 'integral', name: 'Integral', subtitle: 'Hospitalización y consultas', icon: 'medkit-outline', baseMonthly: 1250, description: 'Una opción de ejemplo que combina atención hospitalaria y consultas.', benefits: ['Hospitalización de ejemplo', 'Consultas médicas de ejemplo', 'Atención de urgencias de ejemplo'] },
  { id: 'family', name: 'Familiar', subtitle: 'Protección para tu familia', icon: 'people-outline', baseMonthly: 1850, description: 'Una opción ilustrativa para explorar protección familiar. Los integrantes se confirmarían al contratar con una aseguradora.', benefits: ['Protección familiar de ejemplo', 'Hospitalización de ejemplo', 'Consultas médicas de ejemplo'] },
];
export const INSURANCE_OCCUPATIONS = [
  { id: 'administrative', label: 'Administrativo' },
  { id: 'professional', label: 'Profesionista' },
  { id: 'self-employed', label: 'Trabajador independiente' },
  { id: 'student', label: 'Estudiante' },
  { id: 'retired', label: 'Jubilado' },
  { id: 'other', label: 'Otra ocupación' },
];

export const ACCEPTANCE_STATEMENT = 'Acepto los términos y condiciones del contrato de seguro';

/** Deterministic demonstration values, not an insurer quote or actuarial model. */
export function getDemoMonthlyPrice(planId: InsurancePlanId, details: EnrollmentDetails): number | null {
  const plan = INSURANCE_PLANS.find(item => item.id === planId);
  if (!plan || !/^\d{1,2}$/.test(details.age.trim())) return null;
  const age = Number(details.age);
  if (age < 18 || age > 80 || !['Mujer', 'Hombre'].includes(details.sex) || !['Sí', 'No'].includes(details.smoker) || !INSURANCE_OCCUPATIONS.some(item => item.id === details.occupation)) return null;
  return plan.baseMonthly + Math.max(0, age - 40) * 15 + (details.smoker === 'Sí' ? 200 : 0);
}

export function buildEnrollmentDescription(planId: InsurancePlanId, details: EnrollmentDetails, holderName: string, monthly: number): string {
  const expected = getDemoMonthlyPrice(planId, details);
  if (expected === null || expected !== monthly || !holderName.trim()) throw new Error('Revisa los datos de tu solicitud antes de continuar.');
  const plan = INSURANCE_PLANS.find(item => item.id === planId)!;
  const occupation = INSURANCE_OCCUPATIONS.find(item => item.id === details.occupation)!;
  return [
    'SOLICITUD DE SEGURO DE DEMOSTRACIÓN',
    `Plan: ${plan.name}`,
    `Asegurada/o: ${holderName.trim()}`,
    `Edad: ${Number(details.age)} años`,
    `Sexo: ${details.sex}`,
    `¿Fumas?: ${details.smoker}`,
    `Ocupación: ${occupation.label}`,
    `Precio de ejemplo: $${monthly.toLocaleString('es-MX')} MXN / mes`,
    `Frase de aceptación: «${ACCEPTANCE_STATEMENT}»`,
    'Video de aceptación adjunto para probar el recorrido.',
    'Solicitud guardada únicamente en este dispositivo. No se ha enviado a una aseguradora, no emite una póliza, no activa cobertura ni realiza un cobro.',
  ].join('\n');
}
