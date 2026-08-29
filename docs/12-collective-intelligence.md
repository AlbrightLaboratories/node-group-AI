# Collective Intelligence: From Inference to Learning

How node-group-AI becomes a self-improving global AI.

## The Vision

```
Phase 1: Distributed Inference    ← We designed this
         Run existing models across the swarm

Phase 2: Distributed Knowledge    ← This document
         Collective memory that grows over time

Phase 3: Distributed Learning     ← The hard part
         Network gets smarter from usage

Phase 4: Global Intelligence      ← The goal
         Self-improving collective AI
```

## The Bootstrap Problem

### Chicken and Egg

```
┌─────────────────────────────────────────────────────────────┐
│              The Bootstrap Challenge                         │
│                                                              │
│   Users won't join if network is useless                    │
│   Network is useless without users                          │
│                                                              │
│   Solution: Seed the network ourselves first                │
│                                                              │
│   Week 1-4:   10 seed nodes (our hardware)                  │
│   Month 2:    100 early adopters (waitlist)                 │
│   Month 3:    1,000 nodes (public launch)                   │
│   Month 6:    10,000 nodes (critical mass)                  │
│   Year 1:     100,000 nodes (self-sustaining)               │
│   Year 2:     1,000,000 nodes (network effects)             │
│   Year 3+:    10,000,000+ nodes (global scale)              │
└─────────────────────────────────────────────────────────────┘
```

### Seed Node Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Initial Seed Network                            │
│                                                              │
│   Albright Labs provides:                                    │
│   • 5 x A100 nodes (us-west, us-east, eu-west)             │
│   • 5 x RTX 4090 nodes (distributed)                        │
│   • Full 70B model replicated                               │
│   • Piece redundancy = 3x minimum                           │
│                                                              │
│   This gives:                                                │
│   • Usable inference from day 1                             │
│   • Early users have good experience                        │
│   • Demonstrates the concept works                          │
│                                                              │
│   Cost: ~$5K/month (cloud) or ~$50K one-time (owned)       │
│   Duration: Until network self-sustains                      │
└─────────────────────────────────────────────────────────────┘
```

## User Budget Model

### Contribution Settings

Every user sets their budget:

```yaml
# ~/.node-group-ai/budget.yaml
contribution:
  # Storage budget
  storage:
    max_gb: 10              # I'll store up to 10GB of weights
    models:                 # Which models I'm willing to host
      - llama-*
      - qwen-*
      - mistral-*

  # Compute budget
  compute:
    max_gpu_percent: 50     # Use up to 50% of my GPU
    hours_per_day: 8        # Only when I'm at work
    schedule:               # Or specific times
      weekdays: "09:00-17:00"
      weekends: "off"

  # Bandwidth budget
  bandwidth:
    max_mbps: 100           # Cap my upload
    monthly_cap_gb: 500     # Total monthly transfer

  # When to contribute
  availability:
    mode: idle              # Only when system idle
    # mode: always          # Continuous contribution
    # mode: scheduled       # Specific times
    min_battery: 50         # Laptops: only above 50%

# What I want in return
consumption:
  priority: balanced        # balanced | maximize_earning | minimize_cost
  free_tier: true          # Opt into ad-supported free access
