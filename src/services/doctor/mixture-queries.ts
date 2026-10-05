import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { doctorQueryKeys } from './doctor-queries';
import * as api from './mixture-api';

export const mixtureKeys = { catalog: (type: 'npt' | 'oncology') => ['doctor', 'mixture-catalog', type] as const, detail: (id: number) => ['doctor', 'mixture', id] as const };
export const useMixtureCatalog = (type: 'npt' | 'oncology') => useQuery({ queryKey: mixtureKeys.catalog(type), queryFn: () => api.getMixtureCatalog(type) });
export const useMixtureRequest = (id: number) => useQuery({ queryKey: mixtureKeys.detail(id), queryFn: () => api.getMixtureRequest(id), enabled: id > 0, refetchInterval: 30_000 });
export const usePrevalidateMixture = () => useMutation({ mutationFn: api.prevalidateMixture });
export function useCreateMixtureRequest() { const client = useQueryClient(); return useMutation({ mutationFn: ({ body, key }: { body: FormData; key: string }) => api.createMixtureRequest(body, key), onSuccess: () => void client.invalidateQueries({ queryKey: doctorQueryKeys.requests() }) }); }
