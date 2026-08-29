/**
 * Types for the node-group-AI waitlist form handler
 */

export interface WaitlistSubmission {
  email: string;
  hardware: HardwareType;
  storage_commitment_gb: number;
}

export type HardwareType =
  | "consumer_gpu"    // RTX 3060-4090
  | "gaming_pc"       // Gaming rigs with GPU
  | "workstation"     // Professional workstations
  | "server"          // Dedicated servers
  | "data_center";    // Data center equipment

export interface UserRecord {
  email: string;
  hardware: HardwareType;
  storage_gb: number;
  compute_tflops: number;
  created_at: number;
  ip_hash: string;
}

export interface WaitlistStats {
  total_users: number;
  total_storage_gb: number;
  total_compute_tflops: number;
}

export interface ValuationResult {
  valuation: number;
  formatted: string;
  visible: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  valuation?: ValuationResult;
}

export interface Env {
  WAITLIST_KV: KVNamespace;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
}

// Hardware type to estimated TFLOPs mapping
export const HARDWARE_TFLOPS: Record<HardwareType, number> = {
  consumer_gpu: 25,      // ~RTX 3070 average
  gaming_pc: 35,         // ~RTX 3080/4070
  workstation: 50,       // Professional GPU
  server: 100,           // Multiple GPUs
  data_center: 500,      // Many GPUs
};
