import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Icon,
  SectionTitle,
  colors,
  confirmAction,
  notify,
} from '../components/ui';
import { useAppStore } from '../state/store';
import { Appointment } from '../domain/types';
import { dateLabel, todayISO } from '../domain/dates';
import { exportCalendar } from '../services/files';
import Sheet from '../components/AgendaPopup';
import BookingFooterButton from '../components/BookingFooterButton';
import AgendaFilterPopup from '../components/AgendaFilterPopup';

type Props = {
  initialAppointmentId?: string;
  onClose: () => void;
  onBook: () => void;
  onReschedule: (id: string) => void;
  onTeleconsult: (id: string) => void;
};

type Filter = 'upcoming' | 'history' | 'cancelled' | 'all';

function localDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dayISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function appointmentTime(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.time}:00`).getTime();
}

function displayDate(date: string) {
  try {
    return dateLabel(date);
  } catch {
    return date;
  }
}

function monthTitle(date: Date) {
  const label = date.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function appointmentStatus(appointment: Appointment, now: number) {
  if (appointment.status === 'cancelled')
    return { label: 'Cancelada', color: colors.danger, background: '#FFF0F0' };
  if (appointment.status === 'completed')
    return {
      label: 'Atendida',
      color: colors.tealDark,
      background: colors.mint,
    };
  if (appointmentTime(appointment) < now)
    return {
      label: 'Pendiente de cierre',
      color: '#916021',
      background: '#FFF5E6',
    };
  return {
    label: 'Programada',
    color: colors.tealDark,
    background: colors.mint,
  };
}

export default function AgendaScreen({ initialAppointmentId, onClose, onBook, onReschedule, onTeleconsult }: Props) {
  const { state, updateAppointment } = useAppStore();
  const today = todayISO();
  const [now, setNow] = useState(() => Date.now());
  const focusDate = state.appointments.find(appointment => appointment.id === initialAppointmentId)?.date;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const date = localDate(focusDate ?? today);
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const hasFilters = selectedDate !== null || filter !== 'all';
  const closeFilterPopup = useCallback(() => setShowOptions(false), []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const listTop = useRef<number | null>(null);
  const focusGroupTop = useRef<number | null>(null);
  const focusRowTop = useRef<number | null>(null);
  const focusScrollDone = useRef(false);

  function scrollToNewAppointment() {
    if (!initialAppointmentId || focusScrollDone.current || listTop.current === null || focusGroupTop.current === null || focusRowTop.current === null || !scrollViewRef.current) return;
    const targetY = listTop.current + focusGroupTop.current + Math.max(0, focusRowTop.current - 60);
    focusScrollDone.current = true;
    requestAnimationFrame(() => scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY), animated: false }));
  }

  function handleListLayout(event: LayoutChangeEvent) {
    listTop.current = event.nativeEvent.layout.y;
    scrollToNewAppointment();
  }

  function handleFocusGroupLayout(event: LayoutChangeEvent) {
    focusGroupTop.current = event.nativeEvent.layout.y;
    scrollToNewAppointment();
  }

  function handleFocusRowLayout(event: LayoutChangeEvent) {
    focusRowTop.current = event.nativeEvent.layout.y;
    scrollToNewAppointment();
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const appointmentCounts = useMemo(() => {
    const counts = new Map<string, { active: number; cancelled: number }>();
    state.appointments.forEach((appointment) => {
      const count = counts.get(appointment.date) || { active: 0, cancelled: 0 };
      if (appointment.status === 'cancelled') count.cancelled += 1;
      else count.active += 1;
      counts.set(appointment.date, count);
    });
    return counts;
  }, [state.appointments]);

  const visibleAppointments = useMemo(
    () =>
      state.appointments
        .filter((appointment) => {
          if (selectedDate && appointment.date !== selectedDate) return false;
          if (filter === 'cancelled') return appointment.status === 'cancelled';
          if (filter === 'history')
            return (
              appointment.status === 'completed' ||
              (appointment.status === 'scheduled' && appointmentTime(appointment) < now)
            );
          if (filter === 'upcoming')
            return appointment.status === 'scheduled' && appointmentTime(appointment) >= now;
          return true;
        })
        .sort((a, b) => {
          const difference = appointmentTime(a) - appointmentTime(b);
          return filter === 'history' || filter === 'cancelled' ? -difference : difference;
        }),
    [state.appointments, filter, selectedDate, now],
  );

  const detail = state.appointments.find((appointment) => appointment.id === detailId);
  const appointmentGroups = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    visibleAppointments.forEach(appointment => {
      const group = groups.get(appointment.date) ?? [];
      group.push(appointment);
      groups.set(appointment.date, group);
    });
    return [...groups].map(([date, appointments]) => ({ date, appointments }));
  }, [visibleAppointments]);
  const detailDoctor = detail && state.doctors.find((doctor) => doctor.id === detail.doctorId);

  function openDetail(appointment: Appointment) {
    setDetailId(appointment.id);
  }

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  }

  function selectDay(date: string) {
    setSelectedDate(date);
    setFilter('all');
  }

  function applyFilters(date: string | null, status: Filter) {
    setSelectedDate(date);
    setFilter(status);
    if (date) {
      const selected = localDate(date);
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
    }
    setShowOptions(false);
  }

  function clearFilters() {
    setSelectedDate(null);
    setFilter('all');
  }

  function cancelAppointment(appointment: Appointment) {
    confirmAction(
      'Cancelar cita',
      `Se cancelará tu cita del ${displayDate(appointment.date)} a las ${appointment.time} h. Puedes agendar otra cuando quieras.`,
      () => {
        try {
          updateAppointment(appointment.id, { status: 'cancelled' });
          notify('Cita cancelada', 'Tu agenda se actualizó en este dispositivo.');
        } catch (error) {
          notify(
            'No se pudo cancelar',
            error instanceof Error ? error.message : 'Intenta nuevamente.',
          );
        }
      },
    );
  }

  function markAttended(appointment: Appointment) {
    if (appointmentTime(appointment) > Date.now()) {
      notify(
        'La cita aún no ocurre',
        'Podrás marcarla como atendida después de la hora programada.',
      );
      return;
    }
    confirmAction('Marcar como atendida', 'Esta cita pasará a tu historial como atendida.', () => {
      try {
        updateAppointment(appointment.id, { status: 'completed' });
        notify('Cita actualizada', 'La cita ya aparece como atendida en tu historial.');
      } catch (error) {
        notify(
          'No se pudo actualizar',
          error instanceof Error ? error.message : 'Intenta nuevamente.',
        );
      }
    });
  }

  async function downloadAppointment() {
    if (!detail || !detailDoctor || exporting) return;
    setExporting(true);
    try {
      await exportCalendar(detail, detailDoctor);
    } catch (error) {
      notify('No se pudo exportar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  }

  if (detail) {
    const status = appointmentStatus(detail, now);
    const isScheduled = detail.status === 'scheduled';
    const canComplete = isScheduled && appointmentTime(detail) <= now;
    return (
      <Sheet title="Detalle de cita" onClose={onClose} onBack={() => setDetailId(null)}>
        <View style={s.detailHeader}>
          {detailDoctor ? (
            <Avatar doctor={detailDoctor} size={68} />
          ) : (
            <View style={s.doctorFallback}>
              <Icon name="user" size={26} color={colors.tealDark} />
            </View>
          )}
          <View style={s.flex}>
            <Text style={s.doctorName}>{detailDoctor?.name || 'Profesional no disponible'}</Text>
            <Text style={s.secondary}>{detailDoctor?.specialty || 'Consulta médica'}</Text>
            <View style={[s.statusBadge, { backgroundColor: status.background }]}>
              <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <Card style={s.detailCard}>
          <DetailRow icon="calendar" label="Fecha" value={displayDate(detail.date)} />
          <DetailRow icon="clock" label="Hora" value={`${detail.time} h`} />
          <DetailRow
            icon={detail.mode === 'Teleconsulta' ? 'video' : 'location'}
            label="Modalidad"
            value={detail.mode}
          />
          {detail.mode === 'Presencial' && (
            <DetailRow
              icon="location"
              label="Ubicación"
              value={detailDoctor?.address || 'Sin ubicación registrada'}
            />
          )}
          <DetailRow icon="user" label="Paciente" value={detail.patientName} />
          <DetailRow icon="file" label="Tipo de visita" value={detail.visitType} />
          <DetailRow
            icon="creditCard"
            label="Forma de pago"
            value={
              detail.paymentMethod === 'Seguro'
                ? `Seguro${state.policies.find((policy) => policy.id === detail.insuranceId)?.insurer ? ` · ${state.policies.find((policy) => policy.id === detail.insuranceId)?.insurer}` : ''}`
                : 'Particular'
            }
            last
          />
        </Card>

        {isScheduled && detail.mode === 'Teleconsulta' && (
          <View style={s.actionSpace}>
            <Button
              title="Abrir teleconsulta"
              icon="video"
              onPress={() => onTeleconsult(detail.id)}
              testID="agenda-teleconsult"
            />
          </View>
        )}

        <SectionTitle>Gestionar cita</SectionTitle>
        <View style={s.actions}>
          <Button
            title={exporting ? 'Exportando…' : 'Agregar a mi calendario'}
            icon="calendar"
            secondary
            disabled={!detailDoctor || exporting || detail.status === 'cancelled'}
            onPress={downloadAppointment}
            testID="appointment-export-calendar"
          />
          {isScheduled && (
            <Button
              title="Reprogramar cita"
              icon="edit"
              secondary
              onPress={() => onReschedule(detail.id)}
              testID="appointment-reschedule"
            />
          )}
          {canComplete && (
            <Button
              title="Marcar como atendida"
              icon="check"
              secondary
              onPress={() => markAttended(detail)}
              testID="appointment-complete"
            />
          )}
          {isScheduled && (
            <Button
              title="Cancelar cita"
              danger
              onPress={() => cancelAppointment(detail)}
              testID="appointment-cancel"
            />
          )}
        </View>
        <Text style={s.localNote}>
          Agenda local de demostración. Los cambios no notifican al profesional.
        </Text>
      </Sheet>
    );
  }

  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  // Six fixed weeks keep the sheet and appointments stationary across months.
  const calendarCells = Array.from(
    { length: 42 },
    (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1, 12);
      return {
        date: dayISO(date.getFullYear(), date.getMonth(), date.getDate()),
        day: date.getDate(),
        outside: date.getMonth() !== month.getMonth(),
      };
    },
  );
  return (
    <View style={s.root}>
    <View style={s.root} pointerEvents={showOptions ? 'none' : 'auto'} accessibilityElementsHidden={showOptions} importantForAccessibility={showOptions ? 'no-hide-descendants' : 'auto'}>
    <Sheet
      title="Tu agenda"
      scrollViewRef={scrollViewRef}
      onContentSizeChange={scrollToNewAppointment}
      onClose={onClose}
      footer={
        <BookingFooterButton
          title="Agendar cita"
          icon="plus"
          testID="agenda-book"
          onPress={onBook}
        />
      }
    >
      <View style={[s.calendarToolbar, calendarOpen && s.calendarToolbarExpanded]}>
      <Pressable
        testID="agenda-calendar-toggle"
        accessibilityRole="button"
        accessibilityLabel={calendarOpen ? 'Ocultar calendario' : 'Mostrar calendario'}
        accessibilityState={{ expanded: calendarOpen }}
        hitSlop={5}
        onPress={() => setCalendarOpen(open => !open)}
        style={({ pressed }) => [s.calendarToggle, { opacity: pressed ? .75 : 1 }]}
      >
        <Icon name="calendar" size={15} color={colors.tealDark} />
        <Text style={s.calendarToggleText}>{calendarOpen ? 'Ocultar calendario' : 'Mostrar calendario'}</Text>
        <Icon name={calendarOpen ? 'chevronUp' : 'chevronDown'} size={14} color={colors.tealDark} />
      </Pressable>
        <View style={s.filterControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasFilters ? 'Filtros de agenda activos' : 'Filtros de agenda'}
          accessibilityState={{ expanded: showOptions }}
          testID="agenda-options"
          onPress={() => setShowOptions(true)}
          style={s.arrowButton}
        >
          <Icon name="filter" size={19} color={colors.tealDark} />
        </Pressable>
        {hasFilters && <Pressable testID="agenda-clear-filters" accessibilityRole="button" accessibilityLabel="Borrar filtros de agenda" onPress={clearFilters} style={s.clearFilters}>
          <Text style={s.clearFiltersText}>Borrar filtros</Text>
        </Pressable>}
        </View>
      </View>
      {calendarOpen && <View testID="agenda-calendar">
      <View style={s.monthHeader}>
        <Pressable
          testID="agenda-prev-month"
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          style={s.arrowButton}
          onPress={() => changeMonth(-1)}
        >
          <Icon name="chevronLeft" size={25} />
        </Pressable>
        <Text style={s.monthLabel}>{monthTitle(month).replace(' de ', ' ')}</Text>
        <Pressable
          testID="agenda-next-month"
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          style={s.arrowButton}
          onPress={() => changeMonth(1)}
        >
          <Icon name="chevronRight" size={25} />
        </Pressable>
      </View>
      <View style={s.weekRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
          <Text key={index} style={[s.weekday, { width: '14.285714%' }]}>
            {day}
          </Text>
        ))}
      </View>
      <View style={s.daysGrid}>
        {calendarCells.map((cell) => (
          <Pressable
            key={cell.date}
            testID={`agenda-day-${cell.date}`}
            accessibilityRole="button"
            accessibilityLabel={`${displayDate(cell.date)}, ${appointmentCounts.get(cell.date)?.active ?? 0} citas`}
            accessibilityState={{ selected: selectedDate === cell.date }}
            onPress={() => {
              selectDay(cell.date);
              if (cell.outside) {
                const d = localDate(cell.date);
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
              }
            }}
            style={[s.dayCell, { width: '14.285714%' }]}
          >
            <View style={[
              s.dayCircle,
              (appointmentCounts.get(cell.date)?.active ?? 0) > 0 && s.reservedCircle,
              cell.date === today && s.todayCircle,
              cell.date === selectedDate && s.selectedCircle,
            ]}>
              <Text
                style={[
                  s.dayText,
                  cell.outside && { color: '#A0ADBF' },
                  (appointmentCounts.get(cell.date)?.active ?? 0) > 0 && s.reservedDayText,
                  cell.date === selectedDate && s.selectedDayText,
                  cell.date === today && s.todayText,
                ]}
              >
                {cell.day}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      </View>}
      <View testID="agenda-appointments" onLayout={handleListLayout}>
      {!visibleAppointments.length ? (
        <Text style={s.emptyDay}>{selectedDate ? `Sin citas para el ${displayDate(selectedDate)}` : 'No tienes citas en esta vista.'}</Text>
      ) : (
        appointmentGroups.map(group => {
          const groupDate = localDate(group.date);
          const day = groupDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' });
          const monthName = groupDate.toLocaleDateString('es-MX', { month: 'long' });
          const month = `de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}${groupDate.getFullYear() === localDate(today).getFullYear() ? '' : ` de ${groupDate.getFullYear()}`}`;
          return <View key={group.date} testID={`agenda-group-${group.date}`} style={s.appointmentGroup} onLayout={initialAppointmentId && group.date === focusDate ? handleFocusGroupLayout : undefined}>
            <Text accessibilityRole="header" testID={`agenda-heading-${group.date}`} style={s.dayHeading}>
              <Text testID={`agenda-day-label-${group.date}`} style={s.dayTitle}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
              <Text testID={`agenda-month-label-${group.date}`} style={s.dayMonth}> {month}</Text>
            </Text>
            {group.appointments.map((appointment) => {
          const doctor = state.doctors.find((item) => item.id === appointment.doctorId);
          const status = appointmentStatus(appointment, now);
          return (
            <Pressable
              key={appointment.id}
              onLayout={appointment.id === initialAppointmentId ? handleFocusRowLayout : undefined}
              testID={`agenda-open-${appointment.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Ver cita con ${doctor?.name}, ${appointment.time}, ${status.label}`}
              onPress={() => openDetail(appointment)}
              style={s.simpleRow}
            >
              <View style={s.timeColumn}>
                <Text style={s.largeTime}>{appointment.time}</Text>
              </View>
              <View style={s.flex}>
                <Text style={s.appointmentDoctor}>{doctor?.name || 'Consulta médica'}</Text>
                <Text style={s.secondary}>
                  {doctor?.specialty} · {appointment.mode}
                </Text>
                {appointment.status !== 'scheduled' && (
                  <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
                )}
              </View>
              <Icon
                name={appointment.mode === 'Teleconsulta' ? 'video' : 'location'}
                size={21}
                color={colors.teal}
              />
              <Icon name="chevronRight" size={22} color={colors.teal} />
            </Pressable>
          );
            })}
          </View>;
        })
      )}
      </View>
    </Sheet>
    </View>
    {showOptions && <AgendaFilterPopup date={selectedDate} status={filter} today={today} onClose={closeFilterPopup} onApply={applyFilters} />}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.detailRow, !last && s.detailDivider]}>
      <View style={s.detailRowIcon}>
        <Icon name={icon} size={19} color={colors.muted} />
      </View>
      <View style={s.flex}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  calendarToggle: { minHeight: 30, marginTop: 7, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#DDF5F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  calendarToggleText: { color: colors.tealDark, fontSize: 11, fontWeight: '500' },
  // Reserve the clear action inside the existing gap without moving the calendar or list.
  calendarToolbar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: -8 },
  calendarToolbarExpanded: { marginBottom: 12 },
  filterControls: { width: 70, minHeight: 64, marginRight: -13, alignItems: 'center' },
  clearFilters: { minHeight: 20, width: '100%', alignItems: 'center', justifyContent: 'center' },
  clearFiltersText: { color: colors.tealDark, fontSize: 9, lineHeight: 13 },
  appointmentGroup: { marginTop: 20 },
  dayHeading: { marginBottom: 4, color: colors.navy },
  dayTitle: { color: colors.navy, fontWeight: '700', fontSize: 21 },
  dayMonth: { color: '#8AA0B7', fontSize: 13, fontWeight: '400' },
  emptyDay: { color: colors.muted, paddingVertical: 12, fontSize: 12, textAlign: 'center' },
  simpleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  timeColumn: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingRight: 12,
    maxWidth: 80,
  },
  largeTime: { color: colors.navy, fontSize: 21, fontWeight: '700' },
  flex: { flex: 1, minWidth: 0 },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 20,
  },
  nextCard: {
    padding: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: 'rgba(0,170,165,0.1)',
  },
  nextIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  eyebrow: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  nextTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 3,
  },
  secondary: { fontSize: 13, lineHeight: 19, color: colors.muted },
  calendarCard: {
    borderRadius: 24,
    padding: 11,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.navy,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { minHeight: 49, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  todayCircle: { borderColor: colors.teal, backgroundColor: colors.teal },
  selectedCircle: { borderColor: '#2456C4', borderWidth: 2 },
  reservedCircle: { backgroundColor: '#DDF2FA', borderColor: '#DDF2FA' },
  reservedDayText: { color: colors.navy, fontWeight: '700' },
  dayText: {
    fontSize: 15,
    color: colors.navy,
    fontWeight: '500',
    marginTop: -2,
  },
  todayText: { color: colors.white, fontWeight: '700' },
  selectedDayText: { color: colors.navy, fontWeight: '700' },
  dayDot: {
    position: 'absolute',
    bottom: 4,
    height: 4,
    width: 4,
    borderRadius: 2,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  calendarHint: { fontSize: 11, color: colors.muted },
  todayButton: {
    minWidth: 54,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: { fontSize: 13, fontWeight: '700', color: colors.tealDark },
  calendarHelp: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    lineHeight: 25,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  clearDate: { minHeight: 44, justifyContent: 'center', paddingLeft: 5 },
  clearText: { fontSize: 12, color: colors.tealDark, fontWeight: '600' },
  appointmentList: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.white,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  dateColumn: {
    width: 48,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingRight: 10,
  },
  appointmentDay: { fontSize: 24, fontWeight: '700', color: colors.navy },
  appointmentMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  appointmentTime: {
    fontSize: 11,
    color: colors.tealDark,
    fontWeight: '600',
    marginTop: 7,
  },
  appointmentDoctor: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  modeText: { color: colors.muted, fontSize: 11 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 7,
  },
  statusText: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 23,
  },
  doctorFallback: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 20,
    lineHeight: 27,
    color: colors.navy,
    fontWeight: '700',
    marginBottom: 3,
  },
  detailCard: { paddingVertical: 0 },
  detailRow: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 13,
    alignItems: 'flex-start',
  },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  detailRowIcon: { paddingTop: 3 },
  detailLabel: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: colors.navy,
    lineHeight: 21,
    fontWeight: '500',
  },
  body: { fontSize: 14, lineHeight: 22, color: colors.navy },
  actionSpace: { marginTop: 20 },
  actions: { gap: 10 },
  localNote: {
    marginTop: 20,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});

