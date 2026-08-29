# Node Discovery

How nodes find each other in a network of millions.

## The Problem

At 10 million nodes, naive approaches fail:
- **Central registry**: Single point of failure, bottleneck
- **Full mesh**: 50 trillion connections (impossible)
- **Broadcast**: Network flood (impossible)

## The Solution: Hierarchical DHT

We combine a Kademlia-style DHT with hierarchical clustering:

```
┌─────────────────────────────────────────────────────────────┐
│                      Discovery Layers                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Global DHT Ring                       │   │
│  │    SuperNodes participate, O(log n) lookups          │   │
│  │    10,000 nodes, ~14 hops max                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SuperNode Clusters                       │   │
│  │    Each SuperNode tracks ~1,000 leaf nodes           │   │
│  │    Direct registration, 1 hop                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Gossip Peer Groups                       │   │
│  │    Leaf nodes share state with ~5 neighbors          │   │
│  │    Local awareness, 0 hops                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Kademlia DHT

### Node IDs
Each node has a 256-bit ID derived from:
```
node_id = SHA256(public_key || region || timestamp)
```

### XOR Distance
Distance between nodes is XOR of their IDs:
```
distance(A, B) = A XOR B
```

This creates a metric space where:
- `distance(A, A) = 0`
- `distance(A, B) = distance(B, A)`
- `distance(A, B) + distance(B, C) >= distance(A, C)`

### K-Buckets
Each SuperNode maintains k-buckets (k=20):
```
bucket[0]: nodes where distance starts with 0b1...     (farthest)
bucket[1]: nodes where distance starts with 0b01...
bucket[2]: nodes where distance starts with 0b001...
...
bucket[255]: nodes where distance starts with 0b0...01 (closest)
```

Each bucket holds up to k=20 nodes, preferring long-lived nodes.

### Lookup Algorithm
To find a node or value:

```python
def lookup(target_id):
    # Start with k closest nodes from our buckets
    closest = self.find_closest(target_id, k=20)
    queried = set()

    while True:
        # Query alpha=3 nodes in parallel
        to_query = [n for n in closest if n not in queried][:3]
        if not to_query:
            break

        for node in to_query:
            queried.add(node)
            # Ask each node for their closest to target
            new_nodes = node.find_node(target_id)
            closest = merge_closest(closest, new_nodes, target_id, k=20)

    return closest[0]  # Closest node to target
```

Complexity: O(log n) network hops for n nodes.

## SuperNode Election

SuperNodes are elected from the top 1% of nodes by score:

```python
score = (
    uptime_ratio * 0.4 +           # % time online last 30 days
    bandwidth_score * 0.3 +        # Normalized throughput
    gpu_capability * 0.2 +         # Normalized GPU power
    reliability_score * 0.1        # Task completion rate
)
```

### Election Process
1. Zone Manager collects scores from all nodes
2. Top 1% are marked SuperNode-eligible
3. Eligible nodes participate in DHT ring
4. Demotion occurs if score drops below threshold for 24 hours

### SuperNode Responsibilities
- Participate in global DHT
- Track up to 1,000 leaf nodes
- Route tasks to leaf nodes
- Aggregate health metrics
- Cache hot model locations

## Leaf Node Registration

When a leaf node joins:

```
Leaf Node                SuperNode               DHT
    │                        │                     │
    │  1. Bootstrap          │                     │
    │  (DNS seed list)       │                     │
    │───────────────────────►│                     │
    │                        │                     │
    │  2. Register           │                     │
    │  {node_id, caps, IP}   │                     │
    │───────────────────────►│                     │
    │                        │                     │
    │                        │ 3. Store in DHT     │
    │                        │ (async, for lookup) │
    │                        │────────────────────►│
    │                        │                     │
    │  4. Confirm + Peers    │                     │
    │  {ok, gossip_peers}    │                     │
    │◄───────────────────────│                     │
    │                        │                     │
    │  5. Join gossip        │                     │
    │  (p2p with peers)      │                     │
    │═══════════════════════►│                     │
