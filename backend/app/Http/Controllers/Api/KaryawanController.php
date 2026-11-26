<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKaryawanRequest;
use App\Http\Requests\UpdateKaryawanRequest;
use App\Models\Employee;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class KaryawanController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'divisi_id' => 'nullable|exists:divisions,id',
            'status' => 'nullable|in:aktif,nonaktif',
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Employee::with('division');

        if ($request->filled('search')) {
            $search = addcslashes($request->search, '%_');
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('rfid_uid', 'like', "%{$search}%");
            });
        }

        if ($request->filled('divisi_id')) {
            $query->where('divisi_id', $request->divisi_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->input('per_page', 100);
        $karyawan = $query->orderBy('nama')->paginate($perPage);

        return $this->successResponse($karyawan, 'Data karyawan berhasil diambil');
    }

    public function store(StoreKaryawanRequest $request)
    {
        $karyawan = Employee::create($request->validated());

        AuditLogService::log('create_karyawan', $karyawan, null, $karyawan->toArray(), $request);

        return $this->successResponse($karyawan, 'Karyawan berhasil ditambahkan', 201);
    }

    public function show(Employee $karyawan)
    {
        $karyawan->load('division');

        return $this->successResponse($karyawan, 'Data karyawan berhasil diambil');
    }

    public function update(UpdateKaryawanRequest $request, Employee $karyawan)
    {
        $old = $karyawan->toArray();
        $karyawan->update($request->validated());

        AuditLogService::log('update_karyawan', $karyawan, $old, $karyawan->fresh()->toArray(), $request);

        return $this->successResponse($karyawan->fresh(), 'Karyawan berhasil diupdate');
    }

    public function destroy(Request $request, Employee $karyawan)
    {
        if ($karyawan->status === 'aktif' && $karyawan->attendances()->exists()) {
            throw new ApiException('Karyawan aktif masih memiliki data absensi, ubah status menjadi nonaktif sebelum menghapus', 422);
        }

        $old = $karyawan->toArray();
        $karyawan->delete();

        AuditLogService::log('delete_karyawan', null, $old, null, $request);

        return $this->successResponse(null, 'Karyawan berhasil dihapus');
    }
}
