import { fireEvent, render } from '@testing-library/react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppField } from '@/components/ui/app-field';
import { ContentState } from '@/components/ui/content-state';

describe('shared UI states', () => {
  test('button exposes disabled and busy accessibility state', async () => {
    const press = jest.fn();
    const screen = await render(<AppButton label="Guardar" loading onPress={press} />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(press).not.toHaveBeenCalled();
  });

  test('content error state offers a retry action', async () => {
    const retry = jest.fn();
    const screen = await render(<ContentState title="Sin conexión" message="Intenta nuevamente" retry={retry} />);
    fireEvent.press(screen.getByText('Intentar de nuevo'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('field exposes its validation error to assistive technology', async () => {
    const screen = await render(<AppField label="Registro" value="" error="El registro es obligatorio" />);
    expect(screen.getByLabelText('Registro').props.accessibilityHint).toBe('El registro es obligatorio');
    expect(screen.getByRole('alert')).toHaveTextContent('El registro es obligatorio');
  });
});
