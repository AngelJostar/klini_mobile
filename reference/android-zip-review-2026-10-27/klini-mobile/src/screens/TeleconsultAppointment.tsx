import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Appointment, Doctor } from '../domain/types';
import TeleconsultManage from './TeleconsultManage';
import { colors } from '../components/ui';
import DoctorPortrait from '../components/DoctorPortrait';
import TeleconsultPopup from '../components/TeleconsultPopup';
import { money } from '../domain/dates';
import { APPOINTMENT_DURATION_MINUTES } from '../domain/reducer';

export default function TeleconsultAppointment({
  appointment,
  doctor,
  onClose,
  onBack,
}: {
  appointment: Appointment;
  doctor?: Doctor;
  onClose: () => void;
  onBack: () => void;
  onReschedule: (id: string) => void;
}) {
  const [mode, setMode] = useState<'reschedule' | 'cancel' | null>(null);
  const scheduled = appointment.status === 'scheduled';
  if (mode)
    return (
      <TeleconsultManage
        mode={mode}
        appointment={appointment}
        doctor={doctor}
        onClose={onClose}
        onBack={() => setMode(null)}
        onDone={() => setMode(null)}
      />
    );
  const date = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <TeleconsultPopup
      title="Tu cita"
      compact
      onClose={onClose}
      onBack={onBack}
      footer={
        <View>
          {scheduled && (
            <View style={s.actions}>
              <Pressable
                testID="teleconsult-reschedule"
                accessibilityRole="button"
                disabled={!doctor}
                onPress={() => setMode('reschedule')}
                style={s.action}
              >
                <Text style={[s.actionText, !doctor && s.disabled]}>Reprogramar</Text>
              </Pressable>
              <Pressable
                testID="teleconsult-cancel"
                accessibilityRole="button"
                onPress={() => setMode('cancel')}
                style={s.action}
              >
                <Text style={s.actionText}>Cancelar cita</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.note}>Datos de ejemplo</Text>
        </View>
      }
    >
      <View testID="teleconsult-appointment-detail" style={s.details}>
        <View style={[s.row, s.professional]}>
          <Text style={s.label}>Profesional</Text>
          <View style={s.professionalValue}>
            {doctor && <DoctorPortrait doctor={doctor} size={40} />}
            <View style={s.flex}>
              <Text style={s.value}>{doctor?.name || 'Profesional no disponible'}</Text>
              <Text style={s.secondary}>{doctor?.specialty || 'Teleconsulta'}</Text>
            </View>
          </View>
        </View>
        {[
          ['Paciente', appointment.patientName],
          ['Fecha', date.charAt(0).toUpperCase() + date.slice(1)],
          ['Horario', appointment.time + ' h · ' + APPOINTMENT_DURATION_MINUTES + ' min'],
          ['Modalidad', appointment.mode],
        ].map(([label, value]) => (
          <View key={label} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text style={[s.value, s.flex]}>{value}</Text>
          </View>
        ))}
        <View style={[s.row, { borderBottomWidth: 0 }]}>
          <Text style={s.label}>Consulta</Text>
          <View style={s.flex}>
            <Text style={s.value}>{doctor ? money(doctor.price) : 'Precio por confirmar'}</Text>
            <Text style={s.secondary}>Precio informativo. Sin cobro en este paso.</Text>
          </View>
        </View>
        {!scheduled && (
          <Text testID="teleconsult-detail-status" style={s.status}>
            {appointment.status === 'cancelled' ? 'Cita cancelada' : 'Cita completada'}
          </Text>
        )}
      </View>
    </TeleconsultPopup>
  );
}
const s = StyleSheet.create({
  details: { paddingTop: 14 },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EFF4',
    alignItems: 'flex-start',
  },
  professional: { paddingTop: 4 },
  label: { width: 72, fontSize: 11, lineHeight: 17, color: '#7893B7' },
  professionalValue: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex: { flex: 1 },
  value: { fontSize: 13, fontWeight: '600', lineHeight: 19, color: colors.navy },
  secondary: { fontSize: 10, lineHeight: 16, color: '#7893B7', marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  actionText: { fontSize: 12, color: colors.tealDark },
  disabled: { opacity: 0.4 },
  note: { textAlign: 'center', fontSize: 9, color: '#98A9BC', marginTop: 6 },
  error: { fontSize: 12, color: colors.danger, marginTop: 10 },
  status: { fontSize: 13, color: colors.muted, marginTop: 12 },
});
