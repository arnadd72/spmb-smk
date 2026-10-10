// Env deterministik untuk test. Dijalankan sebelum modul aplikasi dimuat.
// Database test = spmb_test (Postgres lokal). CI menimpa lewat TEST_DATABASE_URL.
const urlTest = process.env.TEST_DATABASE_URL ?? "postgresql://spmb:spmb_dev@localhost:5433/spmb_test";

process.env.DATABASE_URL = urlTest;
process.env.DIRECT_URL = urlTest;
process.env.JWT_SECRET = "rahasia-uji-jwt-yang-cukup-panjang-32-karakter-lebih";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
