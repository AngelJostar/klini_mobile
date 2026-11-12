import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import type { Mode } from '../domain/types';
import DirectoryOptionsPopup from './DirectoryOptionsPopup';

export type DirectoryOptionField = 'country' | 'city' | 'specialty' | 'insurer';
export type DirectoryFilterMode = Mode | 'Todas';
type RequestBase = { restoreNativeFocus?: () => void };
export type DirectoryOptionsRequest = RequestBase & ({
  kind: 'options';
  field: DirectoryOptionField;
  label: string;
  value: string;
  options: string[];
  optionPrefix?: string;
  allLabel?: string;
  emptyMessage?: string;
  onSelect: (value: string) => void;
} | {
  kind: 'filters';
  mode: DirectoryFilterMode;
  onlyFavorites: boolean;
  onApply: (mode: DirectoryFilterMode, onlyFavorites: boolean) => void;
});

const Context = createContext<{
  open: (request: DirectoryOptionsRequest) => void;
  close: () => void;
  active: DirectoryOptionField | 'filters' | null;
} | null>(null);

export function useDirectoryOptions() {
  const context = useContext(Context);
  if (!context) throw new Error('DirectoryOptionsProvider es obligatorio.');
  return context;
}

/** The overlay is a sibling of the entire directory, outside its scrolling form. */
export default function DirectoryOptionsProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DirectoryOptionsRequest | null>(null);
  const open = useCallback((value: DirectoryOptionsRequest) => {
    Keyboard.dismiss();
    setRequest(value);
  }, []);
  const close = useCallback(() => {
    Keyboard.dismiss();
    setRequest(null);
  }, []);
  const active: DirectoryOptionField | 'filters' | null = request ? request.kind === 'options' ? request.field : 'filters' : null;
  const context = useMemo(() => ({ open, close, active }), [open, close, active]);
  return <Context.Provider value={context}>
    <View style={s.root}>
      <View style={s.root} pointerEvents={request ? 'none' : 'auto'} accessibilityElementsHidden={!!request} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'} aria-hidden={!!request}>
        {children}
      </View>
      {request && <DirectoryOptionsPopup key={active} request={request} onClose={close} />}
    </View>
  </Context.Provider>;
}

const s = StyleSheet.create({ root: { flex: 1 } });
