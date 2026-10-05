import { recordTechnicalError } from '@/services/observability/logger';

describe('privacy-safe logging', () => {
  test('removes credentials and clinical identifiers from technical context', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    recordTechnicalError('request.failed', {
      status: 422,
      token: 'secret',
      password: 'secret',
      patientName: 'Paciente Demo',
      path: '/patient/profile',
    });
    expect(warn).toHaveBeenCalledWith('[Klini Mobile] request.failed', { status: 422, path: '/patient/profile' });
    warn.mockRestore();
  });
});
