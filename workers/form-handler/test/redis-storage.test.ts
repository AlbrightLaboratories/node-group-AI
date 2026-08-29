/**
 * US-001 AC5, AC6: Redis storage tests
 * TDD: These tests must FAIL initially (functions don't exist yet)
 *
 * AC5: Store user record in Redis hash waitlist:user:{email}
 * AC6: Increment stats in waitlist:stats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { storeUserRecord, updateStats, getStats } from "../src/scripts/redis-storage";
import type { UserRecord, WaitlistStats } from "../src/types";

describe("storeUserRecord", () => {
  const mockRedis = {
    hset: vi.fn(),
    hgetall: vi.fn(),
    exists: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    await storeUserRecord(mockRedis as any, record);

    expect(mockRedis.hset).toHaveBeenCalledWith(
      "waitlist:user:user@example.com",
      expect.objectContaining({
        email: "user@example.com",
        hardware: "consumer_gpu",
        storage_gb: "100",
      })
    );
  });

  it("should update existing record on duplicate email", async () => {
    mockRedis.exists.mockResolvedValue(1); // User exists

    const record: UserRecord = {
      email: "existing@example.com",
      hardware: "server",
      storage_gb: 500,
      compute_tflops: 100,
      created_at: Date.now(),
      ip_hash: "def456",
    };

    const result = await storeUserRecord(mockRedis as any, record);

    expect(result.isUpdate).toBe(true);
    expect(mockRedis.hset).toHaveBeenCalled();
  });

  it("should create new record for new email", async () => {
    mockRedis.exists.mockResolvedValue(0); // User doesn't exist

    const record: UserRecord = {
      email: "new@example.com",
      hardware: "gaming_pc",
      storage_gb: 200,
      compute_tflops: 35,
      created_at: Date.now(),
      ip_hash: "ghi789",
    };

    const result = await storeUserRecord(mockRedis as any, record);

    expect(result.isUpdate).toBe(false);
    expect(mockRedis.hset).toHaveBeenCalled();
  });
});

describe("updateStats", () => {
  const mockRedis = {
    hincrby: vi.fn(),
    hset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should increment all stats counters for new user", async () => {
    await updateStats(mockRedis as any, 100, 25, false);

    expect(mockRedis.hincrby).toHaveBeenCalledWith(
      "waitlist:stats",
      "total_users",
      1
    );
    expect(mockRedis.hincrby).toHaveBeenCalledWith(
      "waitlist:stats",
      "total_storage_gb",
      100
    );
    expect(mockRedis.hincrby).toHaveBeenCalledWith(
      "waitlist:stats",
      "total_compute_tflops",
      25
    );
  });

  it("should not increment user count for update", async () => {
    await updateStats(mockRedis as any, 100, 25, true);

    expect(mockRedis.hincrby).not.toHaveBeenCalledWith(
      "waitlist:stats",
      "total_users",
      1
    );
  });

  it("should handle storage delta for updates", async () => {
    // When updating, we pass the delta (new - old)
    await updateStats(mockRedis as any, 50, 10, true); // +50GB, +10 TFLOPs delta

    expect(mockRedis.hincrby).toHaveBeenCalledWith(
      "waitlist:stats",
      "total_storage_gb",
      50
    );
  });
});

describe("getStats", () => {
  const mockRedis = {
    hgetall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return parsed stats from Redis", async () => {
    mockRedis.hgetall.mockResolvedValue({
      total_users: "100",
      total_storage_gb: "10000",
      total_compute_tflops: "2500",
    });

    const stats = await getStats(mockRedis as any);

    expect(stats).toEqual({
      total_users: 100,
      total_storage_gb: 10000,
      total_compute_tflops: 2500,
    });
  });

  it("should return zeros for empty stats", async () => {
    mockRedis.hgetall.mockResolvedValue(null);

    const stats = await getStats(mockRedis as any);

    expect(stats).toEqual({
      total_users: 0,
      total_storage_gb: 0,
      total_compute_tflops: 0,
    });
  });
});
