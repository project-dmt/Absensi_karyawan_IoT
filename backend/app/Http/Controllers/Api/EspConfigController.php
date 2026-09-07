<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class EspConfigController extends Controller
{
    private const ESP_PORT = 8080;

    /**
     * Info konfigurasi yang akan dikirim ke ESP (untuk ditampilkan di UI admin).
     */
    public function info(Request $request): JsonResponse
    {
        $apiKeys = config('services.api_keys', []);

        return $this->successResponse([
            'server_url' => $request->getSchemeAndHttpHost(),
            'api_key'    => $apiKeys[0] ?? '',
        ], 'Info konfigurasi ESP');
    }

    /**
     * Cek apakah ESP (di IP tersebut) merespon listener port 8080.
     */
    public function check(Request $request, string $ip): JsonResponse
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->errorResponse('Format IP tidak valid.', 422);
        }

        try {
            $resp = Http::timeout(5)->get("http://{$ip}:".self::ESP_PORT.'/status');
        } catch (\Throwable $e) {
            return $this->errorResponse("Gagal menjangkau ESP di {$ip}: ".$e->getMessage(), 502);
        }

        if ($resp->failed()) {
            return $this->errorResponse("ESP di {$ip} tidak merespon.", 502, [
                'detail' => $resp->body(),
            ]);
        }

        return $this->successResponse($resp->json(), 'Perangkat ESP ditemukan dan merespon.');
    }

    /**
     * Kirim konfigurasi (server_url + api_key) langsung ke ESP via LAN listener 8080.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ip'         => 'required|ip',
            'server_url' => 'nullable|url|max:255',
            'api_key'    => 'nullable|string|max:255',
        ]);

        $apiKeys = config('services.api_keys', []);

        $serverUrl = $validated['server_url'] ?? $request->getSchemeAndHttpHost();
        $apiKey    = $validated['api_key'] ?? ($apiKeys[0] ?? '');

        if (empty($serverUrl) || empty($apiKey)) {
            return $this->errorResponse('server_url / api_key harus diisi atau tersedia di konfigurasi backend.', 422);
        }

        try {
            $resp = Http::timeout(5)
                ->withHeaders([
                    'X-API-Key'      => $apiKey,
                    'Accept'         => 'application/json',
                    'Content-Type'   => 'application/json',
                ])
                ->post("http://{$validated['ip']}:".self::ESP_PORT.'/config', [
                    'server_url' => $serverUrl,
                    'api_key'    => $apiKey,
                ]);
        } catch (\Throwable $e) {
            return $this->errorResponse("Gagal mengirim ke ESP {$validated['ip']}: ".$e->getMessage(), 502);
        }

        if ($resp->failed()) {
            return $this->errorResponse("ESP di {$validated['ip']} menolak/menolak koneksi.", 502, [
                'detail' => $resp->body(),
            ]);
        }

        $data = $resp->json();

        return $this->successResponse(
            $data['data'] ?? null,
            $data['message'] ?? 'Konfigurasi terkirim ke ESP, device akan restart.'
        );
    }
}