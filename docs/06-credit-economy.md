# Credit Economy

How node-group-AI tracks contributions and consumption at scale.

## Design Goals

| Goal | Challenge | Solution |
|------|-----------|----------|
| Scale | 1M+ transactions/sec | CRDT-based ledger |
| Fairness | Prevent gaming | Work verification |
| Latency | Real-time balance | Local caching |
| Consistency | Distributed state | Eventual convergence |

## Credit Model

### Earning Credits

| Action | Credits/Unit | Notes |
|--------|-------------|-------|
| GPU-hour contributed | +10 | Base rate for idle availability |
| Inference task completed | +1-5 | Based on model size |
| Training task completed | +10-50 | Based on duration |
| SuperNode service | +2/hour | For high-uptime nodes |
| Orchestrator service | +5/hour | For zone managers |

### Spending Credits

| Action | Credits/Unit | Notes |
|--------|-------------|-------|
| Inference (per 1K tokens) | -1 | Output tokens |
| Embedding (per 1K tokens) | -0.1 | Input tokens |
| Training (per GPU-hour) | -10 | Reserved time |
| Storage (per GB/month) | -1 | Model/data storage |
| Priority boost | -1 to -100 | Bid for queue priority |

### Credit Multipliers

```
Base Rate × Hardware Multiplier × Uptime Multiplier × Quality Multiplier

Hardware Multiplier:
  - Consumer GPU (RTX 3000/4000): 1.0x
  - Prosumer (A-series): 1.5x
  - Datacenter (A100): 2.0x
  - Latest gen (H100/B200): 3.0x

Uptime Multiplier:
  - <90% uptime: 0.5x
  - 90-95%: 0.8x
  - 95-99%: 1.0x
  - 99%+: 1.2x

Quality Multiplier:
  - High error rate: 0.5x
  - Normal: 1.0x
  - High reliability: 1.1x
```

## CRDT Ledger

We use CRDTs (Conflict-free Replicated Data Types) for the credit ledger. This allows:
- No central coordinator
- Partition tolerance
- Eventual consistency
- Local reads (fast balance checks)

### G-Counter for Earnings

Each node tracks earnings locally:

```
Earnings Counter (G-Counter):
{
  "node_a": 1500,  // Only node_a can increment
  "node_b": 2300,  // Only node_b can increment
  "node_c": 890    // Only node_c can increment
}

Total earnings = sum of all values = 4690
```

Merge: `max(local[node], remote[node])` for each node

### PN-Counter for Balance

Balance combines earnings (positive) and spending (negative):

```
Balance (PN-Counter):
{
  "positive": {  // G-Counter
    "node_a": 1500,
    "verified_by_zone_1": 1500
  },
  "negative": {  // G-Counter
    "gateway_1": 400,
    "gateway_2": 250
  }
}

Balance = sum(positive) - sum(negative) = 1500 - 650 = 850
```

### State Replication

```
┌──────────────────────────────────────────────────────────────┐
│                    Credit Replication                         │
│                                                               │
│  Leaf Node                                                    │
│     │                                                         │
│     │ Every 30s: send delta                                   │
│     ▼                                                         │
│  SuperNode                                                    │
│     │                                                         │
│     │ Every 5min: aggregate + send                            │
│     ▼                                                         │
│  Zone Manager                                                 │
│     │                                                         │
│     │ Every 15min: reconcile with region                      │
│     ▼                                                         │
│  Regional Coordinator                                         │
│     │                                                         │
│     │ Every 1hr: global sync                                  │
│     ▼                                                         │
│  Global State (authoritative snapshot)                        │
└──────────────────────────────────────────────────────────────┘
```

## Work Verification

Credits aren't awarded on trust—work must be verified.

### Inference Verification

```
1. Task submitted with random challenge seed
2. Node executes, returns result + proof
3. Proof = hash(result + seed + node_signature)
4. 5% of tasks spot-checked by re-execution
5. Mismatch = credit penalty + reputation hit
```

### Spot Check Algorithm

```python
def should_spot_check(task, node):
    # Higher check rate for new/low-reputation nodes
    base_rate = 0.05  # 5%

    if node.tasks_completed < 100:
        return random.random() < 0.20  # 20% for new nodes

    if node.reputation < 0.8:
        return random.random() < 0.15  # 15% for low rep

    return random.random() < base_rate

def verify_task(task, original_result, node):
    # Re-execute on different node
    verify_node = select_verifier(exclude=node)
    verify_result = verify_node.execute(task)

    if results_match(original_result, verify_result):
        return True
    else:
        # Dispute: run on 3rd node as tiebreaker
        tiebreaker = select_verifier(exclude=[node, verify_node])
        tiebreaker_result = tiebreaker.execute(task)

        if results_match(tiebreaker_result, verify_result):
            penalize(node)  # Original node was wrong
            return False
        elif results_match(tiebreaker_result, original_result):
            return True  # Verifier was wrong
        else:
            # All three differ—flag for human review
            flag_for_review(task, [original_result, verify_result, tiebreaker_result])
            return None
```

