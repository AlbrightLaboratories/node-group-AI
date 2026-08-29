/**
 * US-003: Conditional valuation display tests
 * TDD: These tests must FAIL initially (functions don't exist yet)
 *
 * AC1: Return valuation ONLY if storage_commitment_gb > 50
 * AC2: Return 'hidden' status for storage_commitment_gb <= 50
 */
import { describe, it, expect } from "vitest";
import { shouldRevealValuation, buildValuationResponse } from "../src/scripts/conditional-display";

describe("shouldRevealValuation", () => {
  it("should return true for storage commitment > 50GB", () => {
    expect(shouldRevealValuation(51)).toBe(true);
    expect(shouldRevealValuation(100)).toBe(true);
    expect(shouldRevealValuation(500)).toBe(true);
    expect(shouldRevealValuation(1024)).toBe(true);
  });

  it("should return false for storage commitment <= 50GB", () => {
    expect(shouldRevealValuation(50)).toBe(false);
    expect(shouldRevealValuation(49)).toBe(false);
    expect(shouldRevealValuation(25)).toBe(false);
    expect(shouldRevealValuation(1)).toBe(false);
  });

  it("should return false for exactly 50GB (boundary)", () => {
    expect(shouldRevealValuation(50)).toBe(false);
  });

  it("should return true for 51GB (just above boundary)", () => {
    expect(shouldRevealValuation(51)).toBe(true);
  });
});

describe("buildValuationResponse", () => {
  it("should include valuation for high-commitment users", () => {
    const response = buildValuationResponse(100, 1500000); // 100GB, $1.5M
    expect(response.visible).toBe(true);
    expect(response.valuation).toBe(1500000);
    expect(response.formatted).toBe("$1.5M");
  });

  it("should hide valuation for low-commitment users", () => {
    const response = buildValuationResponse(50, 1500000); // 50GB, $1.5M
    expect(response.visible).toBe(false);
    expect(response.valuation).toBeUndefined();
    expect(response.formatted).toBeUndefined();
    expect(response.message).toBe("Commit 50GB+ to see network value");
  });

  it("should hide valuation for minimum commitment users", () => {
    const response = buildValuationResponse(1, 1500000);
    expect(response.visible).toBe(false);
    expect(response.message).toBe("Commit 50GB+ to see network value");
  });
});
