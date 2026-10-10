<?php

namespace Tests\Unit\Penyimpanan;

use App\Services\Penyimpanan\GoogleDriveDokumen;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Google\Service\Drive\FileList;
use Google\Service\Drive\Resource\Files;
use Google\Service\Exception as GoogleException;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class GoogleDriveDokumenTest extends TestCase
{
    private MockInterface $files;

    private GoogleDriveDokumen $penyimpanan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->files = Mockery::mock(Files::class);
        $drive = Mockery::mock(Drive::class);
        $drive->files = $this->files;
        $this->penyimpanan = new GoogleDriveDokumen($drive, 'root-id');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function fileDenganId(string $id): DriveFile
    {
        return new DriveFile(['id' => $id]);
    }

    public function test_simpan_membuat_folder_bersarang_lalu_mengunggah_berkas(): void
    {
        $kosong = new FileList(['files' => []]);
        $this->files->shouldReceive('listFiles')->twice()->andReturn($kosong);

        $this->files->shouldReceive('create')
            ->once()
            ->withArgs(fn (DriveFile $m, array $o) => $m->getName() === '2027-2028' && $m->getParents() === ['root-id'])
            ->andReturn($this->fileDenganId('folder-periode'));
        $this->files->shouldReceive('create')
            ->once()
            ->withArgs(fn (DriveFile $m, array $o) => $m->getName() === 'SPMB-2027-0001 - AHMAD' && $m->getParents() === ['folder-periode'])
            ->andReturn($this->fileDenganId('folder-pendaftar'));
        $this->files->shouldReceive('create')
            ->once()
            ->withArgs(fn (DriveFile $m, array $o) => $m->getName() === 'akta.jpg'
                && $m->getParents() === ['folder-pendaftar']
                && $o['data'] === 'isi'
                && $o['mimeType'] === 'image/jpeg')
            ->andReturn($this->fileDenganId('file-akta'));

        $ref = $this->penyimpanan->simpan('2027-2028/SPMB-2027-0001 - AHMAD/akta.jpg', 'isi', 'image/jpeg');

        $this->assertSame('file-akta', $ref);
    }

    public function test_simpan_memakai_ulang_folder_yang_sudah_ada(): void
    {
        $this->files->shouldReceive('listFiles')
            ->once()
            ->andReturn(new FileList(['files' => [['id' => 'folder-ada']]]));
        $this->files->shouldReceive('create')
            ->once()
            ->withArgs(fn (DriveFile $m, array $o) => $m->getParents() === ['folder-ada'])
            ->andReturn($this->fileDenganId('file-1'));

        $this->assertSame('file-1', $this->penyimpanan->simpan('2027-2028/kk.jpg', 'x'));
    }

    public function test_path_traversal_ditolak(): void
    {
        $this->expectException(RuntimeException::class);

        $this->penyimpanan->simpan('a/../b.txt', 'x');
    }

    public function test_ada_false_bila_404_dan_bila_di_sampah(): void
    {
        $this->files->shouldReceive('get')->with('hilang', Mockery::any())->andThrow(new GoogleException('tidak ada', 404));
        $this->files->shouldReceive('get')->with('sampah', Mockery::any())->andReturn(new DriveFile(['id' => 'sampah', 'trashed' => true]));
        $this->files->shouldReceive('get')->with('aktif', Mockery::any())->andReturn(new DriveFile(['id' => 'aktif', 'trashed' => false]));

        $this->assertFalse($this->penyimpanan->ada('hilang'));
        $this->assertFalse($this->penyimpanan->ada('sampah'));
        $this->assertTrue($this->penyimpanan->ada('aktif'));
    }

    public function test_hapus_memanggil_drive_delete(): void
    {
        $this->files->shouldReceive('delete')->once()->with('file-x');

        $this->penyimpanan->hapus('file-x');

        $this->addToAssertionCount(1);
    }
}
