import React, { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, useWindowDimensions, BackHandler, Image, ScrollView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePopupAlreadyOpen } from '../components/PopupTransition';
import PharmacySellerPopup from '../components/PharmacySellerPopup';
import { Button, Chip, Empty, Icon, TextField, colors } from '../components/ui';
import { useAppStore } from '../state/store';
import { DEMO_PRODUCTS, DEMO_PROGRAMS, emptyPharmacyState, filterPharmacyProducts, getPharmacyOffers, pharmacyOfferSnapshot, pharmacyTotals, type Product, type CartLine, type PharmacyAddress, type PharmacyOrder } from '../domain/pharmacy';
import { pharmacyApiConfigured, loadPharmacyCatalog, loginPharmacy, loadPharmacyOrders, submitPharmacyOrder, type RemotePharmacyOrder, type PharmacySettings, type PrescriptionFile, uploadPrescription, createPharmacyRequestId, logoutPharmacy } from '../services/pharmacy-api';

type PharmacyCatalog = { products: Product[]; settings: PharmacySettings };
type Page = 'catalog' | 'cart' | 'address' | 'review' | 'prescription' | 'success' | 'order' | 'program' | 'help' | 'login';
type Tab = 'products' | 'orders' | 'programs';
type Filters = { specialty?: string; type?: string; laboratory?: string; promotionsOnly?: boolean; programsOnly?: boolean };
const money = (value: number) => '$' + (value / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const hasOfferPrice = (item: Product) => item.offers?.length !== 0;
const productPrice = (item: Product) => hasOfferPrice(item) ? money(item.priceCents) : 'Precio no disponible';
const blankAddress: PharmacyAddress = { name: '', street: '', neighborhood: '', postalCode: '', reference: '' };
const addressValid = (value: PharmacyAddress) => value.name.trim().length >= 2 && value.street.trim().length >= 3 && value.neighborhood.trim().length >= 2 && /^\d{5}$/.test(value.postalCode);
const productPictureHeights = { card: 120, featured: 150, detail: 225, thumbnail: 75 };
function ProductPicture({ product, variant = 'card' }: { product: Product; variant?: keyof typeof productPictureHeights }) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  return <View style={[s.picture, { height: productPictureHeights[variant] }, variant === 'detail' && s.pictureLarge]}>
    {product.imageUrl && failedUrl !== product.imageUrl ? <Image accessibilityLabel={product.name} source={{ uri: product.imageUrl }} resizeMode="contain" style={s.image} onError={() => setFailedUrl(product.imageUrl)} /> :
      <View accessible accessibilityRole="image" accessibilityLabel={'Imagen no disponible para ' + product.name} style={s.picturePlaceholder}>
        <Icon name="image-outline" size={24} color={colors.muted} /><Text style={s.picturePlaceholderText}>Sin imagen</Text>
      </View>}
  </View>;
}
function Action({ title, onPress, icon = 'chevron', disabled = false }: { title: string; onPress: () => void; icon?: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[s.action, disabled && s.disabled]}><Icon name={icon} size={18} color={colors.tealDark} /><Text style={s.actionText}>{title}</Text><Icon name="chevron" size={15} color={colors.muted} /></Pressable>;
}
function Check({ text, checked, onPress, disabled }: { text: string; checked: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={text} disabled={disabled} onPress={onPress} style={s.checkRow}><Icon name={checked ? 'checkbox' : 'square-outline'} color={colors.tealDark} size={21} /><Text style={s.small}>{text}</Text></Pressable>;
}
function Quantity({ value, max, disabled, onChange }: { value: number; max: number; disabled: boolean; onChange: (value: number) => void }) {
  return <View style={s.quantity}><Pressable accessibilityRole="button" accessibilityLabel="Reducir cantidad" disabled={disabled || value <= 1} onPress={() => onChange(value - 1)} style={s.quantityButton}><Icon name="remove" color={colors.tealDark} size={18} /></Pressable><Text style={s.body}>{value}</Text><Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" disabled={disabled || value >= Math.min(max, 99)} onPress={() => onChange(value + 1)} style={s.quantityButton}><Icon name="plus" color={colors.tealDark} size={18} /></Pressable></View>;
}
export default function PharmacyScreen(props: { onClose: () => void; initialTab?: Tab }) {
  const { state } = useAppStore();
  return <PharmacyContent key={state.profile.id} {...props} />;
}
function PharmacyContent({ onClose, initialTab = 'products' }: { onClose: () => void; initialTab?: Tab }) {
  const store = useAppStore();
  const pharmacy = store.state.pharmacy ?? emptyPharmacyState();
  const connected = pharmacyApiConfigured();
  const [failedBanner, setFailedBanner] = useState<string | undefined>();
  const [catalog, setCatalog] = useState<PharmacyCatalog | null>(null);
  const [loading, setLoading] = useState(connected);
  const [remoteCart, setRemoteCart] = useState<CartLine[]>([]);
  const [remoteOrders, setRemoteOrders] = useState<RemotePharmacyOrder[]>([]);
  const [session, setSession] = useState<{ token: string; name: string } | null>(null);
  const [page, setPage] = useState<Page>('catalog');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [draftFilters, setDraftFilters] = useState<Filters | null>(null);
  const [filterField, setFilterField] = useState<'specialty' | 'type' | 'laboratory' | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [address, setAddress] = useState<PharmacyAddress>(blankAddress);
  const [method, setMethod] = useState<'apple-pay' | 'card'>('apple-pay');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [terms, setTerms] = useState(false);
  const [prescriptionAccepted, setPrescriptionAccepted] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<PrescriptionFile | null>(null);
  const [prescriptionUploadId, setPrescriptionUploadId] = useState<number | undefined>();
  const [uploadConsent, setUploadConsent] = useState(false);
  const [loginNext, setLoginNext] = useState<Page>('review');
  const lastSubmittedAt = useRef(0);
  const submission = useRef<{ signature: string; id: string } | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | RemotePharmacyOrder | null>(null);
  const [programId, setProgramId] = useState(DEMO_PROGRAMS[0]?.id ?? '');
  const [programConsent, setProgramConsent] = useState(false);
  const [programTab, setProgramTab] = useState<'available' | 'requests'>('available');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const sessionToken = useRef<string | undefined>(undefined);
  useEffect(() => { sessionToken.current = session?.token; }, [session]);
  useEffect(() => () => { const token = sessionToken.current; sessionToken.current = undefined; if (token) void logoutPharmacy(token).catch(() => undefined); }, []);
  const products = useMemo(() => connected ? catalog?.products ?? [] : DEMO_PRODUCTS, [connected, catalog]);
  const cart = connected ? remoteCart : pharmacy.cart;
  const settings = catalog?.settings;
  const enabled = !connected || !!settings?.enabled;
  const requiresPrescription = cart.some(line => line.product.requiresPrescription);
  let totalsError = '';
  let totals = { subtotalCents: 0, shippingCents: 0, totalCents: 0 };
  try { totals = pharmacyTotals(cart, connected ? settings?.shippingCents ?? 0 : 4900); } catch (failure) { totalsError = failure instanceof Error ? failure.message : 'Revisa los importes del carrito.'; }
  const shippingCents = cart.length ? connected ? settings?.shippingCents ?? 0 : totals.shippingCents : 0;
  const totalCents = totals.subtotalCents + shippingCents;
  const filtered = useMemo(() => filterPharmacyProducts(products, { ...filters, query }), [products, filters, query]);
  const program = DEMO_PROGRAMS.find(item => item.id === programId);
  const orders = connected ? remoteOrders : pharmacy.orders;
  const clearAccount = () => {
    const token = sessionToken.current ?? session?.token;
    sessionToken.current = undefined;
    if (token) void logoutPharmacy(token).catch(() => undefined);
    setSession(null); setPassword(''); setLogin(''); setRemoteOrders([]); setRemoteCart([]);
    setSelectedOrder(null); setAddress(blankAddress); setTerms(false);
    setPrescriptionId(''); setPrescriptionUploadId(undefined); setPrescriptionFile(null);
    setUploadConsent(false); setPrescriptionAccepted(false); setMethod('apple-pay');
    submission.current = null;
  };
  const safeSetPage = (next: Page) => { if (!busyRef.current) { setPage(next); setError(''); setMessage(''); } };
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    const current = generation.current;
    try { await operation(); } catch (failure) { if (mounted.current && generation.current === current) setError(failure instanceof Error ? failure.message : 'No fue posible completar la operación.'); }
    finally { busyRef.current = false; if (mounted.current && generation.current === current) setBusy(false); }
  };
  const refresh = useCallback(async () => {
    if (!connected) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try { const result = await loadPharmacyCatalog(controller.signal); if (mounted.current && !controller.signal.aborted) setCatalog(result); }
    catch (failure) { if (mounted.current && !controller.signal.aborted) { setCatalog(null); setError(failure instanceof Error ? failure.message : 'No se pudo consultar la farmacia.'); } }
    finally { if (mounted.current && !controller.signal.aborted) setLoading(false); }
  }, [connected, setError]);
  useEffect(() => { mounted.current = true; const timer = setTimeout(() => void refresh(), 0); return () => { clearTimeout(timer); mounted.current = false; request.current?.abort(); }; }, [refresh]);
  const back = () => {
    if (busyRef.current) return true;
    if (product) { setProduct(null); setError(''); return true; }
    if (draftFilters) { setDraftFilters(null); return true; }
    if (paymentOpen) { setPaymentOpen(false); return true; }
    if (termsOpen) { setTermsOpen(false); return true; }
    if (page === 'catalog') { request.current?.abort(); clearAccount(); onClose(); return true; }
    const previous: Partial<Record<Page, Page>> = { address: 'cart', review: 'address', prescription: 'cart', help: 'order', success: 'catalog', order: 'catalog', login: loginNext };
    setPage(previous[page] ?? 'catalog'); setError(''); setMessage(''); return true;
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); back(); } };
    if (Platform.OS === 'web') window.addEventListener('keydown', keyboard);
    return () => { subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('keydown', keyboard); };
  });
  const changeCart = async (lines: CartLine[]) => {
    pharmacyTotals(lines, connected ? settings?.shippingCents ?? 0 : 4900);
    setTerms(false);
    if (connected) setRemoteCart(lines);
    else await store.setPharmacyCartPersisted(lines);
  };
  const add = (item: Product, count = 1) => void run(async () => {
    if (!enabled || loading) throw new Error('El catálogo no está disponible.');
    const current = cart.find(line => line.product.id === item.id)?.quantity ?? 0;
    if (current + count > Math.min(item.stock, 99)) throw new Error('La cantidad supera la disponibilidad del producto.');
    await changeCart([...cart.filter(line => line.product.id !== item.id), { product: item, quantity: current + count }]);
    setProduct(null);
    setMessage('Producto agregado al carrito.');
  });
  const openSeller = (item: Product) => {
    if (busy || !enabled || loading) return;
    setError(''); setMessage(''); setProduct(item);
  };
  const refreshOrders = () => void run(async () => {
    if (!session) { setTab('orders'); setLoginNext('catalog'); setPage('login'); return; }
    setRemoteOrders(await loadPharmacyOrders(session.token));
  });
  const submit = () => void run(async () => {
    lastSubmittedAt.current = Date.now();
    if (totalsError) throw new Error(totalsError);
    if (connected && !settings?.ordersAvailable) throw new Error('Las solicitudes están temporalmente deshabilitadas.');
    if (!terms || !addressValid(address) || !cart.length) throw new Error('Revisa el carrito, la dirección y las condiciones.');
    if (connected) {
      if (!session) { setLoginNext('review'); setPage('login'); return; }
      const input = { lines: cart, address, termsAccepted: terms, ...(prescriptionUploadId ? { prescriptionUploadId } : prescriptionId ? { prescriptionId: Number(prescriptionId) } : {}) };
      const signature = JSON.stringify(input);
      if (!submission.current || submission.current.signature !== signature) submission.current = { signature, id: createPharmacyRequestId() };
      const order = await submitPharmacyOrder(session.token, { ...input, clientRequestId: submission.current.id });
      if (!mounted.current) return;
      submission.current = null;
      setSelectedOrder(order); setRemoteOrders(current => [order, ...current.filter(item => item.id !== order.id)]); setRemoteCart([]);
    } else {
      const id = await store.createPharmacyDemoOrderPersisted({ lines: cart, address, paymentMethod: method, prescriptionAccepted });
      if (!mounted.current) return;
      setSelectedOrder({ id, createdAt: new Date().toISOString(), mode: 'demo', status: 'preparing', lines: cart.map(line => ({ ...line, product: { ...line.product } })), address: { ...address }, paymentMethod: method, subtotalCents: totals.subtotalCents, shippingCents, totalCents, prescriptionAccepted });
    }
    setPage('success');
  });
  const cartRow = (line: CartLine, editable = false) => <View key={line.product.id} testID={`pharmacy-cart-line-${line.product.id}`} style={s.cartRow}>
    <View style={s.thumbnail}><ProductPicture product={line.product} variant="thumbnail" /></View><View style={s.flex}><Text style={s.productName}>{line.product.name}</Text><Text style={s.small}>{line.product.presentation}</Text><Text testID={`pharmacy-cart-seller-${line.product.id}`} style={s.small}>{line.product.provider?.isKlini ? 'Klini' : line.product.provider?.name ?? 'Distribuidor del catálogo'}</Text><Text style={[s.price, { color: settings?.accentColor ?? colors.tealDark }]}>{money(line.product.priceCents)}</Text>{!editable && <Text style={s.small}>Cantidad: {line.quantity}</Text>}</View>
    {editable && <View style={s.cartControls}><Quantity value={line.quantity} max={line.product.stock} disabled={busy} onChange={value => void run(() => changeCart(cart.map(item => item.product.id === line.product.id ? { ...item, quantity: value } : item)))} /><Pressable accessibilityRole="button" accessibilityLabel={'Eliminar ' + line.product.name} disabled={busy} onPress={() => void run(() => changeCart(cart.filter(item => item.product.id !== line.product.id)))}><Icon name="trash" size={19} color={colors.tealDark} /></Pressable></View>}
  </View>;
  const summary = (subtotal = totals.subtotalCents, shipping = shippingCents, total = totalCents) => <View style={s.summary}><View style={s.between}><Text style={s.small}>Productos</Text><Text style={s.body}>{money(subtotal)}</Text></View><View style={s.between}><Text style={s.small}>Envío estimado</Text><Text style={s.body}>{money(shipping)}</Text></View><View style={[s.between, s.total]}><Text style={s.heading}>Total</Text><Text style={s.heading}>{money(total)} MXN</Text></View></View>;
  const cards = (items: Product[]) => <View style={s.grid}>{items.map(item => <View key={item.id} style={s.productCard}>
    <Pressable testID={'pharmacy-product-' + item.id} accessibilityRole="button" accessibilityLabel={'Elegir distribuidor de ' + item.name} disabled={busy || !enabled} onPress={() => openSeller(item)}>
      <ProductPicture product={item} /><Text style={s.productName}>{item.name}</Text><Text style={s.small}>{item.presentation} · {item.laboratory}</Text>
    </Pressable>
    <View style={s.between}><View style={s.flex}><Text style={[s.price, { color: settings?.accentColor ?? colors.tealDark }, !hasOfferPrice(item) && s.small]}>{productPrice(item)}</Text>{!!item.originalPriceCents && item.originalPriceCents > item.priceCents && <Text style={s.oldPrice}>{money(item.originalPriceCents)}</Text>}</View><Pressable testID={'pharmacy-add-' + item.id} accessibilityRole="button" accessibilityLabel={'Agregar ' + item.name} disabled={busy || !item.stock || !enabled} onPress={() => openSeller(item)} style={s.add}><Icon name="plus" size={18} color="white" /></Pressable></View>{!item.stock && <Text style={s.small}>{item.offers?.length === 0 ? 'Sin distribuidores' : 'Agotado'}</Text>}
  </View>)}</View>;
  let title = settings?.title || 'Farmacia digital';
  let content: React.ReactNode;
  let footer: React.ReactNode;

  if (page === 'catalog') {
    content = <>

      <View style={s.tabs}>{(['products', 'orders', 'programs'] as Tab[]).map(value => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === value }} key={value} onPress={() => { setTab(value); setError(''); setMessage(''); if (value === 'orders' && connected && session) refreshOrders(); }} style={[s.tab, tab === value && s.tabActive]}><Text style={[s.tabText, tab === value && s.tabTextActive]}>{value === 'products' ? 'Productos' : value === 'orders' ? 'Mis compras' : 'Apego'}</Text></Pressable>)}</View>
      {tab === 'products' && <>
        <View style={s.searchRow}><View style={s.search}><Icon name="search" size={18} color={colors.tealDark} /><TextInput accessibilityLabel="Buscar productos" testID="pharmacy-search" value={query} onChangeText={setQuery} placeholder="Buscar productos" placeholderTextColor={colors.muted} style={s.searchInput} /></View><Pressable testID="pharmacy-filters" accessibilityRole="button" accessibilityLabel="Filtros" onPress={() => { setFilterField(null); setDraftFilters({ ...filters }); }} style={s.filter}><Icon name="filter" color={colors.tealDark} /></Pressable></View>
        {Object.values(filters).some(Boolean) && <Action title="Borrar filtros" icon="close" onPress={() => setFilters({})} />}
        <View style={s.delivery}><Icon name="location" size={13} color={colors.muted} /><Text style={s.small}>Entrega según cobertura del distribuidor</Text></View>
        {loading ? <Empty title="Consultando productos…" /> : connected && !catalog ? <Empty title="No se pudo cargar el catálogo" description="No sustituimos un error de conexión por productos de ejemplo." action="Reintentar" onAction={() => void refresh()} /> : !enabled ? <Empty title="Farmacia temporalmente no disponible" description="La publicación del catálogo está desactivada." action="Actualizar" onAction={() => void refresh()} /> : <>
          {!!settings?.bannerImageUrl && failedBanner !== settings.bannerImageUrl && <Image accessibilityLabel="Promoción de farmacia" source={{ uri: settings.bannerImageUrl }} resizeMode="cover" style={{ width: '100%', height: 130, borderRadius: 15 }} onError={() => setFailedBanner(settings.bannerImageUrl)} />}
          {!!settings?.subtitle && <Text style={s.body}>{settings.subtitle}</Text>}
          {!query && !Object.values(filters).some(Boolean) && filtered[0] && <View style={s.hero}>
            <Pressable testID="pharmacy-featured-product" accessibilityRole="button" accessibilityLabel={'Elegir distribuidor de promoción ' + filtered[0].name} disabled={busy || !enabled} onPress={() => openSeller(filtered[0])} style={s.heroLink}>
              <View style={s.flex}><Text style={s.promotion}>DESTACADO</Text><Text style={s.heading}>{filtered[0].name}</Text><Text style={s.small}>{filtered[0].presentation} · {filtered[0].laboratory}</Text><Text style={[s.heroPrice, { color: settings?.accentColor ?? colors.tealDark }, !hasOfferPrice(filtered[0]) && s.small]}>{productPrice(filtered[0])}</Text>{!!filtered[0].originalPriceCents && filtered[0].originalPriceCents > filtered[0].priceCents && <Text style={s.oldPrice}>{money(filtered[0].originalPriceCents)}</Text>}</View>
              <View style={s.heroImage}><ProductPicture product={filtered[0]} variant="featured" /></View>
            </Pressable>
            <Pressable testID="pharmacy-add-featured" accessibilityRole="button" accessibilityLabel={'Agregar promoción ' + filtered[0].name} disabled={busy || !filtered[0].stock || !enabled} onPress={() => openSeller(filtered[0])} style={[s.add, s.heroAdd]}><Icon name="plus" size={18} color="white" /></Pressable>
          </View>}
          <View style={s.between}><Text style={s.heading}>{query || Object.values(filters).some(Boolean) ? filtered.length + ' productos' : 'Explorar productos'}</Text><Text style={s.small}>{connected ? 'Precios MXN' : 'Datos de ejemplo'}</Text></View>
          {filtered.length ? cards(filtered) : <Empty title="Sin productos" description="Prueba otra búsqueda o cambia los filtros." />}
        </>}

      </>}
      {tab === 'orders' && <><Text style={s.heading}>Tus pedidos</Text>{connected && !session ? <Empty title="Consulta tus solicitudes" description="Inicia sesión con tu cuenta de paciente para ver solo tus pedidos." action="Iniciar sesión" onAction={() => { setLoginNext('catalog'); safeSetPage('login'); }} /> : <>
        {connected && <Action title="Actualizar pedidos" icon="refresh" onPress={refreshOrders} disabled={busy} />}
        {orders.length ? orders.map(order => <Pressable accessibilityRole="button" accessibilityLabel={'Ver pedido ' + order.id} key={order.id} style={s.orderRow} onPress={() => { setSelectedOrder(order); safeSetPage('order'); }}><View style={s.flex}><Text style={s.productName}>{order.id}</Text><Text style={s.small}>{'mode' in order ? order.status === 'cancelled' ? 'Cancelado · demo' : 'Preparando · demo' : 'Solicitud · ' + order.status}</Text></View><Text style={s.body}>{money(order.totalCents)}</Text><Icon name="chevron" size={17} /></Pressable>) : <Empty title="Aún no tienes pedidos" description={connected ? 'Las solicitudes que envíes aparecerán aquí.' : 'Puedes recorrer una compra de demostración.'} />}
      </>}</>}
      {tab === 'programs' && <><Text style={s.heading}>Programas de apego</Text>{connected ? <Empty title="Programas del distribuidor" description="La inscripción conectada aún no está habilitada. No se envían solicitudes ni se aplican beneficios automáticamente." /> : <>
        <View style={s.chips}><Chip label="Disponibles" selected={programTab === 'available'} onPress={() => setProgramTab('available')} /><Chip label="Mis solicitudes" selected={programTab === 'requests'} onPress={() => setProgramTab('requests')} /></View>
        {programTab === 'available' ? DEMO_PROGRAMS.map(item => <View key={item.id} style={s.programCard}><Text style={s.heading}>{item.name}</Text><Text style={s.small}>{item.laboratory}</Text><Text style={[s.heroPrice, { color: settings?.accentColor ?? colors.tealDark }]}>{item.discountPercent}%</Text><Text style={s.small}>En productos participantes · Demostración</Text><Action title="Ver programa" onPress={() => { setProgramId(item.id); setProgramConsent(false); safeSetPage('program'); }} /></View>) : pharmacy.programRequests.length ? pharmacy.programRequests.map(item => <View key={item.id} style={s.programCard}><Text style={s.heading}>{DEMO_PROGRAMS.find(p => p.id === item.programId)?.name}</Text><Text style={s.promotion}>En revisión · Demostración</Text><Text style={s.small}>Esta solicitud es local; no activa un beneficio real.</Text></View>) : <Empty title="Sin solicitudes" />}
      </>}</>}
      {connected && session && <Action title={'Cerrar sesión de ' + session.name} icon="logout" disabled={busy} onPress={() => { clearAccount(); setPage('catalog'); setMessage('Sesión cerrada. Los datos de esta cuenta se retiraron de la pantalla.'); }} />}
    </>;
    if (tab === 'products') footer = <Pressable testID="pharmacy-buy-again" accessibilityRole="button" accessibilityLabel="Comprar de nuevo" onPress={() => setTab('orders')} style={s.buyAgain}><Icon name="clock" size={18} color={colors.tealDark} /><Text style={s.actionText}>Comprar de nuevo</Text><Icon name="chevron" size={16} color={colors.tealDark} /></Pressable>;
  } else if (page === 'cart') {
    title = 'Carrito';
    content = cart.length ? <>{cart.map(line => cartRow(line, true))}<Action title="Agregar cupón" icon="plus" onPress={() => setCouponOpen(value => !value)} />{couponOpen && <><TextField label="Cupón" value={coupon} onChangeText={setCoupon} /><Button title="Validar cupón" secondary onPress={() => setMessage('No hay cupones habilitados. No se aplicó ningún descuento.')} /></>}{summary()}<Text style={s.small}>Entrega estimada: {connected ? settings?.deliveryEstimate || 'Por confirmar' : '1–2 días · ejemplo'}</Text><Action title="Seguir comprando" onPress={() => safeSetPage('catalog')} /></> : <Empty title="Tu carrito está vacío" action="Explorar productos" onAction={() => safeSetPage('catalog')} />;
    footer = <Button title="Continuar" testID="pharmacy-checkout" disabled={busy || !!totalsError || !cart.length || !enabled} onPress={() => safeSetPage(requiresPrescription && !(connected ? prescriptionUploadId || prescriptionId : prescriptionAccepted) ? 'prescription' : 'address')} />;
  } else if (page === 'prescription') {
    title = 'Receta médica';
    content = <><Text style={s.heading}>{connected ? 'Adjunta tu receta para revisión' : 'Receta de demostración'}</Text>{cart.filter(line => line.product.requiresPrescription).map(line => cartRow(line))}
      <Text style={s.body}>{connected ? 'La receta debe pertenecer a tu cuenta de paciente. Una solicitud recibida no significa que la receta esté aprobada.' : 'No adjuntes una receta real a la demostración. Este paso usa una referencia ficticia y no solicita evaluación médica.'}</Text>
      {connected ? <>
        {!session && <Button title="Iniciar sesión para enviar receta" onPress={() => { setLoginNext('prescription'); safeSetPage('login'); }} />}
        <Button title={prescriptionFile ? 'Cambiar archivo de receta' : 'Seleccionar receta PDF o imagen'} secondary disabled={busy} onPress={() => void run(async () => {
          const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: false, copyToCacheDirectory: true });
          if (result.canceled || !mounted.current) return;
          const asset = result.assets[0];
          if (!asset.size || asset.size > 8 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(asset.mimeType ?? '')) throw new Error('Selecciona PDF, JPG o PNG de hasta 8 MB.');
          setPrescriptionFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType!, size: asset.size, ...(asset.file ? { file: asset.file } : {}) });
          setPrescriptionUploadId(undefined); setUploadConsent(false); setPrescriptionId('');
        })} />
        {!!prescriptionFile && <><Text style={s.body}>{prescriptionFile.name}</Text><Check text="Enviar este archivo privado a Klini para revisar mi receta" checked={uploadConsent} disabled={busy} onPress={() => setUploadConsent(value => !value)} /><Button title={busy ? 'Enviando…' : prescriptionUploadId ? 'Receta recibida, pendiente de revisión' : 'Enviar receta a revisión'} disabled={busy || !session || !uploadConsent || !!prescriptionUploadId} onPress={() => void run(async () => {
          if (!session || !prescriptionFile || !uploadConsent) return;
          const uploaded = await uploadPrescription(session.token, prescriptionFile);
          if (mounted.current) { setPrescriptionUploadId(uploaded.id); setMessage('Receta recibida. Pendiente de revisión; no está aprobada.'); }
        })} /></>}
        {!prescriptionUploadId && <><Text style={s.small}>También puedes usar el folio de una receta ya registrada en tu cuenta.</Text><TextField label="Folio de receta en tu cuenta Klini" value={prescriptionId} onChangeText={setPrescriptionId} keyboardType="number-pad" /></>}
        <Text style={s.small}>El servidor comprueba la propiedad del documento. Cerrar este flujo no borra una receta ya enviada.</Text>
      </> : <Check text="Usar receta ficticia de ejemplo" checked={prescriptionAccepted} onPress={() => setPrescriptionAccepted(value => !value)} />}
    </>;
    footer = <Button title={connected ? 'Continuar a revisión' : 'Continuar con ejemplo'} disabled={busy || (connected ? !prescriptionUploadId && !/^[1-9]\d*$/.test(prescriptionId) : !prescriptionAccepted)} onPress={() => safeSetPage('address')} />;
  } else if (page === 'address') {
    title = 'Dirección y entrega';
    content = <><Text style={s.small}>{connected ? 'Se enviará esta dirección a Klini al confirmar la solicitud.' : 'Usa una dirección ficticia para esta demostración.'}</Text><TextField label="Nombre" maxLength={150} value={address.name} onChangeText={name => setAddress({ ...address, name })} /><TextField label="Calle y número" maxLength={250} value={address.street} onChangeText={street => setAddress({ ...address, street })} /><TextField label="Colonia" maxLength={150} value={address.neighborhood} onChangeText={neighborhood => setAddress({ ...address, neighborhood })} /><TextField label="Código postal" value={address.postalCode} onChangeText={postalCode => setAddress({ ...address, postalCode })} keyboardType="number-pad" maxLength={5} /><TextField label="Referencias (opcional)" maxLength={500} value={address.reference ?? ''} onChangeText={reference => setAddress({ ...address, reference })} /><Text style={s.heading}>Entrega</Text><Text style={s.body}>Estándar · {connected ? settings?.deliveryEstimate || 'Por confirmar' : '1–2 días de ejemplo'} · {money(shippingCents)}</Text><Text style={s.small}>Cobertura y envío definitivos deben confirmarse antes de cualquier cobro.</Text></>;
    footer = <Button title="Continuar" testID="pharmacy-address-next" disabled={!addressValid(address)} onPress={() => safeSetPage('review')} />;
  } else if (page === 'review') {
    title = connected ? 'Revisar solicitud' : 'Revisar y pagar';
    content = <><Action title={'Dirección: ' + address.street + ' · CP ' + address.postalCode} icon="location" onPress={() => safeSetPage('address')} />{connected && !settings?.ordersAvailable && <Text style={s.error}>Las solicitudes están temporalmente deshabilitadas.</Text>}<Text style={s.small}>Entrega: {connected ? settings?.deliveryEstimate || 'Por confirmar' : '1–2 días · ejemplo'}</Text><Action title={connected ? 'Pago: todavía no habilitado' : 'Pago de ejemplo: ' + (method === 'apple-pay' ? 'Apple Pay' : 'Tarjeta')} icon="card" onPress={() => setPaymentOpen(true)} /><Text style={s.heading}>{cart.length} productos</Text>{cart.map(line => cartRow(line))}{summary()}<Check text={connected ? 'Acepto las condiciones de la solicitud' : 'Acepto las condiciones de la demostración'} checked={terms} disabled={busy} onPress={() => setTerms(value => !value)} /><Action title="Ver condiciones" icon="document" onPress={() => setTermsOpen(true)} /><Text style={s.small}>{connected ? 'Enviar no realiza un cobro, reserva de existencias ni dispensación. Tu solicitud quedará pendiente.' : 'Simulación local: no se cobrará ni se enviará ningún producto.'}</Text></>;
    footer = <Button title={busy ? 'Guardando…' : connected ? session ? 'Enviar solicitud' : 'Iniciar sesión para solicitar' : 'Confirmar pedido de ejemplo'} testID="pharmacy-submit" disabled={busy || !!totalsError || !terms || !cart.length || (connected && !settings?.ordersAvailable)} onPress={submit} />;
  } else if (page === 'login') {
    title = 'Tu cuenta Klini';
    content = <><Text style={s.heading}>Inicia sesión como paciente</Text><Text style={s.body}>La sesión de farmacia se conserva solo mientras este flujo está abierto. No se guardan contraseñas ni tokens en el dispositivo.</Text><TextField label="Correo o usuario" value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username" /><TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" /></>;
    footer = <Button title={busy ? 'Iniciando…' : 'Iniciar sesión'} disabled={busy || !login.trim() || !password} onPress={() => void run(async () => { try { const authenticated = await loginPharmacy(login.trim(), password); if (!mounted.current) { void logoutPharmacy(authenticated.token).catch(() => undefined); return; } sessionToken.current = authenticated.token; setSession(authenticated); setPage(loginNext); setRemoteOrders(await loadPharmacyOrders(authenticated.token)); } finally { setPassword(''); } })} />;
  } else if ((page === 'success' || page === 'order' || page === 'help') && selectedOrder) {
    title = page === 'help' ? 'Ayuda con mi pedido' : page === 'success' ? 'Confirmación' : 'Tu pedido';
    const isDemo = 'mode' in selectedOrder;
    const cancelled = selectedOrder.status === 'cancelled';
    content = page === 'help' ? <><Text style={s.heading}>{selectedOrder.id}</Text><Text style={s.small}>{isDemo ? 'Pedido de demostración' : 'Solicitud enviada'}</Text><Action title="Consultar mi entrega" icon="location" onPress={() => setMessage(isDemo ? 'No existe una entrega real en el modo demostración.' : 'La entrega no está confirmada. Consulta al distribuidor cuando procese tu solicitud.')} /><Action title="Solicitar cancelación" icon="close" disabled={busy || cancelled} onPress={() => { if (isDemo) void run(async () => { await store.cancelPharmacyDemoOrderPersisted(selectedOrder.id); setSelectedOrder({ ...selectedOrder, status: 'cancelled' }); setMessage('Pedido de ejemplo cancelado.'); }); else setMessage('La cancelación conectada aún no está habilitada; no se ha enviado una solicitud de cancelación.'); }} /><Action title="Contactar soporte" icon="chat" onPress={() => setMessage('El canal de soporte de pedidos aún no está configurado. No se ha enviado ningún mensaje.')} /></> : <>
      {page === 'success' && <View style={s.confirmation}><Icon name="checkCircle" size={48} color={colors.tealDark} /><Text style={s.title}>{isDemo ? 'Pedido de ejemplo guardado' : 'Solicitud recibida'}</Text><Text style={s.small}>{isDemo ? 'Sin cobro ni envío real' : 'Pendiente de revisión · Sin cobro'}</Text></View>}
      <Text style={s.heading}>{selectedOrder.id}</Text><Text style={s.promotion}>{cancelled ? 'Cancelado' : isDemo ? 'Preparando · Demostración' : 'Solicitud ' + selectedOrder.status}</Text>
      {page === 'order' && <View style={s.tracking}>{['Recibido', 'En revisión', 'Entrega'].map((label, index) => <View style={s.trackingStep} key={label}><Icon name={index === 0 ? 'bag-outline' : index === 1 ? 'clock' : 'checkCircle'} color={index === 0 ? colors.tealDark : colors.muted} /><Text style={s.small}>{label}</Text></View>)}</View>}
      {selectedOrder.lines.map(line => cartRow(line))}{summary(selectedOrder.subtotalCents, selectedOrder.shippingCents, selectedOrder.totalCents)}
      <Text style={s.small}>{isDemo ? 'Los estados son ilustrativos. No hay un pedido comercial ni comprobante fiscal.' : 'Pago no configurado. Esta solicitud no reserva existencias ni confirma disponibilidad o dispensación.'}</Text>
      <Action title="Comprar de nuevo" icon="refresh" disabled={busy} onPress={() => void run(async () => { const currentOffers = products.flatMap(getPharmacyOffers); const next = selectedOrder.lines.map(line => { const current = currentOffers.find(item => item.id === line.product.id); if (!current || current.stock < line.quantity) throw new Error('Algún producto o distribuidor ya no está disponible. Revisa el catálogo.'); return { product: pharmacyOfferSnapshot(current), quantity: line.quantity }; }); await changeCart(next); setPage('cart'); })} />
      <Action title="Ayuda con mi pedido" icon="info" onPress={() => safeSetPage('help')} />
    </>;
    footer = <Button title={page === 'success' ? 'Ver pedido' : 'Volver a mis compras'} onPress={() => { if (page === 'success') { if (Date.now() - lastSubmittedAt.current < 600) return; safeSetPage('order'); } else { setTab('orders'); safeSetPage('catalog'); } }} />;
  } else if (page === 'program' && program) {
    title = 'Programa';
    content = <><Text style={s.title}>{program.name}</Text><Text style={s.small}>{program.laboratory}</Text><Text style={s.promotion}>{program.discountPercent}% en productos participantes</Text>{cards(DEMO_PRODUCTS.filter(item => program.productIds.includes(item.id)))}<Text style={s.heading}>Condiciones</Text><Text style={s.body}>{program.description}</Text><Text style={s.small}>{program.conditions}</Text><Text style={s.small}>Vigencia de ejemplo: {program.expiresAt}. Sujeto a validación; no acumulable.</Text><Check text="Acepto las condiciones del programa de demostración" checked={programConsent} onPress={() => setProgramConsent(value => !value)} /><Text style={s.small}>Sin cobros automáticos. No se envía información a un laboratorio.</Text></>;
    footer = <Button title="Solicitar inscripción de ejemplo" disabled={busy || !programConsent || pharmacy.programRequests.some(item => item.programId === program.id)} onPress={() => void run(async () => { await store.requestPharmacyProgramPersisted(program.id); setProgramTab('requests'); setTab('programs'); setPage('catalog'); })} />;
  } else content = <Empty title="Selecciona un producto" action="Volver al catálogo" onAction={() => safeSetPage('catalog')} />;
  const close = () => { if (!busyRef.current) { if (product) { setProduct(null); setError(''); return; } request.current?.abort(); clearAccount(); onClose(); } };
  const cartAction = <Pressable testID="pharmacy-cart" accessibilityRole="button" accessibilityLabel={'Carrito, ' + cart.reduce((sum, line) => sum + line.quantity, 0) + ' productos'} disabled={busy} onPress={() => safeSetPage('cart')} style={s.bag}><Icon name="bag-outline" color={colors.tealDark} size={21} /><Text style={s.badge}>{cart.reduce((sum, line) => sum + line.quantity, 0)}</Text></Pressable>;
  const overlay = product ? <PharmacySellerPopup key={product.id} product={product} cart={cart} thumbnail={<ProductPicture product={product} variant="thumbnail" />} busy={busy} error={error} onClose={() => { if (!busyRef.current) { setProduct(null); setError(''); } }} onAdd={offer => add(pharmacyOfferSnapshot(offer))} /> : (draftFilters || paymentOpen || termsOpen) ? <View style={s.overlay} accessibilityViewIsModal><Pressable testID={draftFilters ? 'pharmacy-filter-backdrop' : undefined} accessibilityRole="button" accessibilityLabel="Cerrar ventana emergente" style={StyleSheet.absoluteFill} onPress={() => { setDraftFilters(null); setPaymentOpen(false); setTermsOpen(false); }} /><View testID={draftFilters ? 'pharmacy-filter-popup' : undefined} style={[s.popup, !!draftFilters && s.filtersPopup]}>{draftFilters ? <ScrollView style={s.filtersScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.filtersContent}>
      <View style={s.filtersHeader}><Text accessibilityRole="header" style={s.filtersTitle}>Filtros</Text><Pressable testID="pharmacy-filter-close" accessibilityRole="button" accessibilityLabel="Cerrar ventana emergente" hitSlop={10} onPress={() => { setDraftFilters(null); setFilterField(null); }} style={s.filtersClose}><Icon name="close" color={colors.tealDark} size={20} /></Pressable></View>
      <View style={s.filtersFields}>
        {(['specialty', 'type', 'laboratory'] as const).map((key, index) => <View key={key}>
          <Text style={s.filtersLabel}>{['Especialidad', 'Tipo de producto', 'Laboratorio'][index]}</Text>
          <Pressable testID={'pharmacy-filter-field-' + key} accessibilityRole="button" accessibilityLabel={'Elegir ' + ['especialidad', 'tipo de producto', 'laboratorio'][index]} accessibilityState={{ expanded: filterField === key }} hitSlop={{ top: 4, bottom: 4 }} onPress={() => setFilterField(filterField === key ? null : key)} style={s.filtersSelect}>
            <Text style={[s.filtersValue, !!draftFilters[key] && s.filtersSelectedValue]}>{draftFilters[key] || 'Todos'}</Text><Icon name="chevronDown" size={16} color={colors.tealDark} />
          </Pressable>
          {filterField === key && <View style={[s.chips, s.filtersOptions]}>{['', ...Array.from(new Set(products.map(item => item[key])))].map(value => <Chip key={value} label={value || 'Todos'} selected={(draftFilters[key] ?? '') === value} onPress={() => { setDraftFilters({ ...draftFilters, [key]: value }); setFilterField(null); }} />)}</View>}
        </View>)}
      </View>
      <View style={s.filtersChecks}>
        {([{ key: 'promotionsOnly', text: 'Solo promociones' }, { key: 'programsOnly', text: 'Programas de apego' }] as const).map(({ key, text }) => <Pressable key={key} testID={'pharmacy-filter-' + key} accessibilityRole="checkbox" accessibilityLabel={text} accessibilityState={{ checked: !!draftFilters[key] }} onPress={() => setDraftFilters({ ...draftFilters, [key]: !draftFilters[key] })} style={s.filtersCheckRow}>
          <View style={[s.filtersCheckbox, !!draftFilters[key] && s.filtersCheckboxSelected]}>{draftFilters[key] && <Icon name="check" size={14} color="white" />}</View><Text style={s.filtersCheckText}>{text}</Text>
        </Pressable>)}
      </View>
      <View testID="pharmacy-filter-footer" style={s.filtersFooter}><Pressable testID="pharmacy-filter-clear" accessibilityRole="button" accessibilityLabel="Borrar filtros" onPress={() => { setDraftFilters({}); setFilterField(null); }} style={s.filtersClear}><Text style={s.filtersClearText}>Borrar filtros</Text></Pressable><Pressable testID="pharmacy-apply-filters" accessibilityRole="button" accessibilityLabel="Aplicar" onPress={() => { setFilters(draftFilters); setDraftFilters(null); setFilterField(null); }} style={({ pressed }) => [s.filtersApply, pressed && s.filtersApplyPressed]}><Text style={s.filtersApplyText}>Aplicar</Text></Pressable></View>
    </ScrollView> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 17 }}>
      <View style={s.between}><Text style={s.heading}>{paymentOpen ? 'Forma de pago' : 'Condiciones'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar ventana emergente" onPress={() => { setPaymentOpen(false); setTermsOpen(false); }}><Icon name="close" color={colors.tealDark} /></Pressable></View>
      {paymentOpen && <>{connected ? <Text style={s.body}>Los pagos todavía no están habilitados. Puedes enviar una solicitud sin cobro; no captures datos bancarios.</Text> : <><Check text="Apple Pay · ejemplo" checked={method === 'apple-pay'} onPress={() => setMethod('apple-pay')} /><Check text="Tarjeta · ejemplo" checked={method === 'card'} onPress={() => setMethod('card')} /><Text style={s.small}>Esta selección no abre Apple Pay ni captura una tarjeta.</Text></>}<Button title="Continuar" onPress={() => setPaymentOpen(false)} /></>}
      {termsOpen && <>{settings?.purchaseTermsUrl && <Action title="Leer términos de compra" icon="external" onPress={() => void run(async () => { await Linking.openURL(settings.purchaseTermsUrl!); })} />}<Text style={s.body}>{connected ? settings?.termsText || 'La solicitud requiere confirmación de disponibilidad, revisión de receta cuando corresponda y acuerdo de entrega. No se realiza un cobro ni reserva de stock.' : 'Este recorrido conserva datos ficticios en el dispositivo. No celebra una compra ni procesa pagos, envío de productos o revisión médica. No introduzcas datos personales o recetas reales.'}</Text><Button title="Cerrar condiciones" onPress={() => setTermsOpen(false)} /></>}
    </ScrollView>}</View></View> : undefined;
  return <PharmacyPopup title={title} contentKey={page + '-' + tab} onClose={close} onBack={back} canDismiss={() => !busyRef.current} footer={footer} headerAction={page === 'catalog' ? cartAction : undefined} overlay={overlay} notice={connected ? 'Conectado a Klini · Sin cobros automáticos' : 'Demostración · Sin compras ni cargos reales'}>
      {!!totalsError && <Text accessibilityRole="alert" style={s.error}>{totalsError}</Text>}
      {!!error && <Text accessibilityRole="alert" testID="pharmacy-error" style={s.error}>{error}</Text>}
      {!!message && <Text accessibilityRole="alert" style={s.message}>{message}</Text>}
      {!connected && !!store.storageError && <Text accessibilityRole="alert" style={s.error}>{store.storageError}</Text>}
      <View style={{ gap: 10 }}>{content}</View>
    </PharmacyPopup>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, body: { fontSize: 14, lineHeight: 21, color: colors.navy }, small: { fontSize: 11, lineHeight: 17, color: colors.muted, flexShrink: 1 }, title: { fontSize: 23, fontWeight: '700', lineHeight: 29, color: colors.navy }, heading: { fontSize: 16, fontWeight: '700', color: colors.navy }, label: { fontSize: 12, fontWeight: '600', color: colors.navy, marginBottom: 8 }, productName: { fontSize: 13, fontWeight: '600', lineHeight: 18, color: colors.navy }, price: { fontSize: 20, fontWeight: '700', color: colors.tealDark, marginTop: 5 }, heroPrice: { fontSize: 28, fontWeight: '700', color: colors.tealDark, marginTop: 8 }, oldPrice: { color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, tabs: { flexDirection: 'row', marginTop: 0, marginBottom: 2 }, tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' }, tabActive: { borderColor: colors.teal }, tabText: { fontSize: 12, color: colors.muted }, tabTextActive: { color: colors.navy, fontWeight: '600' },
  bag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 44, minHeight: 44 }, badge: { color: colors.tealDark, fontSize: 11, fontWeight: '700' }, searchRow: { flexDirection: 'row', gap: 8 }, search: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#EDF8F6', borderRadius: 22, paddingHorizontal: 12 }, searchInput: { flex: 1, minHeight: 40, color: colors.navy, fontSize: 13 }, filter: { backgroundColor: '#EDF8F6', padding: 9, borderRadius: 12 },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 5 }, buyAgain: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#EFF8F6' }, hero: { backgroundColor: '#F3FAF8', borderRadius: 17, padding: 14, marginVertical: 2 }, heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6 }, heroImage: { width: '42%', height: 150 }, heroAdd: { position: 'absolute', right: 14, bottom: 13 }, promotion: { alignSelf: 'flex-start', fontSize: 10, color: colors.tealDark, backgroundColor: '#E1F4EF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }, productCard: { width: '47%', marginBottom: 10 }, picture: { justifyContent: 'center', alignItems: 'center', width: '100%', overflow: 'hidden' }, pictureLarge: { marginVertical: 8 }, image: { width: '100%', height: '100%' }, picturePlaceholder: { alignItems: 'center', gap: 4 }, picturePlaceholderText: { fontSize: 10, lineHeight: 14, color: colors.muted },
  add: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealDark }, cartRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EDF1F3' }, thumbnail: { width: 55, height: 75, overflow: 'hidden', justifyContent: 'center' }, cartControls: { alignItems: 'flex-end', gap: 15 }, quantity: { borderRadius: 20, backgroundColor: '#EBF7F4', flexDirection: 'row', alignItems: 'center' }, quantityButton: { padding: 8 }, action: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#EFF3F5', paddingVertical: 10 }, actionText: { flex: 1, fontSize: 12, color: colors.navy }, summary: { gap: 13, paddingTop: 15 }, total: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 14 }, footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, programCard: { padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 16, gap: 9 }, orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, borderBottomWidth: 1, borderColor: colors.line }, confirmation: { alignItems: 'center', gap: 15, paddingVertical: 20 }, tracking: { flexDirection: 'row', paddingVertical: 18, backgroundColor: '#F8FBFB', borderRadius: 15 }, trackingStep: { flex: 1, alignItems: 'center', gap: 9 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,36,65,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }, popup: { width: '100%', maxWidth: 420, padding: 22, gap: 17, backgroundColor: 'white', borderRadius: 20, maxHeight: '90%' }, error: { color: '#A22F41', backgroundColor: '#FFF0F2', padding: 12, borderRadius: 10, fontSize: 12 }, message: { color: colors.tealDark, backgroundColor: '#E7F8F2', padding: 12, borderRadius: 10, fontSize: 12 }, link: { color: colors.tealDark, fontSize: 12 }, disabled: { opacity: 0.4 },
  filtersPopup: { maxWidth: 342, padding: 0, gap: 0, maxHeight: '94%', overflow: 'hidden' }, filtersScroll: { flexShrink: 1 }, filtersContent: { padding: 20, paddingBottom: 24 },
  filtersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24, marginBottom: 16 }, filtersTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.navy }, filtersClose: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  filtersFields: { gap: 19 }, filtersLabel: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: colors.navy, marginBottom: 3 }, filtersSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 37, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ECF8F6' }, filtersValue: { flex: 1, fontSize: 11, lineHeight: 17, color: colors.muted }, filtersSelectedValue: { color: colors.navy }, filtersOptions: { marginTop: 10 },
  filtersChecks: { marginTop: 11, gap: 7 }, filtersCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }, filtersCheckbox: { width: 18, height: 18, borderRadius: 1, borderWidth: 1, borderColor: colors.tealDark, alignItems: 'center', justifyContent: 'center' }, filtersCheckboxSelected: { backgroundColor: colors.tealDark }, filtersCheckText: { flexShrink: 1, fontSize: 11, lineHeight: 17, color: colors.muted },
  filtersFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 14 }, filtersClear: { minHeight: 44, justifyContent: 'center' }, filtersClearText: { fontSize: 11, lineHeight: 17, color: colors.tealDark }, filtersApply: { minWidth: 76, minHeight: 44, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, backgroundColor: '#007D78', alignItems: 'center', justifyContent: 'center' }, filtersApplyPressed: { opacity: 0.75 }, filtersApplyText: { fontSize: 12, lineHeight: 20, fontWeight: '600', color: 'white' },
});

