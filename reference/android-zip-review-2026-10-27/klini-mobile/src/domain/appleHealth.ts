export const HEALTH_CATEGORIES = [
  { id: 'HKQuantityTypeIdentifierHeartRate', label: 'Frecuencia cardiaca', unit: 'count/min', displayUnit: 'lpm', icon: 'heart-outline' },
  { id: 'HKQuantityTypeIdentifierRestingHeartRate', label: 'Frecuencia en reposo', unit: 'count/min', displayUnit: 'lpm', icon: 'heart-outline' },
  { id: 'HKQuantityTypeIdentifierStepCount', label: 'Pasos', unit: 'count', displayUnit: 'pasos', icon: 'walk-outline' },
  { id: 'HKQuantityTypeIdentifierActiveEnergyBurned', label: 'Actividad (último intervalo)', unit: 'kcal', displayUnit: 'kcal', icon: 'flame-outline' },
  { id: 'HKCategoryTypeIdentifierSleepAnalysis', label: 'Sueño (último intervalo)', unit: 'min', displayUnit: 'min', icon: 'moon-outline' },
] as const;
export type HealthCategory = typeof HEALTH_CATEGORIES[number]['id'];

/** Native iOS builds may load HealthKit lazily; preferences alone never enable it. */
export function canUseAppleHealthRuntime(platform: string, executionEnvironment: string | null | undefined): boolean {
  return platform === 'ios' && (executionEnvironment === 'bare' || executionEnvironment === 'standalone');
}

export interface HealthReading {
  id: HealthCategory;
  value?: number;
  stage?: string;
  source?: string;
  start?: string;
  end?: string;
  error?: boolean;
  day?: string;
  timeZone?: string;
  updated?: string;
  sources?: string[];
}
/** Preferences only: never store measurements or claim that Apple granted read access. */
export interface AppleHealthPreferences {
  ownerId: string;
  enabled: boolean;
  selected: HealthCategory[];
  requested: HealthCategory[];
}
export function orderedHealthCategories(ids: readonly HealthCategory[]): HealthCategory[] {
  return HEALTH_CATEGORIES.filter(item => ids.includes(item.id)).map(item => item.id);
}
export function isAppleHealthPreferences(value: unknown): value is AppleHealthPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  const ids = (input: unknown): input is HealthCategory[] => Array.isArray(input)
    && input.length <= HEALTH_CATEGORIES.length && new Set(input).size === input.length
    && input.every(id => HEALTH_CATEGORIES.some(item => item.id === id));
  return Object.keys(p).every(key => ['ownerId', 'enabled', 'selected', 'requested'].includes(key))
    && typeof p.ownerId === 'string' && p.ownerId.length > 0 && p.ownerId.length <= 128
    && typeof p.enabled === 'boolean' && ids(p.selected) && ids(p.requested)
    && p.selected.every(id => (p.requested as HealthCategory[]).includes(id))
    && (!p.enabled || p.selected.length > 0);
}
export function emptyAppleHealthPreferences(ownerId: string): AppleHealthPreferences {
  return { ownerId, enabled: false, selected: [], requested: [] };
}
