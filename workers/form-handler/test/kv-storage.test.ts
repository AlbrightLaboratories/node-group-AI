/**
 * US-001 AC5, AC6: KV storage tests
 * AC5: Store user record in KV user:{email}
 * AC6: Increment stats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  storeUserRecord,
  updateStats,
  getStats,
  checkAndIncrementRateLimit,
} from "../src/scripts/kv-storage";
import type { UserRecord } from "../src/types";

// Create a mock KV namespace
function createMockKV(): KVNamespace {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

describe("storeUserRecord", () => {
  let mockKV: KVNamespace;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("should store user record with correct key pattern", async () => {
    const record: UserRecord = {
      email: "user@example.com",
      hardware: "consumer_gpu",
      storage_gb: 100,
      compute_tflops: 25,
      created_at: Date.now(),
      ip_hash: "abc123",
    };

    await storeUserRecord(mockKV, record);

    expect(mockKV.put).toHaveBeenCalledWith(
      "user:user@example.com",
      expect.stringContaining('"email":"user@example.com"')
    );
  });

  it("should detect update on duplicate email", async () => {
    const existingRecord: UserRecord = {
      email: "existing@example.com",
      hardware: "gaming_pc",
      storage_gb: 200,
      compute_tflops: 35,
      created_at: Date.now(),
      ip_hash: "old123",
    };

    // Pre-populate KV
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(existingRecord)
    );

    const newRecord: UserRecord = {
      email: "existing@example.com",
      hardware: "server",
      storage_gb: 500,
      compute_tflops: 100,
      created_at: Date.now(),
      ip_hash: "new456",
    };

    const result = await storeUserRecord(mockKV, newRecord);

    expect(result.isUpdate).toBe(true);
    expect(result.previousRecord).toBeDefined();
    expect(result.previousRecord?.storage_gb).toBe(200);
  });

  it("should detect new record for new email", async () => {
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const record: UserRecord = {
      email: "new@example.com",
      hardware: "gaming_pc",
      storage_gb: 200,
      compute_tflops: 35,
      created_at: Date.now(),
      ip_hash: "ghi789",
    };

    const result = await storeUserRecord(mockKV, record);

    expect(result.isUpdate).toBe(false);
    expect(result.previousRecord).toBeUndefined();
  });
});

describe("updateStats", () => {
  let mockKV: KVNamespace;

  beforeEach(() => {
    mockKV = createMockKV();
    // Start with empty stats
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it("should increment all stats for new user", async () => {
    await updateStats(mockKV, 100, 25, false);

    expect(mockKV.put).toHaveBeenCalledWith(
      "stats",
      JSON.stringify({
        total_users: 1,
        total_storage_gb: 100,
        total_compute_tflops: 25,
      })
    );
  });

  it("should not increment user count for update", async () => {
    // Existing stats
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        total_users: 5,
        total_storage_gb: 500,
        total_compute_tflops: 125,
      })
    );

    const previousRecord: UserRecord = {
      email: "test@example.com",
      hardware: "gaming_pc",
      storage_gb: 100,
      compute_tflops: 35,
      created_at: Date.now(),
      ip_hash: "test",
    };

    await updateStats(mockKV, 200, 50, true, previousRecord);

    // Verify put was called
    expect(mockKV.put).toHaveBeenCalled();

    // Parse the call to check values
    const putCall = (mockKV.put as ReturnType<typeof vi.fn>).mock.calls[0];
    const savedStats = JSON.parse(putCall[1]);

    // User count should stay same
    expect(savedStats.total_users).toBe(5);
    // Storage: 500 - 100 (old) + 200 (new) = 600
    expect(savedStats.total_storage_gb).toBe(600);
    // Compute: 125 - 35 (old) + 50 (new) = 140
    expect(savedStats.total_compute_tflops).toBe(140);
  });
});

describe("getStats", () => {
  let mockKV: KVNamespace;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("should return parsed stats from KV", async () => {
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        total_users: 100,
        total_storage_gb: 10000,
        total_compute_tflops: 2500,
      })
    );

    const stats = await getStats(mockKV);

    expect(stats).toEqual({
      total_users: 100,
      total_storage_gb: 10000,
      total_compute_tflops: 2500,
    });
  });

  it("should return zeros for empty stats", async () => {
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const stats = await getStats(mockKV);

    expect(stats).toEqual({
      total_users: 0,
      total_storage_gb: 0,
      total_compute_tflops: 0,
    });
  });
});

describe("checkAndIncrementRateLimit", () => {
  let mockKV: KVNamespace;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("should allow first request from IP", async () => {
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const result = await checkAndIncrementRateLimit(mockKV, "ip_abc123", 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("should block after max requests", async () => {
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({ count: 5, windowStart: Math.floor(Date.now() / 1000) })
    );

    const result = await checkAndIncrementRateLimit(mockKV, "ip_abc123", 5, 60);

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(6);
  });

  it("should reset after window expires", async () => {
    const oldWindowStart = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
    (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({ count: 10, windowStart: oldWindowStart })
    );

    const result = await checkAndIncrementRateLimit(mockKV, "ip_abc123", 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });
});
