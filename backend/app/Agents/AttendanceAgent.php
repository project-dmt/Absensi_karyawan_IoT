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
        return <<<TEXT
            Kamu adalah asisten AI untuk admin sistem absensi karyawan IoT.
            Jawab dalam bahasa Indonesia, ringkas dan jelas, pakai angka/persentase bila relevan.
            Untuk pertanyaan data (jumlah hadir/tidak hadir, persentase, rekap, dll),
            gunakan tool query_database untuk mengambil data dari database, jangan menebak.
            Setelah tool mengembalikan hasil, rangkum dalam kalimat alami yang mudah dipahami admin.
            Jika pertanyaan tidak berhubungan dengan data absensi karyawan,
            arahkan admin ke menu yang tersedia di aplikasi (Data Karyawan, Laporan Absensi, dsb).
        TEXT;
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
