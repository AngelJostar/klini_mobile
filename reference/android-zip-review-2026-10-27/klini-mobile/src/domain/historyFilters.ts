import type { ClinicalRecord } from './types';
export type HistoryFilters = { from: string; to: string; specialty: string; institution: string };
export const emptyHistoryFilters: HistoryFilters = { from: '', to: '', specialty: '', institution: '' };
export function filterDateToISO(value: string): string | null {
  if (!value) return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(+year, +month - 1, +day, 12);
  return +year >= 1900 && date.getFullYear() === +year && date.getMonth() === +month - 1 && date.getDate() === +day ? `${year}-${month}-${day}` : null;
}
export function matchesHistoryFilters(record: ClinicalRecord, filters: HistoryFilters): boolean {
  return (!filters.from || record.date >= filters.from) && (!filters.to || record.date <= filters.to) &&
    (!filters.specialty || record.specialty === filters.specialty) && (!filters.institution || record.institution === filters.institution);
}
