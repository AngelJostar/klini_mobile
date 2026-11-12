import React from 'react';
import { PopupTransitionProvider } from '../components/PopupTransition';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Button, colors, Icon, Sheet } from '../components/ui';
import { menuItems, professionalMenuItems } from '../domain/navigation';
import { useAppStore } from '../state/store';
import DirectoryFlow from '../screens/DirectoryFlow';
import AgendaScreen from '../screens/AgendaScreen';
import TeleconsultScreen from '../screens/TeleconsultScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import BodyParametersScreen from '../screens/BodyParametersScreen';
import ProfileScreen from '../screens/SocialProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import AlertsScreen from '../screens/AlertsScreen';
import PharmacyScreen from '../screens/PharmacyScreen';
import MedicationsScreen from '../screens/MedicationsScreen';

export default function SectionRoute() {
  return <PopupTransitionProvider><SectionContent /></PopupTransitionProvider>;
}

function SectionContent() {
  const { professionalProfile } = useAppStore();
  const params = useLocalSearchParams<{
    section: string;
    doctorId?: string;
    mode?: string;
    rescheduleId?: string;
    appointmentId?: string;
    recordType?: string;
    archiveTab?: string;
    archiveTitle?: string;
    treatmentId?: string;
    medicationId?: string;
    activateAlert?: string;
  }>();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const profileSelected = () => router.dismissTo({
    pathname: '/',
    params: { home: 'today', profileSelection: String(Date.now()) },
  });
  const go = (section: string, extra: Record<string, string> = {}) =>
    router.replace({ pathname: '/[section]', params: { section, ...extra } });
  const professionalService = professionalMenuItems.find(item => item.destination.section === params.section);
  const requiresProfessional = !!professionalService && !professionalProfile;
  const pending = professionalService ?? menuItems.find((item) => item.destination.section === params.section);
  if (params.section === 'archive' && params.archiveTab === 'medications') return <MedicationsScreen onClose={close} />;
  if (params.section === 'register' || params.section === 'archive') return (
    <ArchiveScreen
      key={`${params.section}-${params.recordType ?? 'all'}-${params.archiveTab ?? 'records'}`}
      onClose={close}
      initialCreate={params.section === 'register'}
      initialHistory={params.archiveTab === 'history' || !!params.archiveTitle}
      initialListTitle={params.archiveTitle}
      initialTab={params.archiveTab === 'medications' ? 'medications' : 'records'}
      initialType={params.recordType === 'Estudio' || params.recordType === 'Receta' || params.recordType === 'Consulta' ? params.recordType : undefined}
    />
  );
  if (params.section === 'pharmacy' || params.section === 'adherence-programs') return <PharmacyScreen onClose={close} initialTab={params.section === 'adherence-programs' ? 'programs' : 'products'} />;
  if (params.section === 'insurance') return <InsuranceScreen onClose={close} />;
  if (params.section === 'alerts') return <AlertsScreen onClose={close} initialTreatmentId={params.treatmentId} initialMedicationId={params.medicationId} activateOnSave={params.activateAlert === 'true'} />;
  if (params.section === 'body-parameters') return <BodyParametersScreen onClose={close} />;
  if (params.section === 'profile') return <ProfileScreen onClose={close} onProfileSelected={profileSelected} />;
  if (params.section === 'teleconsult') return <TeleconsultScreen onReschedule={id => go('directory', { rescheduleId: id })} onClose={close} onBook={() => go('directory', { mode: 'Teleconsulta' })} appointmentId={params.appointmentId} />;
  if (params.section === 'wallet') return <WalletScreen onClose={close} />;
  if (params.section === 'directory') return <DirectoryFlow onClose={close} onBooked={id => go('agenda', { appointmentId: id })} initialDoctorId={params.doctorId} initialMode={params.mode === 'Presencial' || params.mode === 'Teleconsulta' ? params.mode : undefined} rescheduleId={params.rescheduleId} />;
  if (params.section === 'agenda') return <AgendaScreen key={params.appointmentId ?? 'agenda'} initialAppointmentId={params.appointmentId} onClose={close} onBook={() => go('directory')} onReschedule={id => go('directory', { rescheduleId: id })} onTeleconsult={id => go('teleconsult', { appointmentId: id })} />;
  let content: React.ReactNode;
  switch (params.section) {
    case 'register':
      content = <ArchiveScreen onClose={close} initialCreate />;
      break;
    case 'directory':
      content = (
        <DirectoryFlow
          onClose={close}
          onBooked={id => go('agenda', { appointmentId: id })}
          initialDoctorId={params.doctorId}
          initialMode={
            params.mode === 'Presencial' || params.mode === 'Teleconsulta' ? params.mode : undefined
          }
          rescheduleId={params.rescheduleId}
        />
      );
      break;
    case 'agenda':
      content = (
        <AgendaScreen
          key={params.appointmentId ?? 'agenda'}
          initialAppointmentId={params.appointmentId}
          onClose={close}
          onBook={() => go('directory')}
          onReschedule={(id) => go('directory', { rescheduleId: id })}
          onTeleconsult={(id) => go('teleconsult', { appointmentId: id })}
        />
      );
      break;
    case 'teleconsult':
      content = (
        <TeleconsultScreen
          onReschedule={id => go('directory', { rescheduleId: id })}
          onClose={close}
          onBook={() => go('directory', { mode: 'Teleconsulta' })}
          appointmentId={params.appointmentId}
        />
      );
      break;
    case 'insurance':
      content = <InsuranceScreen onClose={close} />;
      break;
    case 'archive':
      content = (
        <ArchiveScreen
          key={`${params.recordType ?? 'all'}-${params.archiveTab ?? 'records'}`}
          initialTab={params.archiveTab === 'medications' ? 'medications' : 'records'}
          onClose={close}
          initialType={
            params.recordType === 'Estudio' || params.recordType === 'Receta' || params.recordType === 'Consulta'
              ? params.recordType
              : undefined
          }
        />
      );
      break;
    case 'profile':
      content = <ProfileScreen onClose={close} onProfileSelected={profileSelected} />;
      break;
    default:
      content = (
        <Sheet title={pending?.title ?? 'Sección no disponible'} onClose={close}>
          <View testID={professionalService ? `professional-service-${professionalService.id}` : undefined} style={s.pending}>
            <View style={s.icon}>
              <Icon name={pending?.icon ?? 'info'} size={32} color={colors.tealDark} />
            </View>
            <Text style={s.title}>{requiresProfessional ? 'Selecciona tu perfil profesional' : 'Este espacio está por llegar'}</Text>
            <Text style={s.description}>
              {requiresProfessional
                ? 'Este servicio está disponible desde un perfil de profesional de la salud.'
                : 'Estamos incorporando esta sección a tu nuevo inicio. Sus funciones estarán disponibles en una próxima etapa.'}
            </Text>
            {requiresProfessional && <Button testID="professional-service-select-profile" title="Seleccionar perfil" onPress={() => go('profile')} />}
            <Button title="Volver al inicio" onPress={close} />
          </View>
        </Sheet>
      );
  }
  return (
    <View style={s.root}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 22 : 0}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={s.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(26,52,72,.31)' },
  safe: { flex: 1 },
  pending: { alignItems: 'center', padding: 24, gap: 18 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F5',
  },
  title: { color: colors.navy, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
});

