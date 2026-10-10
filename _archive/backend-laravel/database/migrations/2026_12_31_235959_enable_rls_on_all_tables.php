<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PRD 7.4: RLS aktif di semua tabel public, tanpa policy anon. Laravel memakai role
 * postgres (bypass RLS), akses anon lewat Data API Supabase tertolak.
 * Migrasi ini harus yang terakhir. Saat menambah tabel baru (M2 dst.), jalankan ulang
 * isinya lewat migrasi baru; perintah ini idempoten.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            do $$
            declare t record;
            begin
              for t in select tablename from pg_tables where schemaname = 'public' loop
                execute format('alter table public.%I enable row level security', t.tablename);
              end loop;
            end $$;
        SQL);
    }

    public function down(): void
    {
        // RLS sengaja tidak dinonaktifkan.
    }
};
