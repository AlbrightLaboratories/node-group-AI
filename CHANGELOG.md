# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 — 2026-08-29

Initial release of node-group-AI — a decentralized GPU mesh platform for distributed AI compute.

### Added

- Decentralized GPU mesh architecture documentation (242cc73) (#3)
  - 12 comprehensive docs covering architecture, security, scaling, governance
- GitHub Pages landing site with waitlist form (f057d8c) (#1)
  - Responsive design with network visualization
  - Storage commitment slider (1GB-1TB)
  - Hardware type selection
- Cloudflare Worker for form submission (f057d8c, 4127cb7) (#1, #2)
  - Input validation with email format checking
  - Rate limiting (5 requests/min per IP)
  - IP hashing for privacy-preserving duplicate detection
  - Cloudflare KV storage for user records and stats
- Network valuation calculation (f057d8c) (#1)
  - Formula: `(storage_gb × $0.10) + (compute_tflops × $50) + (users × $100)`
  - Conditional display: valuation shown only for >50GB commitments
  - Formatted output: $X.XK / $X.XM / $X.XB
- 56 unit tests covering all components (f057d8c, 4127cb7) (#1, #2)

### Changed

- Migrated storage from Upstash Redis to Cloudflare KV (4127cb7) (#2)
  - Eliminates external dependency
  - Uses native Cloudflare KV namespace binding
  - No secrets configuration required

### Fixed

- Worker endpoint URL in site JavaScript (c915d99) (#1)

### Technical Details

- **Worker:** https://node-group-ai-form-handler.hawaiideveloper.workers.dev
- **KV Namespace:** `waitlist` (id: e9866fd880534e9e896bcf3eb5b0971b)
- **Test coverage:** 56 tests passing
- **Dependencies:** Cloudflare Workers runtime only (no external services)
