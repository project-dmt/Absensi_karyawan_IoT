<?php

namespace App\Providers;

use App\Ai\ProxyOpenAiCompatibleProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Ai\Ai;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Gateway OpenAI-compatible tertentu menambahkan prefix "proxy_" ke nama tool.
        // Override driver bawaan dengan provider yang membersihkan prefix tersebut.
        Ai::extend('openai-compatible', function ($app, array $config) {
            return new ProxyOpenAiCompatibleProvider($config, $app->make(Dispatcher::class));
        });

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->input('email') . '|' . $request->ip()
            );
        });

        RateLimiter::for('change-password', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?? $request->ip());
        });
    }
}
