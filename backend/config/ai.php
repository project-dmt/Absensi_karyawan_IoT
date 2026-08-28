<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default AI Provider Names
    |--------------------------------------------------------------------------
    */

    'default' => 'attendance-ai',

    /*
    |--------------------------------------------------------------------------
    | Caching
    |--------------------------------------------------------------------------
    */

    'caching' => [
        'embeddings' => [
            'cache' => false,
            'store' => env('CACHE_STORE', 'database'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Providers
    |--------------------------------------------------------------------------
    */

    'providers' => [
        'attendance-ai' => [
            'driver' => 'openai-compatible',
            'url' => env('OPENAI_COMPATIBLE_URL', 'https://openrouter.ai/api/v1/'),
            'key' => env('OPENAI_COMPATIBLE_API_KEY'),
            'models' => [
                'text' => [
                    'default' => env('OPENAI_COMPATIBLE_MODEL', 'cohere/north-mini-code:free'),
                ],
            ],
        ],

        // Backup failover — dipakai otomatis kalau provider utama rate-limited (429)
        'attendance-ai-backup' => [
            'driver' => 'openai-compatible',
            'url' => env('OPENAI_COMPATIBLE_URL', 'https://openrouter.ai/api/v1/'),
            'key' => env('OPENAI_COMPATIBLE_API_KEY'),
            'models' => [
                'text' => [
                    'default' => env('OPENAI_COMPATIBLE_MODEL_BACKUP', 'nvidia/nemotron-3-super-120b-a12b:free'),
                ],
            ],
        ],
    ],

];
