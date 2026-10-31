import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, Empty, Icon, TextField, colors, notify } from '../components/ui';
import { useAppStore } from '../state/store';
import Sheet from '../components/DirectoryPopup';
import DoctorPortrait from '../components/DoctorPortrait';
import DirectorySearch from '../components/DirectorySearch';
import BookingFooterButton from '../components/BookingFooterButton';
import { addDays, dateLabel, futureDates, money, monthLabel, parseDate, todayISO } from '../domain/dates';
import { APPOINTMENT_DURATION_MINUTES, appointmentTimestamp } from '../domain/reducer';
import type { Doctor, Mode, NewAppointment, Policy, StoreContext } from '../domain/types';

type Props = {
  onClose: () => void;
  onBooked: (id: string) => void;
  initialDoctorId?: string;
  initialMode?: Mode;
  rescheduleId?: string;
};
type PatientFields = {
  name: string;
  birthDate: string;
  phone: string;
  email: string;
};
type PatientErrors = Partial<Record<keyof PatientFields | 'reason', string>>;
type ProfileTab = 'Experiencia' | 'Opiniones' | 'Horarios';
type FilterMode = Mode | 'Todas';
const MODES: Mode[] = ['Presencial', 'Teleconsulta'];
const HOURS = [
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
const STEP_TITLES = [
  'Encuentra a tu médico',
  'Tus médicos',
  'Conoce a tu médico',
  'Elige tu horario',
  'Servicio y pago',
  'Datos del paciente',
  'Revisa tu cita',
  'Cita guardada',
];
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
const blankPatient = (): PatientFields => ({
  name: '',
  birthDate: '',
  phone: '',
  email: '',
});
const slotIsFuture = (date: string, time: string) => {
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};
const validBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10)) &&
    value <= todayISO() &&
    Number(value.slice(0, 4)) >= 1900
  );
};

