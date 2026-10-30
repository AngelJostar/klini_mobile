import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Empty,
  Icon,
  Row,
  SectionTitle,
  TextField,
  colors,
  confirmAction,
  notify,
  styles,
} from "../components/ui";
import Sheet from "../components/TeleconsultPopup";
import { useAppStore } from "../state/store";
import type { Claim, ClinicalRecord, Policy } from "../domain/types";
import { addDays, dateLabel, todayISO } from "../domain/dates";
import { openAttachment, pickAttachment } from "../services/files";

type Page =
  "list" | "policy" | "policyForm" | "claim" | "claimForm" | "contact";
type PolicyForm = Omit<Policy, "id">;
type ClaimForm = {
  policyId: string;
  date: string;
  amount: string;
  concept: string;
  notes: string;
};

const statusLabels: Record<Claim["status"], string> = {
  draft: "Borrador local",
  submitted: "Registrado localmente",
  review: "En revisión local",
  resolved: "Cerrado localmente",
};
const statusOptions: Claim["status"][] = [
  "draft",
  "submitted",
  "review",
  "resolved",
];
const cash = (amount: number) =>
  `${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} MXN`;
const policyDocumentTitle = (policy: Pick<Policy, "insurer" | "number">) =>
  `Póliza · ${policy.insurer} · ${policy.number}`;
const claimDocumentTitle = (claim: Pick<Claim, "folio">) =>
  `Comprobante · ${claim.folio}`;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return (
    year >= 1900 &&
    year <= 2200 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
function validPhone(value: string) {
  const normalized = value.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized);
}
function policyStatus(policy: Policy) {
  const today = todayISO();
  return policy.startDate > today
    ? "Por comenzar"
    : policy.endDate < today
      ? "Vencida"
      : "Vigente";
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 9,
        padding: 13,
        borderRadius: 16,
        backgroundColor: colors.mint,
        marginBottom: 12,
      }}
    >
      <Icon name="info" size={18} color={colors.tealDark} />
      <Text style={[styles.small, { flex: 1, color: colors.tealDark }]}>
        {children}
      </Text>
    </View>
  );
}

