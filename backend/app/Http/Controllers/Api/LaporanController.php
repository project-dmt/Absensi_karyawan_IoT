<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LaporanRequest;
use App\Models\Attendance;
use App\Models\Division;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LaporanController extends Controller
{
    public function index(LaporanRequest $request)
    {
        $validated = $request->validated();

        $query = Attendance::with('employee.division', 'inputBy')
            ->whereBetween('tanggal', [$validated['dari'], $validated['sampai']]);

        if (isset($validated['divisi_id'])) {
            $query->whereHas('employee', function ($q) use ($validated) {
                $q->where('divisi_id', $validated['divisi_id']);
            });
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['search'])) {
            $search = addcslashes($validated['search'], '%_');
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        $laporan = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->paginate((int) $request->input('per_page', 100));

        return $this->successResponse($laporan, 'Laporan absensi berhasil diambil');
    }

    public function grafik(Request $request)
    {
        $validated = $request->validate([
            'dari' => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
            'periode' => 'required|in:harian,mingguan,bulanan',
            'divisi_id' => 'nullable|exists:divisions,id',
        ]);

        $dari = Carbon::parse($validated['dari'], 'Asia/Jakarta')->startOfDay();
        $sampai = Carbon::parse($validated['sampai'], 'Asia/Jakarta')->startOfDay();
        $periode = $validated['periode'];
        $divisiId = $validated['divisi_id'] ?? null;

        $buckets = $this->buildGrafikBuckets($dari, $sampai, $periode);
        $bucketIndex = [];
        foreach ($buckets as $index => $bucket) {
            $bucketIndex[$bucket['key']] = $index;
        }

        $divisionQuery = Division::query()->orderBy('nama_divisi');
        if ($divisiId) {
            $divisionQuery->whereKey($divisiId);
        }
        $divisions = $divisionQuery->get(['id', 'nama_divisi']);

        $employees = Employee::query()
            ->where('status', 'aktif')
            ->when($divisiId, fn ($query) => $query->where('divisi_id', $divisiId))
            ->get(['id', 'divisi_id']);

        $records = Attendance::query()
            ->with('employee:id,divisi_id')
            ->whereBetween('tanggal', [$dari->toDateString(), $sampai->toDateString()])
            ->whereHas('employee', function ($query) use ($divisiId) {
                $query->where('status', 'aktif')
                    ->when($divisiId, fn ($q) => $q->where('divisi_id', $divisiId));
            })
            ->orderBy('employee_id')->orderBy('tanggal')->orderBy('id')
            ->get(['id', 'employee_id', 'tanggal', 'status']);

        $statusByEmployeeDate = [];
        foreach ($records as $record) {
            $date = $record->tanggal instanceof Carbon
                ? $record->tanggal->toDateString()
                : Carbon::parse($record->tanggal, 'Asia/Jakarta')->toDateString();
            $statusByEmployeeDate[$record->employee_id][$date] ??= $record->status;
        }

        $statuses = config('absensi.statuses', ['Hadir', 'Terlambat', 'Alpha', 'Izin', 'Sakit']);
        $divisionSeries = [];
        foreach ($divisions as $division) {
            $divisionSeries[$division->id] = [
                'id' => $division->id, 'nama_divisi' => $division->nama_divisi,
                'counts' => array_fill(0, count($buckets), 0), 'total' => 0,
                'status_counts' => array_fill_keys($statuses, 0), 'total_records' => 0,
            ];
        }

        $totals = array_fill_keys($statuses, 0);
        foreach ($employees as $employee) {
            $divisionId = $employee->divisi_id ?? 0;
            if (!isset($divisionSeries[$divisionId])) {
                if ($divisiId) continue;
                $divisionSeries[0] ??= [
                    'id' => 0, 'nama_divisi' => 'Tanpa Divisi',
                    'counts' => array_fill(0, count($buckets), 0), 'total' => 0,
                    'status_counts' => array_fill_keys($statuses, 0), 'total_records' => 0,
                ];
                $divisionId = 0;
            }

            for ($date = $dari->copy(); $date->lte($sampai); $date->addDay()) {
                $dateKey = $date->toDateString();
                $status = $statusByEmployeeDate[$employee->id][$dateKey] ?? 'Alpha';
                $totals[$status] = ($totals[$status] ?? 0) + 1;
                $divisionSeries[$divisionId]['status_counts'][$status] =
                    ($divisionSeries[$divisionId]['status_counts'][$status] ?? 0) + 1;
                $divisionSeries[$divisionId]['total_records']++;
                $position = $bucketIndex[$this->grafikBucketKey($date, $periode)] ?? null;
                if ($position !== null && in_array($status, ['Hadir', 'Terlambat'], true)) {
                    $divisionSeries[$divisionId]['counts'][$position]++;
                    $divisionSeries[$divisionId]['total']++;
                }
            }
        }

        $divisionsOut = array_values($divisionSeries);
        usort($divisionsOut, function (array $a, array $b) {
            if ($a['id'] === 0) return 1;
            if ($b['id'] === 0) return -1;
            return strcmp($a['nama_divisi'], $b['nama_divisi']);
        });

        $maxValue = 1;
        $maxTotal = 1;
        foreach ($divisionsOut as $series) {
            $maxValue = max($maxValue, ...$series['counts']);
            $maxTotal = max($maxTotal, $series['total']);
        }


        $totalRecords = array_sum($totals);
        $totalKehadiran = ($totals['Hadir'] ?? 0) + ($totals['Terlambat'] ?? 0);
        $totals['total_kehadiran'] = $totalKehadiran;
        $totals['total_records'] = $totalRecords;

        return $this->successResponse([
            'periode' => $periode,
            'dari' => $dari->toDateString(),
            'sampai' => $sampai->toDateString(),
            'buckets' => $buckets,
            'divisions' => $divisionsOut,
            'totals' => $totals,
            'max_value' => $maxValue,
            'max_total' => $maxTotal,
        ], 'Data grafik kehadiran berhasil diambil');
    }

    private function buildGrafikBuckets(Carbon $dari, Carbon $sampai, string $periode): array
    {
        $buckets = [];

        if ($periode === 'harian') {
            $cursor = $dari->copy();
            while ($cursor->lte($sampai)) {
                $buckets[] = [
                    'key' => $cursor->toDateString(),
                    'label' => $cursor->copy()->locale('id')->translatedFormat('d M'),
                    'start' => $cursor->toDateString(),
                    'end' => $cursor->toDateString(),
                ];
                $cursor->addDay();
            }

            return $buckets;
        }

        if ($periode === 'mingguan') {
            $cursor = $dari->copy()->startOfWeek(Carbon::MONDAY);
            $last = $sampai->copy()->startOfWeek(Carbon::MONDAY);

            while ($cursor->lte($last)) {
                $weekEnd = $cursor->copy()->endOfWeek(Carbon::SUNDAY);
                $buckets[] = [
                    'key' => $cursor->toDateString(),
                    'label' => $cursor->copy()->locale('id')->translatedFormat('d M')
                        .' - '.$weekEnd->copy()->locale('id')->translatedFormat('d M'),
                    'start' => $cursor->toDateString(),
                    'end' => $weekEnd->toDateString(),
                ];
                $cursor->addWeek();
            }

            return $buckets;
        }

        $cursor = $dari->copy()->startOfMonth();
        $last = $sampai->copy()->startOfMonth();

        while ($cursor->lte($last)) {
            $buckets[] = [
                'key' => $cursor->format('Y-m'),
                'label' => $cursor->copy()->locale('id')->translatedFormat('M Y'),
                'start' => $cursor->toDateString(),
                'end' => $cursor->copy()->endOfMonth()->toDateString(),
            ];
            $cursor->addMonth();
        }

        return $buckets;
    }

    private function grafikBucketKey(Carbon $date, string $periode): string
    {
        return match ($periode) {
            'harian' => $date->toDateString(),
            'mingguan' => $date->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'bulanan' => $date->format('Y-m'),
        };
    }

    public function export(Request $request)
    {
        $request->validate([
            'dari' => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
            'divisi_id' => 'nullable|exists:divisions,id',
            'status' => 'nullable|in:'.implode(',', config('absensi.statuses')),
            'search' => 'nullable|string|max:100',
            'format' => 'nullable|in:xlsx,csv',
        ]);

        $query = Attendance::with('employee.division')
            ->whereBetween('tanggal', [$request->dari, $request->sampai]);

        if ($request->filled('divisi_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('divisi_id', $request->divisi_id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = addcslashes($request->search, '%_');
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('tanggal', 'desc')
            ->orderBy('employee_id')
            ->get();

        $format = $request->get('format', 'xlsx');

        if ($format === 'csv') {
            return $this->exportCsv($records, $request);
        }

        return $this->exportXlsx($records, $request);
    }

    private function exportXlsx($records, $request)
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $headers = ['No', 'Tanggal', 'NIP', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan'];

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '2563EB']],
            'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
            'borders' => [
                'allBorders' => ['borderStyle' => 'thin', 'color' => ['rgb' => 'D1D5DB']],
            ],
        ];

        foreach ($headers as $col => $header) {
            $cellRef = Coordinate::stringFromColumnIndex($col + 1).'1';
            $cell = $sheet->getCell($cellRef)->setValue($header);
            $cell->getStyle()->applyFromArray($headerStyle);
        }

        $no = 1;
        $row = 2;
        foreach ($records as $record) {
            $tanggal = $record->tanggal instanceof Carbon
                ? $record->tanggal->format('d/m/Y')
                : $record->tanggal;

            $data = [
                $no++,
                $tanggal,
                $record->employee->nip ?? '',
                $record->employee->nama ?? '',
                $record->employee->division->nama_divisi ?? '',
                $record->jam_masuk ?? '-',
                $record->jam_pulang ?? '-',
                $record->status,
                $record->keterangan ?? '',
            ];

            foreach ($data as $col => $value) {
                $cellRef = Coordinate::stringFromColumnIndex($col + 1).$row;
                $sheet->getCell($cellRef)->setValue($value);
            }

            $statusColor = match ($record->status) {
                'Hadir' => 'D1FAE5',
                'Terlambat' => 'FEF3C7',
                'Izin' => 'DBEAFE',
                'Alpha' => 'FEE2E2',
                default => 'F9FAFB',
            };

            $statusCellRef = 'H'.$row;
            $sheet->getCell($statusCellRef)->getStyle()->applyFromArray([
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => $statusColor]],
            ]);

            $row++;
        }

        foreach (range('A', 'I') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $filename = 'laporan_absensi_'.$request->dari.'_sd_'.$request->sampai.'.xlsx';

        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(false);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function exportCsv($records, $request)
    {
        $filename = 'laporan_absensi_'.$request->dari.'_sd_'.$request->sampai.'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($records) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['No', 'Tanggal', 'NIP', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan']);

            $no = 1;
            foreach ($records as $row) {
                fputcsv($file, [
                    $no++,
                    $this->sanitizeCsvCell($row->tanggal instanceof Carbon
                        ? $row->tanggal->format('Y-m-d')
                        : $row->tanggal),
                    $this->sanitizeCsvCell($row->employee->nip ?? ''),
                    $this->sanitizeCsvCell($row->employee->nama ?? ''),
                    $this->sanitizeCsvCell($row->employee->division->nama_divisi ?? ''),
                    $row->jam_masuk ?? '-',
                    $row->jam_pulang ?? '-',
                    $this->sanitizeCsvCell($row->status),
                    $this->sanitizeCsvCell($row->keterangan ?? ''),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function sanitizeCsvCell($value): string
    {
        $value = (string) $value;
        if (in_array(substr($value, 0, 1), ['=', '+', '-', '@', "\t"], true)) {
            return "\t".$value;
        }

        return $value;
    }
}
