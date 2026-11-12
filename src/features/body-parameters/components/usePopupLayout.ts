import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Keep the top edge stable when the keyboard resizes the available area. */
export function usePopupLayout() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [panelHeight] = useState(() => Math.min(height - insets.top - 24, height * .82));
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const onLayout = ({ nativeEvent }: { nativeEvent: { layout: { height: number } } }) => {
    const top = Math.max(0, nativeEvent.layout.height - panelHeight);
    setAnchorTop(current => current ?? top);
  };
  return { panelHeight, anchorTop, onLayout };
}