### Training Verification

Training jobs use checkpoint verification:

```
1. Training job requests N GPU-hours
2. Job split into 1-hour checkpoints
3. Each checkpoint: save weights + metrics
4. Random checkpoints verified:
   - Load checkpoint, train 100 steps
   - Compare loss trajectory
   - Mismatch = investigate
5. Credits released per verified checkpoint
```

## Anti-Gaming Measures

### Sybil Prevention

Prevent users from creating fake nodes to earn credits:

```
New Node Requirements:
1. Unique hardware fingerprint (GPU serial, etc.)
2. Proof of GPU via challenge (render specific frame)
3. Minimum 24-hour "trial period" at 0.1x rate
4. Phone/email verification for account
5. First 1000 credits non-transferable
```

### Collusion Detection

```python
def detect_collusion(nodes):
    # Check for suspicious patterns

    # Same IP range
    ip_clusters = cluster_by_ip(nodes)
    if any(len(c) > 10 for c in ip_clusters):
        flag_for_review(ip_clusters)

    # Mutual verification (A verifies B, B verifies A)
    verification_graph = build_verification_graph(nodes)
    cycles = find_cycles(verification_graph, max_length=3)
    if cycles:
        flag_for_review(cycles)

    # Credit transfers forming rings
    transfer_graph = build_transfer_graph(nodes)
    rings = find_rings(transfer_graph)
    if rings:
        freeze_accounts(rings)
```

### Rate Limiting

```
Per-node limits:
  - Max 1000 credits earned/day (prevents fake work spam)
  - Max 10 tasks/second (prevents DoS)
  - Max 100 transfers/day (prevents laundering)

Per-user limits:
  - Max 10 nodes per account
  - Max 10,000 credits spent/day
  - Max 5 priority bids/minute
```

## Credit Marketplace

### Direct Transfers

Users can transfer credits to others:

```python
client.transfer_credits(
    to_user="user_xyz",
    amount=500,
    memo="Payment for custom model"
)
```

Transfer fees: 5% (burned, reducing total supply)

### Credit Packages

For users without hardware to contribute:

| Package | Credits | Price | Per Credit |
|---------|---------|-------|------------|
| Starter | 100 | $10 | $0.10 |
| Standard | 1,000 | $80 | $0.08 |
| Pro | 10,000 | $600 | $0.06 |
| Enterprise | Custom | Custom | $0.04+ |

### Withdrawal

Contributors can withdraw credits as cash:

```
Minimum withdrawal: 1000 credits
Rate: $0.05 per credit (50% of purchase price)
Processing: 7 days
KYC required: Yes, for amounts > $600/year
```

## Balance Caching

For fast balance checks (task submission):

```
┌─────────────────────────────────────────────────────────────┐
│                     Balance Cache                            │
│                                                              │
│  API Gateway (edge)                                          │
│    └── Local cache: user_id → {balance, ttl: 60s}           │
│                                                              │
│  Zone Manager                                                │
│    └── Authoritative cache: user_id → {balance, ttl: 5min}  │
│                                                              │
│  Regional Coordinator                                        │
│    └── CRDT state: full ledger                              │
└─────────────────────────────────────────────────────────────┘

Read path:
  1. Check edge cache (1ms)
  2. Miss → check zone cache (10ms)
  3. Miss → compute from CRDT (50ms)

Write path:
  1. Deduct from zone cache immediately
  2. Propagate to CRDT async
  3. Invalidate edge caches
```

## Reporting

### User Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Credit Summary                              Last 30 days   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Balance: 2,450 credits                             │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Earned    │  │    Spent    │  │   Net       │         │
│  │   +3,200    │  │   -1,150    │  │  +2,050     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Breakdown:                                                  │
│  • GPU contribution (180 hrs): +1,800 credits               │
│  • Inference tasks (1,400): +1,400 credits                  │
│  • Inference usage (850K tokens): -850 credits              │
│  • Training job (3 hrs): -300 credits                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Network Economics

| Metric | Value | Notes |
|--------|-------|-------|
| Total credits in circulation | 500M | Growing ~5%/month |
| Credits earned/day | 2M | Contribution activity |
| Credits spent/day | 1.8M | Consumption |
| Net inflation | +200K/day | New value creation |
| Transfer volume | 50K/day | Marketplace activity |

## Related Documentation

- [Task Routing](05-task-routing.md) - Priority based on credits
- [Security Model](07-security-model.md) - Account security
- [API Reference](08-api-reference.md) - Credit API endpoints
