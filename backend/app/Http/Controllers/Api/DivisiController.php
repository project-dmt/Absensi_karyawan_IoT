<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Division;

class DivisiController extends Controller
{
    public function index()
    {
        $divisi = Division::withCount('employees')->get();

        return $this->successResponse($divisi, 'Data divisi berhasil diambil');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_divisi' => 'required|string|max:100|unique:divisions,nama_divisi',
        ]);

        $divisi = Division::create($validated);

        return $this->successResponse($divisi, 'Divisi berhasil ditambahkan', 201);
    }

    public function show($id)
    {
        $divisi = Division::with('employees')->findOrFail($id);

        return $this->successResponse($divisi, 'Data divisi berhasil diambil');
    }

    public function update(Request $request, $id)
    {
        $divisi = Division::findOrFail($id);

        $validated = $request->validate([
            'nama_divisi' => 'sometimes|required|string|max:100|unique:divisions,nama_divisi,' . $id,
        ]);

        $divisi->update($validated);

        return $this->successResponse($divisi->fresh(), 'Divisi berhasil diupdate');
    }

    public function destroy($id)
    {
        $divisi = Division::findOrFail($id);
        $divisi->delete();

        return $this->successResponse(null, 'Divisi berhasil dihapus');
    }
}
