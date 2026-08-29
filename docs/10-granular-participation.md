# Granular Participation: 1GB to 8GB Nodes

How nodes with minimal resources contribute to frontier model inference.

## The Challenge

Not everyone has an A100. Real-world GPU availability:

| Tier | VRAM | Example Hardware | % of Users |
|------|------|------------------|------------|
| Minimal | 1-2 GB | Laptop iGPU, old cards, limited allocation | 20% |
| Low | 3-4 GB | GTX 1050, laptop GPUs | 25% |
| Medium | 6-8 GB | GTX 1060, RTX 3050, RTX 4060 | 30% |
| Good | 10-12 GB | RTX 3080, RTX 4070 | 15% |
| High | 16-24 GB | RTX 3090, RTX 4090 | 8% |
| Datacenter | 40-80 GB | A100, H100 | 2% |

**If we require 48GB minimum, we exclude 98% of potential contributors.**

## Byte-Level Model Decomposition

### Weight Matrix Sharding

A 70B model is composed of weight matrices. Each matrix can be sharded:

```
┌─────────────────────────────────────────────────────────────┐
│           Weight Matrix Decomposition                        │
│                                                              │
│   Attention Q-projection (8192 × 8192 = 134 MB FP16)        │
│                                                              │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐        │
│   │Shard│Shard│Shard│Shard│Shard│Shard│Shard│Shard│        │
│   │  0  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │        │
│   │1024 │1024 │1024 │1024 │1024 │1024 │1024 │1024 │        │
│   │cols │cols │cols │cols │cols │cols │cols │cols │        │
│   │     │     │     │     │     │     │     │     │        │
│   │16MB │16MB │16MB │16MB │16MB │16MB │16MB │16MB │        │
│   │     │     │     │     │     │     │     │     │        │
│   │NodeA│NodeB│NodeC│NodeD│NodeE│NodeF│NodeG│NodeH│        │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘        │
│                                                              │
│   Each 1GB node can hold ~60 shards (60 × 16MB)             │
│   70B model ≈ 8,400 shards (at 16MB each)                   │
│   Minimum nodes needed: 140 (at 1GB each)                    │
└─────────────────────────────────────────────────────────────┘
```

### Column-Parallel Matrix Multiplication

When weights are sharded by columns, computation distributes naturally:

```
┌─────────────────────────────────────────────────────────────┐
│         Distributed Matrix Multiplication                    │
│                                                              │
│   Input activations: X (batch × 8192)                       │
│   Weight matrix: W (8192 × 8192), sharded by columns        │
│                                                              │
│   X × W = X × [W₀ | W₁ | W₂ | ... | W₇]                    │
│         = [X×W₀ | X×W₁ | X×W₂ | ... | X×W₇]                │
│                                                              │
│   ┌──────────┐                                              │
│   │  Input X │ (broadcast to all nodes)                     │
│   └────┬─────┘                                              │
│        │                                                     │
│   ┌────┴────┬────────┬────────┬────────┐                   │
│   ▼         ▼        ▼        ▼        ▼                    │
│ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐               │
│ │Node0│  │Node1│  │Node2│  │Node3│  │Node4│  ...          │
│ │X×W₀ │  │X×W₁ │  │X×W₂ │  │X×W₃ │  │X×W₄ │               │
│ └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘               │
│    │        │        │        │        │                    │
│    └────────┴────────┼────────┴────────┘                    │
│                      ▼                                       │
│              ┌──────────────┐                               │
│              │  Concatenate │                               │
│              │   Results    │                               │
│              └──────────────┘                               │
│                                                              │
│   Each node only needs memory for:                          │
│   • Its weight shard (16MB)                                 │
│   • Input activations (small, ~KB)                          │
│   • Output partial result (small, ~KB)                      │
│                                                              │
│   Total per node: ~20MB active memory!                      │
└─────────────────────────────────────────────────────────────┘
```

## Participation Tiers

### Tier 1: Weight Storage (1GB minimum)

Nodes act as distributed model storage. They don't compute, just serve weights.

