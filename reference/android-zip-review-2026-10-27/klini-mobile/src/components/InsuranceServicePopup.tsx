import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClinicalRecord, Doctor, Policy } from '../domain/types';
import { insuranceExpiryLabel, insurancePlanName, insuranceStatus, maskedPolicyNumber } from '../domain/insurancePresentation';
import { downloadInsuranceDocument } from '../services/insuranceDocuments';
import { colors, Icon } from './ui';

export type InsuranceServiceKind = 'credential' | 'coverage' | 'network' | 'documents';
type DownloadKind = 'credential' | 'policy' | 'conditions' | 'receipts';
type NetworkItem = { id: string; name: string; subtitle: string; description: string; icon: string };
type Detail = { title: string; subtitle?: string; description: string; icon: string; anchor?: LayoutRectangle };
const TITLES: Record<InsuranceServiceKind, string> = { credential: 'Credencial', coverage: 'Coberturas', network: 'Red médica', documents: 'Documentos' };
const COVERAGES = [
  { key: 'hospitalization', title: 'Hospitalización', icon: 'bed-outline', description: 'La atención hospitalaria, sus límites y los requisitos de autorización dependen de las condiciones particulares de tu póliza.' },
  { key: 'emergencies', title: 'Urgencias', icon: 'pulse-outline', description: 'Los servicios de urgencias y su forma de atención deben consultarse en la póliza y confirmarse directamente con la aseguradora.' },
  { key: 'consultations', title: 'Consultas médicas', icon: 'medkit-outline', description: 'La disponibilidad de consultas, copagos y prestadores depende de la póliza contratada y de la confirmación de la aseguradora.' },
] as const;
const DOCUMENTS: { key: DownloadKind; title: string }[] = [
  { key: 'policy', title: 'Póliza' }, { key: 'conditions', title: 'Condiciones generales' }, { key: 'receipts', title: 'Recibos' },
];
const HOSPITALS: NetworkItem[] = [
  { id: 'hospital-example', name: 'Hospital de ejemplo', subtitle: 'Ubicación por confirmar', icon: 'business-outline', description: 'Institución ficticia para explorar la demostración. Consulta con tu aseguradora los hospitales disponibles para tu póliza antes de solicitar atención.' },
  { id: 'clinic-example', name: 'Clínica de ejemplo', subtitle: 'Ubicación por confirmar', icon: 'business-outline', description: 'Clínica ficticia para explorar la demostración. La ubicación, los servicios y la pertenencia a una red requieren confirmación con la aseguradora.' },
];
const searchKey = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function InsuranceServicePopup({ kind, policy, doctors, records, onClose, onOpenRecord, onAttachDocument }: {
  kind: InsuranceServiceKind;
  policy: Policy;
  doctors: Doctor[];
  records: ClinicalRecord[];
  onClose: () => void;
  onOpenRecord: (record: ClinicalRecord) => Promise<void>;
  onAttachDocument: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [networkTab, setNetworkTab] = useState<'hospitals' | 'doctors'>('hospitals');
  const [networkAnchor, setNetworkAnchor] = useState<LayoutRectangle | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const cardFrame = useRef<LayoutRectangle | null>(null);
  const insets = useSafeAreaInsets();
  const working = useRef(false);
  const mounted = useRef(true);
  const dismiss = useCallback(() => { if (detail) setDetail(null); else onClose(); }, [detail, onClose]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(); return true; });
    if (Platform.OS === 'web') {
      const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } };
      window.addEventListener('keydown', escape);
      return () => { subscription.remove(); window.removeEventListener('keydown', escape); };
    }
    return () => subscription.remove();
  }, [dismiss]);

  async function perform(key: string, action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(key); setError('');
    try { await action(); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir el documento. Intenta de nuevo.'); }
    finally { working.current = false; if (mounted.current) setBusy(''); }
  }
  const download = (document: DownloadKind) => perform(document, () => downloadInsuranceDocument(policy, document));
  const status = insuranceStatus(policy);
  const networkItems: NetworkItem[] = networkTab === 'hospitals' ? HOSPITALS : doctors.map(doctor => ({
    id: doctor.id, name: doctor.name, subtitle: doctor.specialty, icon: 'medkit-outline',
    description: `${doctor.city}\n${doctor.address}\n\nPerfil ficticio de la demostración. La participación de este profesional en tu red médica requiere confirmación con tu aseguradora.`,
  }));
  const visibleItems = networkItems.filter(item => searchKey(`${item.name} ${item.subtitle}`).includes(searchKey(query.trim())));

  function openDetail(next: Omit<Detail, 'anchor'>) {
    // Preserve the visible frame before replacing a list with its conditions.
    // Doctor details inherit the expanded network frame as well.
    const anchor = kind === 'coverage' && cardFrame.current ? { ...cardFrame.current }
      : kind === 'network' && networkTab === 'doctors' && networkAnchor ? { ...networkAnchor } : undefined;
    setDetail({ ...next, anchor });
  }
  function changeNetworkTab(tab: 'hospitals' | 'doctors') {
    if (tab === 'doctors' && networkTab !== 'doctors' && cardFrame.current) setNetworkAnchor({ ...cardFrame.current });
    if (tab === 'hospitals') setNetworkAnchor(null);
    setNetworkTab(tab);
    setQuery('');
  }
  const anchor = detail?.anchor ?? (kind === 'network' && networkTab === 'doctors' ? networkAnchor : undefined);
  const safeBottom = Math.max(insets.bottom, 12);
  const safeTop = Math.max(insets.top, 12);
  const safeLeft = Math.max(insets.left, 12);
  const safeRight = Math.max(insets.right, 12);
  const availableWidth = Math.max(0, overlaySize.width - safeLeft - safeRight);
  const detailWidth = anchor ? Math.min(anchor.width, availableWidth) : 0;
  // Only move the captured top when a smaller viewport would hide the fixed
  // controls. The inner layout surface also shrinks with the iOS keyboard.
  const minimumHeight = Math.min(140, Math.max(0, overlaySize.height - safeTop - safeBottom));
  const detailTop = anchor ? Math.max(safeTop, Math.min(anchor.y, overlaySize.height - safeBottom - minimumHeight)) : 0;
  const detailLeft = anchor ? Math.max(safeLeft, Math.min(anchor.x, overlaySize.width - safeRight - detailWidth)) : 0;
  const anchoredStyle = anchor && overlaySize.height > 0 ? {
    top: detailTop,
    left: detailLeft,
    width: detailWidth,
    height: Math.max(0, overlaySize.height - safeBottom - detailTop),
  } : null;

  function downloadButton(document: DownloadKind, title = 'Descargar') {
    return <Pressable testID={`insurance-download-${document}`} accessibilityRole="button" accessibilityLabel={`${title} ${document === 'credential' ? 'credencial de ejemplo' : 'documento de ejemplo'}`} accessibilityState={{ disabled: !!busy, busy: busy === document }} disabled={!!busy} onPress={() => void download(document)} style={[s.pill, !!busy && s.disabled]}>
      {busy === document ? <ActivityIndicator size="small" color={colors.tealDark} /> : <Icon name="download" size={17} color={colors.teal} />}
      <Text style={s.pillText}>{busy === document ? 'Preparando…' : title}</Text>
    </Pressable>;
  }

  return <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.layoutSurface} onLayout={({ nativeEvent: { layout } }) => setOverlaySize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar ventana del seguro" onPress={dismiss} />
    <View testID="insurance-popup" role="dialog" accessibilityLabel={detail?.title || TITLES[kind]} accessibilityViewIsModal onLayout={({ nativeEvent: { layout } }) => { if (!detail) cardFrame.current = { ...layout }; }} style={[s.card, anchoredStyle && s.anchoredCard, anchoredStyle]}>
      <View style={s.header}>
        {detail && <Pressable testID="insurance-popup-back" accessibilityRole="button" accessibilityLabel="Volver al servicio del seguro" onPress={() => setDetail(null)} style={s.detailBack}><Icon name="back" size={20} /></Pressable>}
        <Text style={s.title}>{detail?.title || TITLES[kind]}</Text>
        <Pressable testID="insurance-popup-close" accessibilityRole="button" accessibilityLabel={detail ? 'Volver al servicio del seguro' : 'Cerrar ventana del seguro'} onPress={dismiss} style={s.close}><Icon name="close" size={21} /></Pressable>
      </View>
      <ScrollView key={detail ? `detail-${detail.title}` : kind === 'network' ? `${kind}-${networkTab}` : kind} testID="insurance-popup-scroll" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator persistentScrollbar={!!anchoredStyle} style={[s.scroll, anchoredStyle && s.anchoredScroll]} contentContainerStyle={s.content}>
        {detail ? <View testID="insurance-service-detail">
          <View style={s.detailHeading}><View style={s.miniTile}><Icon name={detail.icon} size={25} color={colors.teal} /></View><Text style={s.detailSubtitle}>{detail.subtitle || 'Información de ejemplo'}</Text></View>
          <Text style={s.detailDescription}>{detail.description}</Text>
        </View> : <>
          {kind === 'credential' && <>
            <View style={s.credential} testID="insurance-credential-card">
              <View style={s.credentialHeading}><Icon name="shield-outline" size={34} color={colors.teal} /><View style={s.flex}><Text style={s.planName}>{insurancePlanName(policy)}</Text><Text style={s.subtitle}>{policy.insurer}</Text></View></View>
              <View style={s.credentialDivider} />
              <View style={s.holderRow}><Text style={[s.holder, s.flex]}>{policy.holder}</Text><View style={s.status}><View style={[s.dot, status !== 'Vigente' && s.inactiveDot]} /><Text style={[s.statusText, status !== 'Vigente' && s.inactiveStatus]}>{status}</Text></View></View>
              <Text style={s.cardDetail}>Póliza {maskedPolicyNumber(policy)}</Text>
              <Text style={s.cardDetail}>Vigencia: {insuranceExpiryLabel(policy)}</Text>
            </View>
            <View style={s.centerAction}>{downloadButton('credential')}</View>
          </>}
          {kind === 'coverage' && <>
            {COVERAGES.map(coverage => <Pressable key={coverage.key} testID={`insurance-coverage-${coverage.key}`} accessibilityRole="button" accessibilityLabel={`Ver condiciones de ${coverage.title}`} onPress={() => openDetail({ title: coverage.title, icon: coverage.icon, description: `${policy.coverage}\n\n${coverage.description}\n\nInformación de ejemplo; no es una autorización de cobertura.` })} style={s.coverageRow}>
              <Icon name={coverage.icon} size={27} color={colors.teal} /><Text style={[s.rowTitle, s.flex]}>{coverage.title}</Text><Text style={s.conditionsLink}>Ver condiciones</Text><Icon name="chevronRight" size={16} color={colors.teal} />
            </Pressable>)}
            <Text style={s.limitText}>Alcance y límites según tu póliza.</Text>
          </>}
          {kind === 'network' && <>
            <View style={s.search}><Icon name="search" size={19} color={colors.teal} /><TextInput testID="insurance-network-search" accessibilityLabel="Buscar hospital o médico" placeholder="Buscar hospital o médico" placeholderTextColor="#7E98A9" value={query} onChangeText={setQuery} style={s.searchInput} maxLength={120} autoCorrect={false} /></View>
            <View style={s.tabs} accessibilityRole="tablist">
              {(['hospitals', 'doctors'] as const).map(tab => <Pressable key={tab} testID={`insurance-network-${tab}`} accessibilityRole="tab" accessibilityState={{ selected: networkTab === tab }} onPress={() => changeNetworkTab(tab)} style={[s.tab, networkTab === tab && s.selectedTab]}><Text style={[s.tabText, networkTab === tab && s.selectedTabText]}>{tab === 'hospitals' ? 'Hospitales' : 'Médicos'}</Text></Pressable>)}
            </View>
            {visibleItems.map(item => <Pressable key={item.id} testID={`insurance-network-item-${item.id}`} accessibilityRole="button" accessibilityLabel={`Ver ${item.name}`} onPress={() => openDetail({ title: item.name, subtitle: item.subtitle, description: item.description, icon: item.icon })} style={s.networkRow}><View style={s.miniTile}><Icon name={item.icon} size={25} color={colors.teal} /></View><View style={s.flex}><Text style={s.rowTitle}>{item.name}</Text><Text style={s.subtitle}>{item.subtitle}</Text></View><Icon name="chevronRight" size={18} color={colors.navy} /></Pressable>)}
            {!visibleItems.length && <Text style={s.empty}>No se encontraron {networkTab === 'hospitals' ? 'hospitales' : 'médicos'}.</Text>}
          </>}
          {kind === 'documents' && <>
            {DOCUMENTS.map(document => <Pressable key={document.key} testID={`insurance-download-${document.key}`} accessibilityRole="button" accessibilityLabel={`Descargar ${document.title}, PDF de ejemplo`} accessibilityState={{ disabled: !!busy, busy: busy === document.key }} disabled={!!busy} onPress={() => void download(document.key)} style={[s.documentRow, !!busy && s.disabled]}>
              <Icon name="document-text-outline" size={28} color={colors.teal} /><View style={s.flex}><Text style={s.rowTitle}>{document.title}</Text><Text style={s.subtitle}>PDF · Archivo de ejemplo</Text></View>{busy === document.key ? <ActivityIndicator size="small" color={colors.teal} /> : <Icon name="download" size={20} color={colors.teal} />}
            </Pressable>)}
            {!!records.length && <Text style={s.savedLabel}>Tus documentos adjuntos</Text>}
            {records.map(record => <Pressable key={record.id} testID={`insurance-record-${record.id}`} accessibilityRole="button" accessibilityLabel={`Abrir ${record.title}`} accessibilityState={{ disabled: !!busy, busy: busy === record.id }} disabled={!!busy} onPress={() => void perform(record.id, () => onOpenRecord(record))} style={[s.documentRow, !!busy && s.disabled]}><Icon name="attachment" size={25} color={colors.teal} /><View style={s.flex}><Text style={s.rowTitle}>{record.title}</Text><Text style={s.subtitle}>{record.attachment?.name || 'Documento adjunto'}</Text></View>{busy === record.id ? <ActivityIndicator size="small" color={colors.teal} /> : <Icon name="download" size={20} color={colors.teal} />}</Pressable>)}
            <Pressable testID="insurance-documents-attach" accessibilityRole="button" accessibilityLabel="Adjuntar documento a la póliza" accessibilityState={{ disabled: !!busy, busy: busy === 'attach' }} disabled={!!busy} onPress={() => void perform('attach', onAttachDocument)} style={[s.attach, !!busy && s.disabled]}>{busy === 'attach' ? <ActivityIndicator size="small" color={colors.teal} /> : <Icon name="plus" size={18} color={colors.teal} />}<Text style={s.attachText}>{busy === 'attach' ? 'Adjuntando…' : 'Adjuntar documento'}</Text></Pressable>
          </>}
        </>}
        {!!error && <Text testID="insurance-popup-error" accessibilityRole="alert" style={s.error}>{error}</Text>}
      </ScrollView>
      <Text style={s.demo}>Datos de ejemplo</Text>
    </View>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,28,45,.43)' },
  layoutSurface: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  card: { width: '100%', maxWidth: 350, maxHeight: '85%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, boxShadow: '0 12px 35px rgba(8,36,65,.14)' },
  anchoredCard: { position: 'absolute', maxWidth: undefined, maxHeight: undefined },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  title: { flex: 1, color: colors.navy, fontSize: 21, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E4F5F5' },
  detailBack: { minWidth: 30, height: 34, justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  anchoredScroll: { flex: 1, minHeight: 0 },
  content: { paddingBottom: 2 },
  flex: { flex: 1, minWidth: 0 },
  credential: { borderRadius: 13, backgroundColor: '#EDF8F8', padding: 15 },
  credentialHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planName: { color: colors.navy, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  subtitle: { color: '#8296AA', fontSize: 11, lineHeight: 17, marginTop: 1 },
  credentialDivider: { height: 1, backgroundColor: '#D9ECEF', marginVertical: 12 },
  holderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  holder: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal },
  statusText: { color: colors.tealDark, fontSize: 10 },
  inactiveDot: { backgroundColor: colors.muted },
  inactiveStatus: { color: colors.muted },
  cardDetail: { color: '#748BA1', fontSize: 11, lineHeight: 19 },
  centerAction: { alignItems: 'center', marginTop: 15 },
  pill: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, minHeight: 32, borderRadius: 20, backgroundColor: '#DFF4F3', paddingHorizontal: 18, paddingVertical: 5, alignSelf: 'center' },
  pillText: { color: colors.tealDark, fontSize: 11, lineHeight: 18, fontWeight: '500' },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 53, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDF3F5' },
  rowTitle: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.navy },
  conditionsLink: { fontSize: 9, lineHeight: 14, color: '#8796A6' },
  limitText: { color: '#8296AA', fontSize: 10, lineHeight: 16, marginTop: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAF7F7', minHeight: 34, paddingHorizontal: 12, borderRadius: 19, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 7, color: colors.navy, fontSize: 12 },
  tabs: { flexDirection: 'row', borderRadius: 20, backgroundColor: '#E9F0F6', marginBottom: 12, padding: 2 },
  tab: { minHeight: 32, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  selectedTab: { backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(8,36,65,.10)' },
  tabText: { color: '#6684A3', fontSize: 12 },
  selectedTabText: { color: colors.navy, fontWeight: '600' },
  networkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EDF3F5', minHeight: 65 },
  miniTile: { width: 42, height: 42, borderRadius: 11, backgroundColor: '#EFF9F8', alignItems: 'center', justifyContent: 'center' },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minHeight: 60, borderBottomWidth: 1, borderBottomColor: '#EAF2F4' },
  savedLabel: { fontSize: 11, color: colors.muted, marginTop: 16, marginBottom: 2 },
  attach: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, marginTop: 7 },
  attachText: { color: colors.tealDark, fontSize: 11 },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  detailSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  detailDescription: { color: colors.navy, fontSize: 13, lineHeight: 21 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 18, textAlign: 'center' },
  demo: { fontSize: 9, color: '#92A3B4', textAlign: 'center', marginTop: 13 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  disabled: { opacity: .5 },
});
