import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
});

redis.connect().catch(() => {
  console.warn("Redis não disponível — cache desativado");
});
