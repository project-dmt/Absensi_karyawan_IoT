<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogService
{
    public static function log(
        string $action,
        ?object $model = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null,
    ): ?AuditLog {
        return AuditLog::create([
            'user_id' => $request?->user()?->id,
            'action' => $action,
            'model_type' => $model ? get_class($model) : null,
            'model_id' => $model?->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
