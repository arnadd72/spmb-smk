<?php

namespace App\Console\Commands;

use App\Services\Penyimpanan\PenyimpananDokumen;
use Illuminate\Console\Command;
use Throwable;

class DriveUji extends Command
{
    protected $signature = 'spmb:drive-uji';

    protected $description = 'Uji tulis, baca, dan hapus berkas kecil lewat driver PenyimpananDokumen aktif';

    public function handle(PenyimpananDokumen $penyimpanan): int
    {
        $isi = 'uji-spmb-'.bin2hex(random_bytes(8));
        $path = '_uji/uji-'.now()->format('YmdHis').'.txt';
        $driver = config('dokumen.driver');

        try {
            $ref = $penyimpanan->simpan($path, $isi, 'text/plain');
            $this->line("[$driver] tulis: ok ($ref)");

            $dibaca = stream_get_contents($penyimpanan->ambilStream($ref));
            if ($dibaca !== $isi) {
                $this->error('Baca: isi berkas tidak sama dengan yang ditulis.');

                return self::FAILURE;
            }
            $this->line("[$driver] baca: ok");

            $penyimpanan->hapus($ref);
            if ($penyimpanan->ada($ref)) {
                $this->error('Hapus: berkas masih ada.');

                return self::FAILURE;
            }
            $this->line("[$driver] hapus: ok");
        } catch (Throwable $e) {
            $this->error('Uji gagal: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('Uji tulis-baca-hapus berhasil.');

        return self::SUCCESS;
    }
}
