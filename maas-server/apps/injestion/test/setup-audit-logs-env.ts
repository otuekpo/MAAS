// Dedicated env for the injestion audit-log suite. Imported FIRST in the spec
// so it is evaluated before the real maas-server AppModule (whose
// MongooseModule.forRoot and BullModule capture MONGODB_URI / REDIS_URL at
// import time). Gives the suite its own Mongo DB and Redis DB so the real API
// calls + the real AuditLogProcessor do not collide with the other injestion
// e2e suites (which share Redis DB 14 / 15 and Mongo maas_test_e2e).
process.env.MONGODB_URI =
  "mongodb://localhost:27017/maas_test_inj_audit?directConnection=true";
process.env.REDIS_URL = "redis://localhost:6379/13";
process.env.SECRET_KEY = "test-secret-key";