```
┌─────────────────────────────────────────────────────────────┐
│              Distributed Model CDN                           │
│                                                              │
│   1GB Node contribution:                                     │
│   • Stores ~60 weight shards (16MB each)                    │
│   • Serves shards to compute nodes on demand                │
│   • Earns credits for storage + bandwidth                   │
│                                                              │
│   Inference request arrives:                                 │
│   1. Coordinator identifies needed shards                    │
│   2. Fetches from storage nodes in parallel                 │
│   3. Compute node receives, processes, returns              │
│                                                              │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │Storage 1│ │Storage 2│ │Storage 3│ │Storage 4│          │
│   │ 1GB     │ │ 1GB     │ │ 1GB     │ │ 1GB     │          │
│   │Shards   │ │Shards   │ │Shards   │ │Shards   │          │
│   │ 0-59    │ │ 60-119  │ │120-179  │ │180-239  │          │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│        │           │           │           │                │
│        └───────────┴─────┬─────┴───────────┘                │
│                          ▼                                   │
│                   ┌────────────┐                            │
│                   │  Compute   │                            │
│                   │   Node     │                            │
│                   │  (8GB+)    │                            │
│                   └────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Tier 2: Micro-Compute (3-4GB)

Nodes can compute on their own shards, returning partial results.

```
┌─────────────────────────────────────────────────────────────┐
│             Micro-Compute Participation                      │
│                                                              │
│   3GB Node:                                                  │
│   • Stores weight shards (~180 shards)                      │
│   • Performs partial matmul on those shards                 │
│   • Returns partial results to coordinator                  │
│                                                              │
│   Memory budget (3GB):                                       │
│   • Weight shards: 2.5 GB                                   │
│   • Activation buffer: 256 MB                               │
│   • Output buffer: 256 MB                                   │
│   • Overhead: ~100 MB                                       │
│                                                              │
│   For one transformer layer:                                 │
│   • Receives: input activations (batch × hidden_dim)        │
│   • Computes: partial Q, K, V, or MLP output               │
│   • Returns: partial result                                 │
│                                                              │
│   10 nodes × 3GB = 30GB model capacity                      │
│   25 nodes × 3GB = 75GB model capacity (70B fits!)         │
└─────────────────────────────────────────────────────────────┘
```

### Tier 3: Layer Compute (6-8GB)

Nodes can handle complete layers or attention heads.

```
┌─────────────────────────────────────────────────────────────┐
│              Layer-Level Participation                       │
│                                                              │
│   8GB Node:                                                  │
│   • Hosts 1-2 complete transformer layers                   │
│   • Or 4-8 attention heads                                  │
│   • Full local computation, no partial results              │
│                                                              │
│   70B model: 80 layers × ~1.7GB each (INT4)                │
│   8GB node: ~4 layers                                       │
│   20 nodes × 8GB = 160GB = full model with redundancy      │
│                                                              │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │ Node A  │ │ Node B  │ │ Node C  │ │ Node D  │  ...     │
│   │Layers   │ │Layers   │ │Layers   │ │Layers   │          │
│   │ 0-3     │ │ 4-7     │ │ 8-11    │ │ 12-15   │          │
│   │  8GB    │ │  8GB    │ │  8GB    │ │  8GB    │          │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│        │           │           │           │                │
│        ▼           ▼           ▼           ▼                │
│   Pipeline: input → A → B → C → D → ... → output           │
└─────────────────────────────────────────────────────────────┘
```

## Extreme Quantization for Tiny Nodes

### 1-Bit and 2-Bit Models

Recent research (BitNet, 1-bit LLMs) shows extreme quantization is viable:

```
┌─────────────────────────────────────────────────────────────┐
│           Extreme Quantization Levels                        │
│                                                              │
│   Llama 70B at different precisions:                        │
│                                                              │
│   FP16:  140 GB  (baseline)                                 │
│   INT8:   70 GB  (1.0 bytes/param)                          │
│   INT4:   35 GB  (0.5 bytes/param)                          │
│   INT3:   26 GB  (0.375 bytes/param)                        │
│   INT2:   17.5 GB (0.25 bytes/param)                        │
│   1-bit:  8.75 GB (0.125 bytes/param)                       │
│                                                              │
│   With 1-bit quantization:                                  │
│   • 8GB node can hold ENTIRE 70B model                      │
│   • 1GB node can hold ~8B parameters (meaningful chunk)     │
│   • Quality loss ~5-10% (acceptable for many uses)          │
│                                                              │
│   Ternary weights (-1, 0, +1):                              │
│   • 1.58 bits/param                                         │
│   • 70B = 13.8 GB                                           │
│   • Better quality than pure 1-bit                          │
└─────────────────────────────────────────────────────────────┘
```

### Mixed Precision Ensemble

Combine outputs from multiple quantization levels:

```
┌─────────────────────────────────────────────────────────────┐
│           Mixed Precision Ensemble                           │
│                                                              │
│   Same prompt sent to multiple precision versions:          │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│   │   1-bit     │   │   2-bit     │   │   4-bit     │      │
│   │   8.75GB    │   │   17.5GB    │   │   35GB      │      │
│   │  (1GB node) │   │  (3GB node) │   │  (8GB node) │      │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘      │
│          │                 │                 │              │
│          ▼                 ▼                 ▼              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Ensemble Combiner                       │  │
│   │  • Weighted average of logits                       │  │
│   │  • Higher precision gets more weight                │  │
│   │  • Final output quality ≈ 8-bit equivalent          │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                              │
│   Result: Full model quality from nodes that can't          │
│   individually run it                                        │
└─────────────────────────────────────────────────────────────┘
```

## KV Cache Distribution

For long context, KV cache dominates memory. Distribute it:

```
┌─────────────────────────────────────────────────────────────┐
│              KV Cache Distribution                           │
│                                                              │
│   128K context window:                                       │
│   • KV cache size: 128K × 80 layers × 2 (K+V) × 8192 dim   │
│   • Per token: 1.3 MB                                       │
│   • Full context: 167 GB (!!)                               │
│                                                              │
│   Without distribution: impossible on consumer hardware     │
│   With distribution: split across many nodes                │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                    KV Cache Ring                     │  │
│   │                                                      │  │
│   │   Token 0-1K    Token 1K-2K   Token 2K-3K   ...    │  │
│   │   ┌─────────┐   ┌─────────┐   ┌─────────┐          │  │
│   │   │ Node A  │   │ Node B  │   │ Node C  │          │  │
│   │   │  1.3GB  │   │  1.3GB  │   │  1.3GB  │          │  │
│   │   └─────────┘   └─────────┘   └─────────┘          │  │
│   │                                                      │  │
│   │   Attention computation:                             │  │
│   │   • Current token queries all KV nodes              │  │
│   │   • Each node returns attention over its range      │  │
│   │   • Coordinator combines                             │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                              │
│   100 × 1GB nodes = 100GB KV cache = 75K context!          │
└─────────────────────────────────────────────────────────────┘
```

## Computation at the Byte Level

### Bit-Serial Computation

For 1-bit weights, computation simplifies dramatically:

```
┌─────────────────────────────────────────────────────────────┐
│            Bit-Serial Matrix Multiplication                  │
│                                                              │
│   Traditional (FP16):                                        │
│   y = Σ(x_i × w_i)  // multiply-accumulate, expensive       │
│                                                              │
│   1-bit weights (w ∈ {-1, +1}):                             │
│   y = Σ(x_i × w_i)                                          │
│     = Σ(x_i where w_i=+1) - Σ(x_i where w_i=-1)            │
│     = popcount(x AND w) - popcount(x AND NOT w)            │
│                                                              │
│   This is just XNOR + popcount!                             │
│   • 64 weights processed in single 64-bit operation        │
│   • 10-100x faster than FP16 matmul                        │
│   • Even CPUs can do this efficiently                       │
│   • 1GB node can process meaningful chunks                  │
│                                                              │
│   ┌───────────────────────────────────────────────────┐    │
│   │  1GB Node Processing:                              │    │
│   │  • Load 1GB of 1-bit weights (8B parameters!)     │    │
│   │  • XNOR with input activations                     │    │
│   │  • Popcount result                                 │    │
│   │  • Return partial sum                              │    │
│   │  • Throughput: millions of params/second on CPU   │    │
│   └───────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Sparse Activation

