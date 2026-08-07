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
            'url' => env('OPENAI_COMPATIBLE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/'),
            'key' => env('OPENAI_COMPATIBLE_API_KEY'),
            'models' => [
                'text' => [
                    'default' => env('OPENAI_COMPATIBLE_MODEL', 'gemini-2.0-flash'),
                ],
            ],
        ],
    ],

];
