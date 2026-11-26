// Format a date value for display in Asia/Jakarta, e.g. "24 Nov 2026".
// Accepts ISO datetime strings, "YYYY-MM-DD" or Date; returns "-" for null/invalid.
export function formatTanggalIndo(value) {
  if (!value) return "-";
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
