# Release Dependencies

## v0.1.0 Dependency Map

### Components touched

| Component | Change | Issue |
|-----------|--------|-------|
| `docs/` | 12 architecture documents | #3 |
| `site/` | GitHub Pages landing site with waitlist form | #1, #3 |
| `workers/form-handler/` | Cloudflare Worker for form submission | #1, #2 |
| `workers/form-handler/src/scripts/kv-storage.ts` | KV storage implementation | #2 |

### Services affected

| Service | Impact | Action Required |
|---------|--------|-----------------|
| Cloudflare Worker | Initial deployment | None (already deployed) |
| Cloudflare KV | New namespace `waitlist` | None (already created) |
| GitHub Pages | Static site hosting | Deploy `site/` directory |

### External dependencies

| Dependency | Version | Notes |
|------------|---------|-------|
| Cloudflare Workers | Runtime | No external secrets required |
| Cloudflare KV | Built-in | Namespace id: `e9866fd880534e9e896bcf3eb5b0971b` |

### Breaking changes

None — this is the initial release.

### Rollback considerations

Since this is v0.1.0 (initial release), rollback means:
1. Delete the Cloudflare Worker: `wrangler delete`
2. Clear KV data: `wrangler kv namespace delete --namespace-id e9866fd880534e9e896bcf3eb5b0971b`
3. Remove GitHub Pages deployment

### Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (static site)               │
│   site/index.html → form → POST to Worker                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                        │
│   node-group-ai-form-handler.hawaiideveloper.workers.dev   │
│   • Validates input                                         │
│   • Stores user records in KV                              │
│   • Calculates network valuation                           │
│   • Returns valuation for >50GB commitments                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare KV                            │
│   Namespace: waitlist                                       │
│   Keys: user:{email}, stats, valuation, ratelimit:{ip}     │
└─────────────────────────────────────────────────────────────┘
```
