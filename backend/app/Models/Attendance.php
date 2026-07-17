<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = ['employee_id', 'tanggal', 'jam_masuk', 'jam_pulang', 'status', 'keterangan', 'input_by'];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'jam_masuk' => 'datetime:H:i:s',
            'jam_pulang' => 'datetime:H:i:s',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function inputBy()
    {
        return $this->belongsTo(User::class, 'input_by');
    }
}
