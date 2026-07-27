<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KaryawanController;
use App\Http\Controllers\Api\DivisiController;
use App\Http\Controllers\Api\JadwalController;
use App\Http\Controllers\Api\AbsensiController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GlobalSearchController;
use App\Http\Controllers\Api\SseController;

// =====================================================
// PUBLIC API - Endpoint untuk ESP32 (API Key Auth)
// =====================================================
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.absensi.device');

// =====================================================
// PUBLIC API - Endpoint untuk React (Login)
// =====================================================
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('api.login');

// =====================================================
// PROTECTED API - Endpoint untuk React (Sanctum Auth)
// =====================================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/user', [AuthController::class, 'user'])->name('api.user');
    Route::post('/change-password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:change-password')
        ->name('api.change-password');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('api.dashboard');

    // Global Search
    Route::get('/search', [GlobalSearchController::class, 'index'])->name('api.search');

    // Data Karyawan
    Route::apiResource('karyawan', KaryawanController::class);
    Route::delete('/karyawan/{karyawan}', [KaryawanController::class, 'destroy'])
        ->middleware('role:superadmin')
        ->name('karyawan.destroy');

    // Riwayat Absensi per Karyawan (route model binding: Employee)
    Route::get('/karyawan/{employee}/absensi', [AbsensiController::class, 'history'])
        ->name('karyawan.absensi.history');

    // Data Divisi
    Route::apiResource('divisi', DivisiController::class);
    Route::delete('/divisi/{divisi}', [DivisiController::class, 'destroy'])
        ->middleware('role:superadmin')
        ->name('divisi.destroy');

    // Jadwal Kerja
    Route::get('/jadwal', [JadwalController::class, 'index'])->name('jadwal.index');
    Route::put('/jadwal', [JadwalController::class, 'update'])->name('jadwal.update');

    // Absensi (CRUD)
    Route::post('/absensi/manual', [AbsensiController::class, 'storeManual'])->name('absensi.manual');
    Route::put('/absensi/{attendance}', [AbsensiController::class, 'update'])
        ->middleware('role:admin,superadmin')
        ->name('absensi.update');
    Route::delete('/absensi/{attendance}', [AbsensiController::class, 'destroy'])
        ->middleware('role:superadmin')
        ->name('absensi.destroy');

    // Laporan
    Route::get('/laporan', [LaporanController::class, 'index'])->name('laporan.index');
    Route::get('/laporan/export', [LaporanController::class, 'export'])->name('laporan.export');

    // Realtime SSE Stream
    Route::get('/absensi/stream', [SseController::class, 'stream'])
        ->name('api.absensi.stream');
});
