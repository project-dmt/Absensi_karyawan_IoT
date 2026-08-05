<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Schedule
    |--------------------------------------------------------------------------
    |
    | Fallback values kalau tidak ada data di tabel schedules.
    |
    */

    'default_schedule' => [
        'jam_masuk' => env('DEFAULT_JAM_MASUK', '08:00:00'),
        'jam_pulang' => env('DEFAULT_JAM_PULANG', '17:00:00'),
        'toleransi_menit' => (int) env('DEFAULT_TOLERANSI', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    'pagination' => [
        'per_page' => (int) env('DEFAULT_PER_PAGE', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Status Absensi
    |--------------------------------------------------------------------------
    |
    | List semua status yang valid untuk absensi.
    |
    */

    'statuses' => [
        'Hadir',
        'Terlambat',
        'Alpha',
        'Izin',
    ],

    /*
    |--------------------------------------------------------------------------
    | Status yang Tidak Boleh Checkout
    |--------------------------------------------------------------------------
    |
    | Status ini tidak bisa melakukan checkout (tap kedua).
    |
    */

    'no_checkout_statuses' => ['Alpha', 'Izin'],

];
