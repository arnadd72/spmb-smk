<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Pengaturan extends Model
{
    protected $table = 'pengaturans';

    protected $fillable = ['key', 'value'];

    public static function ambil(string $key, ?string $default = null): ?string
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    public static function simpan(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function ambilTerenkripsi(string $key): ?string
    {
        $nilai = static::ambil($key);

        return $nilai === null ? null : Crypt::decryptString($nilai);
    }

    public static function simpanTerenkripsi(string $key, string $value): void
    {
        static::simpan($key, Crypt::encryptString($value));
    }

    public static function hapus(string $key): void
    {
        static::query()->where('key', $key)->delete();
    }
}
