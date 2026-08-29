# Task Routing

How tasks find the right nodes in a network of millions.

## Routing Goals

| Goal | Target | Mechanism |
|------|--------|-----------|
| Latency | <100ms p99 | Locality-aware routing |
| Throughput | 1M+ tasks/sec | Distributed scheduling |
| Efficiency | >80% GPU util | Hot model caching |
| Fairness | Weighted queue | Credit-based priority |

## Task Lifecycle

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Submit  │───►│  Route  │───►│  Queue  │───►│ Execute │───►│ Return  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     │         DHT lookup     Fair scheduler  Container      Result
     │         + locality     + priority      + GPU          cache
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
   API           SuperNode        Zone          Leaf          Client
  Gateway                        Queue          Node
```

## Routing Strategies

### 1. Locality-Aware Routing

Tasks are routed to the nearest capable node:

```
User in San Francisco
         │
         ▼
┌─────────────────┐
│  Routing Score  │
│                 │
│  us-west-1: 95  │ ← Same region, 10ms RTT
│  us-west-2: 90  │ ← Adjacent zone, 20ms RTT
│  us-east-1: 60  │ ← Cross-country, 80ms RTT
│  eu-west-1: 30  │ ← Overseas, 150ms RTT
└─────────────────┘
         │
         ▼
    Route to us-west-1
```

### Score Calculation
```python
def routing_score(user_location, node):
    latency_score = 100 - (estimated_rtt_ms / 2)  # 0-100
    capacity_score = node.available_capacity * 100  # 0-100
    model_score = 50 if node.has_model_loaded else 0  # bonus

    return (
        latency_score * 0.4 +
        capacity_score * 0.4 +
        model_score * 0.2
    )
```

### 2. Model Affinity Routing

Prefer nodes that already have the model loaded:

```
Request: llama-3.3-70b inference
         │
         ▼
┌─────────────────────────────────────┐
│        Model Location Cache          │
│                                      │
│  llama-3.3-70b:                     │
│    us-west-1: [node_a, node_b]      │
│    us-east-1: [node_c]              │
│    eu-west-1: [node_d, node_e]      │
└─────────────────────────────────────┘
         │
         ▼
    Skip cold start, route to node_a
```

Cold start penalty: ~5 minutes for 70B model load. Model affinity avoids this.

### 3. Consistent Hashing for Stateful Tasks

For tasks that need affinity (training, long-running):

```
                    Hash Ring

        node_a ●─────────────● node_b
              /               \
             /                 \
            /                   \
    node_f ●                     ● node_c
            \                   /
             \                 /
              \               /
        node_e ●─────────────● node_d

    task_hash("training_job_123") → lands on node_c
    node_c fails → rehash to node_d (next clockwise)
```

### 4. Capability Matching

Tasks specify requirements, router finds matches:

```yaml
# Task requirements
task:
  type: inference
  model: llama-3.3-70b
  requirements:
    vram_min: 48GB
    gpu_arch: ["ampere", "hopper", "blackwell"]

# Router query
SELECT nodes WHERE
  vram >= 48GB AND
  gpu_arch IN ["ampere", "hopper", "blackwell"] AND
  status = "available" AND
  region = user_region
ORDER BY routing_score DESC
LIMIT 10
```

## Scheduling Algorithms

### Zone-Level Fair Scheduler

Each zone maintains a weighted fair queue:

```
┌─────────────────────────────────────────────────────┐
│                   Zone Task Queue                    │
│                                                      │
│  Priority Buckets (by credit balance):              │
│                                                      │
│  ┌─────────┐  Weight: 40%                           │
│  │  High   │  Users with 1000+ credits              │
│  │  Queue  │  [task1, task2, task3, ...]            │
│  └─────────┘                                        │
│                                                      │
│  ┌─────────┐  Weight: 35%                           │
│  │ Medium  │  Users with 100-999 credits            │
│  │  Queue  │  [task4, task5, ...]                   │
│  └─────────┘                                        │
│                                                      │
│  ┌─────────┐  Weight: 20%                           │
│  │   Low   │  Users with 1-99 credits               │
│  │  Queue  │  [task6, ...]                          │
│  └─────────┘                                        │
│                                                      │
│  ┌─────────┐  Weight: 5%                            │
│  │  Free   │  Users with 0 credits (rate limited)   │
│  │  Queue  │  [task7, ...]                          │
│  └─────────┘                                        │
└─────────────────────────────────────────────────────┘
```

### Weighted Round Robin
```python
def next_task():
    # Deficit counter scheduling
    for queue in [high, medium, low, free]:
        queue.deficit += queue.weight
        while queue.deficit >= 1 and queue.has_tasks():
            queue.deficit -= 1
            yield queue.pop()
