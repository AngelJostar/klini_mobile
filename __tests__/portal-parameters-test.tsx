import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PatientWebPortal } from '@/components/patient/patient-web-portal';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/config/env', () => ({ env: { apiUrl: 'https://example.invalid/api/mobile/v1', appEnvironment: 'test' } }));
jest.mock('@/services/patient/portal-calendar', () => ({ portalCalendarBridge: '', sharePortalCalendar: jest.fn() }));
jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, unknown>) => jest.requireActual('react').createElement(jest.requireActual('react-native').View, { ...props, testID: 'mock-webview' }),
}));

test('the native parameters entry stays available if the Laravel portal fails', async () => {
  const screen = await render(<PatientWebPortal />);
  await fireEvent(screen.getByTestId('mock-webview'), 'error');
  expect(screen.getByText('No fue posible abrir Klini')).toBeTruthy();
  const entry = screen.getByLabelText('Abrir parámetros corporales locales');
  await fireEvent.press(entry);
  expect(router.push).toHaveBeenCalledWith('/parameters');
});

