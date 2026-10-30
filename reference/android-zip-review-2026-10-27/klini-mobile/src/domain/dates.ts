/** Calendar dates are device-local. Never parse YYYY-MM-DD as UTC. */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO(): string {
  return toISO(new Date());
}
export function addDays(value: string, n: number): string {
  const d = parseDate(value);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function dateLabel(value: string): string {
  return parseDate(value).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
export function monthLabel(value: string): string {
  return parseDate(value).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}
export function money(value: number): string {
  return (
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(value) + " MXN"
  );
}
export function futureDates(n = 14): string[] {
  return Array.from({ length: n }, (_, i) => addDays(todayISO(), i));
}
export function localDateTime(date: string, time: string): Date {
  const d = parseDate(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
