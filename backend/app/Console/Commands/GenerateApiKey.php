<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateApiKey extends Command
{
    protected $signature = 'api:generate-key
                            {--rotate : Tambah key baru ke existing keys, keep old ones}';

    protected $description = 'Generate random API key untuk ESP32 authentication';

    public function handle(): int
    {
        $newKey = Str::random(40);
        $currentKeys = config('services.api_keys', []);
        $envPath = base_path('.env');

        if ($this->option('rotate')) {
            $allKeys = array_merge($currentKeys, [$newKey]);
            $allKeys = array_unique(array_filter($allKeys));
            $newEnvValue = implode(',', $allKeys);

            $this->replaceEnvValue($envPath, 'API_KEY', $newEnvValue);

            $this->info("API Key baru ditambahkan (rotation):");
            $this->newLine();
            $this->line("  Key baru:  <comment>{$newKey}</comment>");
            $this->line("  Total keys aktif: <info>" . count($allKeys) . "</info>");
            $this->newLine();
            $this->warn("Key lama masih aktif. Deploy key baru ke ESP32 dulu, laluhapus key lama dengan:");
            $this->line("  php api:generate-key --prune-old");
        } else {
            $this->replaceEnvValue($envPath, 'API_KEY', $newKey);

            $this->info("API Key baru di-generate:");
            $this->newLine();
            $this->line("  <comment>{$newKey}</comment>");
            $this->newLine();
            $this->warn("Simpan key ini. ESP32 butuh key ini di header X-API-Key.");
        }

        $this->newLine();
        $this->line("Jangan lupa run: <info>php artisan config:clear</info>");

        return Command::SUCCESS;
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
