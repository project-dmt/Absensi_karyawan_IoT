<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'tanggal' => fake()->date('Y-m-d'),
            'jam_masuk' => '08:00:00',
            'jam_pulang' => null,
            'status' => 'Hadir',
            'keterangan' => null,
            'input_by' => User::factory(),
        ];
    }

    public function hadir(): static
    {
        return $this->state(fn () => ['status' => 'Hadir']);
    }

    public function terlambat(): static
    {
        return $this->state(fn () => ['status' => 'Terlambat']);
    }

    public function alpha(): static
    {
        return $this->state(fn () => ['status' => 'Alpha']);
    }

    public function izin(): static
    {
        return $this->state(fn () => ['status' => 'Izin']);
    }
}
