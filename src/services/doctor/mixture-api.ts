import { apiRequest } from '@/services/api/client';

export type CatalogItem = {
  product_code: string;
  presentation_code: string;
  generic_name?: string;
  name?: string;
  description?: string;
  commercial_name?: string;
  presentation?: string;
  category?: string;
  input?: string;
  unit?: string;
  diluents?: { id: number; name?: string }[];
  administration_routes?: { id: number; name?: string }[];
  concentration?: { min?: number | null; max?: number | null };
  requires_infusor?: boolean;
};
export type MixtureCatalog = { catalog_type?: string; catalog_version: string; items: CatalogItem[]; infusors?: { id: number; name?: string; generic_name?: string; commercial_name?: string }[] };
export type MixtureCatalogResponse = { catalog: MixtureCatalog; doctor: { name: string; professional_license: string | null }; medical_unit: { name: string | null; external_code: string } };
export type MixtureRequestDetail = { id: number; external_id: string | null; type: string; status: string; requested_at: string | null; required_at: string | null; service: string | null; priority: string | null; notes: string | null; authorizations: Record<string, string>; integration: { sync_status: string | null; remote_status: string | null; last_error: string | null } | null; patient: { id: number; full_name: string; platform_number: string | null } | null; events: { status: string; actor: string | null; occurred_at: string | null }[] };

export const getMixtureCatalog = (type: 'npt' | 'oncology') => apiRequest<MixtureCatalogResponse>(`doctor/mixtures/catalogs/${type}`);
export const prevalidateMixture = (input: { catalog_type: 'npt' | 'oncology'; catalog_version?: string; items: { product_code: string; presentation_code: string; quantity: number; unit: 'ml' | 'mg' | 'unit' }[] }) => apiRequest<{ prevalidation: { valid: boolean; errors?: { message?: string }[] } }>('doctor/mixtures/prevalidate', { method: 'POST', body: JSON.stringify(input) });
export const createMixtureRequest = (body: FormData, idempotencyKey: string) => apiRequest<{ request: MixtureRequestDetail; duplicate: boolean }>('doctor/mixtures', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body });
export const getMixtureRequest = (id: number) => apiRequest<{ request: MixtureRequestDetail }>(`doctor/mixtures/${id}`);
