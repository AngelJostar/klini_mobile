import { fireEvent, render } from '@testing-library/react-native';
import Constants from 'expo-constants';

import AppleHealthPanel from '@/features/body-parameters/components/AppleHealthPanel';
import { STORAGE_KEY } from '@/features/body-parameters/domain/reducer';
import { createDemoState } from '@/features/body-parameters/domain/seed';
import BodyParametersScreen from '@/features/body-parameters/screens/BodyParametersScreen';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/body-parameters/state/store', () => ({
  useAppStore: () => ({
    state: mockState,
    ownerProfile: mockState.profile,
    addRecord: mockAddRecord,
    updateRecord: jest.fn(),
    updateSettings: jest.fn(),
    storageError: null,
  }),
}));
jest.mock('@/features/body-parameters/services/files', () => ({ exportText: jest.fn() }));

let mockState = createDemoState();
const mockAddRecord = jest.fn(() => 'new-local-reading');

describe('integrated body parameters', () => {
  beforeEach(() => {
    mockState = createDemoState();
    mockAddRecord.mockClear();
    Object.defineProperty(Constants, 'executionEnvironment', { value: 'storeClient', configurable: true });
  });

  test('storage is isolated from the original demonstration and Laravel', () => {
    expect(STORAGE_KEY).toBe('@klini/parameters-preview:v1');
    expect(STORAGE_KEY).not.toBe('@klini/app-state:v1');
  });

  test('Expo Go does not claim an active Apple Health connection', async () => {
    const options = jest.fn();
    const info = jest.fn();
    const screen = await render(<AppleHealthPanel optionsOpen={false} enabled={false} onOptionsChange={options} onShowInfo={info} />);
    expect(screen.getByTestId('apple-health-toggle').props.disabled).toBe(true);
    expect(screen.getByTestId('apple-health-toggle').props.value).toBe(false);
    await fireEvent.press(screen.getByTestId('apple-health-info'));
    expect(info).toHaveBeenCalledTimes(1);
    expect(options).not.toHaveBeenCalled();
  });

  test('information closes without leaving the parameter list', async () => {
    const close = jest.fn();
    const screen = await render(<BodyParametersScreen onClose={close} />);
    expect(screen.getByTestId('body-row-weight')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('apple-health-info'));
    expect(screen.getByTestId('apple-health-info-popup')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('apple-health-info-close'));
    expect(screen.queryByTestId('apple-health-info-popup')).toBeNull();
    expect(screen.getByTestId('body-row-weight')).toBeTruthy();
    expect(close).not.toHaveBeenCalled();
  });

  test('favorites and weight history retain their separate controls', async () => {
    const screen = await render(<BodyParametersScreen onClose={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('body-tab-favorites'));
    expect(screen.getByTestId('body-tab-favorites').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('body-tab-all'));
    await fireEvent.press(screen.getByTestId('body-row-weight'));
    expect(screen.getByTestId('body-parameter-history')).toBeTruthy();
    expect(screen.getByTestId('body-history-add-record')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('body-history-add-record'));
    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(mockAddRecord).not.toHaveBeenCalled();
  });

  test('manual entry rejects empty values and cancel discards the draft', async () => {
    const screen = await render(<BodyParametersScreen onClose={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('body-row-weight'));
    await fireEvent.press(screen.getByTestId('body-history-add-record'));
    await fireEvent.press(screen.getByTestId('body-form-save'));
    expect(screen.getByTestId('body-entry-error')).toBeTruthy();
    expect(mockAddRecord).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('body-form-value'), '73.2');
    await fireEvent.press(screen.getByTestId('body-entry-close'));
    expect(screen.queryByTestId('body-entry-popup')).toBeNull();
    await fireEvent.press(screen.getByTestId('body-history-add-record'));
    expect(screen.getByTestId('body-form-value').props.value).toBe('');
    expect(mockAddRecord).not.toHaveBeenCalled();
  });

  test('filters can be dismissed repeatedly without leaving the list', async () => {
    const close = jest.fn();
    const screen = await render(<BodyParametersScreen onClose={close} />);
    for (let count = 0; count < 2; count++) {
      await fireEvent.press(screen.getByTestId('body-list-filters'));
      expect(screen.getByTestId('body-filters-popup')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('body-filters-close'));
      expect(screen.queryByTestId('body-filters-popup')).toBeNull();
      expect(screen.getByTestId('body-row-weight')).toBeTruthy();
    }
    expect(close).not.toHaveBeenCalled();
  });
});

