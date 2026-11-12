import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPharmacyOffers, isPharmacyProduct, type CartLine, type Product } from '../domain/pharmacy';
import { colors, Icon } from './ui';

const money = (cents: number) => '$' + (cents / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 });
export default function PharmacySellerPopup({ product, cart, thumbnail, busy, error, onClose, onAdd }: {
  product: Product;
  cart: CartLine[];
  thumbnail: ReactNode;
  busy: boolean;
  error: string;
  onClose: () => void;
  onAdd: (offer: Product) => void;
}) {
  const offers = getPharmacyOffers(product);
  const configuredKlini = (product.offers ?? [product]).find(offer => offer.provider?.isKlini && isPharmacyProduct(offer));
  const available = (offer: Product) => (cart.find(line => line.product.id === offer.id)?.quantity ?? 0) < Math.min(offer.stock, 99);
  const [selectedId, setSelectedId] = useState(() => offers.find(available)?.id ?? '');
  const selected = offers.find(offer => offer.id === selectedId);
  const insets = useSafeAreaInsets();
  const card = useRef<React.ComponentRef<typeof View>>(null);
  const closeButton = useRef<React.ComponentRef<typeof View>>(null);
  const dismiss = useRef(onClose);
  const pending = useRef(busy);
  useEffect(() => { dismiss.current = onClose; pending.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const close = () => { if (!pending.current) dismiss.current(); };
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    if (Platform.OS !== 'web') {
      const frame = requestAnimationFrame(() => { if (closeButton.current) AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus'); });
      return () => { subscription.remove(); cancelAnimationFrame(frame); };
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current as unknown as HTMLElement | null;
    const frame = requestAnimationFrame(() => node?.querySelector<HTMLElement>('[data-testid="pharmacy-seller-close"]')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
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
  }, []);
  return <View testID="pharmacy-seller-overlay" style={s.overlay}>
    <Pressable testID="pharmacy-seller-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar selección de distribuidor" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
    <View pointerEvents="box-none" style={[s.position, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View ref={card} testID="pharmacy-seller-popup" role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel="¿Quién te lo entrega?" onAccessibilityEscape={() => { if (!busy) onClose(); }} style={s.card}>
        <View style={s.handle} />
        <View style={s.header}>
          <View style={s.thumbnail}>{thumbnail}</View>
          <View style={s.flex}>
            <Text accessibilityRole="header" style={s.title}>¿Quién te lo entrega?</Text>
            <Text style={s.product}>{product.name} · {product.presentation}</Text>
            <Text style={s.caption}>Precio por unidad · MXN</Text>
            {product.requiresPrescription && <Text style={s.caption}>Requiere receta</Text>}
          </View>
          <Pressable ref={closeButton} testID="pharmacy-seller-close" accessibilityRole="button" accessibilityLabel="Cerrar selección de distribuidor" disabled={busy} onPress={onClose} style={[s.close, busy && s.disabled]}><Icon name="close" size={19} /></Pressable>
        </View>
        <ScrollView style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled">
          {!offers.some(offer => offer.provider?.isKlini) && <View testID="pharmacy-seller-klini-unavailable" accessibilityLabel={configuredKlini ? `Klini, ${money(configuredKlini.priceCents)} MXN, agotado` : 'Klini, precio por configurar, no disponible'} style={[s.row, s.disabled]}><Icon name="radio-button-off-outline" size={21} color={colors.muted} /><Text style={s.name}>Klini{configuredKlini ? ' · Agotado' : ''}</Text><Text style={configuredKlini ? s.price : s.unavailable}>{configuredKlini ? money(configuredKlini.priceCents) : 'Precio por configurar'}</Text></View>}
          {offers.map(offer => {
            const chosen = selectedId === offer.id;
            const soldOut = !available(offer);
            const name = offer.provider?.isKlini ? 'Klini' : offer.provider?.name ?? 'Distribuidor del catálogo';
            return <Pressable key={offer.id} testID={`pharmacy-seller-option-${offer.id}`} accessibilityRole="radio" accessibilityLabel={`${name}, ${money(offer.priceCents)} MXN${soldOut ? ', unidades ya agregadas' : ''}`} accessibilityState={{ checked: chosen, disabled: busy || soldOut }} aria-checked={chosen} disabled={busy || soldOut} onPress={() => setSelectedId(offer.id)} style={({ pressed }) => [s.row, chosen && s.selected, (busy || soldOut) && s.disabled, pressed && s.pressed]}>
              <Icon name={chosen ? 'radio-button-on-outline' : 'radio-button-off-outline'} size={21} color={colors.tealDark} />
              <Text style={s.name}>{name}</Text>
              <Text style={s.price}>{money(offer.priceCents)}</Text>
            </Pressable>;
          })}
          {!offers.length && <Text accessibilityLiveRegion="polite" style={s.empty}>No hay distribuidores con disponibilidad para este producto.</Text>}
          {!!error && <Text testID="pharmacy-seller-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
        <View style={s.footer}>
          <Pressable testID="pharmacy-seller-add" accessibilityRole="button" accessibilityLabel="Agregar al carrito" accessibilityState={{ disabled: busy || !selected || !available(selected), busy }} disabled={busy || !selected || !available(selected)} onPress={() => { if (selected) onAdd(selected); }} style={({ pressed }) => [s.add, (busy || !selected || !available(selected)) && s.disabled, pressed && { opacity: 0.75 }]}><Text style={s.addText}>{busy ? 'Agregando…' : 'Agregar al carrito'}</Text></Pressable>
        </View>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, backgroundColor: 'rgba(8,36,65,.34)' },
  position: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 10, paddingTop: 12 },
  card: { width: '100%', maxWidth: 440, maxHeight: '100%', flexShrink: 1, borderRadius: 24, backgroundColor: 'white', overflow: 'hidden', boxShadow: '0 16px 36px rgba(8,36,65,.14)' },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#CAD5DD', alignSelf: 'center', marginTop: 9 },
  header: { flexShrink: 0, flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingLeft: 16, paddingRight: 8, paddingTop: 12, paddingBottom: 8 },
  thumbnail: { width: 42 },
  flex: { flex: 1, minWidth: 0 },
  title: { color: colors.navy, fontSize: 17, lineHeight: 22, fontWeight: '700', marginTop: 3 },
  product: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  caption: { color: '#94A5B7', fontSize: 10, lineHeight: 15, marginTop: 5 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  list: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 10, paddingBottom: 4 },
  row: { minHeight: 46, paddingHorizontal: 10, paddingVertical: 11, gap: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, color: colors.navy, fontSize: 13, lineHeight: 19 },
  price: { color: colors.tealDark, fontSize: 14, fontWeight: '700' },
  selected: { backgroundColor: '#EAF6F4' },
  pressed: { backgroundColor: '#F1F8F7' },
  unavailable: { color: colors.muted, fontSize: 10, flexShrink: 1, textAlign: 'right' },
  disabled: { opacity: 0.45 },
  empty: { color: colors.muted, fontSize: 12, lineHeight: 18, padding: 12 },
  error: { color: '#A22F41', backgroundColor: '#FFF0F2', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 18 },
  footer: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, flexShrink: 0 },
  add: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.tealDark, paddingHorizontal: 18, paddingVertical: 11 },
  addText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