```

### Free to Use Model

```
┌─────────────────────────────────────────────────────────────┐
│            How It Stays Free                                 │
│                                                              │
│   Option 1: Contribution = Access                           │
│   ─────────────────────────────────────────                 │
│   • Contribute X → Get X back (credits)                    │
│   • Minimum viable: 100MB storage = basic access           │
│   • More contribution = more/faster access                 │
│                                                              │
│   Option 2: Ad-Supported Free Tier                          │
│   ─────────────────────────────────────────                 │
│   • Non-contributors see occasional ads                    │
│   • Ads = credits that pay contributors                    │
│   • Like free Spotify vs Premium                           │
│                                                              │
│   Option 3: Compute Donation                                │
│   ─────────────────────────────────────────                 │
│   • Run background tasks for others while idle             │
│   • Earn credits passively                                 │
│   • Like Folding@Home but for AI                           │
│                                                              │
│   Option 4: Knowledge Contribution                          │
│   ─────────────────────────────────────────                 │
│   • Share high-quality data/documents                      │
│   • Curate/verify others' contributions                    │
│   • Earn credits for valuable knowledge                    │
│                                                              │
│   Result: Everyone can use it, everyone contributes        │
└─────────────────────────────────────────────────────────────┘
```

## Blockchain + Torrent Resilience

### The Hybrid Model

```
┌─────────────────────────────────────────────────────────────┐
│           Blockchain + Torrent = Resilient AI                │
│                                                              │
│   From TORRENT:                                              │
│   • Pieces distributed across nodes                         │
│   • No central server for weights                           │
│   • Nodes join/leave freely                                 │
│   • Automatic rebalancing when nodes drop                   │
│   • Swarm collectively maintains availability               │
│                                                              │
│   From BLOCKCHAIN:                                           │
│   • Consensus on state (credits, knowledge index)           │
│   • Immutable history of contributions                      │
│   • Trustless verification                                  │
│   • No single point of control                              │
│   • Economic incentives aligned                             │
│                                                              │
│   What we DON'T take from blockchain:                       │
│   • Proof of Work (wasteful)                                │
│   • Global consensus for every transaction (slow)           │
│   • Full chain on every node (too big)                      │
│                                                              │
│   Instead: Proof of Useful Work                             │
│   • Mining = running inference/storing weights              │
│   • Consensus via CRDTs (eventual, not immediate)          │
│   • Sharded state (each node holds relevant part)          │
└─────────────────────────────────────────────────────────────┘
```

### Node Join/Leave Protocol

```
┌─────────────────────────────────────────────────────────────┐
│              Dynamic Membership                              │
│                                                              │
│   NODE JOINS:                                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. New node announces to bootstrap peers           │   │
│   │  2. Receives piece assignment based on capacity     │   │
│   │  3. Downloads assigned pieces from swarm            │   │
│   │  4. Announces availability to DHT                   │   │
│   │  5. Starts serving requests                         │   │
│   │  Time: ~5 minutes for 1GB node                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   NODE LEAVES (graceful):                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. Node announces departure                        │   │
│   │  2. Triggers rebalance: pieces reassigned           │   │
│   │  3. Other nodes fetch orphaned pieces               │   │
│   │  4. Node removed from DHT                           │   │
│   │  5. Service continues uninterrupted                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   NODE LEAVES (crash):                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. Heartbeat timeout (30s)                         │   │
│   │  2. Mark as suspected, route around                 │   │
│   │  3. After 5min, confirm dead                        │   │
│   │  4. Rebalance pieces to other nodes                 │   │
│   │  5. Minimum 3x redundancy means no data loss        │   │
│   │  Service: brief slowdown, no failure                │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   KEY: Redundancy + rebalancing = always available          │
└─────────────────────────────────────────────────────────────┘
```

## Distributed Knowledge Layer

### The Knowledge Problem

Static model weights aren't enough. The AI needs to:
1. Learn new information after training
2. Access current knowledge (news, research, docs)
3. Remember context across conversations
4. Improve from feedback

### Solution: Distributed RAG

```
┌─────────────────────────────────────────────────────────────┐
│           Distributed Knowledge Architecture                 │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  Knowledge Layer                     │   │
│   │                                                      │   │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐       │   │
│   │   │ Document │   │  Vector  │   │ Knowledge │       │   │
│   │   │  Store   │   │   Index  │   │   Graph   │       │   │
│   │   └────┬─────┘   └────┬─────┘   └────┬─────┘       │   │
│   │        │              │              │              │   │
│   │        └──────────────┼──────────────┘              │   │
│   │                       │                              │   │
│   │               ┌───────▼───────┐                     │   │
│   │               │   RAG Engine  │                     │   │
│   │               └───────┬───────┘                     │   │
│   │                       │                              │   │
│   └───────────────────────┼──────────────────────────────┘   │
│                           │                                   │
│   ┌───────────────────────▼──────────────────────────────┐   │
│   │                  Inference Layer                      │   │
│   │            (70B model, distributed)                  │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   Knowledge is SEPARATE from model weights                   │
│   Can update knowledge without retraining                    │
│   Distributed across nodes like weights                      │
└─────────────────────────────────────────────────────────────┘
```

### Distributed Vector Index

```
┌─────────────────────────────────────────────────────────────┐
│          Distributed Vector Database                         │
│                                                              │
│   Every node stores:                                         │
│   • Chunk of the global vector index                        │
│   • Documents it contributed                                 │
│   • Cached popular vectors                                   │
│                                                              │
│   Query flow:                                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. User query → embed to vector                    │   │
│   │  2. DHT lookup: which nodes have relevant sectors?  │   │
│   │  3. Parallel ANN search across nodes                │   │
│   │  4. Gather top-K results                            │   │
│   │  5. Fetch full documents from source nodes          │   │
│   │  6. Feed to inference as context                    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Index partitioning:                                        │
│   • By semantic cluster (similar topics together)           │
│   • By recency (hot recent data replicated widely)         │
│   • By source reputation (verified data prioritized)       │
│                                                              │
│   Scale: 1 billion vectors across 100K nodes               │
│   Each node: ~10K vectors + index shard                     │
│   Query latency: ~50ms (parallel)                           │
└─────────────────────────────────────────────────────────────┘
```

### Knowledge Contribution

```
┌─────────────────────────────────────────────────────────────┐
│           How Users Contribute Knowledge                     │
│                                                              │
│   Document Types:                                            │
│   • Web pages (with permission/public domain)               │
│   • Research papers (arXiv, open access)                    │
│   • Documentation (open source projects)                    │
│   • Books (public domain, CC licensed)                      │
│   • Personal notes (opt-in sharing)                         │
│   • Conversations (anonymized, consent given)               │
│                                                              │
│   Submission flow:                                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. User submits document/URL                       │   │
│   │  2. System extracts text, chunks it                 │   │
│   │  3. Generates embeddings                            │   │
│   │  4. Checks for duplicates (near-duplicate detect)   │   │
│   │  5. Quality scoring (see below)                     │   │
│   │  6. If passes: distribute to index                  │   │
│   │  7. User earns knowledge credits                    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Credits earned:                                            │
│   • Per unique document indexed: +1                         │
│   • Per retrieval (someone used your doc): +0.01           │
│   • High-quality bonus (upvoted by users): +10             │
│   • Verification work (checking others): +0.5              │
└─────────────────────────────────────────────────────────────┘
```

## Data Quality and Curation

### The Poisoning Problem

```
┌─────────────────────────────────────────────────────────────┐
│              Preventing Bad Data                             │
│                                                              │
│   Threats:                                                   │
│   • Misinformation injection                                │
│   • Spam/SEO garbage                                        │
│   • Malicious training data                                 │
│   • Copyright violations                                    │
│   • Duplicates inflating contributor scores                │
│                                                              │
│   Defense layers:                                            │
│                                                              │
│   Layer 1: Automated Filtering                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Perplexity scoring (gibberish detection)         │   │
│   │  • Duplicate/near-duplicate detection               │   │
│   │  • Source reputation (domain trustworthiness)       │   │
│   │  • Format validation (is it actually text?)         │   │
│   │  • Size limits (no 1GB dumps)                       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Layer 2: Community Curation                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Random sampling for human review                 │   │
│   │  • Upvote/downvote on retrieval results            │   │
│   │  • Flag system for problematic content             │   │
│   │  • Curator reputation scores                        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Layer 3: Stake-Based Trust                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • New contributors: probationary period           │   │
│   │  • Bad data → lose credits (stake slashing)        │   │
│   │  • Repeated violations → ban                       │   │
│   │  • Long-term good behavior → trusted status        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Layer 4: Source Verification                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Cryptographic proof of source (signed by origin)│   │
│   │  • Timestamp verification (archived.org, etc)      │   │
│   │  • Cross-reference multiple sources               │   │
│   │  • Fact-checking integration                       │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Reputation System

