// Dedicated env for the admin-logs suite. Imported FIRST in the spec so it is
// evaluated before the real AppModule (whose MongooseModule.forRoot captures
// MONGODB_URI at import time). Gives the suite its own Mongo DB and Redis DB
// so the real API calls + the real AuditLogProcessor do not collide with the
// other e2e suites.
process.env.MONGODB_URI =
  "mongodb://localhost:27017/maas_test_admin?directConnection=true";
process.env.REDIS_URL = "redis://localhost:6379/12";
