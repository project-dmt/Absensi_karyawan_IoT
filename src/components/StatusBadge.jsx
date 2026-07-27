const VARIANTS = {
  Hadir: "bg-success-subtle text-success",
  Terlambat: "bg-warning-subtle text-warning",
  Alpha: "bg-danger-subtle text-danger",
  Izin: "bg-info-subtle text-info",
  "Sudah Absen": "bg-secondary-subtle text-secondary",
  aktif: "bg-success-subtle text-success",
  nonaktif: "bg-secondary-subtle text-secondary",
};

export default function StatusBadge({ status }) {
  const className = VARIANTS[status] || "bg-secondary-subtle text-secondary";
  return <span className={`badge ${className}`}>{status}</span>;
}
