<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');
        $validKeys = config('services.api_keys');

        if (!$apiKey || empty($validKeys)) {
            Log::warning('API key attempt with empty key or no keys configured', [
                'ip' => $request->ip(),
            ]);
            return $this->unauthorized();
        }

        foreach ($validKeys as $validKey) {
            if (hash_equals(trim($validKey), $apiKey)) {
                return $next($request);
            }
        }

        Log::warning('Invalid API key attempt', [
            'ip' => $request->ip(),
            'key_prefix' => substr($apiKey, 0, 8) . '...',
        ]);

        return $this->unauthorized();
    }

    private function unauthorized(): Response
    {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized: Invalid API Key'
        ], 401);
    }
}
