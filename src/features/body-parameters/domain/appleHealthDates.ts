/** Local calendar dates, inclusive days; invalid or oversized periods never reach native code. */
export function healthHistoryRange(from: string, to: string) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Usa fechas AAAA-MM-DD.');
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Revisa las fechas.');
    return date;
  };
  const start = parse(from), end = parse(to);
  if (start > end || Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) > 30 * 86400000) throw new Error('Selecciona un período de hasta 31 días.');
  end.setDate(end.getDate() + 1);
  return { start, end };
}