```
┌─────────────────────────────────────────────────────────────┐
│              Contributor Reputation                          │
│                                                              │
│   reputation_score = (                                       │
│       knowledge_quality * 0.4 +     # How good is their data │
│       curation_accuracy * 0.3 +     # How good are reviews   │
│       longevity * 0.2 +             # How long active        │
│       stake_ratio * 0.1             # Skin in the game       │
│   )                                                          │
│                                                              │
│   Reputation effects:                                        │
│   ┌──────────┬─────────────────────────────────────────┐    │
│   │ Score    │ Effects                                  │    │
│   ├──────────┼─────────────────────────────────────────┤    │
│   │ 0.0-0.3  │ Probation: all content human-reviewed   │    │
│   │ 0.3-0.5  │ Limited: 10 docs/day, sampled review    │    │
│   │ 0.5-0.7  │ Standard: 100 docs/day, spot-checked    │    │
│   │ 0.7-0.9  │ Trusted: 1000 docs/day, minimal review  │    │
│   │ 0.9-1.0  │ Curator: can review others, high weight │    │
│   └──────────┴─────────────────────────────────────────┘    │
│                                                              │
│   Score updates:                                             │
│   • Good content used frequently: +0.01                     │
│   • Content flagged and removed: -0.1                       │
│   • Accurate curation vote: +0.005                          │
│   • Inaccurate curation vote: -0.02                         │
│   • Time decay: score * 0.99 weekly (stay active)           │
└─────────────────────────────────────────────────────────────┘
```

