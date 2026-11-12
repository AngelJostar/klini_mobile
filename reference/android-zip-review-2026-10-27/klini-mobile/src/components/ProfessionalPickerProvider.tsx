import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import ProfessionalOptionPopup from './ProfessionalOptionPopup';

export interface ProfessionalPickerRequest {
  field: 'specialty' | 'degreeType';
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  restoreNativeFocus?: () => void;
}
const Context = createContext<{ open: (request: ProfessionalPickerRequest) => void; field: ProfessionalPickerRequest['field'] | null } | null>(null);
export const useProfessionalPicker = () => useContext(Context);

/** Mount the popup beside the drawer, outside its clipped panel and ScrollView. */
export default function ProfessionalPickerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ProfessionalPickerRequest | null>(null);
  const open = useCallback((value: ProfessionalPickerRequest) => { Keyboard.dismiss(); setRequest(value); }, []);
  const close = useCallback(() => { Keyboard.dismiss(); setRequest(null); }, []);
  const context = useMemo(() => ({ open, field: request?.field ?? null }), [open, request?.field]);
  return <Context.Provider value={context}><View style={s.root}>
    <View style={s.root} pointerEvents={request ? 'none' : 'auto'} accessibilityElementsHidden={!!request} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'} aria-hidden={!!request}>{children}</View>
    {request && <ProfessionalOptionPopup key={request.field} request={request} onClose={close} onSelect={value => { request.onSelect(value); close(); }} />}
  </View></Context.Provider>;
}
const s = StyleSheet.create({ root: { flex: 1 } });
