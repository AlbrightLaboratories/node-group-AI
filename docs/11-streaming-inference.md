# Streaming Inference: The Torrent Model

The model doesn't need to "exist" anywhere. The swarm IS the model.

## The Mental Shift

### Old Thinking (Wrong)
```
"We need to fit 70B parameters somewhere"
"Minimum 35GB VRAM required"
"Small nodes can't participate"
```

### New Thinking (Right)
```
"We need to FLOW weights through computation"
"Only need current layer in memory"
"Any node can stream any piece"
```

## How Netflix Streams a Movie

```
┌─────────────────────────────────────────────────────────────┐
│                    Netflix Model                             │
│                                                              │
│   You have: 100MB buffer                                     │
│   Movie is: 4GB                                              │
│                                                              │
│   You don't download 4GB first.                              │
│   You stream what you need, when you need it.                │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Timeline: ═══════════════════════════════════════  │   │
│   │            ▲                                        │   │
│   │            │ You are here                           │   │
│   │            │                                        │   │
│   │  Buffer:   [███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │   │
│   │            └─100MB─┘                                │   │
│   │                     └── Streaming ahead ──┘         │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   • Current frame: in memory                                │
│   • Next 30 seconds: buffering                             │
│   • Rest of movie: on CDN, fetched on demand               │
│   • Adaptive quality: 4K if fast, 720p if slow             │
└─────────────────────────────────────────────────────────────┘
```

## How BitTorrent Shares a File

```
┌─────────────────────────────────────────────────────────────┐
│                   BitTorrent Model                           │
│                                                              │
│   File: 4GB, split into 4000 × 1MB pieces                   │
│                                                              │
│   No single peer has everything.                            │
│   The swarm collectively IS the file.                       │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Peer A: ██░░██░░░░██░░░░░░░░██░░░░░░░░░░          │   │
│   │  Peer B: ░░██░░██░░░░░░██░░░░░░██░░░░░░░░          │   │
│   │  Peer C: ░░░░░░░░██░░██░░██░░░░░░██░░░░██          │   │
│   │  Peer D: ░░░░██░░░░██░░░░░░██░░░░░░░░██░░          │   │
│   │  ─────────────────────────────────────────          │   │
│   │  Swarm:  ██████████████████████████████████ = 100%  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   • Pieces download from multiple peers simultaneously      │
│   • Rarest pieces prioritized                              │
│   • Each peer uploads what they have                       │
│   • No central server needed                               │
└─────────────────────────────────────────────────────────────┘
```

## Applying This to Neural Networks

### Key Realization: Inference is Sequential

```
┌─────────────────────────────────────────────────────────────┐
│           Transformer Inference is a STREAM                 │
│                                                              │
│   Input token                                                │
│       │                                                      │
│       ▼                                                      │
│   ┌─────────┐                                               │
│   │ Layer 0 │ ← Only need layer 0 weights RIGHT NOW         │
│   └────┬────┘                                               │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────┐                                               │
│   │ Layer 1 │ ← Now need layer 1, can FORGET layer 0        │
│   └────┬────┘                                               │
│        │                                                     │
│        ▼                                                     │
│       ...                                                    │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────┐                                               │
│   │Layer 79 │ ← Only need layer 79 now                      │
│   └────┬────┘                                               │
│        │                                                     │
│        ▼                                                     │
│   Output token                                               │
│                                                              │
│   At ANY moment: only 1 layer needed in memory!             │
│   70B model, 80 layers = 875MB per layer (INT4)             │
│   Minimum memory: ~1GB (current + prefetch)                 │
└─────────────────────────────────────────────────────────────┘
```

### The Streaming Protocol

```
┌─────────────────────────────────────────────────────────────┐
│              Weight Streaming Pipeline                       │
│                                                              │
│   Time ──────────────────────────────────────────────►      │
│                                                              │
│   Network:  [L0]──[L1]──[L2]──[L3]──[L4]──[L5]──►          │
│              │     │     │     │     │     │                │
│              ▼     ▼     ▼     ▼     ▼     ▼                │
│   Memory:   ┌───────────────────────────────────┐           │
│             │ [L0][L1]                          │ t=0       │
│             │     [L1][L2]                      │ t=1       │
│             │         [L2][L3]                  │ t=2       │
│             │             [L3][L4]              │ t=3       │
│             └───────────────────────────────────┘           │
│                                                              │
│   Compute:       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            │
│                  ▲L0  ▲L1  ▲L2  ▲L3  ▲L4                   │
│                                                              │
│   Only 2 layers in memory at once!                          │
│   Stream next layer while computing current                 │
│   Evict old layer to make room                              │
└─────────────────────────────────────────────────────────────┘
```