Most activations are zero or near-zero. Exploit this:

```
┌─────────────────────────────────────────────────────────────┐
│              Sparse Activation Exploitation                  │
│                                                              │
│   Observation: In transformer MLPs, ~90% of activations     │
│   are effectively zero after ReLU/GELU                      │
│                                                              │
│   Dense computation: y = W × x   (all elements)             │
│   Sparse computation: y = W[:, nonzero(x)] × x[nonzero]    │
│                                                              │
│   If only 10% of x is nonzero:                              │
│   • 10x less computation                                    │
│   • 10x less weight data needed                             │
│   • 1GB node can handle 10x more effective parameters       │
│                                                              │
│   Implementation:                                            │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  1. Coordinator computes which activations nonzero  │  │
│   │  2. Sends sparse indices to relevant weight-holders │  │
│   │  3. Each node computes only for its nonzero columns │  │
│   │  4. Results gathered and summed                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                              │
│   Memory per node: only weights for active columns          │
│   ~100-500MB per node can contribute meaningfully           │
└─────────────────────────────────────────────────────────────┘
```

## Protocol: Minimal Node Participation

### Registration with Resource Limits

```yaml
# Node with 2GB allocation
node:
  name: "laptop-contribution"
  resource_limits:
    gpu_memory: 2GB      # Hard limit
    cpu_memory: 4GB
    bandwidth: 100Mbps
    compute_hours: 8     # Only contribute while working

participation:
  mode: granular
  roles:
    - weight_storage     # Store 2GB of weight shards
    - micro_compute      # Compute partial matmuls
    - kv_cache_segment   # Store part of context cache

  # Which shards this node will host
  shard_assignment: auto  # Let coordinator assign
```

