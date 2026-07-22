<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LaporanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dari' => 'required|date',
            'sampai' => 'required|date|after_or_equal:dari',
            'divisi_id' => 'nullable|exists:divisions,id',
            'status' => 'nullable|in:' . implode(',', config('absensi.statuses')),
        ];
    }
}
