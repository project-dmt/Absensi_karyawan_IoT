<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Http\Requests\StoreKaryawanRequest;
use App\Http\Requests\UpdateKaryawanRequest;

class KaryawanController extends Controller
{
    public function index()
    {
        $karyawan = Employee::with('division')->get();

        return $this->successResponse($karyawan, 'Data karyawan berhasil diambil');
    }

    public function store(StoreKaryawanRequest $request)
    {
        $karyawan = Employee::create($request->validated());

        return $this->successResponse($karyawan, 'Karyawan berhasil ditambahkan', 201);
    }

    public function show(Employee $karyawan)
    {
        $karyawan->load('division');

        return $this->successResponse($karyawan, 'Data karyawan berhasil diambil');
    }

    public function update(UpdateKaryawanRequest $request, Employee $karyawan)
    {
        $karyawan->update($request->validated());

        return $this->successResponse($karyawan->fresh(), 'Karyawan berhasil diupdate');
    }

    public function destroy(Employee $karyawan)
    {
        $karyawan->delete();

        return $this->successResponse(null, 'Karyawan berhasil dihapus');
    }
}
