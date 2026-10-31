import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import InsurancePanel from '../components/InsurancePanel';
import InsuranceServicePopup from '../components/InsuranceServicePopup';
import BookingFooterButton from '../components/BookingFooterButton';
import { colors, Icon } from '../components/ui';
import { insuranceExpiryLabel, insurancePlanName, insuranceStatus, maskedPolicyNumber } from '../domain/insurancePresentation';
import { todayISO } from '../domain/dates';
import type { ClinicalRecord, Policy } from '../domain/types';
import { openAttachment, pickAttachment } from '../services/files';
import { useAppStore } from '../state/store';
import InsuranceManagementScreen from './InsuranceManagementScreen';
import InsuranceEnrollmentScreen from './InsuranceEnrollmentScreen';

type Page = 'home' | 'policies' | 'summary' | 'add' | 'manage' | 'explore';
type Service = 'credential' | 'coverage' | 'network' | 'documents';
const services: { key: Service; title: string; icon: string }[] = [
  { key: 'credential', title: 'Credencial', icon: 'id-card-outline' },
  { key: 'coverage', title: 'Coberturas', icon: 'shield-outline' },
  { key: 'network', title: 'Red médica', icon: 'business-outline' },
  { key: 'documents', title: 'Documentos', icon: 'file' },
];

function PolicyStatus({ policy }: { policy: Policy }) {
  const status = insuranceStatus(policy);
  return <View style={s.status}><View style={[s.dot, status !== 'Vigente' && { backgroundColor: colors.muted }]} /><Text style={[s.statusText, status !== 'Vigente' && { color: colors.muted }]}>{status}</Text></View>;
}