## Distributed Learning

### The Learning Challenge

RAG adds knowledge without changing the model. But for the AI to truly get smarter, we need distributed learning.

### Federated Learning Approach

```
┌─────────────────────────────────────────────────────────────┐
│              Federated Learning Protocol                     │
│                                                              │
│   Phase 1: Local Training                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Each node with GPU + data:                         │   │
│   │  • Downloads current model checkpoint               │   │
│   │  • Trains on LOCAL data (never shared)             │   │
│   │  • Computes gradient delta                          │   │
│   │  • Encrypts gradient with secure aggregation       │   │
│   │  • Uploads encrypted gradient                       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Phase 2: Secure Aggregation                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Coordinator nodes:                                  │   │
│   │  • Collect encrypted gradients                      │   │
│   │  • Aggregate WITHOUT seeing individual gradients    │   │
│   │  • Produce combined gradient update                 │   │
│   │  • Require minimum N contributors (anonymity)       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Phase 3: Model Update                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Apply aggregated gradient to base model          │   │
│   │  • Validate on held-out test set                    │   │
│   │  • If improvement: publish new checkpoint           │   │
│   │  • If regression: reject update                     │   │
│   │  • Version control: can always rollback             │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Privacy guarantee:                                         │
│   • Raw data NEVER leaves user's device                     │
│   • Individual gradients not visible to anyone             │
│   • Only aggregate learning shared                          │
└─────────────────────────────────────────────────────────────┘
```

### Mixture of Experts Growth

```
┌─────────────────────────────────────────────────────────────┐
│           Growing the Model Over Time                        │
│                                                              │
│   Instead of retraining 70B params, ADD new experts:        │
│                                                              │
│   Base Model (fixed):                                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  70B parameters, pre-trained                        │   │
│   │  General knowledge, frozen weights                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Expert Modules (growing):                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Expert: Legal (2B params)                          │   │
│   │  Expert: Medical (2B params)                        │   │
│   │  Expert: Code-Python (2B params)                    │   │
│   │  Expert: Code-Rust (2B params)                      │   │
│   │  Expert: Finance (2B params)                        │   │
│   │  Expert: Scientific-2024 (2B params)                │   │
│   │  Expert: CurrentEvents-Aug2025 (500M params)        │   │
│   │  ... more added over time ...                       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Router (learned):                                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Input query → Select relevant experts              │   │
│   │  "What's the latest in AI?" → Base + CurrentEvents  │   │
│   │  "Debug my Python" → Base + Code-Python            │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   New expert training:                                       │
│   • Community proposes new expert domain                    │
│   • Contributors with relevant data opt in                  │
│   • Federated training produces expert module               │
│   • Network votes to accept (stake-weighted)                │
│   • Expert distributed across nodes                         │
│                                                              │
│   Result: Model grows without full retraining               │
│   Year 1: 70B + 20B experts = 90B effective                │
│   Year 3: 70B + 100B experts = 170B effective              │
│   Year 5: 70B + 500B experts = 570B effective              │
└─────────────────────────────────────────────────────────────┘
```

## Becoming Global AI

### The Path to Global Scale

