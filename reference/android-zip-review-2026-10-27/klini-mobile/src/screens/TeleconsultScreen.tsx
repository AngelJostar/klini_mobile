import TeleconsultAppointment from './TeleconsultAppointment';
import Sheet from '../components/TeleconsultPopup';
import DoctorPortrait from '../components/DoctorPortrait';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Icon,
  Row,
  SectionTitle,
  TextField,
  colors,
  notify,
} from '../components/ui';
import { useAppStore } from '../state/store';
import type { Appointment, ClinicalRecord } from '../domain/types';
import { dateLabel, todayISO } from '../domain/dates';
import { exportText, openAttachment, pickAttachment } from '../services/files';

type Props = {
  onClose: () => void;
  onBook: () => void;
  onReschedule: (id: string) => void;
  appointmentId?: string;
};
type Page = 'appointment' | 'list' | 'detail' | 'prepare' | 'room' | 'summary' | 'saved';
type SessionKind = 'demo' | 'external';
type Checks = { sound: boolean; camera: boolean; privacy: boolean };
type SavedSummary = {
  title: string;
  text: string;
  completed: boolean;
  completionError?: string;
};

function displayDate(value: string) {
  try {
    return dateLabel(value);
  } catch {
    return value;
  }
}

function durationText(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function messageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/** Only explicit HTTPS links can leave the local application. */
function meetingLink(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password)
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function CheckRow({
  label,
  detail,
  checked,
  onPress,
  testID,
  disabled = false,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.checkRow,
        pressed && { opacity: 0.65 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={[local.checkbox, checked && local.checkboxSelected]}>
        {checked && <Icon name="check" size={16} color={colors.white} />}
      </View>
      <View style={local.flex}>
        <Text style={local.label}>{label}</Text>
        {detail && <Text style={local.small}>{detail}</Text>}
      </View>
    </Pressable>
  );
}

export default function TeleconsultScreen({
  onClose: closeParent,
  onBook,
  onReschedule,
  appointmentId,
}: Props) {
  const { state, ready, addMessage, addRecord, updateAppointment, updateSettings } = useAppStore();
  const [page, setPage] = useState<Page>(appointmentId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState<string | null>(appointmentId || null);
  const [filter, setFilter] = useState<'scheduled' | 'history'>('scheduled');
  const [checks, setChecks] = useState<Checks>({
    sound: false,
    camera: false,
    privacy: false,
  });
  const [note, setNote] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [pickingFile, setPickingFile] = useState(false);
  const [working, setWorking] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [externalOpened, setExternalOpened] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessionKind, setSessionKind] = useState<SessionKind>('demo');
  const [summaryNote, setSummaryNote] = useState('');
  const [completeAppointment, setCompleteAppointment] = useState(false);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  const appointments = useMemo(
    () => state.appointments.filter((item) => item.mode === 'Teleconsulta'),
    [state.appointments],
  );
  const selected = appointments.find((item) => item.id === selectedId);
  const doctor = selected && state.doctors.find((item) => item.id === selected.doctorId);
  const scheduled = selected?.status === 'scheduled';
  const savedUrl = selected?.meetingUrl?.trim() || state.settings.meetingBaseUrl?.trim() || '';
  const validSavedUrl = meetingLink(savedUrl);
  const prepared = checks.sound && checks.camera && checks.privacy;
  const notes = state.messages.filter(
    (item) => item.appointmentId === selectedId && item.author === 'patient',
  );
  const visibleNotes = showAllNotes ? notes : notes.slice(-5);
  const files = [...state.records]
    .filter((item) => !!item.attachment)
    .sort((a, b) => b.date.localeCompare(a.date));
  const initials =
    state.profile.name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('') || 'Tú';
  const visibleAppointments = appointments
    .filter((item) =>
      filter === 'scheduled' ? item.status === 'scheduled' : item.status !== 'scheduled',
    )
    .sort((a, b) =>
      filter === 'scheduled'
        ? `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
        : `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    );

  useEffect(() => {
    if (appointmentId) {
      setSelectedId(appointmentId);
      setPage('detail');
    }
  }, [appointmentId]);

  useEffect(() => {
    setUrlDraft(selected?.meetingUrl || state.settings.meetingBaseUrl || '');
    setUrlError('');
    setNote('');
    setShowAllNotes(false);
    setShowAllFiles(false);
    setChecks({ sound: false, camera: false, privacy: false });
    setExternalOpened(false);
    setSessionStart(null);
    setElapsed(0);
    setSavedSummary(null);
    setSummaryNote('');
    setCompleteAppointment(false);
    setSaveAsDefault(false);
    // Keep a user's in-progress link draft while editing the same appointment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (page !== 'room' || sessionStart === null) return;
    const tick = () => setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [page, sessionStart]);

  useEffect(() => {
    if (page === 'room' && !scheduled) {
      setSessionStart(null);
      setPage('detail');
    }
  }, [page, scheduled]);

  function selectAppointment(item: Appointment) {
    setSelectedId(item.id);
    setPage('appointment');
  }

  function onClose() {
    setSessionStart(null);
    closeParent();
  }

  function backToDetail() {
    setSessionStart(null);
    setPage('detail');
  }

  function backToList() {
    setSessionStart(null);
    setSelectedId(null);
    setPage('list');
  }

  function prepareAppointment() {
    if (!scheduled) {
      notify('Cita no disponible', 'Solo puedes entrar a una teleconsulta programada.');
      return;
    }
    setPage('prepare');
  }

  function enterDemo() {
    if (!scheduled || !prepared) return;
    setMicrophoneOn(true);
    setCameraOn(true);
    setElapsed(0);
    setSessionKind('demo');
    setSessionStart(Date.now());
    setCompleteAppointment(false);
    setPage('room');
  }

  function endDemo() {
    if (sessionStart !== null) setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    setSessionStart(null);
    setSessionKind('demo');
    setSummaryNote('');
    setCompleteAppointment(false);
    setPage('summary');
  }

  function addPatientNote() {
    const text = note.trim();
    if (!selected || !text) return;
    try {
      addMessage({ appointmentId: selected.id, author: 'patient', text });
      setNote('');
    } catch (error) {
      notify('No se guardó tu nota', error instanceof Error ? error.message : 'Intenta otra vez.');
    }
  }

  async function attachFile() {
    if (!selected || pickingFile) return;
    setPickingFile(true);
    try {
      const attachment = await pickAttachment();
      if (!attachment) return;
      addRecord({
        type: 'Nota',
        title: `Adjunto de teleconsulta · ${attachment.name}`,
        date: todayISO(),
        doctorName: 'Añadido por ti',
        description: `Archivo personal guardado para la cita del ${displayDate(selected.date)} a las ${selected.time} h${doctor ? ` con ${doctor.name}` : ''}. No se ha enviado a un profesional.`,
        attachment,
      });
      notify(
        'Documento guardado',
        'El archivo ya está en tu expediente local. No se ha enviado a un médico.',
      );
    } catch (error) {
      notify(
        'No se pudo adjuntar',
        error instanceof Error ? error.message : 'Vuelve a elegir el archivo.',
      );
    } finally {
      setPickingFile(false);
    }
  }

  async function viewFile(record: ClinicalRecord) {
    if (!record.attachment) return;
    try {
      await openAttachment(record.attachment);
    } catch (error) {
      notify(
        'No se pudo abrir',
        error instanceof Error ? error.message : 'El archivo no está disponible.',
      );
    }
  }

  function saveLink() {
    if (!selected) return;
    const url = meetingLink(urlDraft);
    if (!url) {
      setUrlError(
        'Escribe una dirección completa que empiece con https:// y no incluya credenciales.',
      );
      return;
    }
    try {
      updateAppointment(selected.id, { meetingUrl: url });
      if (saveAsDefault) updateSettings({ meetingBaseUrl: url });
      setUrlDraft(url);
      setUrlError('');
      notify(
        'Enlace guardado',
        saveAsDefault
          ? 'Quedó guardado para esta cita y como enlace general. Solo se abrirá cuando tú lo elijas.'
          : 'Quedó guardado para esta cita. Solo se abrirá cuando tú lo elijas.',
      );
    } catch (error) {
      notify(
        'No se guardó el enlace',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  }

  function clearAppointmentLink() {
    if (!selected) return;
    try {
      updateAppointment(selected.id, { meetingUrl: '' });
      setUrlDraft(state.settings.meetingBaseUrl || '');
      setUrlError('');
    } catch (error) {
      notify('No se pudo quitar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  }

  function clearGeneralLink() {
    try {
      updateSettings({ meetingBaseUrl: '' });
      if (!selected?.meetingUrl) setUrlDraft('');
      setUrlError('');
    } catch (error) {
      notify('No se pudo quitar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  }

  async function openMeeting() {
    if (!scheduled || !prepared || working) return;
    const url = meetingLink(savedUrl);
    if (!url) {
      notify(
        'Revisa el enlace',
        'Guarda una dirección HTTPS válida para esta cita o en tus ajustes.',
      );
      return;
    }
    setWorking(true);
    try {
      await Linking.openURL(url);
      setExternalOpened(true);
    } catch (error) {
      notify(
        'No se pudo abrir la reunión',
        error instanceof Error ? error.message : 'Revisa la dirección e inténtalo otra vez.',
      );
    } finally {
      setWorking(false);
    }
  }

  function closeExternalAppointment() {
    if (!scheduled) return;
    setSessionKind('external');
    setElapsed(0);
    setSummaryNote('');
    setCompleteAppointment(false);
    setPage('summary');
  }

  function saveSessionSummary() {
    if (!selected || working) return;
    if (completeAppointment && selected.status !== 'scheduled') {
      notify(
        'La cita cambió',
        'Esta cita ya no está programada. Puedes guardar el resumen sin cambiar su estado.',
      );
      setCompleteAppointment(false);
      return;
    }
    setWorking(true);
    const title =
      sessionKind === 'demo'
        ? 'Resumen de teleconsulta · Demostración'
        : 'Nota personal de teleconsulta';
    const text = [
      sessionKind === 'demo'
        ? 'Sesión local de demostración. No hubo conexión ni comunicación con un médico.'
        : 'Resumen añadido por la persona. Klini no verificó la reunión externa ni su contenido.',
      `Cita registrada: ${displayDate(selected.date)} a las ${selected.time} h.`,
      `Profesional asociado a la cita: ${doctor?.name || 'Sin profesional disponible'}.`,
      `Paciente: ${selected.patientName}.`,
      ...(sessionKind === 'demo' ? [`Duración de la demostración: ${durationText(elapsed)}.`] : []),
      ...(summaryNote.trim() ? [`Mis notas: ${summaryNote.trim()}`] : []),
      'Este registro es una nota personal; no es una nota médica ni una receta.',
    ].join('\n\n');
    try {
      addRecord({
        type: 'Nota',
        title,
        date: todayISO(),
        doctorName: 'Añadido por ti',
        description: text,
      });
      let completionError: string | undefined;
      if (completeAppointment) {
        try {
          updateAppointment(selected.id, { status: 'completed' });
        } catch (error) {
          completionError =
            error instanceof Error ? error.message : 'No se pudo actualizar la cita.';
        }
      }
      setSavedSummary({
        title,
        text,
        completed: completeAppointment && !completionError,
        completionError,
      });
      setPage('saved');
    } catch (error) {
      notify(
        'No se guardó el resumen',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function exportSummary() {
    if (!savedSummary || working) return;
    setWorking(true);
    try {
      await exportText(
        `Klini_teleconsulta_${todayISO()}.txt`,
        `${savedSummary.title}\n\n${savedSummary.text}`,
      );
    } catch (error) {
      notify('No se pudo exportar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setWorking(false);
    }
  }

  function notesAndFiles() {
    return (
      <>
        <SectionTitle>Mis notas de esta cita</SectionTitle>
        <Text style={local.small}>
          Son notas personales guardadas aquí. No hay chat con un médico ni se envían mensajes.
        </Text>
        <View style={local.notesList}>
          {visibleNotes.length === 0 ? (
            <Text style={local.emptyNote}>Todavía no has añadido notas.</Text>
          ) : (
            visibleNotes.map((message) => (
              <View key={message.id} style={local.noteBubble}>
                <Text style={local.noteAuthor}>Tú · {messageTime(message.createdAt)}</Text>
                <Text style={local.body}>{message.text}</Text>
              </View>
            ))
          )}
        </View>
        {notes.length > 5 && !showAllNotes && (
          <Button
            title={`Ver mis ${notes.length} notas`}
            secondary
            onPress={() => setShowAllNotes(true)}
          />
        )}
        <TextField
          label="Escribe una nota personal"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={3000}
          placeholder="Lo que quieres recordar de esta cita…"
          testID="teleconsult-note-input"
        />
        <Button
          title="Guardar nota"
          icon="send"
          secondary
          disabled={!note.trim()}
          onPress={addPatientNote}
          testID="teleconsult-save-note"
        />
        <SectionTitle>Documentos en tu expediente</SectionTitle>
        <Text style={local.small}>
          Estos archivos permanecen en tu expediente local. Para compartirlos en una reunión
          externa, tendrás que elegirlos en ese servicio.
        </Text>
        <Button
          title={pickingFile ? 'Seleccionando archivo…' : 'Adjuntar un archivo a mi expediente'}
          icon="attachment"
          secondary
          disabled={pickingFile}
          onPress={() => {
            void attachFile();
          }}
          testID="teleconsult-attach"
        />
        {files.length > 0 && (
          <Card>
            {(showAllFiles ? files : files.slice(0, 4)).map((record, index) => (
              <View key={record.id}>
                {index > 0 && <View style={local.divider} />}
                <Row
                  title={record.attachment?.name || record.title}
                  subtitle={`${displayDate(record.date)} · Abrir archivo local`}
                  icon="document"
                  onPress={() => {
                    void viewFile(record);
                  }}
                />
              </View>
            ))}
          </Card>
        )}
        {files.length > 4 && !showAllFiles && (
          <Button
            title={`Ver mis ${files.length} archivos`}
            secondary
            onPress={() => setShowAllFiles(true)}
          />
        )}
        {files.length === 0 && (
          <Text style={local.emptyNote}>Aún no hay archivos adjuntos en tu expediente.</Text>
        )}
      </>
    );
  }

  if (!ready)
    return (
      <Sheet title="Teleconsulta" onClose={onClose}>
        <View style={local.loading}>
          <ActivityIndicator color={colors.tealDark} />
          <Text style={local.body}>Cargando tus teleconsultas…</Text>
        </View>
      </Sheet>
    );

  if (page === 'list')
    return (
      <Sheet
        title="Teleconsulta"
        onClose={onClose}
        compact
        footer={
          <Pressable
            testID="teleconsult-book"
            accessibilityRole="button"
            onPress={onBook}
            style={local.bookAnother}
          >
            <Icon name="plus" size={20} color={colors.teal} />
            <Text style={local.bookAnotherText}>Agendar cita</Text>
          </Pressable>
        }
      >
        <View style={local.segment}>
          {(
            [
              { value: 'scheduled', label: 'Próximas' },
              { value: 'history', label: 'Anteriores' },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.value}
              testID={'teleconsult-tab-' + tab.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === tab.value }}
              aria-selected={filter === tab.value}
              onPress={() => setFilter(tab.value)}
              style={[local.segmentTab, filter === tab.value && local.segmentActive]}
            >
              <Text
                style={[
                  local.segmentText,
                  filter === tab.value && { color: colors.navy, fontWeight: '600' },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {visibleAppointments.length === 0 ? (
          <Empty
            title={
              filter === 'scheduled'
                ? 'No tienes próximas teleconsultas'
                : 'Todavía no tienes teleconsultas anteriores'
            }
          />
        ) : (
          visibleAppointments.map((item, index) => {
            const professional = state.doctors.find((d) => d.id === item.doctorId);
            const status =
              item.status === 'cancelled'
                ? 'Cancelada'
                : item.status === 'completed'
                  ? 'Completada'
                  : filter === 'history'
                    ? 'Finalizada sin registro'
                    : 'Confirmada';
            return (
              <Pressable
                key={item.id}
                testID={'teleconsult-appointment-' + item.id}
                accessibilityRole="button"
                accessibilityLabel={
                  'Ver teleconsulta del ' +
                  displayDate(item.date) +
                  ' con ' +
                  (professional?.name || 'profesional')
                }
                onPress={() => selectAppointment(item)}
                style={local.simpleAppointment}
              >
                <Text style={local.nextLabel}>
                  {filter === 'scheduled'
                    ? index === 0
                      ? 'Próxima cita'
                      : 'Cita programada'
                    : 'Cita anterior'}
                </Text>
                <View style={local.simpleDate}>
                  <Text style={local.simpleDateText}>
                    {new Date(item.date + 'T12:00:00').toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={local.simpleTime}>{item.time} h</Text>
                </View>
                <View style={local.simpleDoctor}>
                  {professional ? (
                    <DoctorPortrait doctor={professional} size={50} />
                  ) : (
                    <Icon name="doctor" size={36} />
                  )}
                  <View style={local.flex}>
                    <Text style={local.simpleDoctorName}>
                      {professional?.name || 'Profesional no disponible'}
                    </Text>
                    <Text style={local.simpleSpecialty}>
                      {professional?.specialty || 'Teleconsulta'} · 30 min
                    </Text>
                  </View>
                </View>
                <View style={local.simplePatient}>
                  <Text style={local.patientNameText}>{item.patientName}</Text>
                  <View style={local.statusLine}>
                    <View
                      style={[
                        local.statusDot,
                        item.status === 'cancelled' && { backgroundColor: colors.danger },
                      ]}
                    />
                    <Text
                      style={[
                        local.statusText,
                        item.status === 'cancelled' && { color: colors.danger },
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </Sheet>
    );

  if (!selected)
    return (
      <Sheet title="Teleconsulta" onClose={onClose} onBack={backToList}>
        <Empty
          title="Esta teleconsulta no está disponible"
          description="La cita puede haberse eliminado o tener otra modalidad. Puedes elegir otra en tu agenda de teleconsultas."
          action="Ver mis teleconsultas"
          onAction={backToList}
        />
        <Button title="Agendar una teleconsulta" secondary onPress={onBook} />
      </Sheet>
    );

  if (page === 'appointment')
    return (
      <TeleconsultAppointment
        appointment={selected}
        doctor={doctor}
        onClose={onClose}
        onBack={backToList}
        onReschedule={onReschedule}
      />
    );

  if (page === 'saved' && savedSummary)
    return (
      <Sheet
        title="Resumen guardado"
        onClose={onClose}
        onBack={backToDetail}
        footer={<Button title="Volver a mis teleconsultas" onPress={backToList} />}
      >
        <View style={local.success}>
          <Icon name="checkCircle" size={48} color={colors.tealDark} />
          <Text style={local.title}>Ya está en tu expediente.</Text>
        </View>
        <Card>
          <Text style={local.label}>{savedSummary.title}</Text>
          <Text style={[local.body, { marginTop: 12 }]}>{savedSummary.text}</Text>
        </Card>
        <Text style={local.small}>
          {savedSummary.completed
            ? 'Marcaste esta cita como completada en tu agenda local.'
            : 'El estado de tu cita no se modificó.'}
        </Text>
        {!!savedSummary.completionError && (
          <Text style={local.error}>
            El resumen se guardó, pero no se actualizó la cita: {savedSummary.completionError}
          </Text>
        )}
        <Button
          title="Exportar mi resumen"
          icon="download"
          secondary
          disabled={working}
          onPress={() => {
            void exportSummary();
          }}
        />
      </Sheet>
    );

  if (page === 'summary')
    return (
      <Sheet
        title={sessionKind === 'demo' ? 'Finalizar demostración' : 'Registrar cierre de cita'}
        onClose={onClose}
        onBack={backToDetail}
        footer={
          <Button
            title={completeAppointment ? 'Guardar y completar cita' : 'Guardar resumen'}
            disabled={working}
            onPress={saveSessionSummary}
            testID="teleconsult-save-summary"
          />
        }
      >
        <Text style={local.title}>Tu siguiente paso.</Text>
        <Text style={local.body}>
          {sessionKind === 'demo'
            ? `Demostración de ${durationText(elapsed)}. No hubo comunicación con un médico.`
            : 'Añade tus propias notas al volver de la reunión externa. No verificamos su contenido ni si se llevó a cabo.'}
        </Text>
        <Card>
          <Text style={local.label}>{doctor?.name || 'Cita registrada'}</Text>
          <Text style={local.small}>
            {displayDate(selected.date)} · {selected.time} h
          </Text>
        </Card>
        <TextField
          label="Mis notas del cierre (opcional)"
          value={summaryNote}
          onChangeText={setSummaryNote}
          multiline
          maxLength={5000}
          placeholder="Escribe solo lo que quieres conservar en tu expediente…"
          testID="teleconsult-summary-input"
        />
        <Text style={local.small}>
          Se guardará como una nota personal. No se genera una receta ni una nota médica.
        </Text>
        <CheckRow
          label="Marcar esta cita como completada"
          detail="También cambiará su estado en tu agenda local. Hazlo solo si deseas cerrar esta cita."
          checked={completeAppointment}
          disabled={!scheduled}
          onPress={() => setCompleteAppointment((value) => !value)}
          testID="teleconsult-complete-choice"
        />
      </Sheet>
    );

  if (page === 'room')
    return (
      <Sheet
        title="Sala de demostración"
        onClose={onClose}
        onBack={backToDetail}
        footer={
          <Button
            title="Finalizar demostración"
            danger
            icon="phone"
            onPress={endDemo}
            testID="teleconsult-end-demo"
          />
        }
      >
        <View style={local.roomHeader}>
          <View style={local.flex}>
            <Text style={local.label}>{doctor?.name || 'Tu teleconsulta'}</Text>
            <Text style={local.small}>
              {displayDate(selected.date)} · {selected.time} h
            </Text>
          </View>
          <Text
            accessibilityLabel={`Tiempo de demostración ${durationText(elapsed)}`}
            style={local.timer}
          >
            {durationText(elapsed)}
          </Text>
        </View>
        <Card style={local.roomStage}>
          <View style={local.demoTag}>
            <Icon name="info" size={16} color={colors.tealDark} />
            <Text style={local.demoTagText}>Demostración local</Text>
          </View>
          {doctor ? <Avatar doctor={doctor} size={88} /> : <Icon name="doctor" size={70} />}
          <Text style={local.roomTitle}>No hay un médico conectado</Text>
          <Text style={[local.small, { textAlign: 'center' }]}>
            Esta vista no transmite ni captura audio o video.
          </Text>
          <View style={local.localPreview}>
            {cameraOn ? (
              <View style={local.patientAvatar}>
                <Text style={local.patientInitials}>{initials}</Text>
              </View>
            ) : (
              <Icon name="cameraOff" size={24} color={colors.muted} />
            )}
            <Text style={local.small}>
              {cameraOn ? 'Vista local simulada' : 'Cámara simulada apagada'}
            </Text>
          </View>
        </Card>
        <View style={local.controlRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              microphoneOn ? 'Apagar micrófono simulado' : 'Encender micrófono simulado'
            }
            accessibilityState={{ selected: microphoneOn }}
            onPress={() => setMicrophoneOn((value) => !value)}
            style={[local.control, !microphoneOn && local.controlOff]}
            testID="teleconsult-mic-toggle"
          >
            <Icon name={microphoneOn ? 'mic' : 'micOff'} size={23} />
            <Text style={local.controlLabel}>Micrófono</Text>
            <Text style={local.small}>
              {microphoneOn ? 'Simulado · encendido' : 'Simulado · apagado'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cameraOn ? 'Apagar cámara simulada' : 'Encender cámara simulada'}
            accessibilityState={{ selected: cameraOn }}
            onPress={() => setCameraOn((value) => !value)}
            style={[local.control, !cameraOn && local.controlOff]}
            testID="teleconsult-camera-toggle"
          >
            <Icon name={cameraOn ? 'video' : 'cameraOff'} size={23} />
            <Text style={local.controlLabel}>Cámara</Text>
            <Text style={local.small}>
              {cameraOn ? 'Simulada · encendida' : 'Simulada · apagada'}
            </Text>
          </Pressable>
        </View>
        {notesAndFiles()}
      </Sheet>
    );

  if (page === 'prepare')
    return (
      <Sheet
        title="Antes de entrar"
        onClose={onClose}
        onBack={backToDetail}
        footer={
          <Button
            title="Entrar a sala de demostración"
            icon="video"
            disabled={!scheduled || !prepared}
            onPress={enterDemo}
            testID="teleconsult-enter-demo"
          />
        }
      >
        <Text style={local.title}>Prepara tu espacio.</Text>
        <Text style={local.body}>
          {doctor?.name || 'Tu teleconsulta'} · {displayDate(selected.date)} · {selected.time} h
        </Text>
        <View style={local.info}>
          <Icon name="info" size={20} color={colors.tealDark} />
          <Text style={[local.small, local.flex]}>
            Comprobación manual. Esta aplicación no prueba ni activa tu cámara, micrófono o
            altavoces.
          </Text>
        </View>
        <Card>
          <CheckRow
            label="Revisé el sonido de mi dispositivo"
            detail="Confirma por tu cuenta que puedes escuchar y usar el micrófono."
            checked={checks.sound}
            onPress={() => setChecks((value) => ({ ...value, sound: !value.sound }))}
            testID="teleconsult-check-sound"
          />
          <View style={local.divider} />
          <CheckRow
            label="Revisé mi cámara"
            detail="Puedes comprobarla en la aplicación de cámara de tu dispositivo."
            checked={checks.camera}
            onPress={() => setChecks((value) => ({ ...value, camera: !value.camera }))}
            testID="teleconsult-check-camera"
          />
          <View style={local.divider} />
          <CheckRow
            label="Estoy en un espacio privado"
            detail="Decidiré qué documentos compartir si abro un servicio externo."
            checked={checks.privacy}
            onPress={() => setChecks((value) => ({ ...value, privacy: !value.privacy }))}
            testID="teleconsult-check-privacy"
          />
        </Card>
        {!prepared && (
          <Text style={local.small}>Confirma los tres puntos para habilitar la entrada.</Text>
        )}
        <SectionTitle>Tu reunión externa</SectionTitle>
        {validSavedUrl ? (
          <Card>
            <Text style={local.label}>Enlace configurado por ti</Text>
            <Text selectable style={[local.small, { marginTop: 7 }]}>
              {validSavedUrl}
            </Text>
            <Text style={[local.small, { marginTop: 9 }]}>
              Se abrirá otro servicio. Klini no verifica si tu médico está conectado ni envía tus
              notas o documentos.
            </Text>
            <Button
              title={working ? 'Abriendo…' : 'Abrir reunión externa'}
              icon="external"
              secondary
              disabled={!scheduled || !prepared || working}
              onPress={() => {
                void openMeeting();
              }}
              testID="teleconsult-open-meeting"
            />
          </Card>
        ) : (
          <Card>
            <Text style={local.label}>Sin enlace externo configurado</Text>
            <Text style={local.small}>
              Puedes añadirlo desde el detalle de esta cita. La sala de demostración funciona sin un
              enlace.
            </Text>
            <Button title="Configurar enlace" secondary onPress={backToDetail} />
          </Card>
        )}
        {externalOpened && (
          <Card>
            <Text style={local.label}>Al volver de tu reunión</Text>
            <Text style={local.small}>
              Puedes registrar tus notas y decidir si cierras la cita en tu agenda.
            </Text>
            <Button
              title="Registrar cierre de esta cita"
              secondary
              onPress={closeExternalAppointment}
            />
          </Card>
        )}
        {notesAndFiles()}
      </Sheet>
    );

  return (
    <Sheet
      title="Mi teleconsulta"
      onClose={onClose}
      onBack={backToList}
      footer={
        scheduled ? (
          <Button
            title="Preparar mi consulta"
            icon="video"
            onPress={prepareAppointment}
            testID="teleconsult-prepare"
          />
        ) : (
          <Button title="Agendar otra teleconsulta" icon="plus" onPress={onBook} />
        )
      }
    >
      <Text style={local.title}>Tu cita,{`\n`}organizada.</Text>
      <Card>
        <View style={local.appointmentRow}>
          {doctor ? <Avatar doctor={doctor} size={58} /> : <Icon name="doctor" size={34} />}
          <View style={local.flex}>
            <Text style={local.label}>{doctor?.name || 'Profesional no disponible'}</Text>
            <Text style={local.small}>{doctor?.specialty || 'Teleconsulta'}</Text>
            <Text style={local.date}>
              {displayDate(selected.date)} · {selected.time} h
            </Text>
          </View>
        </View>
        <View style={local.divider} />
        <Row title="Paciente" subtitle={selected.patientName} icon="user" />
        <Row title="Motivo" subtitle={selected.reason || 'Sin motivo registrado'} icon="document" />
        <Text style={[local.status, selected.status === 'cancelled' && { color: colors.danger }]}>
          {selected.status === 'scheduled'
            ? 'Programada · Teleconsulta'
            : selected.status === 'completed'
              ? 'Completada · Solo consulta de datos'
              : 'Cancelada · No se puede ingresar'}
        </Text>
      </Card>
      <View style={local.info}>
        <Icon name="video" size={20} color={colors.tealDark} />
        <Text style={[local.small, local.flex]}>
          Puedes usar una sala de demostración local o abrir un enlace de reunión que tú configures.
          No hay un médico conectado a esta aplicación.
        </Text>
      </View>
      <SectionTitle>Enlace de reunión (opcional)</SectionTitle>
      <Card>
        <TextField
          label="Dirección HTTPS"
          value={urlDraft}
          onChangeText={(value) => {
            setUrlDraft(value);
            setUrlError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://tu-servicio.com/tu-reunion"
          testID="teleconsult-meeting-url"
        />
        {!!urlError && <Text style={local.error}>{urlError}</Text>}
        <CheckRow
          label="Usar también como enlace general"
          detail="Se ofrecerá en otras citas que no tengan un enlace propio."
          checked={saveAsDefault}
          onPress={() => setSaveAsDefault((value) => !value)}
        />
        <Button
          title="Guardar enlace"
          secondary
          icon="check"
          disabled={!urlDraft.trim()}
          onPress={saveLink}
          testID="teleconsult-save-link"
        />
        {!!selected.meetingUrl && (
          <Button title="Quitar enlace de esta cita" secondary onPress={clearAppointmentLink} />
        )}
        {!!state.settings.meetingBaseUrl && (
          <Button title="Quitar enlace general" secondary onPress={clearGeneralLink} />
        )}
        <Text style={local.small}>
          Guardar el enlace no abre ninguna reunión. Tú decides cuándo salir a ese servicio.
        </Text>
      </Card>
      {notesAndFiles()}
    </Sheet>
  );
}

const local = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#EAF0F5',
    borderRadius: 22,
    padding: 3,
    marginTop: 6,
    marginBottom: 24,
  },
  segmentTab: {
    minHeight: 32,
    minWidth: 98,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  segmentActive: { backgroundColor: 'white', boxShadow: '0 1px 3px rgba(8,36,65,.12)' },
  segmentText: { fontSize: 12, color: '#52749A' },
  bookAnother: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  bookAnotherText: { fontSize: 13, color: colors.teal },
  simpleAppointment: { marginBottom: 22 },
  nextLabel: { fontSize: 12, color: '#6E8DB4', marginBottom: 10 },
  simpleDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 18,
  },
  simpleDateText: { fontSize: 17, color: colors.navy, flex: 1 },
  simpleTime: { fontSize: 18, fontWeight: '700', color: colors.navy },
  simpleDoctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  simpleDoctorName: { fontSize: 15, fontWeight: '700', color: colors.navy },
  simpleSpecialty: { fontSize: 13, color: '#6E8DB4', marginTop: 4 },
  simplePatient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: '#E5EDF3',
  },
  patientNameText: { fontSize: 14, color: colors.navy, flex: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
  statusDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: colors.teal },
  statusText: { fontSize: 11, color: colors.teal, flexShrink: 1 },

  flex: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 33,
    color: colors.navy,
    marginBottom: 12,
  },
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.navy,
  },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tealDark,
    marginTop: 7,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tealDark,
    marginTop: 10,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    marginBottom: 5,
  },
  info: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 17,
    padding: 13,
    marginVertical: 14,
    backgroundColor: '#E4F4F3',
  },
  appointmentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: 7,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    minHeight: 52,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9EB4C4',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.tealDark,
    borderColor: colors.tealDark,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  notesList: { gap: 9, marginVertical: 12 },
  emptyNote: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginVertical: 12,
  },
  noteBubble: {
    backgroundColor: '#E4F4F3',
    borderRadius: 17,
    borderBottomRightRadius: 6,
    padding: 13,
    marginLeft: 20,
  },
  noteAuthor: {
    fontSize: 10,
    color: colors.tealDark,
    fontWeight: '600',
    marginBottom: 5,
  },
  loading: { padding: 30, alignItems: 'center', gap: 15 },
  success: { alignItems: 'center', paddingVertical: 18, gap: 15 },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  timer: {
    color: colors.tealDark,
    fontSize: 23,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  roomStage: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 14,
    backgroundColor: '#ECF6F7',
  },
  roomTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'center',
  },
  demoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  demoTagText: { color: colors.tealDark, fontSize: 11, fontWeight: '600' },
  localPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  patientAvatar: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInitials: { color: colors.tealDark, fontSize: 11, fontWeight: '700' },
  controlRow: { flexDirection: 'row', gap: 10 },
  control: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 5,
    borderRadius: 19,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  controlOff: { backgroundColor: '#EBEFF3' },
  controlLabel: { fontSize: 12, color: colors.navy, fontWeight: '600' },
});
