<?php

namespace Tests\Feature;

use App\Models\Pengaturan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PengaturanTest extends TestCase
{
    use RefreshDatabase;

    public function test_nilai_terenkripsi_tidak_tersimpan_polos(): void
    {
        Pengaturan::simpanTerenkripsi('google_drive_refresh_token', 'rahasia-token');

        $mentah = DB::table('pengaturans')->where('key', 'google_drive_refresh_token')->value('value');

        $this->assertNotSame('rahasia-token', $mentah);
        $this->assertSame('rahasia-token', Pengaturan::ambilTerenkripsi('google_drive_refresh_token'));
    }

    public function test_simpan_menimpa_dan_hapus(): void
    {
        Pengaturan::simpan('tahun_ajaran', '2027/2028');
        Pengaturan::simpan('tahun_ajaran', '2028/2029');

        $this->assertSame('2028/2029', Pengaturan::ambil('tahun_ajaran'));

        Pengaturan::hapus('tahun_ajaran');

        $this->assertNull(Pengaturan::ambil('tahun_ajaran'));
    }
}
