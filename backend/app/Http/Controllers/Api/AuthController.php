<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Services\AuditLogService;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditLogService::log('login_failed', null, null, ['email' => $request->email], $request);

            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('admin-token')->plainTextToken;

        AuditLogService::log('login', $user, null, ['email' => $user->email], $request);

        return $this->successResponse([
            'user' => $user->only(['id', 'nama', 'email', 'role']),
            'token' => $token,
        ], 'Login berhasil');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Logout berhasil');
    }

    public function user(Request $request)
    {
        return $this->successResponse(
            $request->user()->only(['id', 'nama', 'email', 'role']),
            'Data user berhasil diambil'
        );
    }

    public function serverTime()
    {
        return $this->successResponse([
            'timestamp' => now()->timestamp,
            'time' => now()->toIso8601String(),
        ], 'Waktu server berhasil diambil');
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'old_password' => 'required',
            'new_password' => 'required|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->old_password, $user->password)) {
            throw new \App\Exceptions\ApiException('Password lama salah', 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        AuditLogService::log('change_password', $user, null, null, $request);

        return $this->successResponse(null, 'Password berhasil diubah');
    }
}
