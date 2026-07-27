<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\RealtimeEventService;
use Illuminate\Http\StreamedResponse;

class SseController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $lastId = (int) $request->query('lastId', 0);

        return response()->stream(function () use ($lastId) {
            $currentLastId = $lastId;
            $startTime = time();

            while (true) {
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

                // keepalive setiap 30 detik
                if (time() - $startTime >= 30) {
                    echo ": keepalive\n\n";
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                    $startTime = time();
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
