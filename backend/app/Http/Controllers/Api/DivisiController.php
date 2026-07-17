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

        return response()->json([
            'success' => true,
            'data' => $divisi,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_divisi' => 'required|string|max:100|unique:divisions,nama_divisi',
        ]);

        $divisi = Division::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Divisi berhasil ditambahkan',
            'data' => $divisi,
        ], 201);
    }

    public function show($id)
    {
        $divisi = Division::with('employees')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $divisi,
        ]);
    }

    public function update(Request $request, $id)
    {
        $divisi = Division::findOrFail($id);

        $validated = $request->validate([
            'nama_divisi' => 'sometimes|required|string|max:100|unique:divisions,nama_divisi,' . $id,
        ]);

        $divisi->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Divisi berhasil diupdate',
            'data' => $divisi,
        ]);
    }

    public function destroy($id)
    {
        $divisi = Division::findOrFail($id);
        $divisi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Divisi berhasil dihapus',
        ]);
    }
}
