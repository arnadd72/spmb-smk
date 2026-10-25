-- RLS di semua tabel (PRD 7.2). Prisma terhubung sebagai pemilik tabel (role postgres di Supabase) sehingga melewati RLS,
-- sedangkan akses lewat API REST Supabase dengan kunci anon atau authenticated ditolak karena tidak ada kebijakan.
-- Tabel baru yang dibuat migrasi berikutnya wajib mengaktifkan RLS sendiri.
DO $$
DECLARE
  tabel record;
BEGIN
  FOR tabel IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabel.tablename);
  END LOOP;
END $$;