## The Swarm Architecture

### Model Weights as Torrent Pieces

```
┌─────────────────────────────────────────────────────────────┐
│           Model as Distributed Torrent                       │
│                                                              │
│   70B INT4 = 35GB = 35,000 × 1MB pieces                     │
│                                                              │
│   Piece map:                                                 │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Layer 0:  pieces 0-437     (437MB)                   │  │
│   │ Layer 1:  pieces 438-874   (437MB)                   │  │
│   │ Layer 2:  pieces 875-1311  (437MB)                   │  │
│   │ ...                                                   │  │
│   │ Layer 79: pieces 34563-34999 (437MB)                 │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   Swarm distribution:                                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Node A (500MB): pieces 0-500                       │   │
│   │  Node B (500MB): pieces 200-700                     │   │
│   │  Node C (500MB): pieces 500-1000                    │   │
│   │  Node D (1GB):   pieces 800-1800                    │   │
│   │  ...                                                 │   │
│   │  Node Z (2GB):   pieces 33000-35000                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Every piece exists on 3+ nodes (redundancy)               │
│   Pieces overlap (like torrent for availability)            │
│   No single node has everything                             │
│   Swarm collectively IS the model                           │
└─────────────────────────────────────────────────────────────┘
```

### Inference Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Streaming Inference Request                     │
│                                                              │
│   User: "Explain quantum computing"                          │
│                                                              │
│   Compute node (can be ANYONE with 1GB free):               │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Step 1: Need Layer 0 weights                        │   │
│   │                                                      │   │
│   │  Tracker lookup: "Who has pieces 0-437?"            │   │
│   │  Response: [Node A, Node B, Node M, Node Q]         │   │
│   │                                                      │   │
│   │  Parallel fetch:                                     │   │
│   │    Node A: pieces 0-150    ───┐                     │   │
│   │    Node B: pieces 151-300  ───┼──► Layer 0 weights  │   │
│   │    Node M: pieces 301-400  ───┤                     │   │
│   │    Node Q: pieces 401-437  ───┘                     │   │
│   │                                                      │   │
│   │  Time: max(piece_transfer_times) ≈ 50ms             │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Step 2: Compute Layer 0, prefetch Layer 1          │   │
│   │                                                      │   │
│   │  GPU: matmul(activations, layer_0_weights)          │   │
│   │                                                      │   │
│   │  Simultaneously:                                     │   │
│   │    Fetch pieces 438-874 from swarm                  │   │
│   │                                                      │   │
│   │  Compute time: 10ms                                  │   │
│   │  Fetch time: 50ms (overlapped)                      │   │
│   │  Effective time: 10ms (fetch hidden behind compute) │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Step 3: Evict Layer 0, compute Layer 1, fetch L2   │   │
│   │                                                      │   │
│   │  Memory: [Layer 1][Layer 2 prefetch]                │   │
│   │  Layer 0 weights: discarded (can re-fetch if needed)│   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Continue for all 80 layers...                             │
│                                                              │
│   Total: 80 layers × 10ms compute = 800ms per token         │
│   (Network latency hidden behind computation)                │
└─────────────────────────────────────────────────────────────┘
```

## Adaptive Quality (Like Netflix)

### Bandwidth-Adaptive Precision

```
┌─────────────────────────────────────────────────────────────┐
│           Adaptive Precision Streaming                       │
│                                                              │
│   Like Netflix adjusts video quality to bandwidth,          │
│   we adjust model precision to network conditions:          │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Bandwidth    Precision    Quality    Layer Size    │   │
│   │  ─────────    ─────────    ───────    ──────────    │   │
│   │  1 Gbps       FP16         100%       1.75 GB       │   │
│   │  500 Mbps     INT8         98%        875 MB        │   │
│   │  200 Mbps     INT4         95%        437 MB        │   │
│   │  100 Mbps     INT2         90%        219 MB        │   │
│   │  50 Mbps      1-bit        85%        109 MB        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Protocol:                                                  │
│   1. Probe network speed to nearest piece holders           │
│   2. Select highest precision that streams fast enough      │
│   3. Adjust mid-inference if conditions change              │
│   4. Critical layers get priority (attention > MLP)         │
│                                                              │
│   Same model, different "resolution" based on connection    │
└─────────────────────────────────────────────────────────────┘
```

### Mixed Precision Per Layer

```
┌─────────────────────────────────────────────────────────────┐
│           Layer-Adaptive Precision                           │
│                                                              │
│   Not all layers equally important:                         │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Layer Type        Importance    Precision          │   │
│   │  ───────────       ──────────    ─────────          │   │
│   │  Embedding         High          INT8               │   │
│   │  Attention (Q,K)   Critical      INT8               │   │
│   │  Attention (V,O)   Medium        INT4               │   │
│   │  MLP (up proj)     Medium        INT4               │   │
│   │  MLP (gate)        Low           INT2               │   │
│   │  MLP (down proj)   Medium        INT4               │   │
│   │  Output head       High          INT8               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Result: 60% size reduction, 98% quality                   │
│   Stream high-precision for critical, low for rest          │
└─────────────────────────────────────────────────────────────┘
```

## Piece-Level Protocol

### Piece Format

```
┌─────────────────────────────────────────────────────────────┐
│                   Piece Structure                            │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  Header (64 bytes)                                   │  │
│   │  ├── model_hash: bytes32      (which model)         │  │
│   │  ├── piece_index: uint32      (which piece)         │  │
│   │  ├── layer: uint16            (which layer)         │  │
│   │  ├── tensor: uint16           (Q/K/V/O/up/gate/down)│  │
│   │  ├── row_start: uint32        (matrix row offset)   │  │
│   │  ├── row_count: uint32        (number of rows)      │  │
│   │  ├── precision: uint8         (FP16/INT8/INT4/etc)  │  │
│   │  ├── checksum: bytes32        (SHA256 of data)      │  │
│   │  └── signature: bytes64       (node signature)      │  │
│   ├──────────────────────────────────────────────────────│  │
│   │  Data (variable, typically 1MB)                      │  │
│   │  └── raw weight bytes in specified precision        │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   Verification:                                              │
│   • Checksum verifies data integrity                        │
│   • Signature verifies source authenticity                  │
│   • Bad pieces: blacklist source, re-fetch from another    │
└─────────────────────────────────────────────────────────────┘
```

### Piece Discovery (DHT)

```
┌─────────────────────────────────────────────────────────────┐
│              Piece Location via DHT                          │
│                                                              │
│   DHT Key: hash(model_id || piece_index)                    │
│   DHT Value: list of (node_id, last_seen, bandwidth)        │
│                                                              │
│   Lookup: "Who has piece 437 of llama-70b-int4?"            │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  DHT Response:                                       │   │
│   │  [                                                   │   │
│   │    {node: "A", region: "us-west", bw: 1Gbps},       │   │
│   │    {node: "B", region: "us-west", bw: 500Mbps},     │   │
│   │    {node: "C", region: "eu-west", bw: 200Mbps},     │   │
│   │    {node: "D", region: "ap-east", bw: 100Mbps}      │   │
│   │  ]                                                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Selection priority:                                        │
│   1. Same region (lowest latency)                           │
│   2. Highest bandwidth                                       │
│   3. Lowest current load                                     │
│   4. Reputation/reliability score                            │
│                                                              │
│   Fetch from multiple in parallel, cancel slowest           │
└─────────────────────────────────────────────────────────────┘
```

## The Minimal Node

### 100MB Contribution

Even 100MB can participate:

```
┌─────────────────────────────────────────────────────────────┐
│           100MB Node Contribution                            │
│                                                              │
│   What 100MB holds:                                          │
│   • 100 pieces of 1MB each                                  │
│   • ~1/350th of a 70B INT4 model                           │
│   • Roughly 23 rows of one weight matrix                    │
│                                                              │
│   How it helps:                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Request: "Need pieces 500-510 for layer 1"         │   │
│   │                                                      │   │
│   │  Your node:                                          │   │
│   │  • Receives request (100 bytes)                     │   │
│   │  • Serves pieces 500-510 (11MB)                     │   │
│   │  • Transfer time: 88ms at 1Gbps                     │   │
│   │                                                      │   │
│   │  You just contributed to a 70B inference!           │   │
│   │  Credit earned: proportional to bytes served        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   350 nodes × 100MB = full 70B model                        │
│   1000 nodes × 100MB = 3x redundancy                        │
│   Any node can contribute ANY amount                        │
└─────────────────────────────────────────────────────────────┘
```

### Micro-Compute Mode

If you have GPU but tiny VRAM:

```
┌─────────────────────────────────────────────────────────────┐
│           Micro-Compute: Stream-Process-Return               │
│                                                              │
│   Your resources: 500MB VRAM, decent GPU                    │
│                                                              │
│   Role: Compute partial results, don't store full layers    │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. Receive: activation slice (10KB)                │   │
│   │  2. Stream: weight slice (500MB) from swarm         │   │
│   │  3. Compute: partial matmul                         │   │
│   │  4. Return: partial result (10KB)                   │   │
│   │  5. Flush: discard weights (make room for next)     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Memory never exceeds 500MB:                                │
│   • Weights stream in, compute, stream out                  │
│   • Like a compute pipeline, not a storage unit             │
│   • GPU utilized, memory minimal                            │
│                                                              │
│   50 micro-compute nodes × 500MB = distributed GPU cluster  │
│   Each contributes compute, none needs full model           │
└─────────────────────────────────────────────────────────────┘
```

## Buffering and Prefetch

### Inference Buffering (Like Video Buffering)

```
┌─────────────────────────────────────────────────────────────┐
│              Inference Buffer Management                     │
│                                                              │
│   Like video player maintains buffer of future frames,      │
│   we maintain buffer of future layers:                      │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Memory Layout (2GB example):                        │   │
│   │                                                      │   │
│   │  ┌─────────┬─────────┬─────────┬─────────┐         │   │
│   │  │  L(n-1) │   L(n)  │  L(n+1) │  L(n+2) │         │   │
│   │  │ evicting│computing│prefetch │prefetch │         │   │
│   │  │  437MB  │  437MB  │  437MB  │  437MB  │         │   │
│   │  └─────────┴─────────┴─────────┴─────────┘         │   │
│   │                                                      │   │
│   │  Buffer state:                                       │   │
│   │  • L(n-1): being freed as L(n) computes             │   │
│   │  • L(n): actively computing                         │   │
│   │  • L(n+1): downloading from swarm (50% done)        │   │
│   │  • L(n+2): download starting                         │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Adaptive buffer size:                                      │
│   • Fast network: smaller buffer (1 layer ahead)            │
│   • Slow network: larger buffer (3-4 layers ahead)          │
│   • Adjust like Netflix adjusts video buffer                │
└─────────────────────────────────────────────────────────────┘
```

### Speculative Prefetch

```
┌─────────────────────────────────────────────────────────────┐
│              Speculative Prefetching                         │
│                                                              │
│   For autoregressive generation (multiple tokens):          │
│                                                              │
│   Token 1 generating:                                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Current: Layer 40 compute                          │   │
│   │  Prefetch: Layers 41-44 (for token 1)              │   │
│   │  Speculative: Layer 0-4 (for token 2)              │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   When token 1 finishes:                                     │
│   • Token 2's early layers already in memory                │
│   • Minimal delay between tokens                            │
│   • Streaming becomes nearly continuous                      │
│                                                              │
│   Network utilization stays high (always fetching)          │
│   GPU utilization stays high (always computing)             │
│   Latency hidden behind useful work                          │
└─────────────────────────────────────────────────────────────┘
```

## Failure Handling

### Piece Unavailable

```
┌─────────────────────────────────────────────────────────────┐
│              Handling Missing Pieces                         │
│                                                              │
│   Scenario: Need piece 437, primary source offline          │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. Primary fetch fails (timeout 100ms)             │   │
│   │  2. Immediate retry from secondary sources          │   │
│   │     (already knew about them from DHT)              │   │
│   │  3. If all sources fail, DHT re-lookup              │   │
│   │  4. If piece truly unavailable:                     │   │
│   │     a. Use lower precision version if available     │   │
│   │     b. Use interpolated/approximated weights        │   │
│   │     c. Skip and note degraded quality               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Recovery time: <200ms (barely noticeable)                 │
│   Graceful degradation: quality loss < piece loss           │
│                                                              │
│   Like Netflix: brief quality drop, not full stop           │
└─────────────────────────────────────────────────────────────┘
```

### Compute Node Failure

```
┌─────────────────────────────────────────────────────────────┐
│              Compute Node Failure Recovery                   │
│                                                              │
│   Scenario: Compute node fails mid-inference                │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  State checkpoints every N layers:                  │   │
│   │                                                      │   │
│   │  Layer 0  ──► Layer 10 ──► Layer 20 ──► ...        │   │
│   │              [checkpoint]  [checkpoint]             │   │
│   │                                                      │   │
│   │  Failure at layer 35:                               │   │
│   │  • Last checkpoint: layer 30                        │   │
│   │  • New compute node fetches checkpoint              │   │
│   │  • Resumes from layer 30 (not layer 0)             │   │
│   │  • Lost work: 5 layers (~50ms)                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Checkpoints stored in KV cache nodes (distributed)        │
│   Any compute node can resume any inference                 │
│   No single point of failure                                │
└─────────────────────────────────────────────────────────────┘
```

## Performance Analysis

### Bandwidth Requirements

```
┌─────────────────────────────────────────────────────────────┐
│           Bandwidth vs Inference Speed                       │
│                                                              │
│   70B INT4 = 35GB, 80 layers = 437MB per layer              │
│                                                              │
│   To hide network behind compute, need:                      │
│   layer_fetch_time < layer_compute_time                     │
│                                                              │
│   Layer compute time (GPU dependent):                        │
│   • A100: ~10ms per layer                                   │
│   • RTX 4090: ~15ms per layer                               │
│   • RTX 3080: ~25ms per layer                               │
│                                                              │
│   Required bandwidth to match:                               │
│   • A100: 437MB / 10ms = 43.7 GB/s (not realistic)         │
│   • RTX 4090: 437MB / 15ms = 29 GB/s (not realistic)       │
│                                                              │
│   Reality check: 1 Gbps = 125 MB/s = 3.5s per layer         │
│   Network WILL be the bottleneck.                           │
│                                                              │
│   Solutions:                                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  1. Aggressive quantization (1-bit = 109MB/layer)   │   │
│   │     At 1Gbps: 0.87s per layer (acceptable)          │   │
│   │                                                      │   │
│   │  2. Parallel fetch from multiple peers              │   │
│   │     10 peers × 100Mbps = 1Gbps aggregate            │   │
│   │     100 peers × 100Mbps = 10Gbps aggregate          │   │
│   │                                                      │   │
│   │  3. Local caching of hot layers                     │   │
│   │     First token slow, subsequent fast               │   │
│   │     (layers already cached from token 1)            │   │
│   │                                                      │   │
│   │  4. Regional proximity                               │   │
│   │     Same-datacenter peers: 10Gbps+                  │   │
│   │     Same-region peers: 1-10Gbps                     │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Realistic Performance Table

