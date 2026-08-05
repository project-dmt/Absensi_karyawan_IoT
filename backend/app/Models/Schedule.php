<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = ['jam_masuk_standar', 'jam_pulang_standar', 'toleransi_menit'];

    protected function casts(): array
    {
        return [
            'jam_masuk_standar' => 'string',
            'jam_pulang_standar' => 'string',
        ];
    }
}
