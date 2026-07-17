<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;

class KaryawanController extends Controller
{
    public function index()
    {
        $karyawan = Employee::with('division')->get();

        return response()->json([
            'success' => true,
            'data' => $karyawan,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'nip' => 'required|string|max:50|unique:employees,nip',
            'jabatan' => 'nullable|string|max:100',
            'divisi_id' => 'nullable|exists:divisions,id',
            'rfid_uid' => 'required|string|max:50|unique:employees,rfid_uid',
            'status' => 'in:aktif,nonaktif',
        ]);

        $karyawan = Employee::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Karyawan berhasil ditambahkan',
            'data' => $karyawan,
        ], 201);
    }

    public function show($id)
    {
        $karyawan = Employee::with('division')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $karyawan,
        ]);
    }

    public function update(Request $request, $id)
    {
        $karyawan = Employee::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:100',
            'nip' => 'sometimes|required|string|max:50|unique:employees,nip,' . $id,
            'jabatan' => 'nullable|string|max:100',
            'divisi_id' => 'nullable|exists:divisions,id',
            'rfid_uid' => 'sometimes|required|string|max:50|unique:employees,rfid_uid,' . $id,
            'status' => 'in:aktif,nonaktif',
        ]);

        $karyawan->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Karyawan berhasil diupdate',
            'data' => $karyawan,
        ]);
    }

    public function destroy($id)
    {
        $karyawan = Employee::findOrFail($id);
        $karyawan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Karyawan berhasil dihapus',
        ]);
    }
}
