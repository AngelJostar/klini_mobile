import type { ApiFailure, ApiSuccess } from './types';

import { env } from '@/config/env';
import { recordTechnicalError } from '@/services/observability/logger';

const REQUEST_TIMEOUT_MS = 15_000;
let accessToken: string | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;

  const messages = collectDetailMessages(error.details);
  return messages.length ? `${error.message}\n\n• ${[...new Set(messages)].join('\n• ')}` : error.message;
}

function collectDetailMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectDetailMessages);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectDetailMessages);
  return [];
}

export function setApiAccessToken(token: string | null) { accessToken = token; }
export function getApiAccessToken() { return accessToken; }
export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) { unauthorizedHandler = handler; }

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  try {
    const response = await fetch(`${env.apiUrl}/${path.replace(/^\//, '')}`, { ...options, headers, signal: controller.signal });
    const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;
    if (!response.ok || !payload || payload.success === false) {
      if (response.status === 401 && unauthorizedHandler) await unauthorizedHandler();
      const error = payload && payload.success === false ? payload.error : null;
      const apiError = new ApiError(error?.message ?? messageForStatus(response.status), error?.code ?? 'http_error', response.status, error?.details);
      recordTechnicalError('api.request.failed', { code: apiError.code, method: options.method ?? 'GET', path: safePath(path), status: apiError.status });
      throw apiError;
    }
    return payload.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    recordTechnicalError(
      error instanceof Error && error.name === 'AbortError'
        ? 'api.request.timeout'
        : 'api.request.network_error',
      { method: options.method ?? 'GET', path: safePath(path) },
    );
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('La solicitud tardó demasiado. Intenta de nuevo.', 'request_timeout', 408);
    throw new ApiError('No fue posible conectar con Dr. Sam. Revisa tu conexión e intenta de nuevo.', 'network_error', 0);
  } finally {
    clearTimeout(timeout);
  }
}

function safePath(path: string) {
  return path.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id');
}

function messageForStatus(status: number) {
  if (status === 401) return 'Tu sesión terminó. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 422) return 'Revisa los datos capturados.';
  if (status >= 500) return 'El servicio no está disponible por el momento.';
  return 'No fue posible completar la solicitud.';
}
