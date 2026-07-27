<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class RealtimeEventService
{
    public static function dispatch(string $type, array $data): void
    {
        DB::table('realtime_events')->insert([
            'event_type' => $type,
            'employee_name' => $data['nama'] ?? '',
            'employee_nip' => $data['nip'] ?? '',
            'status' => $data['status'] ?? '',
            'jam' => $data['jam'] ?? '',
            'created_at' => now(),
        ]);
    }

    public static function getSince(int $lastId): Collection
    {
        return DB::table('realtime_events')
            ->where('id', '>', $lastId)
            ->orderBy('id')
            ->limit(50)
            ->get();
    }

    public static function cleanup(int $hours = 24): int
    {
        return DB::table('realtime_events')
            ->where('created_at', '<', now()->subHours($hours))
            ->delete();
    }
}
