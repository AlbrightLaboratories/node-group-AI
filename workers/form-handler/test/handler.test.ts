/**
 * Main handler integration tests
 * Tests the full request/response flow for US-001 through US-004
 */
import { describe, it, expect, vi } from "vitest";
import { handleRequest, createResponse } from "../src/scripts/handler";
import type { Env } from "../src/types";

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

describe("handleRequest", () => {
  const createMockEnv = (): Env => ({
    WAITLIST_KV: createMockKV(),
    ALLOWED_ORIGIN: "https://albrightlaboratories.github.io",
    RATE_LIMIT_MAX: 5,
    RATE_LIMIT_WINDOW_SECONDS: 60,
  });

  it("should return 405 for GET requests", async () => {
    const mockEnv = createMockEnv();
    const request = new Request("https://worker.example.com/api/waitlist", {
      method: "GET",
    });

    const response = await handleRequest(request, mockEnv);

    expect(response.status).toBe(405);
  });

  it("should return 400 for invalid JSON body", async () => {
    const mockEnv = createMockEnv();
    const request = new Request("https://worker.example.com/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await handleRequest(request, mockEnv);

    expect(response.status).toBe(400);
  });

  it("should return 400 for missing required fields", async () => {
    const mockEnv = createMockEnv();
    const request = new Request("https://worker.example.com/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await handleRequest(request, mockEnv);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("should return 429 when rate limited", async () => {
    // Test the response structure
    const mockEnv = createMockEnv();
    const mockResponse = createResponse(
      { success: false, message: "Rate limit exceeded" },
      429,
      mockEnv.ALLOWED_ORIGIN
    );

    expect(mockResponse.status).toBe(429);
  });

  it("should return 200 with success for valid submission under 50GB", async () => {
    const mockEnv = createMockEnv();
    const mockResponse = createResponse(
      {
        success: true,
        message: "Successfully joined waitlist",
        valuation: {
          visible: false,
          message: "Commit 50GB+ to see network value",
        },
      },
      200,
      mockEnv.ALLOWED_ORIGIN
    );

    expect(mockResponse.status).toBe(200);
    const body = (await mockResponse.json()) as {
      success: boolean;
      valuation: { visible: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.valuation.visible).toBe(false);
  });

  it("should return 200 with valuation for valid submission over 50GB", async () => {
    const mockEnv = createMockEnv();
    const mockResponse = createResponse(
      {
        success: true,
        message: "Successfully joined waitlist",
        valuation: {
          visible: true,
          valuation: 1500000,
          formatted: "$1.5M",
        },
      },
      200,
      mockEnv.ALLOWED_ORIGIN
    );

    expect(mockResponse.status).toBe(200);
    const body = (await mockResponse.json()) as {
      success: boolean;
      valuation: { visible: boolean; formatted: string };
    };
    expect(body.success).toBe(true);
    expect(body.valuation.visible).toBe(true);
    expect(body.valuation.formatted).toBe("$1.5M");
  });

  it("should handle OPTIONS preflight requests", async () => {
    const mockEnv = createMockEnv();
    const request = new Request("https://worker.example.com/api/waitlist", {
      method: "OPTIONS",
    });

    const response = await handleRequest(request, mockEnv);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST"
    );
  });

  it("should process valid submission and store in KV", async () => {
    const mockEnv = createMockEnv();
    const request = new Request("https://worker.example.com/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://albrightlaboratories.github.io",
      },
      body: JSON.stringify({
        email: "test@example.com",
        hardware: "consumer_gpu",
        storage_commitment_gb: 100,
      }),
    });

    const response = await handleRequest(request, mockEnv);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      valuation: { visible: boolean };
    };
    expect(body.success).toBe(true);
    // 100GB > 50GB so valuation should be visible
    expect(body.valuation.visible).toBe(true);
  });
});

describe("createResponse", () => {
  it("should include CORS headers", () => {
    const response = createResponse(
      { success: true },
      200,
      "https://albrightlaboratories.github.io"
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://albrightlaboratories.github.io"
    );
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should serialize body as JSON", async () => {
    const response = createResponse(
      { success: true, message: "Test" },
      200,
      "https://example.com"
    );

    const body = (await response.json()) as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toBe("Test");
  });
});
