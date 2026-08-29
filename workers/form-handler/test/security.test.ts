/**
 * US-004: Security and rate limiting tests
 * TDD: These tests must FAIL initially (functions don't exist yet)
 *
 * AC1: CORS configured for site domain only
 * AC2: Rate limit to 5 submissions per minute per IP
 * AC3: Hash IP for duplicate detection without storing raw IP
 * AC4: Duplicate email updates existing record
 */
import { describe, it, expect } from "vitest";
import { hashIP, checkRateLimit, getCorsHeaders } from "../src/scripts/security";

describe("hashIP", () => {
  it("should hash an IPv4 address deterministically", () => {
    const hash1 = hashIP("192.168.1.1");
    const hash2 = hashIP("192.168.1.1");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different IPs", () => {
    const hash1 = hashIP("192.168.1.1");
    const hash2 = hashIP("192.168.1.2");
    expect(hash1).not.toBe(hash2);
  });

  it("should not contain the original IP in the hash", () => {
    const ip = "192.168.1.100";
    const hash = hashIP(ip);
    expect(hash).not.toContain("192");
    expect(hash).not.toContain("168");
    expect(hash).not.toContain("100");
  });

  it("should handle IPv6 addresses", () => {
    const hash = hashIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should produce a fixed-length output", () => {
    const hash1 = hashIP("1.1.1.1");
    const hash2 = hashIP("255.255.255.255");
    expect(hash1.length).toBe(hash2.length);
  });
});

describe("checkRateLimit", () => {
  it("should allow requests under the limit", async () => {
    // Mock Redis client with 0 current count
    const mockRedis = {
      get: async () => "2",
    };
    const result = await checkRateLimit("ip_hash_123", mockRedis as any, 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it("should block requests at the limit", async () => {
    const mockRedis = {
      get: async () => "5",
    };
    const result = await checkRateLimit("ip_hash_123", mockRedis as any, 5, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should block requests over the limit", async () => {
    const mockRedis = {
      get: async () => "10",
    };
    const result = await checkRateLimit("ip_hash_123", mockRedis as any, 5, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow first request (no existing count)", async () => {
    const mockRedis = {
      get: async () => null,
    };
    const result = await checkRateLimit("ip_hash_123", mockRedis as any, 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});

describe("getCorsHeaders", () => {
  it("should return CORS headers for allowed origin", () => {
    const headers = getCorsHeaders(
      "https://albrightlaboratories.github.io",
      "https://albrightlaboratories.github.io"
    );
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://albrightlaboratories.github.io");
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
  });

  it("should not include origin header for disallowed origin", () => {
    const headers = getCorsHeaders(
      "https://evil-site.com",
      "https://albrightlaboratories.github.io"
    );
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("should handle localhost for development", () => {
    const headers = getCorsHeaders(
      "http://localhost:3000",
      "https://albrightlaboratories.github.io"
    );
    // In production, localhost should be blocked
    // But we may want to allow it in dev
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
  });

  it("should include credentials header", () => {
    const headers = getCorsHeaders(
      "https://albrightlaboratories.github.io",
      "https://albrightlaboratories.github.io"
    );
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });
});
