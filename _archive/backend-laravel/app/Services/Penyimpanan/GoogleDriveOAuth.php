<?php

namespace App\Services\Penyimpanan;

use App\Models\Pengaturan;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * OAuth akun Google pribadi (scope drive.file). Refresh token terenkripsi di tabel pengaturans,
 * tidak pernah di .env (PRD 7.5.2-7.5.3).
 */
class GoogleDriveOAuth
{
    public const KEY_REFRESH_TOKEN = 'google_drive_refresh_token';

    public const KEY_EMAIL = 'google_drive_email';

    public const KEY_ROOT_FOLDER = 'google_drive_root_folder_id';

    private const CACHE_ACCESS_TOKEN = 'google_drive_access_token';

    public function klien(): Client
    {
        $konfig = config('dokumen.google_drive');

        if (empty($konfig['client_id']) || empty($konfig['client_secret']) || empty($konfig['redirect_uri'])) {
            throw new RuntimeException('GOOGLE_DRIVE_CLIENT_ID/SECRET/REDIRECT_URI belum diisi di .env.');
        }

        $klien = new Client;
        $klien->setClientId($konfig['client_id']);
        $klien->setClientSecret($konfig['client_secret']);
        $klien->setRedirectUri($konfig['redirect_uri']);
        $klien->setScopes([Drive::DRIVE_FILE]);
        $klien->setAccessType('offline');
        $klien->setPrompt('consent');

        return $klien;
    }

    public function urlOtorisasi(): string
    {
        return $this->klien()->createAuthUrl();
    }

    /** Tukar kode otorisasi dengan token, simpan refresh token terenkripsi. */
    public function hubungkan(string $kode): void
    {
        $klien = $this->klien();
        $token = $klien->fetchAccessTokenWithAuthCode($kode);

        if (isset($token['error'])) {
            throw new RuntimeException('Otorisasi Google gagal: '.($token['error_description'] ?? $token['error']));
        }

        if (empty($token['refresh_token'])) {
            throw new RuntimeException('Google tidak mengembalikan refresh token. Cabut akses aplikasi lalu ulangi.');
        }

        Pengaturan::simpanTerenkripsi(self::KEY_REFRESH_TOKEN, $token['refresh_token']);
        Cache::put(self::CACHE_ACCESS_TOKEN, $token['access_token'], now()->addMinutes(50));

        try {
            $about = (new Drive($klien))->about->get(['fields' => 'user(emailAddress)']);
            Pengaturan::simpan(self::KEY_EMAIL, $about->getUser()?->getEmailAddress());
        } catch (\Throwable) {
            // Email hanya informasi tampilan.
        }
    }

    public function terhubung(): bool
    {
        return Pengaturan::ambil(self::KEY_REFRESH_TOKEN) !== null;
    }

    public function putuskan(): void
    {
        Pengaturan::hapus(self::KEY_REFRESH_TOKEN);
        Pengaturan::hapus(self::KEY_EMAIL);
        Cache::forget(self::CACHE_ACCESS_TOKEN);
    }

    public function drive(): Drive
    {
        $refresh = Pengaturan::ambilTerenkripsi(self::KEY_REFRESH_TOKEN);

        if ($refresh === null) {
            throw new RuntimeException('Google Drive belum dihubungkan.');
        }

        $klien = $this->klien();
        $akses = Cache::get(self::CACHE_ACCESS_TOKEN);

        if ($akses === null) {
            $token = $klien->fetchAccessTokenWithRefreshToken($refresh);

            if (isset($token['error'])) {
                throw new RuntimeException('Token Google Drive tidak valid atau dicabut: '.$token['error']);
            }

            $akses = $token['access_token'];
            Cache::put(self::CACHE_ACCESS_TOKEN, $akses, now()->addMinutes(50));
        }

        $klien->setAccessToken(['access_token' => $akses]);

        return new Drive($klien);
    }

    /** ID folder root SPMB; dibuat otomatis bila belum ada. */
    public function idFolderRoot(): string
    {
        $tersimpan = Pengaturan::ambil(self::KEY_ROOT_FOLDER);
        if ($tersimpan !== null) {
            return $tersimpan;
        }

        $nama = config('dokumen.google_drive.root_folder_name');
        $folder = $this->drive()->files->create(
            new DriveFile(['name' => $nama, 'mimeType' => 'application/vnd.google-apps.folder']),
            ['fields' => 'id'],
        );

        Pengaturan::simpan(self::KEY_ROOT_FOLDER, $folder->getId());

        return $folder->getId();
    }
}