export default function DirectoryFlow({
  onClose,
  onBooked,
  initialDoctorId,
  initialMode,
  rescheduleId,
}: Props) {
  const { state, storageError, addAppointment, updateAppointment, toggleFavorite }: StoreContext =
    useAppStore();
  const original = state.appointments.find((a) => a.id === rescheduleId);
  const originalIsSelf = original
    ? original.patientId
      ? original.patientId === state.profile.id
      : normalize(original.patientName) === normalize(state.profile.name)
    : true;
  const initialDoctor = state.doctors.find((d) => d.id === (original?.doctorId ?? initialDoctorId));
  const initialDates = futureDates(14);
  const [step, setStep] = useState(rescheduleId && initialDoctor ? 4 : initialDoctor ? 3 : 1);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('México');
  const [specialty, setSpecialty] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>(initialMode ?? 'Todas');
  const [filterInsurer, setFilterInsurer] = useState('');
  const [moreFilters, setMoreFilters] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [doctorId, setDoctorId] = useState(initialDoctor?.id ?? '');
  const [profileTab, setProfileTab] = useState<ProfileTab>('Experiencia');
  const [mode, setMode] = useState<Mode>(
    original?.mode ??
      (initialMode && initialDoctor?.modalities.includes(initialMode)
        ? initialMode
        : initialDoctor?.modalities[0]) ??
      'Presencial',
  );
  const [date, setDate] = useState(
    original && initialDates.includes(original.date) ? original.date : initialDates[0],
  );
  const [time, setTime] = useState(
    original && initialDates.includes(original.date) ? original.time : '',
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(`${date.slice(0, 7)}-01`);
  const [visitType, setVisitType] = useState<'Primera vez' | 'Seguimiento'>(
    original?.visitType ?? 'Primera vez',
  );
  const [paymentMethod, setPaymentMethod] = useState<'Particular' | 'Seguro'>(
    original?.paymentMethod ?? 'Particular',
  );
  const [insuranceId, setInsuranceId] = useState(original?.insuranceId ?? '');
  const [patientType, setPatientType] = useState<'self' | 'other'>(
    originalIsSelf ? 'self' : 'other',
  );
  const [selfPatient, setSelfPatient] = useState<PatientFields>(() => ({
    name: state.profile.name,
    birthDate: state.profile.birthDate,
    phone: state.profile.phone,
    email: state.profile.email,
  }));
  const [otherPatient, setOtherPatient] = useState<PatientFields>(() => ({
    ...blankPatient(),
    name: original && !originalIsSelf ? original.patientName : '',
  }));
  const [reason, setReason] = useState(original?.reason ?? '');
  const [patientErrors, setPatientErrors] = useState<PatientErrors>({});
  const [consentDetails, setConsentDetails] = useState(false);
  const [consentDemo, setConsentDemo] = useState(false);
  const [consentOther, setConsentOther] = useState(false);
  const [consentPolicy, setConsentPolicy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    id: string;
    appointment: NewAppointment;
  } | null>(null);
  const submitting = useRef(false);
  const [clockTick, setClockTick] = useState(0);

  // Recompute availability as time advances while this sheet remains open.
  useEffect(() => {
    const timer = setInterval(() => setClockTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const doctor = state.doctors.find((d) => d.id === doctorId);
  const dates = useMemo(() => futureDates(14), [clockTick]);
  const patient = patientType === 'self' ? selfPatient : otherPatient;

  const results = useMemo(
    () =>
      state.doctors.filter((d) => {
        const searchMatches =
          !query.trim() || normalize(`${d.name} ${d.specialty}`).includes(normalize(query));
        return (
          searchMatches &&
          country === 'México' &&
          (!specialty || normalize(d.specialty) === normalize(specialty)) &&
          (!city.trim() || normalize(d.city).includes(normalize(city))) &&
          (filterMode === 'Todas' || d.modalities.includes(filterMode)) &&
          (!filterInsurer || d.insurers.some((i) => normalize(i) === normalize(filterInsurer))) &&
          (!onlyFavorites || state.favorites.includes(d.id))
        );
      }),
    [
      state.doctors,
      state.favorites,
      query,
      country,
      specialty,
      city,
      filterMode,
      filterInsurer,
      onlyFavorites,
    ],
  );

  const availableTimes = (chosenDate: string, selectedDoctor: Doctor | undefined = doctor) => {
    if (!selectedDoctor || !dates.includes(chosenDate)) return [];
    if (new Date(`${chosenDate}T12:00:00`).getDay() === 0) return [];
    return HOURS.filter((hour) => {
      const start = appointmentTimestamp({ date: chosenDate, time: hour });
      const duration = APPOINTMENT_DURATION_MINUTES * 60_000;
      return (
        slotIsFuture(chosenDate, hour) &&
        !state.appointments.some((a) => {
          if (a.id === rescheduleId || a.status !== 'scheduled') return false;
          const otherStart = appointmentTimestamp(a);
          const overlaps = start < otherStart + duration && start + duration > otherStart;
          const samePatient =
            (patientType === 'self' && a.patientId === state.profile.id) ||
            normalize(a.patientName) === normalize(patient.name);
          return overlaps && (a.doctorId === selectedDoctor.id || samePatient);
        })
      );
    });
  };
  const slots = availableTimes(date);
  const eligiblePolicies = useMemo(
    () =>
      state.policies.filter((policy) => {
        return (
          !!doctor &&
          doctor.insurers.some((i) => normalize(i) === normalize(policy.insurer)) &&
          policy.startDate <= date &&
          policy.endDate >= date
        );
      }),
    [state.policies, doctor, date],
  );
  const policy = eligiblePolicies.find((p) => p.id === insuranceId);

  useEffect(() => {
    if (time && !availableTimes(date).includes(time)) setTime('');
  }, [date, doctorId, state.appointments, patient.name, patientType, state.profile.id, clockTick]);
  useEffect(() => {
    if (insuranceId && !eligiblePolicies.some((p) => p.id === insuranceId)) setInsuranceId('');
  }, [eligiblePolicies, insuranceId]);

  const resetFilters = () => {
    setCountry('México');
    setSpecialty('');
    setQuery('');
    setCity('');
    setFilterMode('Todas');
    setFilterInsurer('');
    setOnlyFavorites(false);
  };
  const chooseDoctor = (chosenDoctor: Doctor) => {
    setDoctorId(chosenDoctor.id);
    const requestedMode = filterMode === 'Todas' ? mode : filterMode;
    setMode(
      chosenDoctor.modalities.includes(requestedMode) ? requestedMode : chosenDoctor.modalities[0],
    );
    setTime('');
    setInsuranceId('');
    setProfileTab('Experiencia');
    setConsentDetails(false);
    setConsentDemo(false);
    setConsentPolicy(false);
    setStep(3);
  };
  const updatePatientField = (field: keyof PatientFields, value: string) => {
    const updater = (current: PatientFields) => ({
      ...current,
      [field]: value,
    });
    if (patientType === 'self') setSelfPatient(updater);
    else setOtherPatient(updater);
    setPatientErrors((current) => ({ ...current, [field]: undefined }));
    setConsentDetails(false);
  };
  const validatePatient = () => {
    const errors: PatientErrors = {};
    if (
      patient.name.trim().split(/\s+/).filter(Boolean).length < 2 ||
      patient.name.trim().length < 5
    )
      errors.name = 'Escribe nombre y apellido.';
    if (!validBirthDate(patient.birthDate.trim()))
      errors.birthDate = 'Usa AAAA-MM-DD y una fecha de nacimiento válida.';
    const digits = patient.phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15)
      errors.phone = 'Escribe un teléfono de 10 a 15 dígitos.';
    if (patient.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email.trim()))
      errors.email = 'Revisa el formato del correo.';
    if (reason.trim().length > 500)
      errors.reason = 'El motivo no debe superar los 500 caracteres.';
    setPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const checkSchedule = () => {
    if (
      !doctor ||
      !doctor.modalities.includes(mode) ||
      !time ||
      !availableTimes(date).includes(time)
    ) {
      notify(
        'Selecciona otro horario',
        'El horario ya pasó o no está disponible. Elige una fecha y hora para continuar.',
      );
      setTime('');
      setStep(4);
      return false;
    }
    return true;
  };
  const confirmBooking = () => {
    if (submitting.current || confirmed) return;
    if (!checkSchedule()) return;
    if (paymentMethod === 'Seguro' && !policy) {
      notify(
        'Selecciona tu póliza',
        'Elige una póliza vigente para la fecha de la cita y aceptada por este médico.',
      );
      setStep(5);
      return;
    }
    if (!validatePatient()) {
      setStep(6);
      return;
    }
    if (
      !consentDetails ||
      !consentDemo ||
      (patientType === 'other' && !consentOther) ||
      (paymentMethod === 'Seguro' && !consentPolicy)
    )
      return;
    if (rescheduleId && (!original || original.status !== 'scheduled')) {
      notify('No se puede reprogramar', 'Esta cita ya no está programada. Revisa tu agenda.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const patientNote = `Datos de reserva local: ${patientType === 'self' ? 'para mí' : 'para otra persona'}. Nacimiento: ${patient.birthDate.trim()}. Teléfono: ${patient.phone.trim()}.${patient.email.trim() ? ` Correo: ${patient.email.trim()}.` : ''}`;
      const appointment: NewAppointment = {
        doctorId: doctor!.id,
        date,
        time,
        mode,
        patientName: patient.name.trim(),
        patientId: patientType === 'self' ? state.profile.id : undefined,
        reason: reason.trim(),
        visitType,
        paymentMethod,
        insuranceId: paymentMethod === 'Seguro' ? policy!.id : undefined,
        status: 'scheduled',
        notes: `${original?.notes ? `${original.notes}\n` : ''}${patientNote}\nDatos revisados y alcance de demostración aceptado: ${new Date().toISOString()}.`,
        meetingUrl:
          mode === 'Teleconsulta' && original?.doctorId === doctor!.id
            ? original.meetingUrl
            : undefined,
      };
      let id: string;
      if (rescheduleId) {
        // One store mutation preserves identity and validates the replacement slot atomically.
        updateAppointment(rescheduleId, {
          ...appointment,
          reminderId: undefined,
        });
        id = rescheduleId;
      } else id = addAppointment(appointment);
      setConfirmed({ id, appointment });
      setStep(8);
    } catch (error) {
      notify(
        'No pudimos guardar la cita',
        error instanceof Error ? error.message : 'Revisa los datos y vuelve a intentarlo.',
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 1 || step === 8) {
      onClose();
      return;
    }
    setStep(step - 1);
  };
  const scheduleSelector = (preview = false) => (
    <>
      <View style={s.calendarHeading}>
        <Text style={s.sectionLabel}>Próximos 14 días</Text>
        <Pressable
          testID="booking-calendar-toggle"
          accessibilityRole="button"
          accessibilityState={{ expanded: showCalendar }}
          onPress={() => {
            setCalendarMonth(`${date.slice(0, 7)}-01`);
            setShowCalendar(!showCalendar);
          }}
          style={s.calendarToggle}
        >
          <Icon name="calendar" size={15} color={colors.tealDark} />
          <Text style={s.calendarLink}>{showCalendar ? 'Ver días' : 'Ver Calendario'}</Text>
        </Pressable>
      </View>
      {showCalendar ? (
        <View testID="booking-calendar">
          <View style={s.calendarHeading}>
            {[-1, 1].map((direction) => {
              const target = parseDate(calendarMonth);
              target.setMonth(target.getMonth() + direction);
              const nextMonth = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`;
              const disabled = nextMonth.slice(0, 7) < dates[0].slice(0, 7) || nextMonth.slice(0, 7) > dates[dates.length - 1].slice(0, 7);
              return (
                <View key={direction} style={direction === -1 ? s.calendarPrevious : s.calendarNext}>
                  <Pressable accessibilityRole="button" accessibilityLabel={direction === -1 ? 'Mes anterior' : 'Mes siguiente'} disabled={disabled} accessibilityState={{ disabled }} onPress={() => setCalendarMonth(nextMonth)} style={[s.calendarArrow, disabled && s.dayUnavailable]}>
                    <Text style={s.calendarArrowText}>{direction === -1 ? '‹' : '›'}</Text>
                  </Pressable>
                </View>
              );
            })}
            <Text style={s.calendarMonth}>{monthLabel(calendarMonth)}</Text>
          </View>
          <View style={s.calendarGrid}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => <Text key={label} style={s.calendarWeekday}>{label}</Text>)}
            {Array.from({ length: 42 }, (_, index) => {
              const day = addDays(calendarMonth, index - (parseDate(calendarMonth).getDay() + 6) % 7);
              const enabled = dates.includes(day) && availableTimes(day).length > 0;
              const selected = day === date;
              return (
                <Pressable key={day} testID={`booking-calendar-day-${day}`} accessibilityRole="button" accessibilityLabel={`${dateLabel(day)}${enabled ? '' : ', sin horarios disponibles'}`} accessibilityState={{ selected, disabled: !enabled }} disabled={!enabled} style={s.calendarCell} onPress={() => { setDate(day); setTime(''); setConsentDetails(false); }}>
                  <View style={[s.calendarCircle, selected && s.calendarSelected]}>
                    <Text style={[s.calendarDay, !enabled && s.dayUnavailable, selected && s.calendarSelectedText]}>{parseDate(day).getDate()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dateScroller}
      >
        {dates.map((day) => {
          const parsed = new Date(`${day}T12:00:00`);
          const selected = day === date;
          const hasSlots = availableTimes(day).length > 0;
          return (
            <Pressable
              key={day}
              onPress={() => {
                setDate(day);
                setTime('');
                setConsentDetails(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dateLabel(day)}${hasSlots ? '' : ', sin horarios disponibles'}`}
              accessibilityState={{ selected }}
              style={[s.day, selected && s.daySelected, !hasSlots && s.dayUnavailable]}
            >
              <Text style={[s.dayWeek, selected && s.selectedText]}>
                {parsed.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}
              </Text>
              <Text style={[s.dayNumber, selected && s.selectedText]}>{parsed.getDate()}</Text>
              <Text style={[s.dayMonth, selected && s.selectedText]}>
                {parsed.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>}
      <Text style={s.selectedDate}>{dateLabel(date)}</Text>
      <View style={s.inline}>
        <Icon name="clock" size={15} color={colors.tealDark} />
        <Text style={s.hint}>Hora local de tu dispositivo</Text>
      </View>
      {slots.length ? (
        <View style={s.slotGrid}>
          {slots.map((hour) => (
            <Pressable
              key={hour}
              onPress={() => {
                setTime(hour);
                setConsentDetails(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: time === hour }}
              accessibilityLabel={`Seleccionar ${hour}`}
              style={[s.slot, time === hour && s.slotSelected]}
            >
              <Text style={[s.slotText, time === hour && { color: colors.tealDark }]}>{hour}</Text>
              {time === hour && <Icon name="check" size={15} color={colors.tealDark} />}
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty
          title="Sin horarios este día"
          description="Los horarios pasados, ocupados y los domingos no están disponibles."
          action={dates.some((d) => availableTimes(d).length) ? 'Ver un día disponible' : undefined}
          onAction={() => {
            const next = dates.find((d) => availableTimes(d).length);
            if (next) {
              setDate(next);
              setTime('');
            }
          }}
        />
      )}
      {preview && time ? (
        <Text style={s.hint}>
          Seleccionaste {time}. Podrás revisar este horario en el siguiente paso.
        </Text>
      ) : null}
      <Notice text="Disponibilidad de ejemplo. Esta demostración guarda citas locales y no consulta la agenda real del médico." />
    </>
  );
  const doctorSummary = (compact = false) =>
    doctor ? (
      <Card style={s.doctorSummary}>
        <View style={s.doctorLine}>
          <DoctorPortrait doctor={doctor} size={compact ? 46 : 58} />
          <View style={s.flex}>
            <Text style={s.doctorName}>{doctor.name}</Text>
            <Text style={s.body}>{doctor.specialty}</Text>
            <Text style={s.hint}>
              {doctor.city} · {mode}
            </Text>
          </View>
        </View>
      </Card>
    ) : null;
  const summaryRow = (label: string, value: string, icon: string) => (
    <View style={s.summaryRow}>
      <Icon name={icon} size={18} color={colors.tealDark} />
      <View style={s.flex}>
        <Text style={s.hint}>{label}</Text>
        <Text style={s.summaryValue}>{value}</Text>
      </View>
    </View>
  );

  if (rescheduleId && (!original || original.status !== 'scheduled') && !confirmed) {
    return (
      <Sheet
        title="Reprogramar cita"
        onClose={onClose}
        footer={<BookingFooterButton title="Cerrar" onPress={onClose} />}
      >
        <Empty
          title="Esta cita ya no se puede reprogramar"
          description="La cita no existe o ya no está programada. Vuelve a la agenda para revisar su estado."
        />
      </Sheet>
    );
  }

  let content: React.ReactNode;
  let footer: React.ReactNode;
  if (step === 1) {
    content = (
      <>
        <DirectorySearch
          doctors={state.doctors}
          country={country}
          setCountry={setCountry}
          city={city}
          setCity={setCity}
          specialty={specialty}
          setSpecialty={setSpecialty}
          insurer={filterInsurer}
          setInsurer={setFilterInsurer}
          query={query}
          setQuery={setQuery}
        />
        <Pressable accessibilityRole="button" onPress={() => setMoreFilters(!moreFilters)}>
          <Text style={s.link}>{moreFilters ? 'Menos filtros' : 'Más filtros'}</Text>
        </Pressable>
        {moreFilters && (
          <>
            <View style={s.wrap}>
              {(['Todas', ...MODES] as FilterMode[]).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={filterMode === item}
                  onPress={() => setFilterMode(item)}
                />
              ))}
            </View>
            <Chip
              label="Mis favoritos"
              selected={onlyFavorites}
              onPress={() => setOnlyFavorites(!onlyFavorites)}
            />
          </>
        )}
      </>
    );
    footer = (
      <BookingFooterButton
        title="Buscar médicos"
        icon="search"
        testID="booking-search-submit"
        onPress={() => setStep(2)}
      />
    );
  } else if (step === 2) {
    content = (
      <>
        <Text style={s.resultsSubtitle}>
          {onlyFavorites
            ? `${results.length} ${results.length === 1 ? 'médico guardado' : 'médicos guardados'}`
            : `${results.length} ${results.length === 1 ? 'médico disponible' : 'médicos disponibles'}`}
        </Text>
        <View style={s.resultsTabs}>
          {[false, true].map((favorites) => (
            <Pressable key={String(favorites)} testID={favorites ? 'directory-tab-favorites' : 'directory-tab-all'} accessibilityRole="tab" accessibilityState={{ selected: onlyFavorites === favorites }} onPress={() => setOnlyFavorites(favorites)} style={[s.resultsTab, onlyFavorites === favorites && s.resultsTabActive]}>
              {favorites && <Icon name="heartFilled" size={14} color={colors.tealDark} />}
              <Text style={[s.resultsTabText, onlyFavorites === favorites && s.resultsTabSelected]}>{favorites ? `Favoritos (${state.favorites.length})` : 'Todos'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.resultsFilters}>
          <View style={s.resultsSearch}>
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput testID="directory-results-search" accessibilityLabel="Buscar médico" placeholder="Buscar médico" placeholderTextColor="#819BB6" value={query} onChangeText={setQuery} autoCorrect={false} style={s.resultsInput} />
          </View>
          <Pressable
            testID="directory-edit-filters"
            accessibilityRole="button"
            onPress={() => setStep(1)}
            style={s.editFilters}
          >
            <Icon name="filter" size={14} color={colors.tealDark} />
            <Text style={s.editFiltersText}>Editar filtros</Text>
          </Pressable>
        </View>
        <View>
          {!results.length ? (
            <Empty
              title="No encontramos coincidencias"
              description="Prueba otra especialidad, ciudad o aseguradora."
              action="Restablecer búsqueda"
              onAction={resetFilters}
            />
          ) : (
            results.map((d) => {
              const next = dates
                .map((date) => ({ date, time: availableTimes(date, d)[0] }))
                .find((slot) => slot.time);
              const favorite = state.favorites.includes(d.id);
              return (
                <View key={d.id} style={s.compactRow}>
                  <Pressable
                    testID={'booking-doctor-' + d.id}
                    accessibilityRole="button"
                    accessibilityLabel={'Ver perfil y horarios de ' + d.name}
                    onPress={() => chooseDoctor(d)}
                    style={s.compactDoctor}
                  >
                    <DoctorPortrait doctor={d} size={54} />
                    <View style={s.flex}>
                      <Text style={s.compactName}>{d.name}</Text>
                      <Text style={s.compactMeta}>{d.specialty}</Text>
                      <Text style={s.compactLocation}>
                        {d.address.replace('Consultorio de ejemplo · ', '')} · {money(d.price)}
                      </Text>
                      <Text style={s.compactAvailability}>
                        {next
                          ? dateLabel(next.date) + ' · ' + next.time
                          : 'Sin horarios disponibles'}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    testID={'directory-favorite-' + d.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      (favorite ? 'Quitar de' : 'Agregar a') + ' favoritos a ' + d.name
                    }
                    accessibilityState={{ selected: favorite }}
                    onPress={() => toggleFavorite(d.id)}
                    style={s.compactFavorite}
                  >
                    <Icon
                      name={favorite ? 'heartFilled' : 'heart'}
                      size={19}
                      color={favorite ? colors.tealDark : '#819BB6'}
                    />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </>
    );
    footer = null;
  } else if (step === 3 && doctor) {
    content = (
      <>
        <Card style={s.profileHero}>
          <DoctorPortrait doctor={doctor} size={78} />
          <Text style={s.profileName}>{doctor.name}</Text>
          <Text style={s.body}>{doctor.specialty}</Text>
          <View style={s.inline}>
            <Icon name="location" size={14} color={colors.muted} />
            <Text style={s.hint}>{doctor.city}</Text>
          </View>
          <View style={s.profileMetrics}>
            <Text style={s.metric}>
              {doctor.experience} años<Text style={s.hint}> · experiencia</Text>
            </Text>
            <Text style={s.metric}>
              ★ {doctor.rating.toFixed(1)}
              <Text style={s.hint}> · ejemplo</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: state.favorites.includes(doctor.id),
            }}
            onPress={() => toggleFavorite(doctor.id)}
            style={s.favoritePill}
          >
            <Icon name="heart" size={16} color={colors.tealDark} />
            <Text style={s.link}>
              {state.favorites.includes(doctor.id) ? 'En mis favoritos' : 'Agregar a favoritos'}
            </Text>
          </Pressable>
        </Card>
        <View style={s.tabs}>
          {(['Experiencia', 'Opiniones', 'Horarios'] as ProfileTab[]).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: profileTab === tab }}
              onPress={() => setProfileTab(tab)}
              style={[s.tab, profileTab === tab && s.activeTab]}
            >
              <Text style={[s.tabText, profileTab === tab && s.activeTabText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
        {profileTab === 'Experiencia' ? (
          <>
            <Card>
              <Text style={s.sectionLabel}>Acerca de {doctor.name}</Text>
              <Text style={s.body}>{doctor.bio}</Text>
              <View style={s.divider} />
              <Text style={s.sectionLabel}>Consultorio</Text>
              <Text style={s.body}>{doctor.address}</Text>
              <Text style={s.hint}>{doctor.city}</Text>
            </Card>
            <Card>
              <Text style={s.sectionLabel}>Modalidades</Text>
              <View style={s.wrap}>
                {doctor.modalities.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    selected={mode === item}
                    onPress={() => {
                      setMode(item);
                      setConsentDetails(false);
                    }}
                  />
                ))}
              </View>
              <Text style={s.sectionLabel}>Consulta particular</Text>
              <Text style={s.price}>{money(doctor.price)}</Text>
              <Text style={s.hint}>Sin cobro en esta demostración.</Text>
            </Card>
            <Card>
              <Text style={s.sectionLabel}>Aseguradoras registradas</Text>
              <Text style={s.body}>
                {doctor.insurers.length
                  ? doctor.insurers.join(' · ')
                  : 'Este perfil solo permite consulta particular.'}
              </Text>
              <Text style={s.hint}>La cobertura real requiere validación de tu aseguradora.</Text>
            </Card>
          </>
        ) : profileTab === 'Opiniones' ? (
          <>
            <Notice text="Opiniones ficticias para demostrar el diseño. No representan pacientes reales ni validan la calidad de atención." />
            <Card>
              <View style={s.between}>
                <Text style={s.doctorName}>Opinión de ejemplo 1</Text>
                <Text style={s.link}>★★★★★</Text>
              </View>
              <Text style={s.body}>
                “La información de la cita fue clara y pude organizar mis documentos.”
              </Text>
              <Text style={s.hint}>Paciente ficticio · sin valoración clínica</Text>
            </Card>
            <Card>
              <View style={s.between}>
                <Text style={s.doctorName}>Opinión de ejemplo 2</Text>
                <Text style={s.link}>★★★★☆</Text>
              </View>
              <Text style={s.body}>“Me resultó sencillo revisar el horario y la ubicación.”</Text>
              <Text style={s.hint}>Paciente ficticio · sin valoración clínica</Text>
            </Card>
          </>
        ) : (
          scheduleSelector(true)
        )}
        <Text style={s.demoCaption}>Perfil ficticio para demostración de Klini.</Text>
      </>
    );
    footer = (
      <BookingFooterButton
        title={time ? `Revisar horario de ${time}` : 'Elegir fecha y hora'}
        icon="calendar"
        onPress={() => setStep(4)}
        testID="booking-profile-next"
      />
    );
  } else if (step === 4 && doctor) {
    content = (
      <>
        {doctorSummary(true)}
        <Text style={s.sectionLabel}>Modalidad de la cita</Text>
        <View style={s.wrap}>
          {doctor.modalities.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={mode === item}
              onPress={() => {
                setMode(item);
                setConsentDetails(false);
              }}
            />
          ))}
        </View>
        {scheduleSelector()}
        {time ? (
          <Card style={s.selectionCard}>
            <Icon name="checkCircle" size={21} color={colors.tealDark} />
            <View style={s.flex}>
              <Text style={s.summaryValue}>
                {dateLabel(date)} · {time} h
              </Text>
              <Text style={s.hint}>{mode}</Text>
            </View>
          </Card>
        ) : null}
      </>
    );
    footer = (
      <BookingFooterButton
        title="Continuar con este horario"
        disabled={!time}
        onPress={() => {
          if (checkSchedule()) setStep(5);
        }}
        testID="booking-schedule-next"
      />
    );
  } else if (step === 5 && doctor) {
    content = (
      <>
        {doctorSummary(true)}
        <Text style={s.sectionLabel}>Tipo de consulta</Text>
        <View style={s.wrap}>
          {(['Primera vez', 'Seguimiento'] as const).map((item) => (
            <Chip
              key={item}
              label={item}
              selected={visitType === item}
              onPress={() => setVisitType(item)}
            />
          ))}
        </View>
        <Text style={s.sectionLabel}>¿Cómo deseas registrar el pago?</Text>
        <View style={s.wrap}>
          {(['Particular', 'Seguro'] as const).map((item) => (
            <Chip
              key={item}
              label={item}
              selected={paymentMethod === item}
              onPress={() => {
                setPaymentMethod(item);
                setConsentPolicy(false);
                setConsentDetails(false);
              }}
            />
          ))}
        </View>
        {paymentMethod === 'Particular' ? (
          <Card>
            <Text style={s.hint}>Precio de consulta de ejemplo</Text>
            <Text style={s.price}>{money(doctor.price)}</Text>
            <Text style={s.body}>El pago se acuerda directamente con el consultorio.</Text>
            <Notice text="Klini no solicita tarjetas ni procesa ningún cobro en esta demostración." />
          </Card>
        ) : (
          <>
            <Text style={s.body}>
              Selecciona una póliza aceptada por este perfil y vigente el {dateLabel(date)}.
            </Text>
            {eligiblePolicies.length ? (
              eligiblePolicies.map((item) => (
                <PolicyOption
                  key={item.id}
                  policy={item}
                  selected={insuranceId === item.id}
                  onPress={() => {
                    setInsuranceId(item.id);
                    setConsentPolicy(false);
                    setConsentDetails(false);
                  }}
                />
              ))
            ) : (
              <Empty
                title="No tienes una póliza elegible"
                description="Agrega una póliza vigente en Seguros y vuelve a intentarlo, o registra la cita como particular. No se aplican descuentos automáticos."
                action="Elegir particular"
                onAction={() => setPaymentMethod('Particular')}
              />
            )}
            <Notice text="Asociar una póliza no confirma cobertura, autorización ni pago. No se envía información a una aseguradora." />
          </>
        )}
      </>
    );
    footer = (
      <BookingFooterButton
        title="Continuar con datos del paciente"
        disabled={paymentMethod === 'Seguro' && !policy}
        onPress={() => {
          if (checkSchedule()) setStep(6);
        }}
        testID="booking-service-next"
      />
    );
  } else if (step === 6) {
    content = (
      <>
        <Text style={s.sectionLabel}>¿Para quién es la cita?</Text>
        <View style={s.wrap}>
          <Chip
            label="Para mí"
            selected={patientType === 'self'}
            onPress={() => {
              setPatientType('self');
              setPatientErrors({});
              setConsentDetails(false);
            }}
          />
          <Chip
            label="Para otra persona"
            selected={patientType === 'other'}
            onPress={() => {
              setPatientType('other');
              setPatientErrors({});
              setConsentDetails(false);
            }}
          />
        </View>
        <Text style={s.hint}>
          Los datos de este formulario se guardan únicamente con la cita; no modifican tu perfil.
        </Text>
        <Card>
          <TextField
            label="Nombre y apellidos *"
            value={patient.name}
            onChangeText={(value) => updatePatientField('name', value)}
            placeholder="Nombre completo del paciente"
            testID="booking-patient-name"
          />
          <FieldError value={patientErrors.name} />
          <TextField
            label="Fecha de nacimiento *"
            value={patient.birthDate}
            onChangeText={(value) => updatePatientField('birthDate', value)}
            placeholder="AAAA-MM-DD"
            testID="booking-patient-birthdate"
          />
          <FieldError value={patientErrors.birthDate} />
          <TextField
            label="Teléfono de contacto *"
            value={patient.phone}
            onChangeText={(value) => updatePatientField('phone', value)}
            keyboardType="phone-pad"
            placeholder="10 dígitos o código de país"
            testID="booking-patient-phone"
          />
          <FieldError value={patientErrors.phone} />
          <TextField
            label="Correo electrónico (opcional)"
            value={patient.email}
            onChangeText={(value) => updatePatientField('email', value)}
            keyboardType="email-address"
            placeholder="nombre@correo.com"
          />
          <FieldError value={patientErrors.email} />
        </Card>
        <TextField
          label="Motivo de consulta (opcional)"
          value={reason}
          onChangeText={(value) => {
            setReason(value);
            setPatientErrors((current) => ({ ...current, reason: undefined }));
            setConsentDetails(false);
          }}
          placeholder="Describe brevemente el motivo de la cita"
          multiline
          testID="booking-reason"
        />
        <FieldError value={patientErrors.reason} />
        <Text style={[s.hint, reason.length > 500 && s.error]}>
          {reason.length}/500 caracteres
        </Text>
        {patientType === 'other' && (
          <Notice text="Registra datos de otra persona solo si tienes su autorización o eres su representante. No incluyas información clínica innecesaria." />
        )}
      </>
    );
    footer = (
      <BookingFooterButton
        title="Revisar mi reserva"
        onPress={() => {
          if (validatePatient() && checkSchedule()) setStep(7);
        }}
        testID="booking-patient-next"
      />
    );
  } else if (step === 7 && doctor) {
    content = (
      <>
        {rescheduleId && (
          <Notice text="Al confirmar, se actualizará la cita existente en una sola operación. Se conservará su identificador y no se creará un duplicado." />
        )}
        {doctorSummary()}
        <Card>
          {summaryRow('Fecha y hora', `${dateLabel(date)} · ${time} h`, 'calendar')}
          {summaryRow('Modalidad', mode, mode === 'Teleconsulta' ? 'video' : 'location')}
          {mode === 'Presencial' &&
            summaryRow('Ubicación', `${doctor.address}, ${doctor.city}`, 'location')}
          {summaryRow('Paciente', patient.name.trim(), 'user')}
          {summaryRow('Consulta', visitType, 'file')}
          {summaryRow(
            'Pago registrado',
            paymentMethod === 'Seguro'
              ? `${policy?.insurer ?? 'Selecciona una póliza'} · ${policy ? maskPolicyNumber(policy.number) : ''}`
              : `Particular · ${money(doctor.price)}`,
            'creditCard',
          )}
          <View style={s.divider} />
          <Text style={s.hint}>Motivo</Text>
          <Text style={s.body}>{reason.trim() || 'No especificado'}</Text>
        </Card>
        <View style={s.editLinks}>
          <Pressable accessibilityRole="button" onPress={() => setStep(4)}>
            <Text style={s.link}>Editar horario</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setStep(5)}>
            <Text style={s.link}>Editar pago</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setStep(6)}>
            <Text style={s.link}>Editar paciente</Text>
          </Pressable>
        </View>
        <CheckRow
          checked={consentDetails}
          onPress={() => setConsentDetails(!consentDetails)}
          label="Revisé el médico, la fecha, el horario y los datos del paciente."
          testID="booking-consent-details"
        />
        <CheckRow
          checked={consentDemo}
          onPress={() => setConsentDemo(!consentDemo)}
          label="Entiendo que esta reserva es una demostración local: no contacta al médico ni garantiza una cita real."
          testID="booking-consent-demo"
        />
        {patientType === 'other' && (
          <CheckRow
            checked={consentOther}
            onPress={() => setConsentOther(!consentOther)}
            label="Tengo autorización para registrar los datos de esta persona o soy su representante."
          />
        )}
        {paymentMethod === 'Seguro' && (
          <CheckRow
            checked={consentPolicy}
            onPress={() => setConsentPolicy(!consentPolicy)}
            label="Autorizo asociar la póliza seleccionada a este registro local y entiendo que no confirma cobertura."
          />
        )}
        <Text style={s.hint}>
          Marca las confirmaciones para guardar. No se realizará ningún cobro.
        </Text>
      </>
    );
    footer = (
      <BookingFooterButton
        title={
          saving
            ? 'Guardando…'
            : rescheduleId
              ? 'Confirmar reprogramación'
              : 'Confirmar cita de demostración'
        }
        icon="check"
        disabled={
          saving ||
          !consentDetails ||
          !consentDemo ||
          (patientType === 'other' && !consentOther) ||
          (paymentMethod === 'Seguro' && !consentPolicy)
        }
        onPress={confirmBooking}
        testID="booking-confirm"
      />
    );
  } else if (step === 8 && confirmed) {
    const bookedDoctor = state.doctors.find((d) => d.id === confirmed.appointment.doctorId);
    content = (
      <>
        <View style={s.successHero}>
          <View style={s.successIcon}>
            <Icon name="check" size={38} color={colors.tealDark} />
          </View>
          <Text style={s.hero}>
            {rescheduleId ? 'Tu cita se actualizó' : 'Todo está organizado'}
          </Text>
          <Text style={[s.body, s.center]}>
            {storageError
              ? 'La cita está disponible en esta sesión.'
              : 'La cita se guardó en tu agenda de Klini.'}
          </Text>
        </View>
        {storageError && (
          <Text accessibilityRole="alert" style={s.error}>
            {storageError}
          </Text>
        )}
        <Card>
          {summaryRow(
            'Médico',
            `${bookedDoctor?.name ?? ''} · ${bookedDoctor?.specialty ?? ''}`,
            'user',
          )}
          {summaryRow(
            'Fecha y hora',
            `${dateLabel(confirmed.appointment.date)} · ${confirmed.appointment.time} h`,
            'calendar',
          )}
          {summaryRow(
            'Modalidad',
            confirmed.appointment.mode,
            confirmed.appointment.mode === 'Teleconsulta' ? 'video' : 'location',
          )}
          {summaryRow('Paciente', confirmed.appointment.patientName, 'user')}
          <View style={s.divider} />
          <Text style={s.hint}>Referencia local</Text>
          <Text selectable style={s.reference}>
            {confirmed.id}
          </Text>
        </Card>
        <Notice text="Confirmación local de demostración. No se ha enviado una solicitud al consultorio, ni un correo, ni una reclamación de seguro." />
        <Text style={s.hint}>
          En tu agenda podrás revisar, reprogramar o cancelar este registro.
        </Text>
      </>
    );
    footer = (
      <>
        <BookingFooterButton
          title="Ver en mi agenda"
          icon="calendar"
          onPress={() => onBooked(confirmed.id)}
          testID="booking-view-agenda"
        />
        <BookingFooterButton title="Volver al inicio" onPress={onClose} />
      </>
    );
  } else {
    content = (
      <Empty
        title="Selecciona un médico"
        description="Regresa al directorio para continuar con tu reserva."
        action="Abrir directorio"
        onAction={() => setStep(2)}
      />
    );
    footer = <BookingFooterButton title="Volver al directorio" onPress={() => setStep(2)} />;
  }

  return (
    <Sheet
      title={STEP_TITLES[step - 1]}
      onClose={onClose}
      onBack={step > 1 && step < 8 ? goBack : undefined}
      step={step}
      footer={footer ? <View style={s.footer}>{footer}</View> : undefined}
    >
      <View style={s.content}>
        {step > 2 && step < 8 && (
          <View style={s.progress}>
            <Text style={s.progressText}>
              {rescheduleId ? 'REPROGRAMAR' : 'NUEVA CITA'} · PASO {step} DE 8
            </Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(step / 8) * 100}%` }]} />
            </View>
          </View>
        )}
        {content}
      </View>
    </Sheet>
  );
}

function maskPolicyNumber(number: string) {
  return number.length > 4 ? `•••• ${number.slice(-4)}` : number;
}
function FieldError({ value }: { value?: string }) {
  return value ? (
    <Text accessibilityRole="alert" style={s.error}>
      {value}
    </Text>
  ) : null;
}
function Notice({ text }: { text: string }) {
  return (
    <View style={s.notice}>
      <Icon name="info" size={17} color={colors.tealDark} />
      <Text style={s.noticeText}>{text}</Text>
    </View>
  );
}
function CheckRow({
  checked,
  onPress,
  label,
  testID,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      testID={testID}
      style={s.checkRow}
    >
      <View style={[s.checkbox, checked && s.checkboxChecked]}>
        {checked && <Icon name="check" size={15} color={colors.white} />}
      </View>
      <Text style={[s.body, s.flex]}>{label}</Text>
    </Pressable>
  );
}
function PolicyOption({
  policy,
  selected,
  onPress,
}: {
  policy: Policy;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Póliza ${policy.insurer}, termina en ${policy.number.slice(-4)}`}
      onPress={onPress}
      style={[s.policy, selected && s.policySelected]}
    >
      <View style={s.doctorLine}>
        <Icon name="shield" size={25} color={colors.tealDark} />
        <View style={s.flex}>
          <Text style={s.doctorName}>{policy.insurer}</Text>
          <Text style={s.body}>{maskPolicyNumber(policy.number)}</Text>
          <Text style={s.hint}>{policy.holder}</Text>
          <Text style={s.hint}>Vigente hasta {dateLabel(policy.endDate)}</Text>
        </View>
        <View style={[s.radio, selected && s.radioSelected]}>
          {selected && <View style={s.radioDot} />}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  resultsSubtitle: { color: '#819BB6', fontSize: 13, marginTop: -13 },
  resultsTabs: { flexDirection: 'row', alignSelf: 'center', width: 250, maxWidth: '100%', backgroundColor: '#EDF1F7', borderRadius: 22, padding: 4 },
  resultsTab: { flex: 1, minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 18 },
  resultsTabActive: { backgroundColor: 'white' },
  resultsTabText: { fontSize: 12, color: colors.muted },
  resultsTabSelected: { color: colors.tealDark, fontWeight: '600' },
  resultsSearch: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, height: 38, borderRadius: 22, backgroundColor: '#EDF1F7' },
  resultsInput: { flex: 1, minWidth: 0, height: 38, paddingVertical: 0, fontSize: 12, color: colors.navy },
  resultsFilters: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  editFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    minHeight: 36,
    borderRadius: 20,
    backgroundColor: '#EFFAFA',
  },
  editFiltersText: { color: colors.tealDark, fontSize: 11 },
  filterSummary: {
    flex: 1,
    color: '#819BB6',
    fontSize: 11,
    borderLeftWidth: 1,
    borderLeftColor: '#DCE7EE',
    paddingLeft: 10,
  },
  compactRow: { borderTopWidth: 1, borderTopColor: '#E2EBF0', position: 'relative' },
  compactDoctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 17,
    minHeight: 106,
    paddingRight: 35,
  },
  compactName: { fontSize: 14, fontWeight: '700', color: colors.navy, paddingRight: 25 },
  compactMeta: { fontSize: 12, color: '#819BB6', marginTop: 3 },
  compactLocation: { fontSize: 10, color: '#819BB6', marginTop: 5, lineHeight: 15 },
  compactAvailability: { fontSize: 11, color: colors.teal, marginTop: 4 },
  compactFavorite: {
    position: 'absolute',
    right: -8,
    top: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { gap: 14, paddingBottom: 8 },
  footer: { gap: 9 },
  flex: { flex: 1, minWidth: 0 },
  progress: { gap: 8, marginBottom: 2 },
  progressText: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  progressFill: { height: 3, borderRadius: 3, backgroundColor: colors.teal },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.tealDark,
  },
  hero: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.navy,
  },
  body: { color: colors.navy, fontSize: 14, lineHeight: 21 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  center: { textAlign: 'center' },
  searchCard: { gap: 14, marginTop: 4 },
  sectionLabel: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 1,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 5,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.mint,
    borderRadius: 14,
    padding: 13,
  },
  noticeText: { flex: 1, color: colors.tealDark, fontSize: 12, lineHeight: 18 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  link: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  chipScroller: { gap: 8, paddingVertical: 1, paddingRight: 8 },
  resultCount: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  resultCard: { gap: 12 },
  doctorLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorName: {
    color: colors.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  favorite: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.mint,
  },
  doctorMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metric: {
    color: colors.navy,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  doctorSummary: { gap: 8 },
  profileHero: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  profileName: {
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.navy,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
  profileMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
    marginTop: 7,
  },
  favoritePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    backgroundColor: colors.mint,
    paddingVertical: 8,
    paddingHorizontal: 13,
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: 264,
    maxWidth: '100%',
    borderRadius: 13,
    backgroundColor: colors.mint,
    padding: 4,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeTab: { backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  activeTabText: { color: colors.navy, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  price: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  demoCaption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  calendarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
  calendarToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  calendarLink: { color: colors.tealDark, fontSize: 12, fontWeight: '600' },
  calendarPrevious: { zIndex: 1 },
  calendarNext: { zIndex: 1 },
  calendarArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  calendarArrowText: { color: colors.navy, fontSize: 28 },
  calendarMonth: { position: 'absolute', left: 44, right: 44, textAlign: 'center', textTransform: 'capitalize', color: colors.navy, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285714%', textAlign: 'center', color: colors.muted, fontSize: 11, paddingVertical: 8 },
  calendarCell: { width: '14.285714%', height: 44, alignItems: 'center', justifyContent: 'center' },
  calendarCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  calendarSelected: { borderColor: '#2456C4' },
  calendarSelectedText: { color: colors.navy, fontWeight: '700' },
  calendarDay: { color: colors.navy, fontSize: 13 },
  dateScroller: { gap: 8, paddingVertical: 3, paddingRight: 8 },
  day: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
  },
  daySelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayUnavailable: { opacity: 0.55 },
  dayWeek: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  dayNumber: {
    color: colors.navy,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '600',
  },
  dayMonth: { color: colors.muted, fontSize: 10, textTransform: 'capitalize' },
  selectedText: { color: colors.white },
  selectedDate: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  slot: {
    minWidth: 85,
    flexGrow: 1,
    maxWidth: '32%',
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
  },
  slotSelected: {
    borderColor: '#DDF3F2',
    backgroundColor: '#DDF3F2',
  },
  slotText: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  selectionCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  policy: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    padding: 15,
    backgroundColor: colors.white,
  },
  policySelected: {
    borderColor: colors.tealDark,
    backgroundColor: colors.mint,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.tealDark },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.tealDark,
  },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 9,
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  editLinks: {
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
    paddingVertical: 3,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 8,
  },
  checkbox: {
    marginTop: 1,
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.tealDark,
    borderColor: colors.tealDark,
  },
  successHero: { alignItems: 'center', gap: 13, paddingVertical: 14 },
  successIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  reference: { fontSize: 12, color: colors.navy, lineHeight: 19, marginTop: 4 },
});

