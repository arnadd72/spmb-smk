<?php

namespace App\Providers;

use App\Services\Penyimpanan\GoogleDriveDokumen;
use App\Services\Penyimpanan\GoogleDriveOAuth;
use App\Services\Penyimpanan\LokalDokumen;
use App\Services\Penyimpanan\PenyimpananDokumen;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PenyimpananDokumen::class, function ($app) {
            return match (config('dokumen.driver')) {
                'lokal' => new LokalDokumen(Storage::disk('dokumen_lokal')),
                'google_drive' => new GoogleDriveDokumen(
                    $app->make(GoogleDriveOAuth::class)->drive(),
                    $app->make(GoogleDriveOAuth::class)->idFolderRoot(),
                ),
                default => throw new InvalidArgumentException('DOKUMEN_DRIVER harus google_drive atau lokal.'),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
