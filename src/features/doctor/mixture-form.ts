import type { DocumentPickerAsset } from 'expo-document-picker';

import type { CatalogItem } from '@/services/doctor/mixture-api';

export function appendValue(form: FormData, key: string, value: string | number | boolean | null | undefined) { if (value !== null && value !== undefined && value !== '') form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)); }
export function appendAttachment(form: FormData, asset: DocumentPickerAsset | null) { if (!asset) return; form.append('authorization_file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob); }
export function requestKey() { return `klini-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function catalogLabel(item: { generic_name?: string; name?: string; description?: string; product_code: string }) { return item.generic_name ?? item.name ?? item.description ?? item.product_code; }

export type NptCatalogGroup = {
  key: 'amino_acids' | 'carbohydrates' | 'lipids' | 'electrolytes' | 'additives';
  label: string;
  items: CatalogItem[];
};

const nptGroups: Omit<NptCatalogGroup, 'items'>[] = [
  { key: 'amino_acids', label: 'Aminoácidos' },
  { key: 'carbohydrates', label: 'Carbohidratos' },
  { key: 'lipids', label: 'Lípidos' },
  { key: 'electrolytes', label: 'Electrolitos' },
  { key: 'additives', label: 'Aditivos' },
];

function normalized(value?: string) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function nptCatalogKey(item: Pick<CatalogItem, 'product_code' | 'presentation_code'>) {
  return `${item.product_code}|${item.presentation_code}`;
}

export function classifyNptCatalogItem(item: CatalogItem): NptCatalogGroup['key'] {
  const category = normalized(item.category);
  const text = normalized([item.generic_name, item.commercial_name, item.presentation, item.input].filter(Boolean).join(' '));

  if (category.includes('amino')) return 'amino_acids';
  if (category.includes('carbo') || category.includes('glucos')) return 'carbohydrates';
  if (category.includes('lipid')) return 'lipids';
  if (category.includes('electrol') || category.includes('cloruro de sodio')) return 'electrolytes';
  if (text.includes('amino')) return 'amino_acids';
  if (text.includes('glucos') || text.includes('dextros') || text.includes('carbo')) return 'carbohydrates';
  if (text.includes('lipid') || text.includes('omega') || text.includes('aceite de pescado')) return 'lipids';
  if (['sodio', 'potasio', 'fosfato', 'magnesio', 'calcio', 'cloruro', 'acetato'].some((term) => text.includes(term))) return 'electrolytes';
  return 'additives';
}

export function groupNptCatalog(items: CatalogItem[]): NptCatalogGroup[] {
  return nptGroups
    .map((group) => ({ ...group, items: items.filter((item) => classifyNptCatalogItem(item) === group.key) }))
    .filter((group) => group.items.length > 0);
}
