import { ApiError, apiErrorMessage, apiRequest, setApiAccessToken, setUnauthorizedHandler } from '@/services/api/client';

describe('API client', () => {
  beforeEach(() => { jest.restoreAllMocks(); jest.spyOn(console, 'warn').mockImplementation(); setApiAccessToken(null); setUnauthorizedHandler(null); });

  test('adds bearer token and unwraps successful responses', async () => {
    setApiAccessToken('secret-token');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { id: 4 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiRequest<{ id: number }>('me')).resolves.toEqual({ id: 4 });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer secret-token');
  });

  test('translates validation errors without losing field details', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'validation_error', message: 'Revisa los datos.', details: { email: ['Inválido'] } } }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiRequest('patient/profile')).rejects.toMatchObject({ code: 'validation_error', status: 422, details: { email: ['Inválido'] } });
  });

  test('formats nested validation details for the user', () => {
    const error = new ApiError('Los datos enviados no son válidos.', 'validation_error', 422, {
      fields: { 'oncology.birth_date': ['La fecha de nacimiento es obligatoria.'], 'oncology.floor': ['El piso es obligatorio.'] },
    });

    expect(apiErrorMessage(error, 'Error')).toBe(
      'Los datos enviados no son válidos.\n\n• La fecha de nacimiento es obligatoria.\n• El piso es obligatorio.',
    );
  });

  test('clears the session on unauthorized response', async () => {
    const unauthorized = jest.fn();
    setUnauthorizedHandler(unauthorized);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'unauthenticated', message: 'Sesión vencida.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiRequest('me')).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});
