import React, { useState } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  colors,
  confirmAction,
  Empty,
  notify,
  Row,
  SectionTitle,
  Sheet,
  styles,
  TextField,
} from "../components/ui";
import { todayISO } from "../domain/dates";
import type { Patient } from "../domain/types";
import { exportText } from "../services/files";
import { useAppStore } from "../state/store";

type Page = "overview" | "profile" | "settings" | "favorites";
const bloodTypes = [
  "Sin registrar",
  "O+",
  "O-",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
];
function normalizeBloodType(value: string) {
  if (bloodTypes.includes(value)) return value;
  const mapping: Record<string, string> = {
    "O positivo": "O+",
    "O negativo": "O-",
    "A positivo": "A+",
    "A negativo": "A-",
    "B positivo": "B+",
    "B negativo": "B-",
    "AB positivo": "AB+",
    "AB negativo": "AB-",
  };
  return mapping[value] || "Sin registrar";
}
function validBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > todayISO()) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return (
    y >= 1900 &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
function validPhone(value: string) {
  return (
    /^[+\d()\s.-]+$/.test(value) &&
    value.replace(/\D/g, "").length >= 7 &&
    value.replace(/\D/g, "").length <= 15
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intenta de nuevo.";
}

export default function ProfileScreen({ onClose }: { onClose: () => void }) {
  const {
    state,
    storageError,
    updateProfile,
    updateSettings,
    toggleFavorite,
    resetDemo,
  } = useAppStore();
  const [page, setPage] = useState<Page>("overview");
  const [draft, setDraft] = useState<Patient>({
    ...state.profile,
    bloodType: normalizeBloodType(state.profile.bloodType),
  });
  const [meetingUrl, setMeetingUrl] = useState(state.settings.meetingBaseUrl);
  const [reminders, setReminders] = useState(state.settings.reminders);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const favoriteDoctors = state.doctors.filter((doctor) =>
    state.favorites.includes(doctor.id),
  );
  const back = () => {
    setError("");
    setPage("overview");
  };
  function editProfile() {
    setDraft({
      ...state.profile,
      bloodType: normalizeBloodType(state.profile.bloodType),
    });
    setError("");
    setPage("profile");
  }
  function editSettings() {
    setMeetingUrl(state.settings.meetingBaseUrl);
    setReminders(state.settings.reminders);
    setError("");
    setPage("settings");
  }
  function saveProfile() {
    if (draft.name.trim().length < 2)
      return setError("Escribe el nombre completo de la persona.");
    if (!validBirthDate(draft.birthDate))
      return setError(
        "Escribe una fecha de nacimiento real con formato AAAA-MM-DD, igual o anterior a hoy.",
      );
    if (
      draft.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    )
      return setError("Revisa el formato del correo electrónico.");
    if (draft.phone.trim() && !validPhone(draft.phone.trim()))
      return setError("El teléfono debe incluir entre 7 y 15 dígitos.");
    if (!bloodTypes.includes(draft.bloodType))
      return setError("Elige un grupo sanguíneo válido o “Sin registrar”.");
    if (
      (draft.emergencyName.trim() || draft.emergencyPhone.trim()) &&
      (!draft.emergencyName.trim() || !validPhone(draft.emergencyPhone.trim()))
    )
      return setError(
        "Completa el nombre y un teléfono válido para el contacto de emergencia, o deja ambos campos vacíos.",
      );
    try {
      updateProfile({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        allergies: draft.allergies.trim(),
        emergencyName: draft.emergencyName.trim(),
        emergencyPhone: draft.emergencyPhone.trim(),
      });
      setError("");
      setPage("overview");
    } catch (e) {
      setError(`No se pudo actualizar el perfil. ${errorMessage(e)}`);
    }
  }
  function saveSettings() {
    const value = meetingUrl.trim();
    if (value) {
      try {
        const url = new URL(value);
        if (
          url.protocol !== "https:" ||
          !url.hostname ||
          url.username ||
          url.password
        )
          throw new Error();
      } catch {
        return setError(
          "Usa un enlace HTTPS válido, sin usuario ni contraseña, o deja el campo vacío.",
        );
      }
    }
    try {
      updateSettings({ reminders, meetingBaseUrl: value });
      setError("");
      setPage("overview");
    } catch (e) {
      setError(`No se pudieron guardar las preferencias. ${errorMessage(e)}`);
    }
  }
  async function exportData() {
    setBusy(true);
    try {
      await exportText(
        `klini-datos-${todayISO()}.json`,
        JSON.stringify(state, null, 2),
        "application/json",
      );
    } catch (e) {
      notify("No se pudieron exportar los datos", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    confirmAction(
      "Restablecer datos de demostración",
      "Se eliminarán todos los cambios de este dispositivo: perfil, citas, archivo, medicamentos, pólizas y preferencias. Se recuperarán los ejemplos iniciales. Esta acción no se puede deshacer.",
      async () => {
        setBusy(true);
        try {
          await resetDemo();
          setPage("overview");
          setError("");
          notify(
            "Datos restablecidos",
            "Los ejemplos iniciales están disponibles de nuevo.",
          );
        } catch (e) {
          notify("No se pudieron restablecer los datos", errorMessage(e));
        } finally {
          setBusy(false);
        }
      },
    );
  }

  if (page === "profile")
    return (
      <Sheet
        title="Editar mi perfil"
        onClose={onClose}
        onBack={back}
        footer={
          <Button
            title="Guardar perfil"
            onPress={saveProfile}
            icon="check"
            testID="save-profile"
          />
        }
      >
        <Text style={[styles.body, { marginBottom: 15 }]}>
          Tus datos ayudan a identificar tus registros. Puedes dejar vacíos los
          campos de contacto.
        </Text>
        <TextField
          label="Nombre completo *"
          value={draft.name}
          onChangeText={(name) => setDraft((value) => ({ ...value, name }))}
          maxLength={120}
          testID="profile-name"
        />
        <TextField
          label="Nacimiento * (AAAA-MM-DD)"
          value={draft.birthDate}
          onChangeText={(birthDate) =>
            setDraft((value) => ({ ...value, birthDate }))
          }
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          testID="profile-birthdate"
        />
        <TextField
          label="Sexo registrado"
          value={draft.sex}
          onChangeText={(sex) => setDraft((value) => ({ ...value, sex }))}
          placeholder="Opcional"
          maxLength={80}
        />
        <TextField
          label="Correo electrónico"
          value={draft.email}
          onChangeText={(email) => setDraft((value) => ({ ...value, email }))}
          keyboardType="email-address"
          maxLength={180}
          testID="profile-email"
        />
        <TextField
          label="Teléfono"
          value={draft.phone}
          onChangeText={(phone) => setDraft((value) => ({ ...value, phone }))}
          keyboardType="phone-pad"
          maxLength={30}
        />
        <SectionTitle>Grupo sanguíneo</SectionTitle>
        <View style={styles.wrap}>
          {bloodTypes.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={draft.bloodType === item}
              onPress={() =>
                setDraft((value) => ({ ...value, bloodType: item }))
              }
            />
          ))}
        </View>
        <TextField
          label="Alergias registradas"
          value={draft.allergies}
          onChangeText={(allergies) =>
            setDraft((value) => ({ ...value, allergies }))
          }
          multiline
          placeholder="Describe la información que deseas registrar"
          maxLength={2000}
        />
        <SectionTitle>Contacto de emergencia</SectionTitle>
        <TextField
          label="Nombre del contacto"
          value={draft.emergencyName}
          onChangeText={(emergencyName) =>
            setDraft((value) => ({ ...value, emergencyName }))
          }
          maxLength={120}
        />
        <TextField
          label="Teléfono de emergencia"
          value={draft.emergencyPhone}
          onChangeText={(emergencyPhone) =>
            setDraft((value) => ({ ...value, emergencyPhone }))
          }
          keyboardType="phone-pad"
          maxLength={30}
          testID="profile-emergency-phone"
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </Sheet>
    );

  if (page === "settings")
    return (
      <Sheet
        title="Preferencias"
        onClose={onClose}
        onBack={back}
        footer={
          <Button
            title="Guardar preferencias"
            onPress={saveSettings}
            icon="check"
            testID="save-settings"
          />
        }
      >
        <Card>
          <View style={local.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Recordatorios de citas</Text>
              <Text style={[styles.small, { marginTop: 5 }]}>
                {Platform.OS === "web"
                  ? "La vista web guarda tu preferencia. Los avisos locales solo están disponibles en Android, con permiso."
                  : "Avisos locales 15 minutos antes de una cita. Android requiere permiso de notificaciones."}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Preferencia de recordatorios de citas"
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ true: colors.teal, false: colors.line }}
              testID="reminder-preference"
            />
          </View>
        </Card>
        <SectionTitle>Teleconsulta externa</SectionTitle>
        <Text style={[styles.body, { marginBottom: 12 }]}>
          Agrega un enlace de reunión HTTPS para abrirlo desde una cita. El
          enlace se abrirá solo cuando lo solicites. Puedes dejarlo vacío.
        </Text>
        <TextField
          label="Enlace de reunión (opcional)"
          value={meetingUrl}
          onChangeText={setMeetingUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://…"
          maxLength={2000}
          testID="meeting-url"
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Text style={styles.small}>
          Los datos se guardan en este dispositivo. Esta demo no tiene cuenta
          remota ni sincronización en la nube.
        </Text>
      </Sheet>
    );

  if (page === "favorites")
    return (
      <Sheet title="Mis médicos favoritos" onClose={onClose} onBack={back}>
        <Text style={[styles.body, { marginBottom: 12 }]}>
          Guarda médicos desde el directorio para encontrarlos aquí.
        </Text>
        {favoriteDoctors.length ? (
          favoriteDoctors.map((doctor) => (
            <Card key={doctor.id}>
              <Row
                title={doctor.name}
                subtitle={`${doctor.specialty} · ${doctor.city}`}
                icon="doctor"
              />
              <Button
                title="Quitar de favoritos"
                secondary
                icon="heartFilled"
                onPress={() => {
                  try {
                    toggleFavorite(doctor.id);
                  } catch (e) {
                    notify("No se pudo actualizar", errorMessage(e));
                  }
                }}
              />
            </Card>
          ))
        ) : (
          <Empty
            title="Aún no tienes favoritos"
            description="En el perfil de un médico, toca el corazón para guardarlo."
          />
        )}
      </Sheet>
    );

  return (
    <Sheet title="Mi perfil" onClose={onClose}>
      <Text style={styles.title}>Tu información.</Text>
      <Text style={[styles.body, { marginTop: 5, marginBottom: 14 }]}>
        Perfil local de demostración
      </Text>
      {storageError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {storageError}
        </Text>
      ) : null}
      <Card>
        <Row
          title={state.profile.name}
          subtitle={state.profile.email || "Sin correo registrado"}
          icon="user"
        />
        <Button
          title="Editar mis datos"
          onPress={editProfile}
          icon="edit"
          testID="edit-profile"
        />
      </Card>
      <SectionTitle>Información clínica</SectionTitle>
      <Card>
        <Row
          title="Grupo sanguíneo"
          subtitle={normalizeBloodType(state.profile.bloodType)}
          icon="activity"
        />
        <View style={styles.divider} />
        <Row
          title="Alergias registradas"
          subtitle={state.profile.allergies || "Sin información registrada"}
          icon="alert"
        />
        <Text style={styles.small}>Información añadida por ti.</Text>
      </Card>
      <SectionTitle>Contacto de emergencia</SectionTitle>
      <Card>
        <Row
          title={state.profile.emergencyName || "Sin contacto registrado"}
          subtitle={
            state.profile.emergencyPhone ||
            "Agrega un contacto al editar tus datos."
          }
          icon="phone"
        />
      </Card>
      <SectionTitle>Mi cuenta local</SectionTitle>
      <Card>
        <Row
          title="Mis médicos favoritos"
          subtitle={`${favoriteDoctors.length} guardados`}
          icon="heart"
          onPress={() => setPage("favorites")}
        />
        <View style={styles.divider} />
        <Row
          title="Preferencias"
          subtitle="Recordatorios y enlace de teleconsulta"
          icon="settings"
          onPress={editSettings}
        />
      </Card>
      <SectionTitle>Mis datos</SectionTitle>
      <Text style={[styles.small, { marginBottom: 9 }]}>
        Exporta tus datos en JSON. Los archivos locales pueden requerir volver a
        adjuntarse si los mueves a otro dispositivo.
      </Text>
      <Button
        title={busy ? "Preparando…" : "Exportar mis datos"}
        onPress={exportData}
        secondary
        icon="download"
        disabled={busy}
        testID="export-data"
      />
      <Button
        title="Restablecer demostración"
        onPress={reset}
        secondary
        icon="refresh"
        disabled={busy}
        testID="reset-demo"
      />
    </Sheet>
  );
}

const local = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
