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
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\RfidScanController;
use App\Http\Controllers\Api\ServerTimeController;
use App\Http\Controllers\Api\EspConfigController;

// =====================================================
// PUBLIC API - Endpoint untuk ESP32 (API Key Auth)
// =====================================================
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.absensi.device');

// ESP32 melaporkan kartu discan; kalau ada sesi registrasi, UID ditangkap
Route::post('/rfid/announce', [RfidScanController::class, 'announce'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.rfid.announce');

// =====================================================
// PUBLIC API - Endpoint untuk React (Login)
// =====================================================
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('api.login');

// Public: waktu server untuk sinkronisasi jam di frontend
Route::get('/server-time', [ServerTimeController::class, 'show'])->name('api.server-time');

// =====================================================
// PROTECTED API - Endpoint untuk React (Sanctum Auth)
// =====================================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/user', [AuthController::class, 'user'])->name('api.user');
    Route::get('/server-time', [AuthController::class, 'serverTime'])->name('api.server-time');
    Route::post('/change-password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:change-password')
        ->name('api.change-password');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('api.dashboard');
    Route::get('/dashboard/terlambat', [DashboardController::class, 'terlambat'])->name('api.dashboard.terlambat');
    Route::get('/dashboard/hadir', [DashboardController::class, 'hadir'])->name('api.dashboard.hadir');
    Route::get('/dashboard/tidak-hadir', [DashboardController::class, 'tidakHadir'])->name('api.dashboard.tidak-hadir');

    // Global Search
    Route::get('/search', [GlobalSearchController::class, 'index'])->name('api.search');

    // RFID Scan session (untuk tombol "Scan Kartu" di form karyawan)
    Route::post('/rfid/register', [RfidScanController::class, 'store'])->name('api.rfid.register');
    Route::get('/rfid/register/{token}', [RfidScanController::class, 'show'])->name('api.rfid.register.show');

    // AI Assistant
    Route::post('/ai/chat', [AiController::class, 'chat'])->name('api.ai.chat');

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
    Route::get('/absensi', [AbsensiController::class, 'index'])->name('absensi.index');
    Route::post('/absensi/manual', [AbsensiController::class, 'storeManual'])->name('absensi.manual');
    // ponytail: testing — hapus absensi hari ini (bulk) — harus di atas {attendance} biar tidak ketangkap param
    Route::delete('/absensi/clear-today', [AbsensiController::class, 'clearToday'])
        ->middleware('role:admin,superadmin')
        ->name('absensi.clearToday');
    Route::put('/absensi/{attendance}', [AbsensiController::class, 'update'])
        ->middleware('role:admin,superadmin')
        ->name('absensi.update');
    Route::delete('/absensi/{attendance}', [AbsensiController::class, 'destroy'])
        ->middleware('role:superadmin')
        ->name('absensi.destroy');

    // Laporan
    Route::get('/laporan', [LaporanController::class, 'index'])->name('laporan.index');
    Route::get('/laporan/export', [LaporanController::class, 'export'])->name('laporan.export');

    // Konfigurasi ESP32 dari web admin (proxy ke listener LAN port 8080)
    Route::get('/esp/config-info', [EspConfigController::class, 'info'])->name('esp.info');
    Route::post('/esp/config', [EspConfigController::class, 'store'])->name('esp.config');
    Route::get('/esp/{ip}/status', [EspConfigController::class, 'check'])->name('esp.status');
});

// Server time (public — untuk jam topbar FE, sinkron semua device)
Route::get('/server-time', [ServerTimeController::class, 'show'])
        ->name('api.server-time');

// Realtime SSE Stream (token via query string — EventSource tidak bisa pakai header)
Route::get('/absensi/stream', [SseController::class, 'stream'])
    ->name('api.absensi.stream');
