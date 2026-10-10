<?php

namespace App\Services\Penyimpanan;

interface PenyimpananDokumen
{
    /**
     * Simpan berkas di $path (mis. "2027-2028/SPMB-2027-0001 - NAMA/akta.jpg").
     *
     * @param  string|resource  $isi
     * @return string Referensi berkas (file ID Drive atau path lokal) untuk disimpan di database.
     */
    public function simpan(string $path, $isi, ?string $mime = null): string;

    /**
     * @return resource
     */
    public function ambilStream(string $referensi);

    public function hapus(string $referensi): void;

    public function ada(string $referensi): bool;
}
