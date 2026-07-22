<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KaryawanController;
use App\Http\Controllers\Api\DivisiController;
use App\Http\Controllers\Api\JadwalController;
use App\Http\Controllers\Api\AbsensiController;
use App\Http\Controllers\Api\LaporanController;

// =====================================================
// PUBLIC API - Endpoint untuk ESP32 (API Key Auth)
// =====================================================
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware('api.key')
    ->name('api.absensi.device');

// =====================================================
// PUBLIC API - Endpoint untuk React (Login)
// =====================================================
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

// =====================================================
// PROTECTED API - Endpoint untuk React (Sanctum Auth)
// =====================================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/user', [AuthController::class, 'user'])->name('api.user');

    // Data Karyawan
    Route::apiResource('karyawan', KaryawanController::class);

    // Riwayat Absensi per Karyawan (route model binding: Employee)
    Route::get('/karyawan/{employee}/absensi', [AbsensiController::class, 'history'])
        ->name('karyawan.absensi.history');

    // Data Divisi
    Route::apiResource('divisi', DivisiController::class);

    // Jadwal Kerja
    Route::get('/jadwal', [JadwalController::class, 'index'])->name('jadwal.index');
    Route::put('/jadwal', [JadwalController::class, 'update'])->name('jadwal.update');

    // Absensi (CRUD)
    Route::post('/absensi/manual', [AbsensiController::class, 'storeManual'])->name('absensi.manual');
    Route::put('/absensi/{attendance}', [AbsensiController::class, 'update'])->name('absensi.update');
    Route::delete('/absensi/{attendance}', [AbsensiController::class, 'destroy'])->name('absensi.destroy');

    // Laporan
    Route::get('/laporan', [LaporanController::class, 'index'])->name('laporan.index');
    Route::get('/laporan/export', [LaporanController::class, 'export'])->name('laporan.export');
});
