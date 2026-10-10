-- Database test terpisah dari database dev.
CREATE DATABASE spmb_test OWNER spmb;
\connect spmb
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\connect spmb_test
CREATE EXTENSION IF NOT EXISTS pg_trgm;