export default function InsuranceScreen({ onClose }: { onClose: () => void }) {
  const store = useAppStore();
  const { state, ready, storageError } = store;
  const [page, setPage] = useState<Page>("list");
  const [tab, setTab] = useState<"policies" | "claims">("policies");
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [formReturn, setFormReturn] = useState<Page>("list");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [policyForm, setPolicyForm] = useState<PolicyForm>({
    insurer: "",
    number: "",
    holder: "",
    startDate: todayISO(),
    endDate: addDays(todayISO(), 365),
    coverage: "",
    phone: "",
    notes: "",
  });
  const [claimForm, setClaimForm] = useState<ClaimForm>({
    policyId: "",
    date: todayISO(),
    amount: "",
    concept: "",
    notes: "",
  });

  const policy = state.policies.find((item) => item.id === policyId);
  const claim = state.claims.find((item) => item.id === claimId);
  const claimPolicy = state.policies.find(
    (item) => item.id === claim?.policyId,
  );
  const sortedClaims = useMemo(
    () => [...state.claims].sort((a, b) => b.date.localeCompare(a.date)),
    [state.claims],
  );
  const policyClaims = sortedClaims.filter(
    (item) => item.policyId === policyId,
  );
  const policyRecords = state.records.filter(
    (record) => !!policy && record.title === policyDocumentTitle(policy),
  );
  const claimRecords = state.records.filter(
    (record) => !!claim && record.title === claimDocumentTitle(claim),
  );

  function handleError(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback;
    setError(message);
    notify("No se pudo completar la acción", message);
  }
  function showPolicy(id: string) {
    setPolicyId(id);
    setError("");
    setPage("policy");
  }
  function showClaim(id: string) {
    setClaimId(id);
    setError("");
    setPage("claim");
  }
  function beginPolicy(existing?: Policy) {
    setEditingPolicyId(existing?.id || null);
    setFormReturn(existing ? "policy" : "list");
    setPolicyForm(
      existing
        ? {
            insurer: existing.insurer,
            number: existing.number,
            holder: existing.holder,
            startDate: existing.startDate,
            endDate: existing.endDate,
            coverage: existing.coverage,
            phone: existing.phone,
            notes: existing.notes,
          }
        : {
            insurer: "",
            number: "",
            holder: state.profile.name,
            startDate: todayISO(),
            endDate: addDays(todayISO(), 365),
            coverage: "",
            phone: "",
            notes: "",
          },
    );
    setError("");
    setPage("policyForm");
  }
  function beginClaim(existing?: Claim, chosenPolicyId?: string) {
    if (!state.policies.length) {
      notify(
        "Agrega una póliza",
        "Necesitas una póliza guardada para registrar un gasto y su seguimiento local.",
      );
      beginPolicy();
      return;
    }
    setEditingClaimId(existing?.id || null);
    setFormReturn(existing ? "claim" : page === "policy" ? "policy" : "list");
    setClaimForm(
      existing
        ? {
            policyId: existing.policyId,
            date: existing.date,
            amount: String(existing.amount),
            concept: existing.concept,
            notes: existing.notes || "",
          }
        : {
            policyId: chosenPolicyId || state.policies[0].id,
            date: todayISO(),
            amount: "",
            concept: "",
            notes: "",
          },
    );
    setError("");
    setPage("claimForm");
  }
  function savePolicy() {
    const next: PolicyForm = Object.fromEntries(
      Object.entries(policyForm).map(([key, value]) => [key, value.trim()]),
    ) as PolicyForm;
    let issue = "";
    if (!next.insurer || !next.number || !next.holder)
      issue = "Completa la aseguradora, el número de póliza y el titular.";
    else if (!validDate(next.startDate) || !validDate(next.endDate))
      issue = "Escribe fechas válidas con formato AAAA-MM-DD.";
    else if (next.endDate < next.startDate)
      issue =
        "La fecha de fin debe ser igual o posterior a la fecha de inicio.";
    else if (next.phone && !validPhone(next.phone))
      issue = "Revisa el teléfono: debe contener entre 7 y 15 dígitos.";
    else if (
      state.policies.some(
        (item) =>
          item.id !== editingPolicyId &&
          item.insurer.trim().toLowerCase() === next.insurer.toLowerCase() &&
          item.number.trim().toLowerCase() === next.number.toLowerCase(),
      )
    )
      issue = "Ya guardaste esta póliza de la misma aseguradora.";
    if (issue) {
      setError(issue);
      return;
    }
    try {
      let id: string;
      if (editingPolicyId) {
        const previous = state.policies.find(
          (item) => item.id === editingPolicyId,
        );
        store.updatePolicy(editingPolicyId, next);
        id = editingPolicyId;
        if (previous)
          state.records
            .filter((item) => item.title === policyDocumentTitle(previous))
            .forEach((item) =>
              store.updateRecord(item.id, {
                title: policyDocumentTitle(next),
                doctorName: next.insurer,
                description: `Documento administrativo de la póliza. Titular: ${next.holder}.`,
              }),
            );
      } else id = store.addPolicy(next);
      setPolicyId(id);
      setError("");
      setPage("policy");
      notify(
        "Póliza guardada",
        "La información se guardó en este dispositivo.",
      );
    } catch (err) {
      handleError(err, "No se pudo guardar la póliza.");
    }
  }
  function saveClaim() {
    const chosenPolicy = state.policies.find(
      (item) => item.id === claimForm.policyId,
    );
    const rawAmount = claimForm.amount.trim().replace(",", ".");
    const amount = Number(rawAmount);
    let issue = "";
    if (!chosenPolicy) issue = "Selecciona una póliza válida.";
    else if (!claimForm.concept.trim())
      issue = "Escribe el concepto del gasto.";
    else if (
      !/^\d+(?:\.\d{1,2})?$/.test(rawAmount) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 999999999
    )
      issue =
        "Escribe un importe mayor que cero, con máximo dos decimales y sin separadores de miles.";
    else if (!validDate(claimForm.date))
      issue = "Escribe una fecha válida con formato AAAA-MM-DD.";
    else if (claimForm.date > todayISO())
      issue = "La fecha del gasto no puede estar en el futuro.";
    else if (
      claimForm.date < chosenPolicy.startDate ||
      claimForm.date > chosenPolicy.endDate
    )
      issue =
        "La fecha del gasto debe estar dentro de la vigencia registrada de la póliza.";
    if (issue) {
      setError(issue);
      return;
    }
    const values = {
      policyId: claimForm.policyId,
      date: claimForm.date,
      amount,
      concept: claimForm.concept.trim(),
      notes: claimForm.notes.trim(),
    };
    try {
      let id: string;
      if (editingClaimId) {
        store.updateClaim(editingClaimId, values);
        id = editingClaimId;
      } else id = store.addClaim({ ...values, status: "draft" });
      setClaimId(id);
      setError("");
      setPage("claim");
      notify(
        "Seguimiento guardado",
        "Se guardó un registro local. No se envió una solicitud a la aseguradora.",
      );
    } catch (err) {
      handleError(err, "No se pudo guardar el seguimiento.");
    }
  }
  function removePolicy() {
    if (!policy) return;
    confirmAction(
      "Eliminar póliza",
      "Se eliminará si no tiene trámites ni citas pendientes vinculadas. Sus documentos guardados en el expediente se conservarán.",
      () => {
        try {
          store.deletePolicy(policy.id);
          setPolicyId(null);
          setPage("list");
          setTab("policies");
          setError("");
        } catch (err) {
          handleError(err, "No se pudo eliminar la póliza.");
        }
      },
    );
  }
  function removeClaim() {
    if (!claim) return;
    confirmAction(
      "Eliminar seguimiento local",
      "Este registro dejará de aparecer en tu seguimiento. Los documentos guardados en el expediente se conservarán. No modifica ningún trámite externo.",
      () => {
        try {
          store.deleteClaim(claim.id);
          setClaimId(null);
          setPage("list");
          setTab("claims");
          setError("");
        } catch (err) {
          handleError(err, "No se pudo eliminar el seguimiento.");
        }
      },
    );
  }
  async function attachDocument(target: "policy" | "claim") {
    if (
      busy ||
      (target === "policy" && !policy) ||
      (target === "claim" && !claim)
    )
      return;
    setBusy(true);
    try {
      const attachment = await pickAttachment();
      if (!attachment) return;
      store.addRecord({
        type: "Nota",
        title:
          target === "policy"
            ? policyDocumentTitle(policy!)
            : claimDocumentTitle(claim!),
        date: todayISO(),
        doctorName:
          target === "policy"
            ? policy!.insurer
            : claimPolicy?.insurer || "Seguro",
        description:
          target === "policy"
            ? `Documento administrativo de la póliza. Titular: ${policy!.holder}.`
            : `Comprobante del seguimiento local ${claim!.folio}. No acredita el envío a una aseguradora.`,
        attachment,
      });
      notify(
        "Documento guardado",
        "El archivo se agregó al expediente como una nota administrativa y puedes abrirlo desde esta pantalla o desde Archivo.",
      );
    } catch (err) {
      handleError(err, "No se pudo adjuntar el documento. Intenta otra vez.");
    } finally {
      setBusy(false);
    }
  }
  async function openDocument(record: ClinicalRecord) {
    try {
      if (record.attachment) await openAttachment(record.attachment);
      else
        notify("Sin archivo", "Este registro no contiene un archivo adjunto.");
    } catch (err) {
      handleError(err, "No se pudo abrir el archivo.");
    }
  }
  async function saveAndDial() {
    const phone = phoneInput.trim();
    if (!policy || !validPhone(phone)) {
      setError("Escribe un teléfono real válido de entre 7 y 15 dígitos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      store.updatePolicy(policy.id, { phone });
      await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
    } catch (err) {
      handleError(
        err,
        "El teléfono se guardó, pero no se pudo abrir el marcador en este dispositivo.",
      );
    } finally {
      setBusy(false);
    }
  }
  function back() {
    setError("");
    if (page === "policyForm" || page === "claimForm") setPage(formReturn);
    else if (page === "contact") setPage("policy");
    else {
      setPage("list");
      if (page === "claim") setTab("claims");
    }
  }
  function documentRows(records: ClinicalRecord[]) {
    return records.length ? (
      records.map((record) => (
        <Row
          key={record.id}
          title={record.attachment?.name || record.title}
          subtitle={`${dateLabel(record.date)} · Archivo del expediente`}
          icon="file"
          onPress={() => {
            void openDocument(record);
          }}
        />
      ))
    ) : (
      <Text style={styles.small}>
        Aún no hay archivos adjuntos. Puedes agregar un PDF o una imagen.
      </Text>
    );
  }

  let title = "Mis seguros";
  if (page === "policy") title = "Mi póliza";
  if (page === "policyForm")
    title = editingPolicyId ? "Editar póliza" : "Agregar póliza";
  if (page === "claim") title = "Seguimiento local";
  if (page === "claimForm")
    title = editingClaimId ? "Editar seguimiento" : "Registrar gasto";
  if (page === "contact") title = "Contacto de la aseguradora";
  let footer: React.ReactNode;
  if (page === "list")
    footer = (
      <Button
        title={tab === "policies" ? "Agregar póliza" : "Registrar gasto"}
        icon="plus"
        onPress={() => (tab === "policies" ? beginPolicy() : beginClaim())}
        testID={
          tab === "policies" ? "insurance-add-policy" : "insurance-add-claim"
        }
      />
    );
  if (page === "policyForm")
    footer = (
      <Button
        title="Guardar póliza"
        icon="check"
        onPress={savePolicy}
        testID="insurance-save-policy"
      />
    );
  if (page === "claimForm")
    footer = (
      <Button
        title="Guardar seguimiento local"
        icon="check"
        onPress={saveClaim}
        testID="insurance-save-claim"
      />
    );
  if (page === "contact")
    footer = (
      <Button
        title={busy ? "Abriendo marcador…" : "Guardar y abrir marcador"}
        icon="phone"
        onPress={() => {
          void saveAndDial();
        }}
        disabled={busy || !phoneInput.trim()}
        testID="insurance-dial"
      />
    );

  return (
    <Sheet
      variant="insurance"
      title={title}
      onClose={onClose}
      onBack={page === "list" ? undefined : back}
      footer={ready ? footer : undefined}
    >
      {!ready ? (
        <View style={{ padding: 30, gap: 12, alignItems: "center" }}>
          <ActivityIndicator color={colors.tealDark} />
          <Text style={styles.body}>Cargando tus seguros…</Text>
        </View>
      ) : (
        <>
          {storageError && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {storageError}
            </Text>
          )}
          {!!error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          {page === "list" && (
            <>
              <Text style={[styles.title, { marginBottom: 8 }]}>
                Todo, en orden.
              </Text>
              <Text style={[styles.body, { marginBottom: 15 }]}>
                Conserva tus pólizas, documentos y gastos en un mismo lugar.
              </Text>
              <View style={styles.wrap}>
                <Chip
                  label={`Pólizas · ${state.policies.length}`}
                  selected={tab === "policies"}
                  onPress={() => {
                    setTab("policies");
                    setError("");
                  }}
                />
                <Chip
                  label={`Seguimiento local · ${state.claims.length}`}
                  selected={tab === "claims"}
                  onPress={() => {
                    setTab("claims");
                    setError("");
                  }}
                />
              </View>
              {tab === "policies" ? (
                <>
                  <SectionTitle>Tus pólizas</SectionTitle>
                  {state.policies.length ? (
                    state.policies.map((item) => (
                      <Card key={item.id}>
                        <Row
                          title={item.insurer}
                          subtitle={`${item.number} · ${item.holder}`}
                          icon="shield"
                          onPress={() => showPolicy(item.id)}
                        />
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text style={styles.small}>
                            Hasta {dateLabel(item.endDate)}
                          </Text>
                          <Text
                            style={[
                              styles.badge,
                              policyStatus(item) === "Vencida" && {
                                color: colors.danger,
                                backgroundColor: "#FCECEF",
                              },
                            ]}
                          >
                            {policyStatus(item)}
                          </Text>
                        </View>
                      </Card>
                    ))
                  ) : (
                    <Empty
                      title="Aún no tienes pólizas"
                      description="Agrega los datos de tu seguro y conserva sus documentos."
                      action="Agregar mi primera póliza"
                      onAction={() => beginPolicy()}
                    />
                  )}
                  <Notice>
                    Los datos de ejemplo son ficticios. Confirma la vigencia y
                    las condiciones en tu póliza original.
                  </Notice>
                </>
              ) : (
                <>
                  <Notice>
                    Seguimiento local: estos registros no se envían a tu
                    aseguradora ni confirman cobertura, autorización o
                    reembolso.
                  </Notice>
                  {sortedClaims.length ? (
                    sortedClaims.map((item) => {
                      const insurer =
                        state.policies.find((p) => p.id === item.policyId)
                          ?.insurer || "Póliza no disponible";
                      return (
                        <Card key={item.id}>
                          <Row
                            title={item.concept}
                            subtitle={`${insurer} · ${dateLabel(item.date)}`}
                            icon="file"
                            onPress={() => showClaim(item.id)}
                          />
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Text style={styles.subtitle}>
                              {cash(item.amount)}
                            </Text>
                            <Text style={styles.badge}>
                              {statusLabels[item.status]}
                            </Text>
                          </View>
                        </Card>
                      );
                    })
                  ) : (
                    <Empty
                      title="Sin gastos registrados"
                      description="Crea un borrador para organizar un gasto, sus comprobantes y su seguimiento."
                      action="Registrar gasto"
                      onAction={() => beginClaim()}
                    />
                  )}
                </>
              )}
            </>
          )}

          {page === "policy" &&
            (policy ? (
              <>
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <Icon name="shield" size={31} color={colors.tealDark} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{policy.insurer}</Text>
                      <Text style={styles.small}>Póliza {policy.number}</Text>
                    </View>
                    <Text style={styles.badge}>{policyStatus(policy)}</Text>
                  </View>
                  <Row title="Titular" subtitle={policy.holder} />
                  <Row
                    title="Vigencia"
                    subtitle={`${dateLabel(policy.startDate)} — ${dateLabel(policy.endDate)}`}
                  />
                </Card>
                <SectionTitle>Cobertura registrada</SectionTitle>
                <Card>
                  <Text style={styles.body}>
                    {policy.coverage ||
                      "Aún no agregaste un resumen de cobertura."}
                  </Text>
                </Card>
                <Text style={styles.small}>
                  Esta información es una nota personal. Consulta límites,
                  exclusiones y autorizaciones en tu contrato original.
                </Text>
                <SectionTitle>Contacto</SectionTitle>
                <Card>
                  <Row
                    title="Teléfono guardado"
                    subtitle={policy.phone || "Sin teléfono registrado"}
                    icon="phone"
                  />
                  <Text style={styles.small}>
                    Los números de demostración son ficticios. Confirma un
                    número real antes de abrir el marcador.
                  </Text>
                  <Button
                    title="Confirmar teléfono y llamar"
                    secondary
                    icon="phone"
                    onPress={() => {
                      setPhoneInput("");
                      setError("");
                      setPage("contact");
                    }}
                  />
                </Card>
                <SectionTitle>Documentos de la póliza</SectionTitle>
                <Card>
                  {documentRows(policyRecords)}
                  <Button
                    title={busy ? "Adjuntando…" : "Adjuntar documento"}
                    icon="attachment"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      void attachDocument("policy");
                    }}
                    testID="insurance-policy-attach"
                  />
                </Card>
                <SectionTitle>Seguimiento local</SectionTitle>
                <Card>
                  {policyClaims.length ? (
                    policyClaims.map((item) => (
                      <Row
                        key={item.id}
                        title={item.concept}
                        subtitle={`${cash(item.amount)} · ${statusLabels[item.status]}`}
                        onPress={() => showClaim(item.id)}
                        icon="file"
                      />
                    ))
                  ) : (
                    <Text style={styles.small}>
                      No hay gastos registrados para esta póliza.
                    </Text>
                  )}
                  <Button
                    title="Registrar gasto"
                    secondary
                    icon="plus"
                    onPress={() => beginClaim(undefined, policy.id)}
                  />
                </Card>
                <SectionTitle>Notas</SectionTitle>
                <Card>
                  <Text style={styles.body}>
                    {policy.notes || "Sin notas adicionales."}
                  </Text>
                </Card>
                <Button
                  title="Editar póliza"
                  secondary
                  icon="edit"
                  onPress={() => beginPolicy(policy)}
                />
                <Button
                  title="Eliminar póliza"
                  danger
                  icon="trash"
                  onPress={removePolicy}
                  testID="insurance-delete-policy"
                />
              </>
            ) : (
              <Empty
                title="Póliza no disponible"
                action="Volver a mis seguros"
                onAction={() => setPage("list")}
              />
            ))}

          {page === "policyForm" && (
            <>
              <Text style={[styles.body, { marginBottom: 15 }]}>
                Registra los datos tal como aparecen en tu contrato. Las fechas
                se escriben como AAAA-MM-DD.
              </Text>
              <TextField
                label="Aseguradora *"
                placeholder="Nombre de la aseguradora"
                value={policyForm.insurer}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, insurer: value }))
                }
                testID="insurance-insurer"
              />
              <TextField
                label="Número de póliza *"
                placeholder="Número o identificador"
                autoCapitalize="characters"
                value={policyForm.number}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, number: value }))
                }
                testID="insurance-number"
              />
              <TextField
                label="Titular *"
                value={policyForm.holder}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, holder: value }))
                }
                testID="insurance-holder"
              />
              <TextField
                label="Inicio de vigencia *"
                placeholder="AAAA-MM-DD"
                value={policyForm.startDate}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, startDate: value }))
                }
                maxLength={10}
                testID="insurance-start-date"
              />
              <TextField
                label="Fin de vigencia *"
                placeholder="AAAA-MM-DD"
                value={policyForm.endDate}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, endDate: value }))
                }
                maxLength={10}
                testID="insurance-end-date"
              />
              <TextField
                label="Resumen de cobertura"
                placeholder="Servicios, límites y condiciones que quieras recordar"
                multiline
                value={policyForm.coverage}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, coverage: value }))
                }
              />
              <TextField
                label="Teléfono de contacto"
                placeholder="Número real de tu aseguradora"
                keyboardType="phone-pad"
                value={policyForm.phone}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, phone: value }))
                }
              />
              <TextField
                label="Notas"
                placeholder="Información adicional"
                multiline
                value={policyForm.notes}
                onChangeText={(value) =>
                  setPolicyForm((form) => ({ ...form, notes: value }))
                }
              />
              <Text style={styles.small}>
                * Campos obligatorios. Guardar no contacta a la aseguradora.
              </Text>
            </>
          )}

          {page === "contact" && policy && (
            <>
              <Notice>
                Estás viendo una demostración local. Los teléfonos de muestra no
                deben utilizarse para contactar a una aseguradora.
              </Notice>
              <Card>
                <Text style={styles.subtitle}>{policy.insurer}</Text>
                <Text style={[styles.body, { marginTop: 6 }]}>
                  Número guardado: {policy.phone || "Sin número"}
                </Text>
              </Card>
              <Text style={[styles.body, { marginBottom: 14 }]}>
                Escribe el número real que verificaste en tu póliza. Al
                continuar se guardará y se abrirá el marcador; tú decides si
                realizas la llamada.
              </Text>
              <TextField
                label="Teléfono real verificado"
                placeholder="Escribe el número real"
                keyboardType="phone-pad"
                value={phoneInput}
                onChangeText={setPhoneInput}
                testID="insurance-verified-phone"
              />
            </>
          )}

          {page === "claimForm" && (
            <>
              <Notice>
                Este es un borrador y seguimiento local. Guardarlo no presenta
                un trámite a la aseguradora.
              </Notice>
              <SectionTitle>Póliza *</SectionTitle>
              <View style={styles.wrap}>
                {state.policies.map((item) => (
                  <Chip
                    key={item.id}
                    label={`${item.insurer} · ${item.number}`}
                    selected={claimForm.policyId === item.id}
                    onPress={() =>
                      setClaimForm((form) => ({ ...form, policyId: item.id }))
                    }
                  />
                ))}
              </View>
              <TextField
                label="Concepto del gasto *"
                placeholder="Por ejemplo: consulta o estudio"
                value={claimForm.concept}
                onChangeText={(value) =>
                  setClaimForm((form) => ({ ...form, concept: value }))
                }
                testID="insurance-claim-concept"
              />
              <TextField
                label="Fecha del gasto *"
                placeholder="AAAA-MM-DD"
                value={claimForm.date}
                maxLength={10}
                onChangeText={(value) =>
                  setClaimForm((form) => ({ ...form, date: value }))
                }
                testID="insurance-claim-date"
              />
              <TextField
                label="Importe en MXN *"
                placeholder="0.00, sin separador de miles"
                keyboardType="decimal-pad"
                value={claimForm.amount}
                onChangeText={(value) =>
                  setClaimForm((form) => ({ ...form, amount: value }))
                }
                testID="insurance-claim-amount"
              />
              <TextField
                label="Notas del seguimiento"
                placeholder="Anota el siguiente paso o una referencia externa"
                multiline
                value={claimForm.notes}
                onChangeText={(value) =>
                  setClaimForm((form) => ({ ...form, notes: value }))
                }
              />
              <Text style={styles.small}>
                La fecha del gasto debe estar dentro de la vigencia registrada.
                Puedes adjuntar comprobantes después de guardar.
              </Text>
            </>
          )}

          {page === "claim" &&
            (claim ? (
              <>
                <Notice>
                  Seguimiento local. Ningún estado de esta pantalla confirma que
                  una aseguradora recibió, autorizó o pagó el gasto.
                </Notice>
                <Card>
                  <Text style={styles.title}>{claim.concept}</Text>
                  <Text
                    style={[
                      styles.title,
                      { color: colors.tealDark, marginVertical: 10 },
                    ]}
                  >
                    {cash(claim.amount)}
                  </Text>
                  <Text style={styles.badge}>{statusLabels[claim.status]}</Text>
                  <Row title="Referencia local" subtitle={claim.folio} />
                  <Row
                    title="Fecha del gasto"
                    subtitle={dateLabel(claim.date)}
                  />
                  <Row
                    title="Póliza"
                    subtitle={
                      claimPolicy
                        ? `${claimPolicy.insurer} · ${claimPolicy.number}`
                        : "Póliza no disponible"
                    }
                    onPress={
                      claimPolicy ? () => showPolicy(claimPolicy.id) : undefined
                    }
                  />
                </Card>
                <SectionTitle>Actualizar estado local</SectionTitle>
                <View style={styles.wrap}>
                  {statusOptions.map((status) => (
                    <Chip
                      key={status}
                      label={statusLabels[status]}
                      selected={claim.status === status}
                      onPress={() => {
                        try {
                          store.updateClaim(claim.id, { status });
                          setError("");
                        } catch (err) {
                          handleError(err, "No se pudo actualizar el estado.");
                        }
                      }}
                    />
                  ))}
                </View>
                <Text style={styles.small}>
                  Elige el estado para tu organización personal. No se
                  sincroniza con ninguna aseguradora.
                </Text>
                <SectionTitle>Comprobantes</SectionTitle>
                <Card>
                  {documentRows(claimRecords)}
                  <Button
                    title={busy ? "Adjuntando…" : "Adjuntar comprobante"}
                    secondary
                    icon="attachment"
                    disabled={busy}
                    onPress={() => {
                      void attachDocument("claim");
                    }}
                    testID="insurance-claim-attach"
                  />
                </Card>
                <SectionTitle>Notas</SectionTitle>
                <Card>
                  <Text style={styles.body}>
                    {claim.notes || "Sin notas adicionales."}
                  </Text>
                </Card>
                <Button
                  title="Editar seguimiento"
                  secondary
                  icon="edit"
                  onPress={() => beginClaim(claim)}
                  testID="insurance-edit-claim"
                />
                <Button
                  title="Eliminar seguimiento local"
                  danger
                  icon="trash"
                  onPress={removeClaim}
                  testID="insurance-delete-claim"
                />
              </>
            ) : (
              <Empty
                title="Seguimiento no disponible"
                action="Volver a mis seguros"
                onAction={() => {
                  setTab("claims");
                  setPage("list");
                }}
              />
            ))}
        </>
      )}
    </Sheet>
  );
}
