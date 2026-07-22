<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Division;
use App\Http\Requests\StoreDivisiRequest;
use App\Http\Requests\UpdateDivisiRequest;
use App\Services\AuditLogService;

class DivisiController extends Controller
{
    public function index()
    {
        $divisi = Division::withCount('employees')->get();

        return $this->successResponse($divisi, 'Data divisi berhasil diambil');
    }

    public function store(StoreDivisiRequest $request)
    {
        $divisi = Division::create($request->validated());

        AuditLogService::log('create_divisi', $divisi, null, $divisi->toArray(), $request);

        return $this->successResponse($divisi, 'Divisi berhasil ditambahkan', 201);
    }

    public function show(Division $divisi)
    {
        $divisi->load('employees');

        return $this->successResponse($divisi, 'Data divisi berhasil diambil');
    }

    public function update(UpdateDivisiRequest $request, Division $divisi)
    {
        $old = $divisi->toArray();
        $divisi->update($request->validated());

        AuditLogService::log('update_divisi', $divisi, $old, $divisi->fresh()->toArray(), $request);

        return $this->successResponse($divisi->fresh(), 'Divisi berhasil diupdate');
    }

    public function destroy(Request $request, Division $divisi)
    {
        $old = $divisi->toArray();
        $divisi->delete();

        AuditLogService::log('delete_divisi', null, $old, null, $request);

        return $this->successResponse(null, 'Divisi berhasil dihapus');
    }
}
