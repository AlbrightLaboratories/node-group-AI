/**
 * Redis storage operations
 * US-001 AC5, AC6
 */
import type { UserRecord, WaitlistStats } from "../types";

export interface StoreResult {
  isUpdate: boolean;
}

interface RedisClient {
  hset: (key: string, data: Record<string, string>) => Promise<number | "OK" | null>;
  hgetall: <T = Record<string, string>>(key: string) => Promise<T | null>;
  exists: (...keys: string[]) => Promise<number>;
  hincrby: (key: string, field: string, increment: number) => Promise<number>;
}

/**
 * Store or update a user record in Redis
 * Key pattern: waitlist:user:{email}
 */
export async function storeUserRecord(
  redis: RedisClient,
  record: UserRecord
): Promise<StoreResult> {
  const key = `waitlist:user:${record.email}`;

  // Check if user already exists
  const exists = await redis.exists(key);
  const isUpdate = exists === 1;

  // Store/update the record
  await redis.hset(key, {
    email: record.email,
    hardware: record.hardware,
    storage_gb: String(record.storage_gb),
    compute_tflops: String(record.compute_tflops),
    created_at: String(record.created_at),
    ip_hash: record.ip_hash,
  });

  return { isUpdate };
}

/**
 * Update aggregate stats counters
 * Key: waitlist:stats
 */
export async function updateStats(
  redis: RedisClient,
  storageDelta: number,
  computeDelta: number,
  isUpdate: boolean
): Promise<void> {
  // Only increment user count for new users
  if (!isUpdate) {
    await redis.hincrby("waitlist:stats", "total_users", 1);
  }

  // Always update storage and compute totals with delta
  await redis.hincrby("waitlist:stats", "total_storage_gb", storageDelta);
  await redis.hincrby("waitlist:stats", "total_compute_tflops", computeDelta);
}

/**
 * Get current aggregate stats
 */
export async function getStats(redis: RedisClient): Promise<WaitlistStats> {
  const data = await redis.hgetall("waitlist:stats");

  if (!data) {
    return {
      total_users: 0,
      total_storage_gb: 0,
      total_compute_tflops: 0,
    };
  }

  return {
    total_users: parseInt(data.total_users || "0", 10),
    total_storage_gb: parseInt(data.total_storage_gb || "0", 10),
    total_compute_tflops: parseInt(data.total_compute_tflops || "0", 10),
  };
}
