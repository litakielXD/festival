const germanDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

export function formatDateLong(value?: string | null) {
  if (!value) return "Unbekannt";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return germanDateFormatter.format(parsed);
}

export function formatDateRange(start?: string | null, end?: string | null) {
  if (start && end) return `${formatDateLong(start)} - ${formatDateLong(end)}`;
  if (start) return formatDateLong(start);
  if (end) return formatDateLong(end);
  return "Unbekannt";
}
