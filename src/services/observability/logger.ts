import { env } from '@/config/env';

type TechnicalContext = Record<string, boolean | number | string | null | undefined>;
const BLOCKED_KEYS = /authorization|cookie|email|login|name|password|patient|payload|token/i;

export function recordTechnicalError(event: string, context: TechnicalContext = {}) {
  const safeContext = Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !BLOCKED_KEYS.test(key))
      .map(([key, value]) => [key, normalizeValue(value)]),
  );

  if (!env.isProduction) console.warn(`[Klini Mobile] ${event}`, safeContext);

  // Punto único para conectar observabilidad en producción. Nunca debe recibir
  // cuerpos HTTP, credenciales, identificadores personales ni información clínica.
}

function normalizeValue(value: TechnicalContext[string]) {
  if (typeof value === 'string') return value.slice(0, 120);
  return value ?? null;
}
