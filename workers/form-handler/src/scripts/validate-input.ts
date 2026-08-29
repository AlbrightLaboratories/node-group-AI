/**
 * Input validation functions for waitlist form
 * US-001 AC2, AC4
 */
import type { WaitlistSubmission, HardwareType } from "../types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_HARDWARE_TYPES: HardwareType[] = [
  "consumer_gpu",
  "gaming_pc",
  "workstation",
  "server",
  "data_center",
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates the complete waitlist submission
 */
export function validateSubmission(submission: WaitlistSubmission): ValidationResult {
  const errors: string[] = [];

  // Validate email
  if (!validateEmail(submission.email)) {
    errors.push("Invalid email format");
  }

  // Validate hardware type
  if (!VALID_HARDWARE_TYPES.includes(submission.hardware)) {
    errors.push("Invalid hardware type");
  }

  // Validate storage commitment (1GB - 1TB)
  const storage = submission.storage_commitment_gb;
  if (typeof storage !== "number" || storage < 1 || storage > 1024) {
    errors.push("Storage commitment must be between 1GB and 1024GB");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
