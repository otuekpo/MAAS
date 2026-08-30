import { Global, Logger, Module, Provider } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis => {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error(`REDIS_URL is required`);
    }

    const client = new Redis(url);

    client.on("error", (err) =>
      Logger.error(`[Redis] ${err.message}`, "RedisModule"),
    );
    client.on("ready", () => Logger.log("[Redis] connected", "RedisModule"));

    return client;
  },
};

@Global()
@Module({
  providers: [RedisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
