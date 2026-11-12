import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DirectoryFilterMode, DirectoryOptionsRequest } from './DirectoryOptionsProvider';
import { colors, Icon } from './ui';
import DirectoryInsurerLogo from './DirectoryInsurerLogo';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export default function DirectoryOptionsPopup({ request, onClose }: { request: DirectoryOptionsRequest; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DirectoryFilterMode>(request.kind === 'filters' ? request.mode : 'Todas');
  const [favorites, setFavorites] = useState(request.kind === 'filters' && request.onlyFavorites);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof View>>(null);
  const completed = useRef(false);
  const title = request.kind === 'options' ? request.label : 'Más filtros';
  const options = useMemo(() => request.kind === 'options'
    ? request.options.filter(option => normalize(search).split(/\s+/).every(term => normalize(option).includes(term)))
    : [], [request, search]);

  useEffect(() => {
    const dismiss = () => { Keyboard.dismiss(); onClose(); };
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(); return true; });
    if (Platform.OS !== 'web') {
      const frame = requestAnimationFrame(() => {
        if (closeButton.current) AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus');
      });
      return () => { subscription.remove(); cancelAnimationFrame(frame); request.restoreNativeFocus?.(); };
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const frame = requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-testid="directory-options-close"]')?.focus());
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
    return () => {
      subscription.remove(); cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose, request]);

  const choose = (value: string) => {
    if (request.kind !== 'options' || completed.current) return;
    completed.current = true;
    request.onSelect(value);
    onClose();
  };
  const apply = () => {
    if (request.kind !== 'filters' || completed.current) return;
    completed.current = true;
    request.onApply(mode, favorites);
    onClose();
  };
  const option = (value: string, label = value) => <Pressable
    testID={value ? `directory-option-${value}` : 'directory-option-all'}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: request.kind === 'options' && request.value === value }}
    onPress={() => choose(value)}
    style={({ pressed }) => [s.option, request.kind === 'options' && request.field === 'insurer' && (value ? s.insurerOption : s.anyInsurerOption), request.kind === 'options' && request.value === value && s.selected, pressed && s.pressed]}
  >
    {request.kind === 'options' && request.field === 'insurer' && !!value && <DirectoryInsurerLogo name={value} />}
    <Text style={[s.optionText, request.kind === 'options' && request.field === 'insurer' && !value && s.anyInsurerText]}>{value && request.kind === 'options' && request.optionPrefix ? `${request.optionPrefix} ${label}` : label}</Text>
    {request.kind === 'options' && request.value === value && <Icon name="check" color={colors.tealDark} size={20} />}
  </Pressable>;

  return <View testID="directory-options-overlay" style={s.overlay}>
    <Pressable testID="directory-options-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar opciones sin cambios" onPress={onClose} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.position, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View ref={card} testID="directory-options-popup" role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={title} onAccessibilityEscape={onClose} style={[s.card, { height: Math.min(request.kind === 'filters' ? 440 : 540, Math.max(0, height - insets.top - insets.bottom - 40)) }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          <Pressable ref={closeButton} testID="directory-options-close" accessibilityRole="button" accessibilityLabel="Cerrar opciones sin cambios" onPress={onClose} style={s.close}><Icon name="close" size={22} /></Pressable>
        </View>
        {request.kind === 'options' ? <>
          <View style={[s.search, request.field === 'insurer' && s.insurerSearch]}>
            <Icon name="search" color={colors.tealDark} size={19} />
            <TextInput testID={`directory-${request.field}-search`} accessibilityLabel={`Buscar ${title.toLocaleLowerCase('es')}`} placeholder={`Buscar ${title.toLocaleLowerCase('es')}`} placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} style={s.input} />
            {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')} style={s.clearSearch}><Icon name="close" color={colors.muted} size={17} /></Pressable>}
          </View>
          <FlatList key={search} data={options} keyExtractor={item => item} style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={12} maxToRenderPerBatch={16} windowSize={5} ListHeaderComponent={request.allLabel ? option('', request.allLabel) : undefined} ListEmptyComponent={<Text accessibilityLiveRegion="polite" style={s.empty}>{request.emptyMessage ?? 'No encontramos resultados.'}</Text>} renderItem={({ item }) => option(item)} />
        </> : <>
          <ScrollView style={s.list} contentContainerStyle={s.filters} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Modalidad de consulta</Text>
            {(['Todas', 'Presencial', 'Teleconsulta'] as DirectoryFilterMode[]).map(item => <Pressable key={item} testID={`directory-filter-mode-${item}`} accessibilityRole="radio" accessibilityState={{ checked: mode === item }} aria-checked={mode === item} onPress={() => setMode(item)} style={({ pressed }) => [s.option, mode === item && s.selected, pressed && s.pressed]}><Text style={s.optionText}>{item}</Text><Icon name={mode === item ? 'radio-button-on-outline' : 'radio-button-off-outline'} size={21} color={mode === item ? colors.tealDark : colors.muted} /></Pressable>)}
            <View style={s.divider} />
            <Pressable testID="directory-filter-favorites" accessibilityRole="checkbox" accessibilityState={{ checked: favorites }} aria-checked={favorites} onPress={() => setFavorites(value => !value)} style={s.option}><Icon name="heart" size={20} color={colors.tealDark} /><Text style={s.optionText}>Mis favoritos</Text><Icon name={favorites ? 'checkbox-outline' : 'square-outline'} size={22} color={colors.tealDark} /></Pressable>
          </ScrollView>
          <View style={s.footer}>
            <Pressable testID="directory-filters-clear" accessibilityRole="button" onPress={() => { setMode('Todas'); setFavorites(false); }} style={s.clear}><Text style={s.clearText}>Borrar filtros</Text></Pressable>
            <Pressable testID="directory-filters-apply" accessibilityRole="button" onPress={apply} style={({ pressed }) => [s.apply, pressed && { opacity: 0.75 }]}><Text style={s.applyText}>Aplicar</Text></Pressable>
          </View>
        </>}
      </View>
    </KeyboardAvoidingView>
  </View>;
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, backgroundColor: 'rgba(8,36,65,.32)' },
  position: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, minHeight: 0, backgroundColor: 'white', borderRadius: 26, overflow: 'hidden', boxShadow: '0 18px 48px rgba(8,36,65,.17)' },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#CAD5DD', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  title: { flex: 1, color: colors.navy, fontSize: 20, fontWeight: '600' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F4F7', alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: '#EEF7F7', marginHorizontal: 18, marginBottom: 12, paddingLeft: 13, paddingRight: 5, minHeight: 46 },
  insurerSearch: { borderRadius: 24 },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.navy, fontSize: 14 },
  clearSearch: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 12, paddingBottom: 14 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12 },
  insurerOption: { minHeight: 64, paddingVertical: 10 },
  anyInsurerOption: { alignSelf: 'flex-start', width: 220, maxWidth: '100%', minHeight: 44, paddingVertical: 8, borderRadius: 22, marginBottom: 6 },
  anyInsurerText: { fontSize: 13 },
  optionText: { flex: 1, color: colors.navy, fontSize: 14, lineHeight: 21 },
  selected: { backgroundColor: '#EAF7F5' },
  pressed: { backgroundColor: '#F0F6F7' },
  empty: { color: colors.muted, padding: 22, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  filters: { paddingHorizontal: 14, paddingBottom: 12 },
  label: { color: colors.navy, fontSize: 13, fontWeight: '600', paddingHorizontal: 10, marginBottom: 8 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.line },
  clear: { minHeight: 44, justifyContent: 'center' },
  clearText: { color: colors.tealDark, fontSize: 12 },
  apply: { minHeight: 44, borderRadius: 24, backgroundColor: colors.tealDark, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
