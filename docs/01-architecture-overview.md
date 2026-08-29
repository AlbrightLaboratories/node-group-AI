# Architecture Overview

node-group-AI is a decentralized GPU compute network that enables millions of users to pool their hardware into a collective intelligence mesh.

## Core Principles

1. **Self-service onboarding** - Users join via web form, not CLI
2. **Zero configuration** - AI prompts and templates are pre-configured
3. **Sovereignty** - Each node owner controls access to their resources
4. **Horizontal scale** - Architecture supports 10M+ nodes

## System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Layer                                │
│   Web Form → API Gateway → Task Submission → Results            │
├─────────────────────────────────────────────────────────────────┤
│                     Coordination Layer                           │
│   Global Router → Regional Coordinators → Zone Managers         │
├─────────────────────────────────────────────────────────────────┤
│                      Discovery Layer                             │
│   DHT Ring → SuperNodes → Gossip Clusters → Leaf Nodes          │
├─────────────────────────────────────────────────────────────────┤
│                       Compute Layer                              │
│   Node Agent → Container Runtime → GPU Execution → Results      │
├─────────────────────────────────────────────────────────────────┤
│                       Data Layer                                 │
│   Distributed Cache → Model Registry → Credit Ledger            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Overview

### User Layer
- **Form Wizard** ([docs/03](03-form-wizard-onboarding.md)) - Self-service join flow
- **API Gateway** - Anycast endpoints for global access
- **Client SDKs** - Python, JavaScript, CLI tools

### Coordination Layer
- **Global Router** - Stateless, DNS-based routing to nearest region
- **Regional Coordinators** - Manage zone membership and cross-zone traffic
- **Zone Managers** - Local scheduling and resource allocation

### Discovery Layer
- **DHT Ring** ([docs/04](04-node-discovery.md)) - Distributed hash table for node lookup
- **SuperNodes** - High-uptime nodes elected for coordination
- **Gossip Clusters** - Local peer groups (~100 nodes) for fast discovery

### Compute Layer
- **Node Agent** - Daemon running on each contributor's machine
- **Container Runtime** - gVisor/Firecracker for isolation
- **GPU Execution** - CUDA/ROCm workload execution

### Data Layer
- **Distributed Cache** - Hot model weights and intermediate results
- **Model Registry** - Available models and their locations
- **Credit Ledger** ([docs/06](06-credit-economy.md)) - CRDT-based contribution tracking

## Traffic Flow

### Task Submission
```
User submits task via web/API
         │
         ▼
   ┌──────────┐
   │ Gateway  │ ← Anycast DNS routes to nearest
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │ Regional │ ← Finds best zone for this task
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │   Zone   │ ← Queries DHT for capable nodes
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │SuperNode │ ← Routes to specific node(s)
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Node(s) │ ← Executes task, returns result
   └──────────┘
```

### Result Return
Results flow back through the same path, with caching at each layer for commonly requested outputs.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Discovery | DHT (Kademlia) | O(log n) lookups, proven at scale |
| Coordination | Hierarchical | Limits blast radius, enables regional autonomy |
| Isolation | gVisor/Firecracker | Strong isolation without VM overhead |
| Credits | CRDT | Eventual consistency, no central bottleneck |
| Transport | QUIC | Fast connection setup, built-in encryption |

## Related Documentation

- [Scale-Out Architecture](02-scale-out-architecture.md) - Detailed scaling design
- [Form Wizard Onboarding](03-form-wizard-onboarding.md) - User join flow
- [Node Discovery](04-node-discovery.md) - DHT and gossip protocols
- [Task Routing](05-task-routing.md) - How tasks find nodes
- [Credit Economy](06-credit-economy.md) - Contribution tracking
- [Security Model](07-security-model.md) - Trust and isolation
- [API Reference](08-api-reference.md) - Full API documentation