### Shard Assignment Protocol

```
┌─────────────────────────────────────────────────────────────┐
│              Dynamic Shard Assignment                        │
│                                                              │
│   Node joins with 1GB allocation:                           │
│                                                              │
│   1. Register with zone coordinator                         │
│      → "I have 1GB, 100Mbps, available 8hrs/day"           │
│                                                              │
│   2. Coordinator assigns shards based on:                   │
│      • Geographic locality (nearby nodes = related shards)  │
│      • Redundancy (each shard on 3+ nodes)                 │
│      • Load balancing (hot shards spread out)              │
│                                                              │
│   3. Node downloads assigned shards:                        │
│      → Shards 4521-4580 of llama-70b-1bit                  │
│      → ~60 × 16MB = 960MB                                  │
│                                                              │
│   4. Node ready to serve:                                   │
│      • Storage requests for shards 4521-4580               │
│      • Compute requests for partial matmul on those shards │
│                                                              │
│   5. On inference request:                                  │
│      → Coordinator routes shard requests to this node      │
│      → Node computes partial result                        │
│      → Returns to coordinator for aggregation              │
└─────────────────────────────────────────────────────────────┘
```

## Latency Analysis

### Granular Distribution Overhead

```
┌─────────────────────────────────────────────────────────────┐
│           Latency Breakdown: 100 × 1GB Nodes                 │
│                                                              │
│   70B model, 1-bit quantization = 8.75GB                    │
│   Split across 100 nodes (87.5MB each)                      │
│                                                              │
│   Per-token inference:                                       │
│                                                              │
│   1. Broadcast activations to all nodes:     5ms            │
│      (parallel, limited by slowest)                         │
│                                                              │
│   2. Local compute at each node:             2ms            │
│      (1-bit matmul is fast)                                 │
│                                                              │
│   3. Gather partial results:                 5ms            │
│      (parallel reduction tree)                              │
│                                                              │
│   4. Coordinator combines:                   1ms            │
│                                                              │
│   Total per token: ~13ms                                    │
│   Throughput: ~75 tokens/second                             │
│                                                              │
│   Compare to single A100: 50ms/token = 20 tok/s             │
│   Distributed 1GB nodes: FASTER (with enough nodes)!        │
└─────────────────────────────────────────────────────────────┘
```

### Network Requirements

```
Per inference request:
• Activation broadcast: 8KB × 100 nodes = 800KB
• Result gather: 8KB × 100 nodes = 800KB
• Total: 1.6MB per token

At 75 tokens/second:
• Bandwidth: 120 MB/s = 960 Mbps

Per 1GB node:
• Download: 8KB per token = 600 KB/s = 5 Mbps
• Upload: 8KB per token = 600 KB/s = 5 Mbps
• Total: 10 Mbps (easily achievable)
```

## Credit Economics for Small Nodes

| Contribution | Memory | Credits/Hour |
|--------------|--------|--------------|
| Weight storage | 1GB | +0.5 |
| Weight storage | 3GB | +1.5 |
| Micro-compute | 1GB | +1.0 |
| Micro-compute | 3GB | +3.0 |
| Layer compute | 8GB | +8.0 |
| Full model | 48GB | +10.0 |

**Key insight**: Many small nodes can collectively earn as much as one large node, democratizing participation.

## Summary: How 1GB Helps Run 70B

```
┌─────────────────────────────────────────────────────────────┐
│                    The 1GB Contribution                      │
│                                                              │
│   70B model at 1-bit = 8.75GB                               │
│   Split into 8,750 × 1MB shards                             │
│                                                              │
│   Your 1GB node:                                             │
│   • Stores 1,000 shards (1GB)                               │
│   • That's 11% of the model                                 │
│   • When your shards needed for inference:                  │
│     1. Receive 8KB activation vector                        │
│     2. XNOR with your 1GB of weights (1-bit)               │
│     3. Popcount → partial result (8KB)                      │
│     4. Send back                                            │
│   • Time: 2ms compute + 10ms network = 12ms                │
│   • You contributed to a 70B inference!                     │
│                                                              │
│   9 more nodes like you = full model coverage               │
│   With redundancy: 30 × 1GB nodes = fault-tolerant 70B     │
└─────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Distributed Inference](09-distributed-inference.md) - Higher-level strategies
- [Scale-Out Architecture](02-scale-out-architecture.md) - Network design
- [Credit Economy](06-credit-economy.md) - Earnings for small nodes
