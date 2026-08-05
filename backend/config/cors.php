<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Konfigurasi CORS untuk komunikasi antara React (frontend) dan
    | Laravel (backend) yang berjalan di port/origin berbeda.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'api/absensi/stream'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5173',
    ],

    'allowed_origins_patterns' => [
        '/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/',
        '/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/',
        '/^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/',
    ],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,

];
