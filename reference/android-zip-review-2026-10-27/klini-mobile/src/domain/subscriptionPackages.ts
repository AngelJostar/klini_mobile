/** Commercial proposal only; these values do not grant access or enforce storage quotas. */
export type SubscriptionPackage = {
  readonly id: 'free' | 'basic' | 'pro' | 'integrated-ai' | 'ai-max';
  readonly name: string;
  readonly monthlyPrice: number;
  readonly storageLabel: string;
  readonly includes?: string;
  readonly benefits: readonly string[];
  readonly note?: string;
};

export const subscriptionPackages: readonly SubscriptionPackage[] = [
  {
    id: 'free',
    name: 'Gratuita',
    monthlyPrice: 0,
    storageLabel: '50 MB',
    benefits: ['Perfil personal', 'Agenda y registro manual de salud'],
  },
  {
    id: 'basic',
    name: 'Básica',
    monthlyPrice: 50,
    storageLabel: '500 MB',
    includes: 'Todo lo de Gratuita',
    benefits: ['Historial clínico', 'Documentos y estudios adjuntos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 99,
    storageLabel: '2 GB',
    includes: 'Todo lo de Básica',
    benefits: ['Alertas de medicamentos', 'Compartir documentos', 'Seguimiento de parámetros corporales'],
  },
  {
    id: 'integrated-ai',
    name: 'IA Integrada',
    monthlyPrice: 199,
    storageLabel: '5 GB',
    includes: 'Todo lo de Pro',
    benefits: ['Resúmenes del expediente con IA', 'Explicación de términos médicos', 'Preguntas sobre tus registros'],
  },
  {
    id: 'ai-max',
    name: 'IA MAX',
    monthlyPrice: 299,
    storageLabel: '10 GB',
    includes: 'Todo lo de IA Integrada',
    benefits: ['Modelo de IA especializado en medicina'],
    note: 'Modelo especializado pendiente de configurar.',
  },
];