/** A single transparent route above Home. Never redraw or replace its header. */
function PharmacyPopup({ title, contentKey, onClose, onBack, canDismiss, footer, headerAction, overlay, notice, children }: PropsWithChildren<{
  title: string;
  contentKey: string;
  onClose: () => void;
  onBack: () => void;
  canDismiss: () => boolean;
  footer?: ReactNode;
  headerAction?: ReactNode;
  overlay?: ReactNode;
  notice: string;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const alreadyOpen = usePopupAlreadyOpen();
  const [progress] = useState(() => new Animated.Value(alreadyOpen ? 1 : 0));
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!active) return;
      setReduced(value);
      Animated.timing(progress, { toValue: 1, duration: value || alreadyOpen ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); progress.stopAnimation(); };
  }, [alreadyOpen, progress]);
  const close = () => {
    if (!canDismiss()) return;
    Animated.timing(progress, { toValue: 0, duration: reduced ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => { if (finished) onClose(); });
  };
  return <View style={popupStyles.root}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,36,65,.08)', opacity: progress }]} />
    <Pressable testID="pharmacy-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar farmacia" onPress={() => overlay ? onBack() : close()} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView pointerEvents="box-none" style={[popupStyles.position, { paddingTop: insets.top + 68 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View testID="pharmacy-popup" accessibilityViewIsModal style={[popupStyles.panel, { paddingBottom: Math.max(insets.bottom, 10), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
        <View style={popupStyles.handle} />
        <View style={popupStyles.controls} pointerEvents={overlay ? 'none' : 'auto'} aria-hidden={!!overlay} accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay ? 'no-hide-descendants' : 'auto'}>
          <Pressable testID="pharmacy-back" accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={popupStyles.iconButton}><Icon name="back" size={23} /></Pressable>
          <Text accessibilityRole="header" style={popupStyles.title}>{title}</Text>
          {headerAction}
          <Pressable testID="pharmacy-close" accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} style={popupStyles.iconButton}><Icon name="close" size={23} /></Pressable>
        </View>
        <ScrollView key={contentKey} testID="pharmacy-content" style={popupStyles.scroll} contentContainerStyle={popupStyles.content} keyboardShouldPersistTaps="handled" pointerEvents={overlay ? 'none' : 'auto'} aria-hidden={!!overlay} accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay ? 'no-hide-descendants' : 'auto'}>{children}</ScrollView>
        <View style={popupStyles.footer} pointerEvents={overlay ? 'none' : 'auto'} aria-hidden={!!overlay} accessibilityElementsHidden={!!overlay} importantForAccessibility={overlay ? 'no-hide-descendants' : 'auto'}>
          {footer}
          <Text style={popupStyles.notice}>{notice}</Text>
        </View>
        {overlay}
      </Animated.View>
    </KeyboardAvoidingView>
  </View>;
}
const popupStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  position: { flex: 1 },
  panel: { flex: 1, minHeight: 0, width: '100%', maxWidth: 540, alignSelf: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0, borderColor: '#E2EAEF' },
  handle: { width: 38, height: 4, borderRadius: 3, backgroundColor: '#CAD5DA', alignSelf: 'center', marginTop: 9, marginBottom: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, minHeight: 44 },
  iconButton: { minWidth: 40, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 5 },
  notice: { fontSize: 9, lineHeight: 13, textAlign: 'center', color: colors.muted, marginTop: 4 },
});
