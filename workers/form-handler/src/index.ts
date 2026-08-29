/**
 * node-group-AI Waitlist Form Handler
 * Cloudflare Worker entry point
 *
 * Routes to: scripts/handler.ts
 */
import type { Env } from "./types";
import { handleRequest } from "./scripts/handler";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
