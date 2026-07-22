<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDivisiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $divisionId = $this->route('divisi')?->id;

        return [
            'nama_divisi' => 'sometimes|required|string|max:100|unique:divisions,nama_divisi,' . $divisionId,
        ];
    }
}