```

### Priority Bidding

Users can bid extra credits for priority:

```python
# Normal submission
client.inference(model="llama-3.3-70b", prompt="...")
# Cost: 1 credit, priority: based on balance

# Priority submission
client.inference(model="llama-3.3-70b", prompt="...", priority_bid=10)
# Cost: 11 credits, jumps to front of queue
```

## Load Balancing

### SuperNode Load Distribution

Each SuperNode balances across its leaf nodes:

```
SuperNode receives task
         │
         ▼
┌─────────────────────────────────────┐
│      Leaf Node Selection            │
│                                      │
│  1. Filter by capability            │
│     [node1, node2, node3, node4]    │
│                                      │
│  2. Filter by availability          │
│     [node1, node3, node4]           │
│                                      │
│  3. Score by load + latency         │
│     node1: 85, node3: 72, node4: 90 │
│                                      │
│  4. Weighted random selection       │
│     Probabilities: [0.35, 0.25, 0.40] │
│                                      │
│  5. Select: node4                   │
└─────────────────────────────────────┘
```

### Spillover Routing

When a zone is overloaded:

```
Zone us-west-1: 95% capacity
         │
         ▼
Spillover threshold exceeded (90%)
         │
         ▼
Route 30% of new tasks to:
  - us-west-2 (20%)
  - us-central-1 (10%)
```

### Backpressure

If all zones are overloaded:

1. **Queue depth limit**: Reject new tasks if queue > 10,000
2. **Client retry**: 429 response with Retry-After header
3. **Admission control**: Rate limit by user tier

## Task Types

### Interactive (Inference)

```yaml
type: inference
latency_target: 100ms
retry: 2
timeout: 30s
routing: locality_first
```

- Route to nearest node with model loaded
- Fail fast, retry allowed
- Stream responses when possible

### Batch (Embeddings, Processing)

```yaml
type: batch
latency_target: none
retry: 3
timeout: 1h
routing: cost_optimized
```

- Route to cheapest available nodes
- Automatic chunking and parallelization
- Result aggregation at zone level

### Long-Running (Training, Fine-tuning)

```yaml
type: training
latency_target: none
retry: 0
timeout: 7d
routing: sticky
checkpoint_interval: 1h
```

- Consistent hash for node affinity
- Checkpoint storage in distributed cache
- Resume from checkpoint on failure

## Failure Handling

### Task Retry

```
Task fails on node_a
         │
         ▼
Retry count < max_retries?
         │
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
Reroute    Return error
to node_b  to client
```

### Speculative Execution

For latency-sensitive tasks:

```python
# Send to multiple nodes, take first response
async def speculative_execute(task, nodes):
    tasks = [node.execute(task) for node in nodes[:2]]
    done, pending = await asyncio.wait(
        tasks, return_when=asyncio.FIRST_COMPLETED
    )
    for p in pending:
        p.cancel()  # Cancel slower executions
    return done.pop().result()
```

### Circuit Breaker

Per-node circuit breaker prevents cascading failures:

```
Node failure rate > 50% in 1 minute
         │
         ▼
Circuit OPEN: stop routing to node
         │
         ▼
Wait 30 seconds
         │
         ▼
Circuit HALF-OPEN: send 1 probe task
         │
    ┌────┴────┐
    │ Success │ Failure
    ▼         ▼
CLOSED     OPEN (reset timer)
(resume)
```

## Monitoring

### Routing Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `route_latency_p99` | Time to select node | >50ms |
| `route_success_rate` | Tasks routed successfully | <99% |
| `spillover_rate` | Tasks routed cross-zone | >20% |
| `queue_depth` | Tasks waiting per zone | >5000 |
| `retry_rate` | Tasks requiring retry | >5% |

### Tracing

Each task carries a trace context:

```json
{
  "trace_id": "abc123",
  "spans": [
    {"name": "api_gateway", "duration_ms": 5},
    {"name": "routing", "duration_ms": 12},
    {"name": "queue_wait", "duration_ms": 45},
    {"name": "execution", "duration_ms": 230},
    {"name": "return", "duration_ms": 8}
  ],
  "total_ms": 300
}
```

## Related Documentation

- [Node Discovery](04-node-discovery.md) - How nodes are found
- [Credit Economy](06-credit-economy.md) - Priority based on credits
- [API Reference](08-api-reference.md) - Task submission API
