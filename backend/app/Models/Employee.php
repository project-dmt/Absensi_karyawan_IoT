<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = ['nama', 'nip', 'jabatan', 'divisi_id', 'rfid_uid', 'status'];

    public function division()
    {
        return $this->belongsTo(Division::class, 'divisi_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
