<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Division;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'nama' => fake()->name(),
            'nip' => fake()->unique()->numerify('NIP############'),
            'rfid_uid' => fake()->unique()->bothify('??####??'),
            'divisi_id' => Division::factory(),
            'status' => 'aktif',
        ];
    }

    public function nonaktif(): static
    {
        return $this->state(fn () => ['status' => 'nonaktif']);
    }
}