```

### Bootstrap Seeds
Initial SuperNode discovery via:
1. **DNS**: `_supernodes.node-group.ai` TXT records
2. **Hardcoded**: Fallback list in agent binary
3. **Cache**: Previously connected SuperNodes

## Gossip Protocol

Leaf nodes gossip with ~5 peers for:
- Local network health
- Peer capability updates
- Fast failure detection

### SWIM-style Failure Detection
```
Every 1 second:
    target = random_peer()
    if ping(target) fails:
        # Indirect probe via k=3 other peers
        for peer in random_sample(peers, k=3):
            if peer.ping(target) succeeds:
                return  # target is alive

        # Mark suspect
        mark_suspect(target)
        broadcast_suspect(target)

Every 5 seconds:
    for node in suspect_list:
        if now - node.suspect_time > 15s:
            mark_dead(node)
            notify_supernode(node)
```

### Gossip Message Types

| Type | Payload | Purpose |
|------|---------|---------|
| PING | `{from, seq}` | Liveness check |
| PONG | `{from, seq}` | Liveness response |
| SUSPECT | `{node_id, reporter}` | Failure suspicion |
| DEAD | `{node_id, confirmer}` | Confirmed failure |
| JOIN | `{node_id, caps}` | New node announcement |
| UPDATE | `{node_id, caps}` | Capability change |

## Capability Indexing

Nodes are indexed by capability for efficient task routing:

```
Capability Index (per SuperNode):
├── gpu_model
│   ├── rtx_4090: [node1, node2, ...]
│   ├── a100: [node3, node4, ...]
│   └── h100: [node5, ...]
├── vram_gb
│   ├── 24: [node1, node2, ...]
│   ├── 40: [node3, ...]
│   └── 80: [node4, node5, ...]
├── models_loaded
│   ├── llama-3.3-70b: [node3, node4, ...]
│   ├── qwen-72b: [node5, ...]
│   └── mistral-7b: [node1, node2, ...]
└── availability
    ├── idle: [node1, node5, ...]
    ├── light: [node2, node3, ...]
    └── busy: [node4, ...]
```

### Index Updates
- Leaf → SuperNode: Every 30 seconds
- SuperNode → Zone: Every 5 minutes (aggregated)
- Zone → Region: Every 15 minutes (summary)

## Lookup Examples

### Find Node by ID
```python
# Task needs specific node (e.g., resume a job)
node = dht.lookup(node_id)
# O(log n) = ~14 hops for 10M nodes via SuperNodes
```

### Find Nodes by Capability
```python
# Task needs A100 with 40GB+ VRAM
candidates = supernode.query({
    "gpu": "a100",
    "vram_min": 40,
    "status": ["idle", "light"]
})
# O(1) - local index lookup at SuperNode
```

### Find Nodes with Model
```python
# Inference task needs llama-3.3-70b already loaded
candidates = supernode.query({
    "models_loaded": "llama-3.3-70b",
    "status": "idle"
})
# O(1) - local index lookup, avoids cold start
```

## Failure Scenarios

### SuperNode Failure
1. Leaf nodes detect via missed heartbeat (3x)
2. Leaf nodes query bootstrap seeds for new SuperNode
3. Re-register with new SuperNode
4. DHT self-heals via k-bucket refresh

### Zone Partition
1. Zones continue operating independently
2. Cross-zone tasks queue
3. Regional coordinator detects partition
4. Reroutes cross-zone traffic via other paths

### Mass Churn Event
1. DHT rebalancing kicks in automatically
2. SuperNode promotion fills gaps
3. Task retry handles in-flight failures
4. System stabilizes in ~5 minutes

## Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| Node lookup | 50-200ms | 14 hops × 10ms RTT |
| Capability query | 1-5ms | Local SuperNode index |
| Registration | 100ms | SuperNode + async DHT |
| Gossip round | 1s | 5 peers parallel |
| Failure detection | 15-30s | SWIM protocol |

## Related Documentation

- [Scale-Out Architecture](02-scale-out-architecture.md) - Topology overview
- [Task Routing](05-task-routing.md) - How tasks find nodes
- [Security Model](07-security-model.md) - Node authentication
