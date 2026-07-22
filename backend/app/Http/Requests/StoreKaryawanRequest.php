<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKaryawanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nama' => 'required|string|max:100',
            'nip' => 'required|string|max:50|unique:employees,nip',
            'jabatan' => 'nullable|string|max:100',
            'divisi_id' => 'nullable|exists:divisions,id',
            'rfid_uid' => 'required|string|max:50|unique:employees,rfid_uid',
            'status' => 'sometimes|in:aktif,nonaktif',
        ];
    }
}