export default function InsuranceScreen({ onClose }: { onClose: () => void }) {
  const { state, storageError, addRecord } = useAppStore();
  const [page, setPage] = useState<Page>('home');
  const [selectedId, setSelectedId] = useState(state.policies[0]?.id ?? '');
  const [service, setService] = useState<Service | null>(null);
  const policy = state.policies.find(item => item.id === selectedId) ?? state.policies[0];
  const records = policy ? state.records.filter(record => record.title === `Póliza · ${policy.insurer} · ${policy.number}` && record.attachment) : [];
  const title = page === 'policies' ? 'Tus seguros' : page === 'explore' ? 'Contratar un seguro nuevo' : 'Mi seguro';

  function back() {
    if (page === 'home') onClose();
    else setPage(page === 'summary' ? 'policies' : 'home');
  }
  async function attachDocument() {
    if (!policy) return;
    const attachment = await pickAttachment();
    if (!attachment) return;
    addRecord({ type: 'Nota', title: `Póliza · ${policy.insurer} · ${policy.number}`, date: todayISO(), doctorName: policy.insurer, description: `Documento administrativo de la póliza. Titular: ${policy.holder}.`, attachment });
  }
  async function openRecord(record: ClinicalRecord) {
    if (!record.attachment) throw new Error('Este registro no tiene un documento adjunto.');
    await openAttachment(record.attachment);
  }

  if (page === 'add' || page === 'manage') return <InsuranceManagementScreen
    key={page}
    initialCreate={page === 'add'}
    initialPolicyId={page === 'manage' ? policy?.id : undefined}
    onClose={() => setPage(page === 'add' ? 'policies' : 'summary')}
    onPolicySaved={id => { setSelectedId(id); setPage('summary'); }}
  />;

  if (page === 'explore') return <InsuranceEnrollmentScreen onClose={onClose} onBack={() => setPage('home')} />;


  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} pointerEvents={service ? 'none' : 'auto'} accessibilityElementsHidden={!!service} importantForAccessibility={service ? 'no-hide-descendants' : 'auto'}>
      <InsurancePanel title={title} onClose={onClose} onBack={back}>
        {!!storageError && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
        {page === 'home' && <>
          <Text style={s.question}>¿Qué deseas hacer?</Text>
          <Pressable testID="insurance-view-my" accessibilityRole="button" onPress={() => setPage('policies')} style={s.menuRow}>
            <Icon name="shield-outline" size={32} color={colors.teal} />
            <View style={s.flex}><Text style={s.menuTitle}>Ver mi seguro</Text><Text style={s.secondary}>Póliza y servicios</Text></View>
            <Icon name="chevronRight" size={20} color={colors.muted} />
          </Pressable>
          <Pressable testID="insurance-new" accessibilityRole="button" onPress={() => setPage('explore')} style={s.menuRow}>
            <Icon name="shield-outline" size={32} color={colors.teal} />
            <View style={s.flex}><Text style={s.menuTitle}>Contratar un seguro nuevo</Text><Text style={s.secondary}>Explorar opciones</Text></View>
            <Icon name="chevronRight" size={20} color={colors.muted} />
          </Pressable>
          {policy ? <View style={s.current}><Text style={s.currentText}>{insurancePlanName(policy)} · Póliza {maskedPolicyNumber(policy)}</Text><PolicyStatus policy={policy} /></View> : <Text style={s.secondary}>Todavía no tienes pólizas registradas.</Text>}
        </>}

        {page === 'policies' && <>
          <Text style={s.subtitle}>Elige la póliza que deseas consultar.</Text>
          {state.policies.map(item => <Pressable key={item.id} testID={`insurance-select-${item.id}`} accessibilityRole="button" accessibilityLabel={`Ver seguro ${insurancePlanName(item)}, póliza ${maskedPolicyNumber(item)}`} onPress={() => { setSelectedId(item.id); setPage('summary'); }} style={({ pressed }) => [s.menuRow, pressed && s.policyPressed]}>
            <Icon name="shield-outline" size={30} color={colors.teal} />
            <View style={s.flex}><Text style={s.menuTitle}>{insurancePlanName(item)}</Text><Text style={s.secondary}>{item.insurer}</Text><Text style={s.small}>Póliza {maskedPolicyNumber(item)}</Text></View>
            {insuranceStatus(item) === 'Vigente' && <Text style={s.statusBadge}>Vigente</Text>}
            <Icon name="chevronRight" size={20} color={colors.muted} />
          </Pressable>)}
          {!state.policies.length && <Text style={s.secondary}>Agrega una póliza para consultar tu seguro.</Text>}
          <Pressable testID="insurance-add-policy" accessibilityRole="button" onPress={() => setPage('add')} style={s.textButton}><Icon name="plus" size={19} color={colors.tealDark} /><Text style={s.link}>Agregar póliza</Text></Pressable>
        </>}

        {page === 'summary' && (policy ? <>
          <View style={s.policyHeading}><Icon name="shield-outline" size={34} color={colors.teal} /><View style={s.flex}><Text style={s.planName}>{insurancePlanName(policy)}</Text><Text style={s.secondary}>{policy.insurer}</Text></View></View>
          <View style={s.policyCard} testID="insurance-summary-card">
            <View style={s.holderRow}><Text style={s.holder}>{policy.holder}</Text><PolicyStatus policy={policy} /></View>
            <Text style={s.secondary}>Póliza {maskedPolicyNumber(policy)}</Text>
            <Text style={s.secondary}>Vigencia: {insuranceExpiryLabel(policy)}</Text>
          </View>
          <View style={s.services}>
            {services.map(item => <Pressable key={item.key} testID={`insurance-service-${item.key}`} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => setService(item.key)} style={s.service}>
              <View style={s.serviceIcon}><Icon name={item.icon} size={27} color={colors.teal} /></View><Text style={s.serviceLabel}>{item.title}</Text>
            </Pressable>)}
          </View>
          <Pressable testID="insurance-change-policy" accessibilityRole="button" onPress={() => setPage('policies')} style={s.change}><Text style={s.link}>Cambiar seguro</Text></Pressable>
          <Pressable testID="insurance-manage" accessibilityRole="button" onPress={() => setPage('manage')} style={s.manage}><Text style={s.small}>Administrar póliza y gastos</Text></Pressable>
        </> : <>
          <Text style={s.subtitle}>No hay pólizas registradas.</Text>
          <BookingFooterButton title="Agregar póliza" icon="plus" onPress={() => setPage('add')} />
        </>)}


      </InsurancePanel>
    </View>
    {service && policy && <InsuranceServicePopup key={`${policy.id}-${service}`} kind={service} policy={policy} doctors={state.doctors} records={records} onClose={() => setService(null)} onOpenRecord={openRecord} onAttachDocument={attachDocument} />}
  </View>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  error: { color: colors.danger, fontSize: 12, marginBottom: 12 },
  question: { color: colors.navy, fontSize: 16, marginBottom: 12 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  policyPressed: { backgroundColor: '#F2FAF9', opacity: .8 },
  menuTitle: { fontSize: 14, fontWeight: '600', color: colors.navy, lineHeight: 20 },
  secondary: { fontSize: 12, color: colors.muted, lineHeight: 19 },
  small: { fontSize: 10, color: '#8497AA', lineHeight: 17 },
  current: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between', paddingTop: 15 },
  currentText: { color: colors.navy, fontSize: 11, flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal },
  statusText: { fontSize: 10, color: colors.tealDark },
  statusBadge: { color: colors.tealDark, backgroundColor: '#E0F7F6', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 15, fontSize: 9 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 15 },
  link: { color: colors.tealDark, fontSize: 12 },
  policyHeading: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 4, marginBottom: 20 },
  planName: { color: colors.navy, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  policyCard: { backgroundColor: '#EDF8F8', padding: 15, borderRadius: 13, gap: 2, marginBottom: 16 },
  holderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  holder: { color: colors.navy, fontSize: 13, fontWeight: '600', flex: 1 },
  services: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 3 },
  service: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 8 },
  serviceIcon: { width: 54, height: 50, borderRadius: 13, backgroundColor: '#EFF9F9', alignItems: 'center', justifyContent: 'center' },
  serviceLabel: { color: '#476987', fontSize: 10, textAlign: 'center' },
  change: { alignSelf: 'center', padding: 15, marginTop: 12 },
  manage: { alignSelf: 'center', padding: 12 },
});
