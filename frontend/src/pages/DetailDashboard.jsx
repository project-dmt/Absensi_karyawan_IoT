import { useParams, useNavigate } from "react-router-dom";
import { useDashboardDetail } from "../api/queries";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_CONFIG = {
  terlambat: {
    title: "Karyawan Terlambat Hari Ini",
    columns: ["No", "Nama", "NIP", "Divisi", "Jam Masuk", "Jam Standar", "Keterlambatan"],
  },
  "tidak-hadir": {
    title: "Karyawan Tidak Hadir Hari Ini",
    columns: ["No", "Nama", "NIP", "Divisi", "Keterangan"],
  },
};

export default function DetailDashboard() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { data = [], isPending } = useDashboardDetail(type);
  const config = PAGE_CONFIG[type];

  if (!config) {
    return <EmptyState message="Halaman tidak ditemukan" />;
  }

  if (isPending) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
        >
          <ArrowLeft data-icon="inline-start" className="size-4" />
          Kembali
        </Button>
        <div>
          <h4>{config.title}</h4>
          <small className="text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </small>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <EmptyState
              message={`Tidak ada data ${config.title.toLowerCase()}`}
              icon={<CheckCircle className="size-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {config.columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>
                        <code>{item.nip}</code>
                      </TableCell>
                      <TableCell>{item.divisi}</TableCell>
                      {type === "terlambat" && (
                        <>
                          <TableCell>{item.jam_masuk}</TableCell>
                          <TableCell>{item.jam_standar}</TableCell>
                          <TableCell>
                            <Badge className="rounded-md badge-status-terlambat">
                              +{item.keterlambatan} menit
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      {type === "tidak-hadir" && (
                        <TableCell>{item.keterangan || "-"}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-3">
        <small className="text-muted-foreground">
          Total: {data.length} karyawan
        </small>
      </div>
    </div>
  );
}