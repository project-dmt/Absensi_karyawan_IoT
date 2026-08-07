<?php

namespace App\Http\Controllers\Api;

use App\Agents\AttendanceAgent;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Ai\Streaming\Events\TextDelta;

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

        $last = $messages->pop();

        return response()->stream(function () use ($messages, $last) {
            $agent = new AttendanceAgent($messages->all());

            $stream = $agent->stream($last['content'], provider: 'attendance-ai');

            foreach ($stream as $event) {
                if ($event instanceof TextDelta) {
                    echo $event->delta;
                    flush();
                }
            }
        }, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
