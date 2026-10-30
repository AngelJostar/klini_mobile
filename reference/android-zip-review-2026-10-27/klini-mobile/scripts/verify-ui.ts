/** Real React Native Web UI smoke tests. No HTTP server or external service required. */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { AppState } from "../src/domain/types";

async function main() {
  const output = path.resolve("dist-web");
  if (!fs.existsSync(path.join(output, "index.html")))
    throw new Error("Ejecuta npm run export:web antes de npm run test:e2e.");
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: process.platform === "linux" ? ["--no-sandbox"] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "America/Mexico_City",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => void dialog.accept());
  await context.route("http://klini.test/**", async (route) => {
    const url = new URL(route.request().url());
    const relative =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname).replace(/^\//, "");
    const file = path.resolve(output, relative);
    if (!file.startsWith(output + path.sep) || !fs.existsSync(file)) {
      await route.abort();
      return;
    }
    const ext = path.extname(file);
    const mime: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".ttf": "font/ttf",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".json": "application/json",
    };
    await route.fulfill({ path: file, contentType: mime[ext] });
  });
  fs.mkdirSync("test-results", { recursive: true });
  const getState = async (): Promise<AppState> =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("@klini/app-state:v1") || "null"),
    );
  async function persisted(predicate: (state: AppState) => boolean) {
    for (let i = 0; i < 50; i++) {
      const s = await getState();
      if (s && predicate(s)) return s;
      await page.waitForTimeout(40);
    }
    throw new Error("El cambio no se persistió.");
  }
  async function close() {
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.waitForTimeout(350);
  }
  async function click(id: string) {
    await page.getByTestId(id).click();
  }
  async function goReview() {
    await click("booking-schedule-next");
    await click("booking-service-next");
    await page
      .getByTestId("booking-reason")
      .fill("Revisión de seguimiento para prueba de interfaz");
    await click("booking-patient-next");
    await click("booking-consent-details");
    await click("booking-consent-demo");
    await click("booking-confirm");
    await page.getByTestId("booking-view-agenda").waitFor();
  }

  try {
    await page.goto("http://klini.test/");
    await page.getByTestId("menu-directory").waitFor();
    await persisted((s) => s.appointments.length === 3);
    const boxes = await Promise.all(
      ["agenda", "directory", "teleconsult", "insurance"].map((id) =>
        page.getByTestId(`menu-${id}`).boundingBox(),
      ),
    );
    assert(
      boxes.every((b) => b && Math.abs(b.y - boxes[0]!.y) < 2),
      "Los cuatro botones deben compartir una fila.",
    );
    await page.screenshot({ path: "test-results/home.png" });
    await click("menu-directory");
    await page.getByTestId("booking-search").fill("Elena");
    await click("booking-search-submit");
    await click("booking-doctor-doctor-elena");
    await click("booking-profile-next");
    if (
      !(await page
        .getByRole("button", { name: /^Seleccionar \d{2}:\d{2}$/ })
        .count())
    )
      await page.getByRole("button", { name: "Ver un día disponible" }).click();
    await page
      .getByRole("button", { name: /^Seleccionar \d{2}:\d{2}$/ })
      .first()
      .click();
    await goReview();
    let state = await persisted((s) => s.appointments.length === 4);
    const booked = state.appointments.find(
      (a) => !a.id.startsWith("appointment-demo"),
    )!;
    assert(booked.patientId === state.profile.id);
    assert(booked.status === "scheduled");
    await page.waitForTimeout(350);
    await page.screenshot({ path: "test-results/confirmation.png" });
    await click("booking-view-agenda");
    await click(`agenda-open-${booked.id}`);
    assert.equal(await page.getByTestId("appointment-notes").count(), 0);
    const downloadEvent = page.waitForEvent("download");
    await click("appointment-export-calendar");
    const download = await downloadEvent;
    assert(download.suggestedFilename().endsWith(".ics"));
    await click("appointment-reschedule");
    const hours = page.getByRole("button", {
      name: /^Seleccionar \d{2}:\d{2}$/,
    });
    await hours.last().click();
    await goReview();
    state = await persisted(
      (s) =>
        s.appointments.find((a) => a.id === booked.id)?.time !== booked.time,
    );
    assert(
      state.appointments.length === 4,
      "Reprogramar no debe duplicar la cita.",
    );
    await click("booking-view-agenda");
    await click(`agenda-open-${booked.id}`);
    await click("appointment-cancel");
    await persisted(
      (s) =>
        s.appointments.find((a) => a.id === booked.id)?.status === "cancelled",
    );
    await close();
    await page.reload();
    await page.getByTestId("menu-agenda").waitFor();
    assert(
      (await getState()).appointments.find((a) => a.id === booked.id)
        ?.status === "cancelled",
    );
    console.log(
      "PASS · reserva, reprogramación, notas, calendario, cancelación y persistencia",
    );

    await page.getByRole("tab", { name: "Tú", exact: true }).click();
    await click("edit-profile");
    await page.getByTestId("profile-name").fill("Sofía Martínez López");
    await click("save-profile");
    await persisted((s) => s.profile.name === "Sofía Martínez López");
    await close();
    await page.reload();
    await page.getByTestId("menu-insurance").waitFor();
    assert(
      (await getState()).appointments
        .filter((a) => a.patientId === "patient-sofia")
        .every((a) => a.patientName === "Sofía Martínez López"),
    );
    console.log("PASS · perfil e identidad de citas tras renombrar");

    await click("menu-insurance");
    await click("insurance-add-policy");
    await page.getByTestId("insurance-insurer").fill("Seguro QA");
    await page.getByTestId("insurance-number").fill("QA-001");
    await page.getByTestId("insurance-holder").fill("Sofía Martínez López");
    const dates = await page.evaluate(() => {
      const start = new Date();
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      return [
        start.toLocaleDateString("sv-SE"),
        end.toLocaleDateString("sv-SE"),
      ];
    });
    await page.getByTestId("insurance-start-date").fill(dates[0]);
    await page.getByTestId("insurance-end-date").fill(dates[1]);
    await click("insurance-save-policy");
    await persisted((s) => s.policies.length === 2);
    await page
      .getByRole("button", { name: "Registrar gasto", exact: true })
      .click();
    await page.getByTestId("insurance-claim-concept").fill("Gasto de prueba");
    await page.getByTestId("insurance-claim-amount").fill("725.50");
    await click("insurance-save-claim");
    await persisted((s) =>
      s.claims.some(
        (c) => c.concept === "Gasto de prueba" && c.amount === 725.5,
      ),
    );
    await click("insurance-delete-claim");
    await persisted(
      (s) => !s.claims.some((c) => c.concept === "Gasto de prueba"),
    );
    await close();
    console.log("PASS · póliza y seguimiento local de gastos");

    await page.getByRole("tab", { name: "Archivo", exact: true }).click();
    await click("add-archive-item");
    await page
      .getByTestId("record-title")
      .fill("Registro de prueba de interfaz");
    await click("save-record");
    await persisted((s) =>
      s.records.some((r) => r.title === "Registro de prueba de interfaz"),
    );
    await page
      .getByRole("button", {
        name: "Registro de prueba de interfaz",
        exact: true,
      })
      .click();
    await click("edit-record");
    await page.getByTestId("record-title").fill("Registro editado");
    await click("save-record");
    await persisted((s) =>
      s.records.some((r) => r.title === "Registro editado"),
    );
    await close();
    console.log("PASS · creación y edición del historial clínico");

    await click("menu-teleconsult");
    await click("teleconsult-appointment-appointment-demo-tele");
    await page
      .getByTestId("teleconsult-note-input")
      .fill("Pregunta de prueba antes de la cita");
    await click("teleconsult-save-note");
    await persisted((s) =>
      s.messages.some((m) => m.text === "Pregunta de prueba antes de la cita"),
    );
    await click("teleconsult-prepare");
    for (const c of ["sound", "camera", "privacy"])
      await click(`teleconsult-check-${c}`);
    await click("teleconsult-enter-demo");
    await click("teleconsult-mic-toggle");
    await click("teleconsult-camera-toggle");
    await page.waitForTimeout(350);
    await page.screenshot({ path: "test-results/teleconsult.png" });
    await click("teleconsult-end-demo");
    await page
      .getByTestId("teleconsult-summary-input")
      .fill("Resumen local de la demostración");
    await click("teleconsult-save-summary");
    await persisted((s) =>
      s.records.some((r) =>
        r.description.includes("Resumen local de la demostración"),
      ),
    );
    assert(
      (await getState()).appointments.find(
        (a) => a.id === "appointment-demo-tele",
      )?.status === "scheduled",
      "El resumen no debe completar la cita sin selección explícita.",
    );
    await close();
    console.log(
      "PASS · preparación, sala simulada, notas y resumen de teleconsulta",
    );

    await page.setViewportSize({ width: 320, height: 640 });
    await page.screenshot({ path: "test-results/home-small.png" });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "No debe haber desbordamiento horizontal en 320px.",
    );
    assert.deepEqual(errors, [], "No debe haber errores de React/JavaScript.");
    console.log(
      "PASS · ancho reducido sin desbordamiento y cero errores de JavaScript",
    );
    fs.writeFileSync(
      "test-results/ui-summary.json",
      JSON.stringify(
        { passed: true, flows: 6, jsErrors: errors, widths: [390, 320] },
        null,
        2,
      ),
    );
  } catch (error) {
    await page.screenshot({ path: "test-results/failure.png" });
    console.error((await page.locator("body").innerText()).slice(-7000));
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
