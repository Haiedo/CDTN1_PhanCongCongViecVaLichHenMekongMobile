-- Runs once, the first time the PostgreSQL container creates its data volume.
-- The test suite (npm test / npm run e2e / npm run tc) wipes its database on every run,
-- so it gets its own database and never touches the demo data in mekong_l4.
CREATE DATABASE mekong_l4_test;
