/**
 * KV storage operations
 * US-001 AC5, AC6
 */
import type { UserRecord, WaitlistStats } from "../types";

export interface StoreResult {
  isUpdate: boolean;
  previousRecord?: UserRecord;
}

/**
 * Store or update a user record in KV
 * Key pattern: user:{email}
 */
export async function storeUserRecord(
  kv: KVNamespace,
  record: UserRecord
): Promise<StoreResult> {
  const key = `user:${record.email}`;

  // Check if user already exists and get previous record
  const existingJson = await kv.get(key);
  const isUpdate = existingJson !== null;
  const previousRecord = isUpdate ? JSON.parse(existingJson) as UserRecord : undefined;

  // Store the record as JSON
  await kv.put(key, JSON.stringify(record));

  return { isUpdate, previousRecord };
}

/**
 * Get a user record
 */
export async function getUserRecord(
  kv: KVNamespace,
  email: string
): Promise<UserRecord | null> {
  const key = `user:${email}`;
  const json = await kv.get(key);
  return json ? JSON.parse(json) as UserRecord : null;
}

/**
 * Update aggregate stats counters
 * Key: stats
 */
export async function updateStats(
  kv: KVNamespace,
  storageDelta: number,
  computeDelta: number,
  isUpdate: boolean,
  previousRecord?: UserRecord
): Promise<void> {
  // Get current stats
  const stats = await getStats(kv);

  // Calculate new totals
  if (isUpdate && previousRecord) {
    // For updates, subtract old values and add new
    stats.total_storage_gb = stats.total_storage_gb - previousRecord.storage_gb + storageDelta;
    stats.total_compute_tflops = stats.total_compute_tflops - previousRecord.compute_tflops + computeDelta;
  } else {
    // For new users, just add
    stats.total_users += 1;
    stats.total_storage_gb += storageDelta;
    stats.total_compute_tflops += computeDelta;
  }

  // Store updated stats
  await kv.put("stats", JSON.stringify(stats));
}

/**
 * Get current aggregate stats
 */
export async function getStats(kv: KVNamespace): Promise<WaitlistStats> {
  const json = await kv.get("stats");

  if (!json) {
    return {
      total_users: 0,
      total_storage_gb: 0,
      total_compute_tflops: 0,
    };
  }

  return JSON.parse(json) as WaitlistStats;
}

/**
 * Store valuation
 */
export async function storeValuation(kv: KVNamespace, valuation: number): Promise<void> {
  await kv.put("valuation", String(valuation));
}

/**
 * Check rate limit using KV with TTL
 */
export async function checkAndIncrementRateLimit(
  kv: KVNamespace,
  ipHash: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; count: number }> {
  const key = `ratelimit:${ipHash}`;
  const json = await kv.get(key);

  let data: { count: number; windowStart: number };
  const now = Math.floor(Date.now() / 1000);

  if (!json) {
    // First request from this IP
    data = { count: 1, windowStart: now };
  } else {
    data = JSON.parse(json);

    // Check if window has expired
    if (now - data.windowStart >= windowSeconds) {
      // Reset window
      data = { count: 1, windowStart: now };
    } else {
      // Increment count
      data.count += 1;
    }
  }

  const allowed = data.count <= maxRequests;

  // Store updated rate limit (expire after window)
  await kv.put(key, JSON.stringify(data), {
    expirationTtl: windowSeconds,
  });

  return { allowed, count: data.count };
}
