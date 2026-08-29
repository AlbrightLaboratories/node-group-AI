/**
 * Conditional valuation display logic
 * US-003 AC1, AC2, AC3, AC4
 *
 * Valuation shown ONLY if storage_commitment_gb > 50
 */
import { formatValuation } from "./valuation";

export interface ValuationResponse {
  visible: boolean;
  valuation?: number;
  formatted?: string;
  message?: string;
}

const REVEAL_THRESHOLD_GB = 50;

/**
 * Determine if valuation should be revealed based on storage commitment
 */
export function shouldRevealValuation(storageCommitmentGb: number): boolean {
  return storageCommitmentGb > REVEAL_THRESHOLD_GB;
}

/**
 * Build the valuation response based on user's commitment level
 */
export function buildValuationResponse(
  storageCommitmentGb: number,
  valuationAmount: number
): ValuationResponse {
  if (shouldRevealValuation(storageCommitmentGb)) {
    return {
      visible: true,
      valuation: valuationAmount,
      formatted: formatValuation(valuationAmount),
    };
  }

  return {
    visible: false,
    message: "Commit 50GB+ to see network value",
  };
}
