/**
 * US-002: Network valuation calculation tests
 * TDD: These tests must FAIL initially (functions don't exist yet)
 *
 * Formula: (total_storage_gb * 0.10) + (total_compute_tflops * 50) + (user_count * 100)
 */
import { describe, it, expect } from "vitest";
import { calculateValuation, formatValuation } from "../src/scripts/valuation";
import type { WaitlistStats } from "../src/types";

describe("calculateValuation", () => {
  it("should calculate valuation using the formula", () => {
    const stats: WaitlistStats = {
      total_users: 100,
      total_storage_gb: 10000,      // 10TB total
      total_compute_tflops: 2500,   // 2500 TFLOPs
    };
    // Formula: (10000 * 0.10) + (2500 * 50) + (100 * 100)
    // = 1000 + 125000 + 10000 = 136000
    const result = calculateValuation(stats);
    expect(result).toBe(136000);
  });

  it("should return 0 for empty network", () => {
    const stats: WaitlistStats = {
      total_users: 0,
      total_storage_gb: 0,
      total_compute_tflops: 0,
    };
    const result = calculateValuation(stats);
    expect(result).toBe(0);
  });

  it("should handle single user correctly", () => {
    const stats: WaitlistStats = {
      total_users: 1,
      total_storage_gb: 100,
      total_compute_tflops: 25,
    };
    // Formula: (100 * 0.10) + (25 * 50) + (1 * 100)
    // = 10 + 1250 + 100 = 1360
    const result = calculateValuation(stats);
    expect(result).toBe(1360);
  });

  it("should scale correctly with large numbers", () => {
    const stats: WaitlistStats = {
      total_users: 1000000,           // 1M users
      total_storage_gb: 100000000,    // 100 PB
      total_compute_tflops: 25000000, // 25M TFLOPs
    };
    // Formula: (100000000 * 0.10) + (25000000 * 50) + (1000000 * 100)
    // = 10000000 + 1250000000 + 100000000 = 1360000000 (1.36B)
    const result = calculateValuation(stats);
    expect(result).toBe(1360000000);
  });
});

describe("formatValuation", () => {
  it("should format thousands as $X.XK", () => {
    expect(formatValuation(1500)).toBe("$1.5K");
    expect(formatValuation(999)).toBe("$999");
    expect(formatValuation(10000)).toBe("$10.0K");
  });

  it("should format millions as $X.XM", () => {
    expect(formatValuation(1000000)).toBe("$1.0M");
    expect(formatValuation(1500000)).toBe("$1.5M");
    expect(formatValuation(136000000)).toBe("$136.0M");
  });

  it("should format billions as $X.XB", () => {
    expect(formatValuation(1000000000)).toBe("$1.0B");
    expect(formatValuation(1360000000)).toBe("$1.4B");
    expect(formatValuation(50000000000)).toBe("$50.0B");
  });

  it("should handle zero", () => {
    expect(formatValuation(0)).toBe("$0");
  });
});
