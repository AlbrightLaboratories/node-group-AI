# Scale-Out Architecture

How node-group-AI scales to millions of nodes and users.

## Design Goals

| Metric | Target | Rationale |
|--------|--------|-----------|
| Nodes | 10,000,000+ | Global GPU pool |
| Users | 100,000,000+ | Consumer + enterprise |
| Tasks/sec | 1,000,000+ | Real-time inference at scale |
| Latency (p99) | <100ms | Interactive use cases |
| Availability | 99.9% | Production workloads |

## Hierarchical Topology

Flat mesh doesn't scale. A million-node full mesh would require 500 billion connections. Instead, we use a hierarchical topology that limits connection count at each layer.

```
                         ┌─────────────────┐
                         │  Global Router  │ ← DNS/Anycast (stateless)
                         │   (Cloudflare)  │
                         └────────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
   │ Region  │              │ Region  │              │ Region  │
   │  AMER   │              │  EMEA   │              │  APAC   │
   │ (3 zones)│             │ (4 zones)│             │ (3 zones)│
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
   ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
   │  Zone   │              │  Zone   │              │  Zone   │
   │us-west-1│              │eu-west-1│              │ap-east-1│
   │(100 SN) │              │(100 SN) │              │(100 SN) │
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
   ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
   │SuperNode│              │SuperNode│              │SuperNode│
   │ Cluster │              │ Cluster │              │ Cluster │
   │(1K nodes)│             │(1K nodes)│             │(1K nodes)│
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
   ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
   │  Leaf   │              │  Leaf   │              │  Leaf   │
   │  Nodes  │              │  Nodes  │              │  Nodes  │
   └─────────┘              └─────────┘              └─────────┘
```

## Layer Specifications

### Layer 1: Global Router
- **Implementation**: Cloudflare Workers + Anycast DNS
- **Instances**: 1 logical (300+ edge locations)
- **Responsibility**: Route users to nearest region
- **State**: Stateless (reads from KV for region health)
- **Failure mode**: Automatic failover via DNS

### Layer 2: Regional Coordinators
- **Implementation**: Kubernetes StatefulSet
- **Instances**: 10 regions globally
- **Responsibility**:
  - Zone membership management
  - Cross-zone task routing
  - Regional credit aggregation
- **Connections**: Full mesh (45 connections)
- **Heartbeat**: 10 seconds
- **Failure mode**: Region fails over to neighbors

### Layer 3: Zone Managers
- **Implementation**: Kubernetes StatefulSet
- **Instances**: ~100 zones (10 per region average)
- **Responsibility**:
  - SuperNode election
  - Intra-zone load balancing
  - Local task queue
- **Connections**: 10 per zone (to regional coordinator + peers)
- **Heartbeat**: 5 seconds
- **Failure mode**: Zone fails over to regional coordinator

### Layer 4: SuperNodes
- **Implementation**: Node agent with elevated privileges
- **Instances**: ~10,000 globally (100 per zone)
- **Responsibility**:
  - DHT participation (Kademlia)
  - Leaf node registration
  - Task routing to leaf nodes
- **Connections**: ~20 DHT peers + ~100 leaf nodes
- **Heartbeat**: 1 second (DHT), 5 seconds (leaf)
- **Election**: Top 1% by uptime/bandwidth/GPU

### Layer 5: Leaf Nodes
- **Implementation**: Node agent
- **Instances**: 10,000,000+ target
- **Responsibility**:
  - Task execution
  - Resource reporting
  - Credit earning
- **Connections**: 1 SuperNode + 5 gossip peers
- **Heartbeat**: 30 seconds
- **Failure mode**: Reconnect to different SuperNode

## Scaling Math

### Connection Overhead

| Layer | Nodes | Connections Each | Total Connections |
|-------|-------|------------------|-------------------|
| Regional | 10 | 9 (full mesh) | 45 |
| Zone | 100 | 10 | 500 |
| SuperNode | 10,000 | 120 | 600,000 |
| Leaf | 10,000,000 | 6 | 30,000,000 |
| **Total** | | | **~30.6M** |

Compare to flat mesh: 10M nodes × 10M nodes / 2 = **50 trillion connections**

### Heartbeat Traffic

| Layer | Nodes | Heartbeat | Size | Traffic/sec |
|-------|-------|-----------|------|-------------|
| Regional | 10 | 10s | 1KB | 1 KB/s |
| Zone | 100 | 5s | 1KB | 20 KB/s |
| SuperNode | 10,000 | 1s | 500B | 5 MB/s |
| Leaf | 10,000,000 | 30s | 200B | 67 MB/s |
| **Total** | | | | **~72 MB/s** |

Manageable even at 10M nodes.

## Node Churn

Expect 1% of nodes to join/leave per hour at scale = 100,000 changes/hour = 28 changes/second.

### Handling Churn
1. **Lazy removal**: Nodes marked "suspect" after 3 missed heartbeats, removed after 5
2. **SuperNode buffers**: Each SuperNode caches 2x expected leaf count
3. **DHT rebalancing**: Kademlia handles churn naturally via k-bucket updates
4. **Task retry**: Failed tasks automatically rerouted to healthy nodes

## Task Routing at Scale

### Hot Path (< 10ms)
1. Request hits edge (Cloudflare Worker)
2. Worker checks local cache for model location
3. If cached: direct route to SuperNode
4. SuperNode routes to available leaf

### Cold Path (< 100ms)
1. Request hits edge
2. Cache miss → query Zone Manager
3. Zone Manager queries DHT for model
4. DHT returns SuperNode list
5. Route to nearest SuperNode with capacity

### Task Distribution
```
┌─────────────────────────────────────────────────────────────┐
│                    Task Distribution                         │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Inference│    │ Training │    │  Batch   │              │
│  │  (90%)   │    │   (5%)   │    │   (5%)   │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Spread  │    │ Colocate │    │  Queue   │              │
│  │ (latency)│    │(bandwidth)│   │(throughput)│             │
│  └──────────┘    └──────────┘    └──────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Failure Domains

### Blast Radius Containment

| Failure | Impact | Recovery |
|---------|--------|----------|
| Leaf node | 1 task | Instant retry |
| SuperNode | ~100 tasks | 5s reconnect |
| Zone | ~10K tasks | 30s failover |
| Region | ~1M tasks | 2min DNS failover |
| Global router | Full outage | 5min Cloudflare failover |

### Partition Tolerance
- Regions can operate independently during partition
- Cross-region tasks queue until connectivity restored
- Credits reconcile via CRDT merge when partition heals

## Capacity Planning

### Year 1 Target
- 100,000 nodes
- 10 zones (3 regions)
- 1,000 SuperNodes

### Year 3 Target
- 1,000,000 nodes
- 50 zones (5 regions)
- 10,000 SuperNodes

### Year 5 Target
- 10,000,000 nodes
- 100 zones (10 regions)
- 100,000 SuperNodes

## Related Documentation

- [Node Discovery](04-node-discovery.md) - DHT implementation details
- [Task Routing](05-task-routing.md) - Scheduling algorithms
- [Credit Economy](06-credit-economy.md) - Distributed ledger design
