# Distributed Inference: What Works

How node-group-AI handles frontier models across a global network.

## The Core Challenge

Frontier models (70B+ parameters) require:
- **140GB** for FP16 weights
- **35-48GB** for INT4/INT8 quantized
- **Microsecond latency** for traditional tensor parallelism

Internet latency is **50-200ms** — 100,000x too slow for naive model splitting.

## What Doesn't Work

### Tensor Parallelism Across WAN

Traditional TP splits matrix operations across GPUs. Each forward pass requires:
- AllReduce after every attention layer
- AllReduce after every MLP layer
- For 70B model: ~160 synchronization points per token

```
Per-token latency with WAN tensor parallelism:
= 160 sync points × 100ms RTT
= 16 seconds per token
= Completely unusable
```

**Verdict**: Not viable for WAN deployment.

## What Actually Works

### Strategy 1: Model Replication (Primary)

Each capable node hosts a complete copy of the model.

```
┌─────────────────────────────────────────────────────────────┐
│                    Model Replication                         │
│                                                              │
│  User in San Francisco requests llama-3.3-70b               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Model Location Index                    │    │
│  │                                                      │    │
│  │  llama-3.3-70b-NVFP4 (35GB):                        │    │
│  │    us-west-1: [node_a (idle), node_b (busy)]        │    │
│  │    us-east-1: [node_c (idle)]                       │    │
│  │    eu-west-1: [node_d (idle), node_e (idle)]        │    │
│  │    ap-east-1: [node_f (busy)]                       │    │
│  │                                                      │    │
│  │  Route to: node_a (same region, idle)               │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  node_a processes request locally                           │
│  Latency: 20ms network + 500ms inference = 520ms           │
└─────────────────────────────────────────────────────────────┘
```

**Requirements**:
- Nodes need 48GB+ VRAM for 70B models
- A100 (40/80GB), H100 (80GB), or multi-GPU consumer setups
- Model pre-loaded for fast response (avoid cold start)

**Economics**:
- 70B model fits on: A100-40GB (INT4), A100-80GB (INT8), H100 (FP8)
- Consumer: 2× RTX 4090 (48GB total) or 3× RTX 3090 (72GB)
- Smaller models (7B-13B) fit on single RTX 3080+

### Strategy 2: Expert Parallelism (MoE Models)

Mixture of Experts models activate only 2-4 experts per token, enabling true distribution.

**Supported Models**:
- Mixtral 8x7B, 8x22B
- DeepSeek-V2, V3
- Qwen3-MoE
- Grok-1

```
┌─────────────────────────────────────────────────────────────┐
│                  Expert Distribution                         │
│                                                              │
│  Mixtral 8x22B: 8 experts, 2 active per token               │
│                                                              │
│  Node Distribution:                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Node A (us-west): Expert 0, Expert 1               │    │
│  │  Node B (us-east): Expert 2, Expert 3               │    │
│  │  Node C (eu-west): Expert 4, Expert 5               │    │
│  │  Node D (ap-east): Expert 6, Expert 7               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Token "quantum" → Router: Expert 3 + Expert 7              │
│                                                              │
│  ┌──────────┐                                               │
│  │Embeddings│ (on coordinator)                              │
│  └────┬─────┘                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐     ┌──────────┐                              │
│  │ Node B   │     │ Node D   │  (parallel)                  │
│  │ Expert 3 │     │ Expert 7 │                              │
│  └────┬─────┘     └────┬─────┘                              │
│       │                │                                     │
│       └───────┬────────┘                                    │
│               ▼                                              │
│  ┌──────────────────┐                                       │
│  │ Combine + Output │                                       │
│  └──────────────────┘                                       │
│                                                              │
│  Latency per token: ~150ms (1.5 round trips average)        │
│  Throughput: ~6-7 tokens/second                             │
│  Quality: Full model quality, no approximation              │
└─────────────────────────────────────────────────────────────┘
```

**Trade-offs**:
- Latency: 100-200ms per token (vs 20ms local)
- Good for: Batch processing, async tasks, non-chat
- Not for: Real-time streaming chat

### Strategy 3: Speculative Decoding

Run small draft model locally, verify with large model remotely.

```
┌─────────────────────────────────────────────────────────────┐
│               Speculative Decoding Flow                      │
│                                                              │
│  Your GPU (RTX 4090, 24GB)           Remote (A100, 80GB)    │
│  ┌────────────────────────┐         ┌────────────────────┐  │
│  │  Draft: Llama 3.3 8B   │         │ Verify: Llama 70B  │  │
│  │                        │         │                    │  │
│  │  Step 1: Generate 8    │         │                    │  │
│  │  candidate tokens      │         │                    │  │
│  │  (fast, 20ms)          │────────►│ Step 2: Verify all │  │
│  │                        │         │ 8 in one batch     │  │
│  │                        │         │ (100ms round-trip) │  │
│  │                        │◄────────│                    │  │
│  │  Step 3: Accept 6/8    │         │ Returns: accept 6  │  │
│  │  (typical acceptance)  │         │ reject 2, correct  │  │
│  └────────────────────────┘         └────────────────────┘  │
│                                                              │
│  Result:                                                     │
│  - 6 tokens verified in 120ms total                         │
│  - 50 tokens/second effective throughput                    │
│  - Full 70B quality on outputs                              │
│  - Only requires 8B model locally (fits any RTX 3080+)      │
└─────────────────────────────────────────────────────────────┘
```

**Requirements**:
- Local: Any 8GB+ GPU for draft model
- Remote: 48GB+ GPU for verifier
- Same model family (Llama draft + Llama verify)

**Performance**:
- 3-5x throughput improvement over pure remote
- Quality identical to large model (verification step)
- Latency varies with acceptance rate

