<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\RealtimeEventService;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SseController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $token = PersonalAccessToken::findToken((string) $request->query('token', ''));

        if (! $token || ! $token->can('*')) {
            abort(401, 'Unauthorized');
        }

        $lastId = (int) $request->query('lastId', 0);

        return response()->stream(function () use ($lastId) {
            set_time_limit(0);
            $currentLastId = $lastId;
            // ponytail: artisan serve = 1 worker; berhenti tiap 10s agar worker
            // tidak tergantung lama (browser EventSource auto-reconnect via lastId).
            $deadline = time() + 10;

            while (time() < $deadline) {
                $events = RealtimeEventService::getSince($currentLastId);

                foreach ($events as $event) {
                    echo "id: {$event->id}\n";
                    echo "event: {$event->event_type}\n";
                    echo "data: " . json_encode([
                        'id' => $event->id,
                        'type' => $event->event_type,
                        'nama' => $event->employee_name,
                        'nip' => $event->employee_nip,
                        'status' => $event->status,
                        'jam' => $event->jam,
                        'created_at' => $event->created_at,
                    ]) . "\n\n";

                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();

                    $currentLastId = $event->id;
                }

                // keepalive tiap iterasi agar worker cepat sadar saat klien pindah halaman
                echo ": keepalive\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();

                if (connection_aborted()) {
                    break;
                }

                // cleanup event lama setiap 1 jam
                if (time() % 3600 === 0) {
                    RealtimeEventService::cleanup(24);
                }

                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
