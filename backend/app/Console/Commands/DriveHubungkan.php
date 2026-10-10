<?php

namespace App\Console\Commands;

use App\Services\Penyimpanan\GoogleDriveOAuth;
use Illuminate\Console\Command;

class DriveHubungkan extends Command
{
    protected $signature = 'spmb:drive-hubungkan {--kode= : Kode otorisasi dari parameter "code" di URL redirect}';

    protected $description = 'Hubungkan akun Google Drive (sementara lewat CLI sampai panel admin tersedia di M6)';

    public function handle(GoogleDriveOAuth $oauth): int
    {
        $kode = $this->option('kode');

        if (! $kode) {
            $this->line('Buka URL ini di browser, setujui akses, lalu salin nilai parameter "code" dari URL redirect:');
            $this->newLine();
            $this->line($oauth->urlOtorisasi());
            $this->newLine();
            $this->line('Lalu jalankan: php artisan spmb:drive-hubungkan --kode="<kode>"');

            return self::SUCCESS;
        }

        $oauth->hubungkan(urldecode($kode));
        $this->info('Google Drive terhubung. Jalankan php artisan spmb:drive-uji untuk menguji.');

        return self::SUCCESS;
    }
}