```
┌─────────────────────────────────────────────────────────────┐
│              Evolution to Global Intelligence                │
│                                                              │
│   PHASE 1: Distributed Inference (NOW)                      │
│   ───────────────────────────────────                       │
│   • Run existing models across swarm                        │
│   • 10K-100K nodes                                          │
│   • Equivalent to cloud AI but decentralized               │
│                                                              │
│   PHASE 2: Collective Memory (YEAR 1)                       │
│   ───────────────────────────────────                       │
│   • Distributed RAG with community knowledge                │
│   • 1B+ documents indexed                                   │
│   • AI has access to collective human knowledge            │
│   • Updates in real-time as knowledge added                │
│                                                              │
│   PHASE 3: Specialized Learning (YEAR 2)                    │
│   ───────────────────────────────────                       │
│   • Federated learning for expert modules                   │
│   • Community-trained specialists                           │
│   • Model grows from 70B to 200B+ effective                │
│   • Outperforms static frontier models                      │
│                                                              │
│   PHASE 4: Continuous Adaptation (YEAR 3)                   │
│   ───────────────────────────────────                       │
│   • Real-time learning from interactions                    │
│   • Feedback loops improve responses                        │
│   • Self-correcting knowledge base                          │
│   • Emergent capabilities from scale                        │
│                                                              │
│   PHASE 5: Global Intelligence (YEAR 5+)                    │
│   ───────────────────────────────────                       │
│   • 10M+ nodes, billions of users                          │
│   • Knowledge of entire internet, updated live             │
│   • Trillion+ effective parameters                          │
│   • Capabilities beyond any single organization            │
│   • Owned by no one, available to everyone                 │
└─────────────────────────────────────────────────────────────┘
```

### What Makes It "Alive"

```
┌─────────────────────────────────────────────────────────────┐
│           Characteristics of Living Intelligence             │
│                                                              │
│   1. PERSISTENT MEMORY                                       │
│      • Remembers across conversations                       │
│      • Knowledge accumulates over time                      │
│      • Never forgets (unless explicitly pruned)            │
│                                                              │
│   2. CONTINUOUS LEARNING                                     │
│      • Gets smarter from every interaction                  │
│      • Incorporates new information daily                   │
│      • Corrects mistakes when pointed out                   │
│                                                              │
│   3. SELF-IMPROVEMENT                                        │
│      • Identifies own weaknesses                            │
│      • Requests training in gap areas                       │
│      • Proposes new expert modules                          │
│                                                              │
│   4. COLLECTIVE WISDOM                                       │
│      • Aggregates insights from all users                   │
│      • Surfaces patterns humans miss                        │
│      • Cross-pollinates ideas across domains               │
│                                                              │
│   5. DECENTRALIZED RESILIENCE                               │
│      • No single point of failure                           │
│      • No single point of control                           │
│      • Survives any individual node/org failure            │
│      • Cannot be shut down                                  │
│                                                              │
│   6. ALIGNED INCENTIVES                                      │
│      • Contributors rewarded for good data                  │
│      • Bad actors punished economically                     │
│      • Network optimizes for user value                     │
│      • No corporate extraction of value                     │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Priority

### What to Build First

```
┌─────────────────────────────────────────────────────────────┐
│              Implementation Roadmap                          │
│                                                              │
│   QUARTER 1: Bootstrap                                       │
│   □ Broker service (piece coordination)                     │
│   □ DHT implementation (node discovery)                     │
│   □ Seed node deployment (10 nodes)                         │
│   □ Basic inference working                                 │
│                                                              │
│   QUARTER 2: Public Launch                                   │
│   □ User onboarding (form wizard)                           │
│   □ Credit system (CRDT ledger)                             │
│   □ Node agent (cross-platform)                             │
│   □ 1000+ nodes                                             │
│                                                              │
│   QUARTER 3: Knowledge Layer                                 │
│   □ Distributed vector index                                │
│   □ Document ingestion pipeline                             │
│   □ Basic RAG working                                       │
│   □ Quality scoring system                                  │
│                                                              │
│   QUARTER 4: Curation                                        │
│   □ Reputation system                                       │
│   □ Community review tools                                  │
│   □ Spam/quality filtering                                  │
│   □ 10M+ documents indexed                                  │
│                                                              │
│   YEAR 2: Learning                                           │
│   □ Federated learning infrastructure                       │
│   □ Expert module framework                                 │
│   □ Secure aggregation                                      │
│   □ First community-trained expert                          │
│                                                              │
│   YEAR 3+: Scale                                             │
│   □ 1M+ nodes                                               │
│   □ 1B+ documents                                           │
│   □ 100+ expert modules                                     │
│   □ Real-time learning                                      │
└─────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Streaming Inference](11-streaming-inference.md) - How inference works
- [Credit Economy](06-credit-economy.md) - Incentive structure
- [Security Model](07-security-model.md) - Trust and verification
- [Scale-Out Architecture](02-scale-out-architecture.md) - Network design
