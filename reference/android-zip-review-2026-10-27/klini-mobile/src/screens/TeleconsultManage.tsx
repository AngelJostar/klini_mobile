import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TeleconsultPopup from '../components/TeleconsultPopup';
import DoctorPortrait from '../components/DoctorPortrait';
import { colors, Icon } from '../components/ui';
import { useAppStore } from '../state/store';
import type { Appointment, Doctor } from '../domain/types';
import { addDays, dateLabel, futureDates, monthLabel, parseDate, toISO } from '../domain/dates';
import { assertAppointmentCanBeSaved, APPOINTMENT_DURATION_MINUTES } from '../domain/reducer';

const hours = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];
export default function TeleconsultManage({
  mode,
  appointment,
  doctor,
  onClose,
  onBack,
  onDone,
}: {
  mode: 'reschedule' | 'cancel';
  appointment: Appointment;
  doctor?: Doctor;
  onClose: () => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const { state, updateAppointment, storageError } = useAppStore();
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState('');
  const [month, setMonth] = useState(() => appointment.date.slice(0, 7) + '-01');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);
  const dates = futureDates(14);
  function slots(day: string) {
    if (!doctor || !dates.includes(day) || parseDate(day).getDay() === 0) return [];
    return hours.filter((hour) => {
      try {
        assertAppointmentCanBeSaved(
          state,
          { ...appointment, date: day, time: hour },
          { ignoreId: appointment.id, now },
        );
        return true;
      } catch {
        return false;
      }
    });
  }
  const available = slots(date);
  const valid =
    available.includes(time) &&
    (date !== appointment.date || time !== appointment.time) &&
    appointment.status === 'scheduled';
  const first = parseDate(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  function moveMonth(delta: number) {
    const next = parseDate(month);
    next.setMonth(next.getMonth() + delta);
    setMonth(toISO(next));
  }
  async function save() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (appointment.status !== 'scheduled') throw Error('Esta cita ya no se puede modificar.');
      if (mode === 'reschedule') {
        if (!valid) throw Error('Selecciona una nueva fecha y un horario disponible.');
        assertAppointmentCanBeSaved(
          state,
          { ...appointment, date, time },
          { ignoreId: appointment.id },
        );
        await updateAppointment(appointment.id, { date, time });
      } else await updateAppointment(appointment.id, { status: 'cancelled' });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la cita. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  const professional = (
    <View style={s.professional}>
      {doctor && <DoctorPortrait doctor={doctor} size={42} />}
      <View style={s.flex}>
        <Text style={s.name}>{doctor?.name || 'Profesional no disponible'}</Text>
        <Text style={s.muted}>{doctor?.specialty || 'Teleconsulta'}</Text>
        {mode === 'reschedule' && <Text style={s.patient}>{appointment.patientName}</Text>}
      </View>
    </View>
  );
  const keep = (
    <Pressable
      testID="teleconsult-keep"
      accessibilityRole="button"
      onPress={onBack}
      disabled={busy}
      style={mode === 'cancel' ? s.primary : s.keep}
    >
      <Text style={mode === 'cancel' ? s.primaryText : s.link}>Conservar cita</Text>
    </Pressable>
  );
  return (
    <TeleconsultPopup
      title={mode === 'reschedule' ? 'Reprogramar cita' : ''}
      compact={mode === 'cancel'}
      onClose={onClose}
      onBack={onBack}
      footer={
        <View>
          {mode === 'reschedule' ? (
            <View style={s.footer}>
              {!!time && (
                <Text testID="reschedule-summary" style={s.summary}>
                  {dateLabel(date)} · {time} h
                </Text>
              )}
              <Pressable
                testID="teleconsult-confirm-change"
                accessibilityRole="button"
                accessibilityState={{ disabled: !valid || busy }}
                disabled={!valid || busy}
                onPress={() => void save()}
                style={[s.primary, (!valid || busy) && s.disabled]}
              >
                <Text style={s.primaryText}>{busy ? 'Guardando…' : 'Confirmar cambio'}</Text>
              </Pressable>
              {keep}
            </View>
          ) : (
            <View style={s.cancelActions}>
              {keep}
              <Pressable
                testID="teleconsult-confirm-cancel"
                accessibilityRole="button"
                disabled={busy || appointment.status !== 'scheduled'}
                onPress={() => void save()}
                style={s.keep}
              >
                <Text style={s.danger}>{busy ? 'Cancelando…' : 'Cancelar cita'}</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.note}>Datos de ejemplo</Text>
        </View>
      }
    >
      <View testID={'teleconsult-' + mode + '-screen'}>
        {mode === 'cancel' && (
          <>
            <Text style={s.title}>¿Cancelar esta cita?</Text>
            <Text style={s.subtitle}>Se cancelará esta teleconsulta.</Text>
          </>
        )}
        {professional}
        {mode === 'reschedule' ? (
          <>
            <Text style={s.current}>
              Cita actual: {dateLabel(appointment.date)} · {appointment.time} h
            </Text>
            <Text style={s.section}>Nueva fecha</Text>
            <View style={s.monthBar}>
              <Pressable
                testID="reschedule-prev-month"
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
                onPress={() => moveMonth(-1)}
                style={s.monthArrow}
              >
                <Icon name="back" size={18} />
              </Pressable>
              <Text style={s.month}>{monthLabel(month)}</Text>
              <Pressable
                testID="reschedule-next-month"
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
                onPress={() => moveMonth(1)}
                style={s.monthArrow}
              >
                <Icon name="chevron" size={18} />
              </Pressable>
            </View>
            <View style={s.grid}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                <View key={index} style={s.cell}>
                  <Text style={s.weekday}>{day}</Text>
                </View>
              ))}
              {days.map((day) => {
                const enabled = day.slice(0, 7) === month.slice(0, 7) && slots(day).length > 0;
                return (
                  <View key={day} style={s.cell}>
                    <Pressable
                      testID={'reschedule-day-' + day}
                      accessibilityRole="button"
                      accessibilityLabel={dateLabel(day)}
                      accessibilityState={{ selected: date === day, disabled: !enabled }}
                      disabled={!enabled}
                      onPress={() => {
                        setDate(day);
                        setTime('');
                        setError('');
                      }}
                      style={[
                        s.day,
                        day === appointment.date && s.originalDay,
                        day === date && s.selectedDay,
                      ]}
                    >
                      <Text
                        style={[
                          s.dayText,
                          !enabled && s.unavailable,
                          day === date && s.selectedText,
                        ]}
                      >
                        {parseDate(day).getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Text style={s.section}>Nuevo horario</Text>
            <View style={s.times}>
              {available.map((hour) => (
                <Pressable
                  key={hour}
                  testID={'reschedule-time-' + hour}
                  accessibilityRole="button"
                  accessibilityState={{ selected: time === hour }}
                  onPress={() => {
                    setTime(hour);
                    setError('');
                  }}
                  style={[s.time, time === hour && s.activeTime]}
                >
                  <Text style={[s.timeText, time === hour && { color: colors.tealDark }]}>
                    {hour}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!available.length && (
              <Text style={s.muted}>
                No hay horarios disponibles para esta fecha. Elige otro día.
              </Text>
            )}
            <Text style={s.duration}>Duración: {APPOINTMENT_DURATION_MINUTES} min</Text>
          </>
        ) : (
          <>
            {[
              ['Paciente', appointment.patientName],
              ['Fecha', dateLabel(appointment.date)],
              ['Horario', appointment.time + ' h · ' + APPOINTMENT_DURATION_MINUTES + ' min'],
            ].map(([label, value]) => (
              <View key={label} style={s.row}>
                <Text style={s.label}>{label}</Text>
                <Text style={s.value}>{value}</Text>
              </View>
            ))}
            <View style={s.row}>
              <Icon name="video" size={22} color={colors.teal} />
              <Text style={s.value}>Teleconsulta</Text>
            </View>
          </>
        )}
        {!!(error || storageError) && (
          <Text accessibilityRole="alert" style={s.error}>
            {error || storageError}
          </Text>
        )}
      </View>
    </TeleconsultPopup>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  professional: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  name: { fontSize: 13, fontWeight: '700', color: colors.navy },
  muted: { fontSize: 11, lineHeight: 17, color: '#7893B7' },
  patient: { fontSize: 11, color: colors.navy, marginTop: 3 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: 10 },
  subtitle: { fontSize: 12, color: '#7893B7', marginTop: 6, marginBottom: 12 },
  current: {
    backgroundColor: '#E5F6F4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: colors.tealDark,
  },
  section: { fontSize: 13, fontWeight: '600', color: colors.navy, marginTop: 14, marginBottom: 6 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  month: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    textTransform: 'capitalize',
    minWidth: 140,
    textAlign: 'center',
  },
  monthArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', height: 34, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 10, color: '#7893B7' },
  day: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayText: { fontSize: 11, color: colors.navy },
  unavailable: { color: '#A9B6CA' },
  originalDay: { borderColor: '#A9B6CA' },
  selectedDay: { backgroundColor: colors.tealDark, borderColor: colors.tealDark },
  selectedText: { color: 'white' },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  time: {
    width: '23%',
    minHeight: 32,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BBCDE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { fontSize: 11, color: colors.navy },
  activeTime: { backgroundColor: '#E4F5F4', borderColor: colors.teal },
  duration: { fontSize: 10, color: '#8CA4C2', marginTop: 7 },
  footer: { alignItems: 'center' },
  primary: {
    backgroundColor: colors.tealDark,
    borderRadius: 22,
    paddingHorizontal: 17,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 12, color: 'white' },
  keep: { minHeight: 36, paddingHorizontal: 8, justifyContent: 'center' },
  link: { fontSize: 11, color: colors.tealDark },
  danger: { fontSize: 11, color: colors.danger },
  cancelActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summary: { fontSize: 13, fontWeight: '600', color: colors.navy, marginBottom: 8 },
  disabled: { opacity: 0.4 },
  note: { fontSize: 9, color: '#98A9BC', textAlign: 'center', marginTop: 7 },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EFF4',
    paddingVertical: 17,
  },
  label: { width: 65, fontSize: 11, color: '#7893B7' },
  value: { flex: 1, fontSize: 13, color: colors.navy, fontWeight: '600' },
  error: { fontSize: 12, lineHeight: 18, color: colors.danger, marginTop: 10 },
});
