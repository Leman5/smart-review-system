import { Redis } from "@upstash/redis";
import type { ReviewStore, StoredPlace } from "./reviewsCache";

/** Returns null when no database is configured, so the app still works with live lookups only. */
export function getStore(): ReviewStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return {
    get: (id) => redis.get<StoredPlace>(`reviews:${id}`),
    set: async (id, value) => {
      await redis.set(`reviews:${id}`, value);
    },
  };
}
