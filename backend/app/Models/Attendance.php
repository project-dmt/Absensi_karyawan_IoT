<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendance';
    protected $fillable = ['employee_id', 'tanggal', 'jam_masuk', 'jam_pulang', 'status', 'keterangan', 'input_by'];

    protected function casts(): array
    {
        return [
            // date:Y-m-d agar JSON ter-serialisasi "Y-m-d" (cast "date" polos
            // menghasilkan ISO UTC yang mundur 1 hari untuk zona Asia/Jakarta)
            'tanggal' => 'date:Y-m-d',
            'jam_masuk' => 'string',
            'jam_pulang' => 'string',
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
