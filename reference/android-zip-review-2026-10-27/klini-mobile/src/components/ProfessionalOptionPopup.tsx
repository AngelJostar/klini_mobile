import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfessionalPickerRequest } from './ProfessionalPickerProvider';
import { colors, Icon } from './ui';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export default function ProfessionalOptionPopup({ request, onClose, onSelect }: { request: ProfessionalPickerRequest; onClose: () => void; onSelect: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof View>>(null);
  const selected = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const options = useMemo(() => {
    const seen = new Set<string>();
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return request.options.map((value, index) => ({ value, index })).filter(option => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return terms.every(term => normalize(option.value).includes(term));
    }).sort((a, b) => a.value.localeCompare(b.value, 'es'));
  }, [query, request.options]);
  useEffect(() => {
    const dismiss = () => { Keyboard.dismiss(); closeRef.current(); };
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(); return true; });
    if (Platform.OS !== 'web') {
      const frame = requestAnimationFrame(() => { if (closeButton.current) AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus'); });
      return () => { subscription.remove(); cancelAnimationFrame(frame); request.restoreNativeFocus?.(); };
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const frame = requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-testid="professional-picker-close"]')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); dismiss(); }
      if (event.key !== 'Tab' || !node) return;
      const controls = Array.from(node.querySelectorAll<HTMLElement>('button,input,[tabindex="0"]')).filter(element => element.getClientRects().length && element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled'));
      const first = controls[0], last = controls[controls.length - 1];
      if (!node.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', keydown, true);
    return () => { subscription.remove(); cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown, true); if (previous?.isConnected) previous.focus(); };
  }, [request]);
  const choose = (value: string) => { if (selected.current) return; selected.current = true; Keyboard.dismiss(); onSelect(value); };
  return <View testID="professional-picker-overlay" style={s.overlay}>
    <Pressable testID="professional-picker-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar selección sin cambios" onPress={onClose} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.position, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View ref={card} testID="professional-picker-popup" role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={request.label} onAccessibilityEscape={onClose} style={[s.card, { height: Math.min(600, Math.max(180, height - insets.top - insets.bottom - 40)) }]}>
        <View style={s.handle} />
        <View style={s.header}><Text accessibilityRole="header" style={s.title}>{request.label}</Text><Pressable ref={closeButton} testID="professional-picker-close" accessibilityRole="button" accessibilityLabel="Cerrar selección sin cambios" onPress={onClose} style={s.close}><Icon name="close" size={21} /></Pressable></View>
        <View style={s.search}><Icon name="search" size={19} color={colors.tealDark} /><TextInput testID="professional-picker-search" accessibilityLabel={request.field === 'specialty' ? 'Buscar especialidad' : 'Buscar licenciatura'} value={query} onChangeText={setQuery} placeholder={request.field === 'specialty' ? 'Buscar especialidad' : 'Buscar licenciatura'} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} style={s.input} />{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery('')} style={s.clear}><Icon name="close" size={17} color={colors.muted} /></Pressable>}</View>
        <FlatList key={query} testID={`professional-profile-${request.field}-options`} data={options} keyExtractor={item => item.value} style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={12} maxToRenderPerBatch={16} windowSize={5} ListEmptyComponent={<Text accessibilityLiveRegion="polite" style={s.empty}>No encontramos resultados.</Text>} renderItem={({ item }) => <Pressable testID={`professional-${request.field}-${item.index}`} accessibilityRole="radio" accessibilityLabel={item.value} accessibilityState={{ checked: request.value === item.value }} aria-checked={request.value === item.value} onPress={() => choose(item.value)} style={({ pressed }) => [s.option, request.value === item.value && s.selected, pressed && s.pressed]}><Text style={s.optionText}>{item.value}</Text>{request.value === item.value && <Icon name="check" size={21} color={colors.tealDark} />}</Pressable>} />
      </View>
    </KeyboardAvoidingView>
  </View>;
}
const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,36,65,.30)', zIndex: 20 }, position: { flex: 1, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }, card: { width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, minHeight: 0, backgroundColor: 'white', borderRadius: 28, overflow: 'hidden', boxShadow: '0 18px 48px rgba(8,36,65,.17)' }, handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#CAD5DD', alignSelf: 'center', marginTop: 10 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 10 }, title: { flex: 1, color: colors.navy, fontSize: 20, lineHeight: 27, fontWeight: '600' }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F4F7', alignItems: 'center', justifyContent: 'center' }, search: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: '#F0F6F7', marginHorizontal: 20, marginBottom: 12, paddingLeft: 13, paddingRight: 5, minHeight: 46 }, input: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.navy, fontSize: 15 }, clear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, list: { flex: 1, minHeight: 0 }, listContent: { paddingHorizontal: 12, paddingBottom: 14 }, option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12 }, optionText: { flex: 1, color: colors.navy, fontSize: 15, lineHeight: 22 }, selected: { backgroundColor: '#EAF7F5' }, pressed: { backgroundColor: '#F0F6F7' }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 16, fontSize: 14, lineHeight: 21 },
});
