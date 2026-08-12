// E2E environment defaults. Runs before each test file so the real app
// modules (AppModule) can be imported with valid configuration. Plain
// assignments (not `??=`) so every test file gets these defaults even when a
// previous file in the same worker mutated process.env.
process.env.DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/maas_test";
process.env.MONGODB_URI =
  "mongodb://localhost:27017/maas_test?directConnection=true";
// Dedicated Redis DB for the audit-log suite so it does not collide with
// the rate-limit suite (which flushes DB 15). The admin-logs suite overrides
// this with its own DB via setup-admin-logs-env.
process.env.REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/15";
process.env.SECRET_KEY = "test-secret-key";
process.env.SMTP_HOST = "localhost";
process.env.SMTP_PORT = "1025";
process.env.SMTP_USER = "test-smtp@maas.test";
process.env.SMTP_PASS = "test-smtp-pass";
process.env.CONTACT_EMAIL = "contact@maas.test";
process.env.BRUTE_FORCE_MAX_ATTEMPTS = "5";
process.env.BRUTE_FORCE_WINDOW_SEC = "900";
process.env.BRUTE_FORCE_BLOCK_SEC = "900";
process.env.AUDIT_LOG_PROCESSOR_CONCURRENCY = "5";
