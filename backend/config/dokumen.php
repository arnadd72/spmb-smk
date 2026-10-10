<?php

return [
    // google_drive (produksi) | lokal (dev & test). Lihat PRD 7.5.3.
    'driver' => env('DOKUMEN_DRIVER', 'lokal'),

    'google_drive' => [
        'client_id' => env('GOOGLE_DRIVE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_DRIVE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_DRIVE_REDIRECT_URI'),
        'root_folder_name' => env('GOOGLE_DRIVE_ROOT_FOLDER_NAME', 'SPMB'),
    ],
];
