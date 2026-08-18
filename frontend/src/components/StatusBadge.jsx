import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS = {
  Hadir: "badge-status-hadir",
  Terlambat: "badge-status-terlambat",
  Alpha: "badge-status-alpha",
  Izin: "badge-status-izin",
  Sakit: "badge-status-sakit",
  "Sudah Absen": "badge-status-sakit",
  aktif: "badge-status-aktif",
  nonaktif: "badge-status-nonaktif",
};

export default function StatusBadge({ status }) {
  return (
    <Badge className={cn("rounded-md", VARIANTS[status] || "badge-status-default")}>
      {status}
    </Badge>
  );
}