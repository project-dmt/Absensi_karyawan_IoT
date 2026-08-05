<?php

namespace Database\Factories;

use App\Models\Schedule;
use Illuminate\Database\Eloquent\Factories\Factory;

class ScheduleFactory extends Factory
{
    protected $model = Schedule::class;

    public function definition(): array
    {
        return [
            'jam_masuk_standar' => '08:00:00',
            'jam_pulang_standar' => '17:00:00',
            'toleransi_menit' => 15,
        ];
    }
}
