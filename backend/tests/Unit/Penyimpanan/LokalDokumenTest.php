<?php

namespace Tests\Unit\Penyimpanan;

use App\Services\Penyimpanan\LokalDokumen;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class LokalDokumenTest extends TestCase
{
    private LokalDokumen $penyimpanan;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('dokumen_lokal');
        $this->penyimpanan = new LokalDokumen(Storage::disk('dokumen_lokal'));
    }

    public function test_simpan_baca_hapus(): void
    {
        $ref = $this->penyimpanan->simpan('2027-2028/SPMB-2027-0001 - AHMAD/akta.txt', 'isi-akta');

        $this->assertTrue($this->penyimpanan->ada($ref));
        $this->assertSame('isi-akta', stream_get_contents($this->penyimpanan->ambilStream($ref)));

        $this->penyimpanan->hapus($ref);

        $this->assertFalse($this->penyimpanan->ada($ref));
    }

    public function test_path_traversal_ditolak(): void
    {
        $this->expectException(RuntimeException::class);

        $this->penyimpanan->simpan('../luar.txt', 'x');
    }

    public function test_ambil_stream_berkas_tidak_ada_gagal(): void
    {
        $this->expectException(\Throwable::class);

        $this->penyimpanan->ambilStream('tidak-ada.txt');
    }
}
