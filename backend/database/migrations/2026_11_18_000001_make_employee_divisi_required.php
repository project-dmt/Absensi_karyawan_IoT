<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'divisi_id')) {
            return;
        }

        $column = collect(Schema::getColumns('employees'))->firstWhere('name', 'divisi_id');

        if (! $column || ! $column['nullable']) {
            return;
        }

        $umumId = DB::table('divisions')->where('nama_divisi', 'Umum')->value('id');

        if (! $umumId) {
            $umumId = DB::table('divisions')->insertGetId([
                'nama_divisi' => 'Umum',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('employees')->whereNull('divisi_id')->update(['divisi_id' => $umumId]);

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['divisi_id']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('divisi_id')->nullable(false)->change();
            $table->foreign('divisi_id')->references('id')->on('divisions')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'divisi_id')) {
            return;
        }

        $column = collect(Schema::getColumns('employees'))->firstWhere('name', 'divisi_id');

        if ($column && $column['nullable']) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['divisi_id']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('divisi_id')->nullable()->change();
            $table->foreign('divisi_id')->references('id')->on('divisions')->nullOnDelete()->cascadeOnUpdate();
        });
    }
};
