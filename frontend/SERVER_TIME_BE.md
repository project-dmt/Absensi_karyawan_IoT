# Endpoint Jam Server — untuk BE Laravel (PC teman)

FE sekarang mengambil jam dari **server**, bukan jam lokal browser. Tambahkan endpoint ini di BE Laravel yang jalan di PC teman.

## Endpoint

```
GET /api/server-time
Auth: tidak perlu (public)
Throttle: bebas
```

## Response (format sama dengan Controller::successResponse)

```json
{
  "success": true,
  "message": "Waktu server",
  "data": {
    "time": "2026-08-28T14:23:05+07:00",
    "timestamp": 1724840585,
    "timezone": "Asia/Jakarta",
    "formatted": "2026-08-28 14:23:05"
  }
}
```

- `time`: ISO 8601 (dipakai FE untuk hitung offset)
- `timestamp`: unix timestamp detik
- `timezone`: string zona
- `formatted`: opsional, untuk debug

## Cara Pasang (paling cepat — closure di routes/api.php)

Tambahkan di `routes/api.php` (di luar grup `auth:sanctum`):

```php
use Carbon\Carbon;
use Illuminate\Http\Request;

Route::get('/server-time', function (Request $request) {
    $now = Carbon::now('Asia/Jakarta');
    return response()->json([
        'success' => true,
        'message' => 'Waktu server',
        'data' => [
            'time'      => $now->toIso8601String(),
            'timestamp' => $now->timestamp,
            'timezone'  => 'Asia/Jakarta',
            'formatted' => $now->format('Y-m-d H:i:s'),
        ],
    ]);
});
```

### Alternatif pakai Controller

```php
// app/Http/Controllers/ServerTimeController.php
namespace App\Http\Controllers;

use Carbon\Carbon;

class ServerTimeController extends Controller
{
    public function show()
    {
        $now = Carbon::now('Asia/Jakarta');
        return $this->successResponse([
            'time'      => $now->toIso8601String(),
            'timestamp' => $now->timestamp,
            'timezone'  => 'Asia/Jakarta',
            'formatted' => $now->format('Y-m-d H:i:s'),
        ], 'Waktu server');
    }
}

// routes/api.php
use App\Http\Controllers\ServerTimeController;
Route::get('/server-time', [ServerTimeController::class, 'show']);
```

## Verifikasi

```bash
curl http://<IP-PC-TEMAN>:8000/api/server-time
# contoh: curl http://192.168.1.17:8000/api/server-time
```

Harus balik JSON di atas (200). FE akan fetch endpoint ini saat mount dan re-sync tiap 60 detik; jika gagal, FE fallback ke jam lokal.

## Catatan Penting

- Pastikan jam di PC server (teman) set ke **Automatic / Sync** biar akurat — semua FE ikut jam itu.
- FE `VITE_API_URL` harus point ke IP PC server: `http://192.168.1.17:8000/api` (sudah di .env.development)
- Mock server (`node mock-server.cjs`) sudah support endpoint ini untuk dev tanpa BE.
