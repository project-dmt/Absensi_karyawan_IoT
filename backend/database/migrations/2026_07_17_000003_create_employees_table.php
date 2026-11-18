<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100);
            $table->string('nip', 50)->unique();
            $table->string('jabatan', 100)->nullable();
            $table->foreignId('divisi_id')->constrained('divisions')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('rfid_uid', 50)->unique();
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->timestamps();

            $table->index('divisi_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
