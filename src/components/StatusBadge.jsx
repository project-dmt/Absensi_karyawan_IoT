const VARIANTS = {
  Hadir: "bg-success",
  Terlambat: "bg-warning text-dark",
  Alpha: "bg-danger",
  Izin: "bg-info text-dark",
  "Sudah Absen": "bg-secondary",
  aktif: "bg-success",
  nonaktif: "bg-secondary",
};

export default function StatusBadge({ status }) {
  const className = VARIANTS[status] || "bg-secondary";
  return <span className={`badge ${className}`}>{status}</span>;
}
