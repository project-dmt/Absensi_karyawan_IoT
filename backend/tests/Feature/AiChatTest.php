<?php

namespace Tests\Feature;

use App\Agents\AttendanceAgent;
use App\Models\User;
use Laravel\Ai\Ai;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiChatTest extends TestCase
{

    private function actingUser(): void
    {
        Sanctum::actingAs(User::factory()->make(['id' => 1]));
    }

    public function test_chat_requires_authentication(): void
    {
        $this->postJson('/api/ai/chat', [
            'messages' => [['role' => 'user', 'parts' => [['type' => 'text', 'text' => 'Halo']]]],
        ])->assertUnauthorized();
    }

    public function test_chat_validates_messages(): void
    {
        $this->actingUser();

        $this->postJson('/api/ai/chat', ['messages' => []])
            ->assertUnprocessable();
    }

    public function test_chat_streams_agent_response(): void
    {
        $this->actingUser();

        Ai::fakeAgent(AttendanceAgent::class, ['Halo admin, ada 10 karyawan hadir hari ini.']);

        $response = $this->postJson('/api/ai/chat', [
            'messages' => [
                ['role' => 'user', 'parts' => [['type' => 'text', 'text' => 'Berapa yang hadir hari ini?']]],
            ],
        ]);

        $response->assertOk();
        $response->assertHeader('content-type', 'text/plain; charset=utf-8');
        $this->assertStringContainsString('10 karyawan hadir', $response->streamedContent());
    }
}
