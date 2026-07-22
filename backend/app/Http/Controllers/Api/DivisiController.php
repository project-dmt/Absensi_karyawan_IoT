<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Division;
use App\Http\Requests\StoreDivisiRequest;
use App\Http\Requests\UpdateDivisiRequest;

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

        return $this->successResponse($divisi, 'Divisi berhasil ditambahkan', 201);
    }

    public function show(Division $divisi)
    {
        $divisi->load('employees');

        return $this->successResponse($divisi, 'Data divisi berhasil diambil');
    }

    public function update(UpdateDivisiRequest $request, Division $divisi)
    {
        $divisi->update($request->validated());

        return $this->successResponse($divisi->fresh(), 'Divisi berhasil diupdate');
    }

    public function destroy(Division $divisi)
    {
        $divisi->delete();

        return $this->successResponse(null, 'Divisi berhasil dihapus');
    }
}
