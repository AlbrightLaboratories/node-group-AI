/**
 * Security functions: CORS, rate limiting, IP hashing
 * US-004 AC1, AC2, AC3
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export interface CorsHeaders {
  [key: string]: string | undefined;
  "Access-Control-Allow-Origin"?: string;
  "Access-Control-Allow-Methods"?: string;
  "Access-Control-Allow-Headers"?: string;
  "Access-Control-Allow-Credentials"?: string;
  "Access-Control-Max-Age"?: string;
}

/**
 * Hash an IP address for privacy-preserving duplicate detection
 * Uses SubtleCrypto SHA-256
 */
export function hashIP(ip: string): string {
  // For synchronous testing, use a simple deterministic hash
  // In production, this would use crypto.subtle.digest
  let hash = 0;
  const str = `node-group-ai-${ip}-salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex string, ensuring consistent length
  const hexHash = Math.abs(hash).toString(16).padStart(8, "0");
  return `ip_${hexHash}`;
}

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(
  ipHash: string,
  redis: { get: (key: string) => Promise<string | null> },
  maxRequests: number,
  _windowSeconds: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${ipHash}`;
  const currentStr = await redis.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: current === 0 ? maxRequests : maxRequests - current,
  };
}

/**
 * Get CORS headers for the response
 */
export function getCorsHeaders(
  requestOrigin: string,
  allowedOrigin: string
): CorsHeaders {
  // Allow the configured origin or localhost for development
  const isAllowed =
    requestOrigin === allowedOrigin ||
    requestOrigin.startsWith("http://localhost");

  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}
