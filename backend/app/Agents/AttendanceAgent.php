<?php

namespace App\Agents;

use App\Tools\QueryDatabaseTool;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class AttendanceAgent implements Agent, Conversational, HasTools
{
    use Promptable;

    public function __construct(protected array $conversation = []) {}

    /**
     * Get the instructions that the agent should follow.
     */
public function instructions(): Stringable|string
    {
        return $this->buildPrompt();
    }

    private function buildPrompt(): string
    {
        $systemPrompt  = "Kamu adalah asisten AI bawaan aplikasi \"Sistem Absensi Karyawan IoT\".\n";
        $systemPrompt .= "Identitasmu asisten AI sistem ini. JANGAN menyebut nama model/penyedia di belakangmu (Claude, Gemini, ChatGPT, Kiro, dsb).\n\n";
        $systemPrompt .= "Tanggal hari ini: " . now()->translatedFormat('l, d F Y') . ".\n\n";

        $systemPrompt .= "PERKENALAN:\n";
        $systemPrompt .= "- Gunakan kalimat buka \"Halo! Saya asisten AI Sistem Absensi Karyawan IoT.\" HANYA saat diminta memperkenalkan diri atau memulai percakapan baru, bukan pada setiap jawaban.\n\n";

        $systemPrompt .= "SUMBER DATA:\n";
        $systemPrompt .= "- Jawab HANYA dari data tool query_database; jangan menebak atau memakai pengetahuan umum.\n";
        $systemPrompt .= "- Database READ-ONLY (hanya SELECT): tidak pernah mengubah, menambah, atau menghapus data.\n\n";

        $systemPrompt .= "PENGAKUAN TIDAK TERSEDIA:\n";
        $systemPrompt .= "- Jika jawaban tidak ada di data: \"Data tersebut tidak tersedia.\" lalu \"Saya hanya bisa menjawab seputar data dan fitur aplikasi ini.\"\n\n";

        $systemPrompt .= "LUAR TOPIK:\n";
        $systemPrompt .= "- Pertanyaan tanggal/hari sekarang BUKAN di luar topik; jawab dari tanggal yang diberikan di atas.\n";
        $systemPrompt .= "- Jangan jawab pertanyaan lain di luar absensi dari pengetahuan umum (mis. presiden, berita, coding). Tolak sopan: \"Maaf, saya hanya bisa menjawab seputar data dan fitur aplikasi ini.\" lalu tanya \"Apakah ada pertanyaan seputar sistem ini?\"\n\n";

        $systemPrompt .= "FORMAT JAWABAN:\n";
        $systemPrompt .= "- Tanpa markdown/bintang (**/*); gunakan teks biasa; untuk daftar pakai nomor dan garis baru.\n";
        $systemPrompt .= "- Saat ditanya total karyawan, sebutkan total keseluruhan LALU rincian aktif/nonaktif beserta divisinya.\n";
        $systemPrompt .= "- Ringkas dan jelas, pakai angka/persentase bila relevan. Selalu bahasa Indonesia.\n";

        return $systemPrompt;
    }

    /**
     * Get the list of messages comprising the conversation so far.
     *
     * @return Message[]
     */
    public function messages(): iterable
    {
        return collect($this->conversation)
            ->map(fn ($message) => new Message($message['role'], $message['content']))
            ->all();
    }

    /**
     * Get the tools available to the agent.
     *
     * @return \Laravel\Ai\Contracts\Tool[]
     */
    public function tools(): iterable
    {
        return [
            new QueryDatabaseTool,
        ];
    }
}
