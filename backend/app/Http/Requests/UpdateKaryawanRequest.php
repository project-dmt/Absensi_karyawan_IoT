<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKaryawanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $employeeId = $this->route('karyawan')?->id;

        return [
            'nama' => 'sometimes|required|string|max:100',
            'nip' => 'sometimes|required|string|max:50|unique:employees,nip,' . $employeeId,
            'jabatan' => 'nullable|string|max:100',
            'divisi_id' => 'nullable|exists:divisions,id',
            'rfid_uid' => 'sometimes|required|string|max:50|unique:employees,rfid_uid,' . $employeeId,
            'status' => 'sometimes|in:aktif,nonaktif',
        ];
    }
}