```
┌─────────────────────────────────────────────────────────────┐
│         Streaming Inference Performance                      │
│                                                              │
│   Scenario: 70B model, 80 layers                            │
│                                                              │
│   ┌──────────────┬──────────┬──────────┬─────────────────┐  │
│   │ Precision    │ Per-layer│ Bandwidth│ Token latency   │  │
│   ├──────────────┼──────────┼──────────┼─────────────────┤  │
│   │ FP16         │ 1.75GB   │ 1 Gbps   │ 14s (unusable)  │  │
│   │ INT8         │ 875MB    │ 1 Gbps   │ 7s (unusable)   │  │
│   │ INT4         │ 437MB    │ 1 Gbps   │ 3.5s (slow)     │  │
│   │ INT4         │ 437MB    │ 10 Gbps  │ 350ms (usable)  │  │
│   │ INT2         │ 219MB    │ 1 Gbps   │ 1.7s (batch OK) │  │
│   │ 1-bit        │ 109MB    │ 1 Gbps   │ 870ms (usable)  │  │
│   │ 1-bit        │ 109MB    │ 10 Gbps  │ 87ms (good!)    │  │
│   └──────────────┴──────────┴──────────┴─────────────────┘  │
│                                                              │
│   Key insight: 1-bit + parallel peers = viable streaming    │
│   10 peers × 1Gbps = 10Gbps aggregate = 87ms tokens        │
│   100 peers × 100Mbps = 10Gbps = 87ms tokens               │
└─────────────────────────────────────────────────────────────┘
```

## Summary: The Torrent Model for AI

```
┌─────────────────────────────────────────────────────────────┐
│                The New Mental Model                          │
│                                                              │
│   OLD: "Model lives on a server, you send requests"        │
│                                                              │
│   NEW: "Model IS the network. Weights flow like video.      │
│         Any node can compute. Any node can store.           │
│         The swarm collectively runs inference."              │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │   │
│   │    │100MB│ │500MB│ │ 1GB │ │ 2GB │ │ 8GB │        │   │
│   │    └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘        │   │
│   │       │       │       │       │       │            │   │
│   │       └───────┴───────┼───────┴───────┘            │   │
│   │                       │                             │   │
│   │               ┌───────▼───────┐                    │   │
│   │               │   70B MODEL   │                    │   │
│   │               │ (distributed) │                    │   │
│   │               └───────────────┘                    │   │
│   │                                                      │   │
│   │   No single node has everything.                    │   │
│   │   Every node has something.                         │   │
│   │   Together: unlimited scale.                        │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Granular Participation](10-granular-participation.md) - How small nodes contribute
- [Node Discovery](04-node-discovery.md) - DHT for piece location
- [Scale-Out Architecture](02-scale-out-architecture.md) - Network topology
