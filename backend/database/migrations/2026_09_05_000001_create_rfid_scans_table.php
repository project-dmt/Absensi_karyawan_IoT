<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table untuk sesi scan RFID dari form tambah/edit karyawan.
     * Admin buka form -> klik "Scan Kartu" -> ESP32 kirim UID -> frontend polling.
     */
    public function up(): void
    {
        Schema::create('rfid_scans', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->enum('status', ['waiting', 'completed', 'expired'])->default('waiting');
            $table->string('uid', 50)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rfid_scans');
    }
};