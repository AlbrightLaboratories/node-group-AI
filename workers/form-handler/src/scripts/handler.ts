/**
 * Main request handler
 * Orchestrates validation, storage, and response
 */
import type { Env, WaitlistSubmission, UserRecord } from "../types";
import { HARDWARE_TFLOPS } from "../types";
import { validateSubmission } from "./validate-input";
import { getCorsHeaders, hashIP, checkRateLimit } from "./security";
import { storeUserRecord, updateStats, getStats } from "./redis-storage";
import { calculateValuation } from "./valuation";
import { buildValuationResponse } from "./conditional-display";
import { Redis } from "@upstash/redis";

/**
 * Create a JSON response with CORS headers
 */
export function createResponse(
  body: Record<string, unknown>,
  status: number,
  allowedOrigin: string
): Response {
  const corsHeaders = getCorsHeaders(allowedOrigin, allowedOrigin);
  const headers = new Headers({ "Content-Type": "application/json" });

  // Add CORS headers, filtering out undefined values
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value !== undefined) {
      headers.set(key, value);
    }
  });

  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Handle incoming requests
 */
export async function handleRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin") || env.ALLOWED_ORIGIN;

  // Handle preflight
  if (request.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGIN);
    const preflightHeaders = new Headers();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value !== undefined) {
        preflightHeaders.set(key, value);
      }
    });
    return new Response(null, { status: 204, headers: preflightHeaders });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return createResponse(
      { success: false, message: "Method not allowed" },
      405,
      env.ALLOWED_ORIGIN
    );
  }

  // Parse JSON body
  let submission: WaitlistSubmission;
  try {
    submission = await request.json();
  } catch {
    return createResponse(
      { success: false, message: "Invalid JSON body" },
      400,
      env.ALLOWED_ORIGIN
    );
  }

  // Validate input
  const validation = validateSubmission(submission);
  if (!validation.valid) {
    return createResponse(
      { success: false, message: "Validation failed", errors: validation.errors },
      400,
      env.ALLOWED_ORIGIN
    );
  }

  // Initialize Redis client
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Get client IP and hash it
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = hashIP(clientIP);

  // Check rate limit
  const rateLimit = await checkRateLimit(
    ipHash,
    redis,
    env.RATE_LIMIT_MAX,
    env.RATE_LIMIT_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    return createResponse(
      { success: false, message: "Rate limit exceeded" },
      429,
      env.ALLOWED_ORIGIN
    );
  }

  // Increment rate limit counter
  const rateLimitKey = `ratelimit:${ipHash}`;
  await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, env.RATE_LIMIT_WINDOW_SECONDS);

  // Calculate compute TFLOPs from hardware type
  const computeTflops = HARDWARE_TFLOPS[submission.hardware] || 25;

  // Build user record
  const record: UserRecord = {
    email: submission.email,
    hardware: submission.hardware,
    storage_gb: submission.storage_commitment_gb,
    compute_tflops: computeTflops,
    created_at: Date.now(),
    ip_hash: ipHash,
  };

  // Store user record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeResult = await storeUserRecord(redis as any, record);

  // Update stats (for new users or with delta for updates)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateStats(
    redis as any,
    submission.storage_commitment_gb,
    computeTflops,
    storeResult.isUpdate
  );

  // Get updated stats and calculate valuation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = await getStats(redis as any);
  const valuation = calculateValuation(stats);

  // Store valuation
  await redis.set("waitlist:valuation", valuation);

  // Build valuation response (hidden or revealed based on commitment)
  const valuationResponse = buildValuationResponse(
    submission.storage_commitment_gb,
    valuation
  );

  return createResponse(
    {
      success: true,
      message: storeResult.isUpdate
        ? "Successfully updated your waitlist entry"
        : "Successfully joined waitlist",
      valuation: valuationResponse,
    },
    200,
    env.ALLOWED_ORIGIN
  );
}
