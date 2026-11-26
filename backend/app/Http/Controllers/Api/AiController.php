<?php

namespace App\Http\Controllers\Api;

use App\Agents\AttendanceAgent;
use App\Http\Controllers\Controller;
use App\Services\PromptInjectionGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Streaming\Events\ToolResult as ToolResultEvent;
use RuntimeException;

class AiController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.parts' => ['sometimes', 'array'],
        ]);

        $messages = collect($request->input('messages'))
            ->map(function ($message) {
                $text = collect($message['parts'] ?? [])
                    ->where('type', 'text')
                    ->pluck('text')
                    ->join('');

                return [
                    'role' => $message['role'],
                    'content' => $text,
                ];
            })
            ->filter(fn ($message) => trim($message['content']) !== '')
            ->values();

        // Proteksi prompt injection lapisan 1: blokir input mencurigakan sebelum masuk ke AI
        foreach ($messages as $message) {
            // Hanya saintasei input user; jangan ganggu riwayat assistant
            if ($message['role'] === 'user') {
                $verdict = PromptInjectionGuard::inspect($message['content']);

                if ($verdict['blocked']) {
                    return response()->stream(function () use ($verdict) {
                        echo $verdict['response'];
                    }, 200, [
                        'Content-Type' => 'text/plain; charset=utf-8',
                        'Cache-Control' => 'no-cache',
                        'X-Accel-Buffering' => 'no',
                    ]);
                }
            }
        }

        $last = $messages->pop();

        return response()->stream(function () use ($messages, $last) {
            try {
                $agent = new AttendanceAgent($messages->all());

                // Failover: utama dulu, kalau rate-limited/sibuk otomatis pindah ke backup
                $stream = $agent->stream($last['content'], provider: [
                    'attendance-ai' => null,
                    'attendance-ai-backup' => null,
                ]);

                $hadOutput = false;
                foreach ($stream as $event) {
                    if ($event instanceof TextDelta) {
                        $hadOutput = true;
                        echo $event->delta;
                        flush();
                    } elseif ($event instanceof ToolResultEvent
                        && $event->successful
                        && $event->toolResult->name === 'ExportAttendanceTool') {
                        $result = is_string($event->toolResult->result)
                            ? $event->toolResult->result
                            : '';

                        if (preg_match('/^\[\[EXPORT_EXCEL:\{"dari":"\d{4}-\d{2}-\d{2}","sampai":"\d{4}-\d{2}-\d{2}"(?:,"format":"(?:xlsx|csv)")?\}\]\]$/', $result)) {
                            $hadOutput = true;
                            echo $result;
                            flush();
                        }
                    }
                }

                if (! $hadOutput) {
                    echo 'Maaf, AI tidak merespon. Silakan coba lagi dalam beberapa detik.';
                    flush();
                }
            } catch (RuntimeException $e) {
                Log::warning('AI tool blocked', ['message' => $e->getMessage()]);
                echo 'Maaf, saya tidak bisa memproses pertanyaan itu. Coba tanyakan dengan kalimat lebih spesifik.';
                flush();
            } catch (\Throwable $e) {
                Log::error('AI chat error', ['message' => $e->getMessage()]);
                echo 'Terjadi gangguan server. Silakan coba beberapa saat lagi.';
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
