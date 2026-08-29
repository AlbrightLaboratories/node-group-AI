/**
 * US-001 AC2, AC4: Input validation tests
 * TDD: These tests must FAIL initially (functions don't exist yet)
 */
import { describe, it, expect } from "vitest";
import { validateEmail, validateSubmission } from "../src/scripts/validate-input";
import type { WaitlistSubmission } from "../src/types";

describe("validateEmail", () => {
  it("should accept valid email formats", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("test.user@domain.co.uk")).toBe(true);
    expect(validateEmail("name+tag@company.org")).toBe(true);
  });

  it("should reject invalid email formats", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("missing@domain")).toBe(false);
    expect(validateEmail("@nodomain.com")).toBe(false);
    expect(validateEmail("spaces in@email.com")).toBe(false);
    expect(validateEmail("")).toBe(false);
  });
});

describe("validateSubmission", () => {
  it("should accept valid submission with all required fields", () => {
    const submission: WaitlistSubmission = {
      email: "user@example.com",
      hardware: "consumer_gpu",
      storage_commitment_gb: 100,
    };
    const result = validateSubmission(submission);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject submission with invalid email", () => {
    const submission: WaitlistSubmission = {
      email: "invalid-email",
      hardware: "consumer_gpu",
      storage_commitment_gb: 100,
    };
    const result = validateSubmission(submission);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid email format");
  });

  it("should reject submission with storage below minimum (1GB)", () => {
    const submission: WaitlistSubmission = {
      email: "user@example.com",
      hardware: "consumer_gpu",
      storage_commitment_gb: 0,
    };
    const result = validateSubmission(submission);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Storage commitment must be between 1GB and 1024GB");
  });

  it("should reject submission with storage above maximum (1TB)", () => {
    const submission: WaitlistSubmission = {
      email: "user@example.com",
      hardware: "consumer_gpu",
      storage_commitment_gb: 2000,
    };
    const result = validateSubmission(submission);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Storage commitment must be between 1GB and 1024GB");
  });

  it("should reject submission with invalid hardware type", () => {
    const submission = {
      email: "user@example.com",
      hardware: "invalid_type",
      storage_commitment_gb: 100,
    } as unknown as WaitlistSubmission;
    const result = validateSubmission(submission);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid hardware type");
  });

  it("should collect all validation errors", () => {
    const submission = {
      email: "invalid",
      hardware: "bad_type",
      storage_commitment_gb: -5,
    } as unknown as WaitlistSubmission;
    const result = validateSubmission(submission);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
