<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ServerTimeController extends Controller
{
    public function show(Request $request)
    {
        $now = Carbon::now('Asia/Jakarta');

        return $this->successResponse([
            'time' => $now->toIso8601String(),
            'timestamp' => $now->timestamp,
            'timezone' => 'Asia/Jakarta',
            'formatted' => $now->format('Y-m-d H:i:s'),
        ], 'Waktu server');
    }
}
