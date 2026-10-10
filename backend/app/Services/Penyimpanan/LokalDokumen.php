<?php

namespace App\Services\Penyimpanan;

use Illuminate\Contracts\Filesystem\Filesystem;
use RuntimeException;

class LokalDokumen implements PenyimpananDokumen
{
    public function __construct(private readonly Filesystem $disk) {}

    public function simpan(string $path, $isi, ?string $mime = null): string
    {
        $path = ltrim($path, '/');

        if (str_contains($path, '..')) {
            throw new RuntimeException('Path berkas tidak valid.');
        }

        $this->disk->put($path, $isi);

        return $path;
    }

    public function ambilStream(string $referensi)
    {
        $stream = $this->disk->readStream($referensi);

        if ($stream === null) {
            throw new RuntimeException('Berkas tidak ditemukan.');
        }

        return $stream;
    }

    public function hapus(string $referensi): void
    {
        $this->disk->delete($referensi);
    }

    public function ada(string $referensi): bool
    {
        return $this->disk->exists($referensi);
    }
}
