import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@app/shared";
import { createUnSuccessfulResponse } from "@app/shared/utilities/apiResponse";

@Injectable()
export class BruteForceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private readonly maxAttempts = Number(
    process.env.BRUTE_FORCE_MAX_ATTEMPTS ?? 5,
  );
  private readonly windowSec = Number(
    process.env.BRUTE_FORCE_WINDOW_SEC ?? 900,
  );
  private readonly blockSec = Number(process.env.BRUTE_FORCE_BLOCK_SEC ?? 900);

  private readonly failureScript = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
    if count >= tonumber(ARGV[2]) then
      redis.call('DEL', KEYS[1])
      redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
      return 1
    end
    return 0
  `;

  private failKey(key: string): string {
    return `bf:f:${key}`;
  }

  private lockKey(key: string): string {
    return `bf:l:${key}`;
  }

  async guard(key: string): Promise<void> {
    if ((await this.redis.exists(this.lockKey(key))) === 1) {
      throw new HttpException(
        createUnSuccessfulResponse(
          "Too many failed attempts. Try again later.",
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(key: string): Promise<void> {
    await this.redis.eval(
      this.failureScript,
      2,
      this.failKey(key),
      this.lockKey(key),
      this.windowSec,
      this.maxAttempts,
      this.blockSec,
    );
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(this.failKey(key), this.lockKey(key));
  }
}
