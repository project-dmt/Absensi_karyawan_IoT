<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->enum('status', ['Hadir', 'Terlambat', 'Alpha', 'Izin', 'Sakit'])->default('Hadir')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->enum('status', ['Hadir', 'Terlambat', 'Alpha', 'Izin'])->default('Hadir')->change();
        });
    }
};
