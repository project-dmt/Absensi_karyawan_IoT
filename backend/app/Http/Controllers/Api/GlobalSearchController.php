<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\Division;

class GlobalSearchController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        $query = $request->q;

        $karyawan = Employee::with('division')
            ->where('nama', 'like', "%{$query}%")
            ->orWhere('nip', 'like', "%{$query}%")
            ->orWhere('rfid_uid', 'like', "%{$query}%")
            ->limit(10)
            ->get()
            ->map(fn ($item) => [
                'type' => 'karyawan',
                'id' => $item->id,
                'title' => $item->nama,
                'subtitle' => $item->nip . ' - ' . $item->division->nama_divisi,
            ]);

        $divisi = Division::where('nama_divisi', 'like', "%{$query}%")
            ->withCount('employees')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'type' => 'divisi',
                'id' => $item->id,
                'title' => $item->nama_divisi,
                'subtitle' => $item->employees_count . ' karyawan',
            ]);

        return $this->successResponse([
            'karyawan' => $karyawan,
            'divisi' => $divisi,
            'total' => $karyawan->count() + $divisi->count(),
        ], 'Hasil pencarian berhasil diambil');
    }
}