### Strategy 4: Pipeline Parallelism (Batch Mode)

Split model layers across nodes, pipeline batches through.

```
┌─────────────────────────────────────────────────────────────┐
│            Pipeline Parallelism for Batch Jobs               │
│                                                              │
│  70B Model: 80 transformer layers                           │
│  Split: 27 + 27 + 26 layers across 3 nodes                  │
│                                                              │
│  ┌──────────┐   100ms   ┌──────────┐   100ms   ┌──────────┐│
│  │ Stage 1  │──────────►│ Stage 2  │──────────►│ Stage 3  ││
│  │Layers 0-26│          │Layers27-53│          │Layers54-80││
│  │ Node A   │          │ Node B   │          │ Node C   ││
│  │ 16GB     │          │ 16GB     │          │ 16GB     ││
│  └──────────┘          └──────────┘          └──────────┘│
│       ▲                                            │       │
│       │              Pipeline Fill                 │       │
│       │                                            ▼       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Batch 1 ────────► Batch 1 ────────► Batch 1 ──►OUT │   │
│  │  Batch 2 ────────► Batch 2 ────────► Batch 2 ──►OUT │   │
│  │  Batch 3 ────────► Batch 3 ────────► Batch 3 ──►OUT │   │
│  │  ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Single request: 300ms (3 × 100ms hops)                     │
│  Batch of 32: 300ms + 31 × 10ms = 610ms total               │
│  Throughput: 52 requests/second (pipeline full)             │
└─────────────────────────────────────────────────────────────┘
```

**Best For**:
- Embeddings (batch thousands of documents)
- Summarization (batch articles)
- Data processing (no real-time requirement)
- Training gradient computation

**Not For**:
- Interactive chat (300ms per token too slow)

### Strategy 5: Hierarchical Routing (Hybrid)

Combine strategies based on request type and available resources.

```
┌─────────────────────────────────────────────────────────────┐
│                  Request Router                              │
│                                                              │
│  Incoming Request                                            │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Classify Request                     │   │
│  └───────────┬──────────────┬───────────────┬───────────┘   │
│              │              │               │                │
│      Chat/Stream      Batch/Async      Training             │
│              │              │               │                │
│              ▼              ▼               ▼                │
│  ┌───────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Model Replica │ │   Pipeline   │ │  Gradient    │       │
│  │ or Speculative│ │  Parallelism │ │ Aggregation  │       │
│  │   Decoding    │ │              │ │              │       │
│  └───────┬───────┘ └──────┬───────┘ └──────┬───────┘       │
│          │                │                │                 │
│          ▼                ▼                ▼                 │
│  Low latency         High throughput   Distributed          │
│  (<100ms/tok)        (async OK)        (hours OK)           │
└─────────────────────────────────────────────────────────────┘
```

## Node Requirements by Strategy

| Strategy | Min VRAM | Latency | Throughput | Use Case |
|----------|----------|---------|------------|----------|
| Replication | 48GB | 20ms/tok | High | Chat, real-time |
| MoE Expert | 12GB/expert | 150ms/tok | Medium | Batch, async |
| Speculative | 8GB (draft) | 25ms/tok | High | Chat with local GPU |
| Pipeline | 16GB/stage | 300ms/tok | High (batch) | Embeddings, processing |

## Consumer GPU Participation

Users with smaller GPUs (RTX 3080, 4070, etc.) can still participate:

| GPU | VRAM | Can Run |
|-----|------|---------|
| RTX 3080 | 10GB | 7B-13B models, MoE experts, speculative draft |
| RTX 3090 | 24GB | 13B-34B models, MoE experts, pipeline stages |
| RTX 4090 | 24GB | 13B-34B models, MoE experts, pipeline stages |
| 2× RTX 4090 | 48GB | 70B INT4, full replication |
| A100 40GB | 40GB | 70B INT4, full replication |
| A100 80GB | 80GB | 70B FP8, full replication |
| H100 80GB | 80GB | 70B+ FP8, full replication |

## Implementation in node-group-AI

### Task Submission with Strategy Hint

```python
from node_group_ai import Client

client = Client()

# Real-time chat: will use replication or speculative
response = client.inference(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Hello"}],
    mode="realtime"  # Forces low-latency path
)

# Batch processing: can use pipeline parallelism
results = client.batch_inference(
    model="llama-3.3-70b",
    prompts=["Summarize: ...", "Summarize: ...", ...],
    mode="throughput"  # Optimizes for batch, latency OK
)

# Async with callback
job = client.async_inference(
    model="mixtral-8x22b",
    messages=[{"role": "user", "content": "Write a novel..."}],
    callback_url="https://my-app.com/webhook"
)
```

### Node Configuration for Participation

```yaml
# ~/.node-group-ai/config.yaml
node:
  name: "my-4090"

gpu:
  devices: [0]
  vram: 24GB

participation:
  # What roles this node can play
  roles:
    - speculative_draft      # Run 8B draft models
    - moe_expert             # Host MoE experts
    - pipeline_stage         # Pipeline parallelism stage
    - small_model_replica    # Full 7B-13B models

  # Models to keep loaded
  preload:
    - llama-3.3-8b           # For speculative drafting
    - mixtral-expert-3       # MoE expert shard
```

## Latency Targets

| Mode | Target | Strategy |
|------|--------|----------|
| Real-time chat | <100ms first token | Replication + local cache |
| Assisted chat | <200ms first token | Speculative decoding |
| Batch inference | <1s per item | Pipeline parallelism |
| Async jobs | Minutes OK | Any available capacity |

## Related Documentation

- [Scale-Out Architecture](02-scale-out-architecture.md) - Network topology
- [Task Routing](05-task-routing.md) - How requests find nodes
- [Node Discovery](04-node-discovery.md) - Model location tracking
