<?php

namespace App\Services\Penyimpanan;

use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Google\Service\Exception;
use RuntimeException;

/**
 * Penyimpanan dokumen di Google Drive (scope drive.file). File tidak pernah dibagikan.
 * Path "a/b/c.jpg" dibuat sebagai folder a/b di bawah folder root SPMB.
 */
class GoogleDriveDokumen implements PenyimpananDokumen
{
    private const FOLDER_MIME = 'application/vnd.google-apps.folder';

    /** @var array<string, string> */
    private array $cacheFolder = [];

    public function __construct(
        private readonly Drive $drive,
        private readonly string $rootFolderId,
    ) {}

    public function simpan(string $path, $isi, ?string $mime = null): string
    {
        $bagian = array_values(array_filter(explode('/', $path), fn ($b) => $b !== ''));
        $nama = array_pop($bagian);

        if ($nama === null || in_array('..', $bagian, true) || $nama === '..') {
            throw new RuntimeException('Path berkas tidak valid.');
        }

        $induk = $this->rootFolderId;
        foreach ($bagian as $folder) {
            $induk = $this->pastikanFolder($folder, $induk);
        }

        $meta = new DriveFile(['name' => $nama, 'parents' => [$induk]]);
        $data = is_resource($isi) ? stream_get_contents($isi) : $isi;
        $mime ??= 'application/octet-stream';

        $file = $this->drive->files->create($meta, [
            'data' => $data,
            'mimeType' => $mime,
            'uploadType' => strlen($data) > 5 * 1024 * 1024 ? 'resumable' : 'multipart',
            'fields' => 'id',
        ]);

        return $file->getId();
    }

    public function ambilStream(string $referensi)
    {
        $respons = $this->drive->files->get($referensi, ['alt' => 'media']);
        $isi = $respons->getBody();

        $stream = fopen('php://temp', 'r+');
        fwrite($stream, (string) $isi);
        rewind($stream);

        return $stream;
    }

    public function hapus(string $referensi): void
    {
        $this->drive->files->delete($referensi);
    }

    public function ada(string $referensi): bool
    {
        try {
            $file = $this->drive->files->get($referensi, ['fields' => 'id,trashed']);

            return ! $file->getTrashed();
        } catch (Exception $e) {
            if ($e->getCode() === 404) {
                return false;
            }

            throw $e;
        }
    }

    private function pastikanFolder(string $nama, string $induk): string
    {
        $kunci = $induk.'/'.$nama;
        if (isset($this->cacheFolder[$kunci])) {
            return $this->cacheFolder[$kunci];
        }

        $q = sprintf(
            "name = '%s' and '%s' in parents and mimeType = '%s' and trashed = false",
            str_replace("'", "\'", $nama),
            $induk,
            self::FOLDER_MIME,
        );
        $hasil = $this->drive->files->listFiles(['q' => $q, 'fields' => 'files(id)', 'pageSize' => 1]);
        $ada = $hasil->getFiles();

        if (! empty($ada)) {
            return $this->cacheFolder[$kunci] = $ada[0]->getId();
        }

        $folder = $this->drive->files->create(
            new DriveFile(['name' => $nama, 'mimeType' => self::FOLDER_MIME, 'parents' => [$induk]]),
            ['fields' => 'id'],
        );

        return $this->cacheFolder[$kunci] = $folder->getId();
    }
}
