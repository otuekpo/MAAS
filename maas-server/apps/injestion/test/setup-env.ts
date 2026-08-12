// E2E environment defaults. Runs before each test file so the real app
// modules (InjestionModule) can be imported with valid configuration. Plain
// assignments so every test file gets these defaults even when a previous
// file in the same worker mutated process.env.
process.env.DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/maas_test";
process.env.MONGODB_URI =
  "mongodb://localhost:27017/maas_test_e2e?directConnection=true";
process.env.REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/14";
process.env.AUDIT_LOG_PROCESSOR_CONCURRENCY = "5";
