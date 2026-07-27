<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realtime_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 50);  // check_in, checkout
            $table->string('employee_name', 100);
            $table->string('employee_nip', 50)->nullable();
            $table->string('status', 20);       // Hadir, Terlambat, Checkout
            $table->string('jam', 20);           // jam masuk/keluar
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realtime_events');
    }
};
