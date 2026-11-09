<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateApiKey extends Command
{
    protected $signature = 'api:generate-key
                            {--rotate : Tambah key baru ke existing keys, keep old ones}
                            {--prune-old : Hapus semua key lama, sisakan key yang paling baru (dipakai setelah --rotate)}';

    protected $description = 'Generate random API key untuk ESP32 authentication';

    public function handle(): int
    {
        $envPath = base_path('.env');
        $currentKeys = array_values(array_filter(config('services.api_keys', [])));

        // Prune: buang semua key kecuali yang terakhir (key baru dari --rotate)
        if ($this->option('prune-old')) {
            // Baca langsung dari .env (source of truth file yg mau ditulis),
            // bukan dari config cache yg mungkin masih stale.
            $envKeys = array_values(array_filter($this->readEnvKeys($envPath)));

            if (count($envKeys) < 2) {
                $this->warn('Hanya ada 1 key aktif, ga ada yang bisa di-prune.');
                $this->line('Key aktif: <comment>'.($envKeys[0] ?? '(kosong)').'</comment>');

                return Command::SUCCESS;
            }

            $keep = end($envKeys);
            $removed = array_slice($envKeys, 0, -1);

            $this->replaceEnvValue($envPath, 'API_KEY', $keep);

            $this->info('Key lama dihapus. Sisa 1 key aktif:');
            $this->newLine();
            $this->line("  Key aktif: <comment>{$keep}</comment>");
            $this->newLine();
            $this->line('Key yang dihapus (<info>'.count($removed).'</info>):');
            foreach ($removed as $old) {
                $this->line("  - {$old}");
            }
            $this->newLine();
            $this->warn('Pastikan semua ESP32 sudah pakai key yang aktif sebelum lanjut.');
            $this->newLine();
            $this->line('Jangan lupa run: <info>php artisan config:clear</info>');

            return Command::SUCCESS;
        }

        $newKey = Str::random(40);

        if ($this->option('rotate')) {
            $allKeys = array_merge($currentKeys, [$newKey]);
            $allKeys = array_unique(array_filter($allKeys));
            $newEnvValue = implode(',', $allKeys);

            $this->replaceEnvValue($envPath, 'API_KEY', $newEnvValue);

            $this->info('API Key baru ditambahkan (rotation):');
            $this->newLine();
            $this->line("  Key baru:  <comment>{$newKey}</comment>");
            $this->line('  Total keys aktif: <info>'.count($allKeys).'</info>');
            $this->newLine();
            $this->warn('Key lama masih aktif. Deploy key baru ke ESP32 dulu, laluhapus key lama dengan:');
            $this->line('  php artisan api:generate-key --prune-old');
        } else {
            $this->replaceEnvValue($envPath, 'API_KEY', $newKey);

            $this->info('API Key baru di-generate:');
            $this->newLine();
            $this->line("  <comment>{$newKey}</comment>");
            $this->newLine();
            $this->warn('Simpan key ini. ESP32 butuh key ini di header X-API-Key.');
            $this->newLine();
            $this->warn('Key LAMA langsung mati. Semua ESP32 harus di-update dengan key baru ini.');
        }

        $this->newLine();
        $this->line('Jangan lupa run: <info>php artisan config:clear</info>');

        return Command::SUCCESS;
    }

    /**
     * Baca daftar API key langsung dari file .env.
     *
     * @return array<int, string>
     */
    private function readEnvKeys(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }

        $content = (string) file_get_contents($path);

        if (! preg_match('/^API_KEY=(.*)$/m', $content, $m)) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', trim($m[1])))));
    }

    private function replaceEnvValue(string $path, string $key, string $value): void
    {
        $content = file_get_contents($path);

        if (preg_match("/^{$key}=.*/m", $content)) {
            $content = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $content);
        } else {
            $content .= "\n{$key}={$value}\n";
        }

        file_put_contents($path, $content);
    }
}
