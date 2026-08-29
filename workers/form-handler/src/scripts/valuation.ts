/**
 * Network valuation calculation
 * US-002 AC1, AC2, AC3
 *
 * Formula: (total_storage_gb * 0.10) + (total_compute_tflops * 50) + (user_count * 100)
 */
import type { WaitlistStats } from "../types";

/**
 * Calculate network valuation based on committed resources
 */
export function calculateValuation(stats: WaitlistStats): number {
  const storageValue = stats.total_storage_gb * 0.10;
  const computeValue = stats.total_compute_tflops * 50;
  const userValue = stats.total_users * 100;

  return storageValue + computeValue + userValue;
}

/**
 * Format valuation as human-readable string ($X.XK, $X.XM, $X.XB)
 */
export function formatValuation(value: number): string {
  if (value === 0) {
    return "$0";
  }

  if (value >= 1_000_000_000) {
    // Billions
    const billions = value / 1_000_000_000;
    return `$${billions.toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    // Millions
    const millions = value / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  }

  if (value >= 1_000) {
    // Thousands
    const thousands = value / 1_000;
    return `$${thousands.toFixed(1)}K`;
  }

  return `$${value}`;
}
