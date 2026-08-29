# Security Model

How node-group-AI protects nodes, users, and data.

## Threat Model

### Assets to Protect

| Asset | Owner | Threats |
|-------|-------|---------|
| GPU hardware | Node contributor | Malicious tasks, overuse |
| Data in transit | User | Eavesdropping, tampering |
| Model weights | Network | Theft, unauthorized access |
| Credits | User | Theft, manipulation |
| User prompts | User | Privacy breach |
| Task results | User | Interception |

### Threat Actors

| Actor | Capability | Goal |
|-------|------------|------|
| Malicious user | Submit tasks | Abuse node resources, steal data |
| Malicious node | Execute tasks | Steal prompts, return bad results |
| Network attacker | MitM, packet injection | Eavesdrop, tamper |
| Sybil attacker | Create fake nodes | Farm credits, manipulate routing |

## Defense Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Defense in Depth                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 1: Network Security                            │   │
│  │  • mTLS for all node-to-node communication           │   │
│  │  • QUIC with TLS 1.3                                 │   │
│  │  • Certificate pinning for SuperNodes                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 2: Identity & Access                           │   │
│  │  • Node identity via Ed25519 keypairs                │   │
│  │  • User authentication via OAuth/JWT                 │   │
│  │  • Per-node access control lists                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 3: Task Isolation                              │   │
│  │  • Container sandboxing (gVisor/Firecracker)         │   │
│  │  • GPU isolation via MIG/vGPU                        │   │
│  │  • Resource limits (CPU, memory, time)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 4: Data Protection                             │   │
│  │  • End-to-end encryption for sensitive tasks         │   │
│  │  • Prompt anonymization option                       │   │
│  │  • Result encryption before return                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 5: Audit & Detection                           │   │
│  │  • Complete task audit logs                          │   │
│  │  • Anomaly detection for abuse                       │   │
│  │  • Reputation scoring                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Node Identity

### Key Generation

Each node generates an Ed25519 keypair on first run:

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

# Generated once, stored in ~/.node-group-ai/keys/
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

# Node ID derived from public key
node_id = sha256(public_key.public_bytes())[:32]
```

### Certificate Chain

```
Root CA (node-group.ai)
    │
    ├── Regional CA (us-west.node-group.ai)
    │       │
    │       ├── Zone CA (us-west-1.node-group.ai)
    │       │       │
    │       │       └── Node Cert (node_abc123.us-west-1.node-group.ai)
    │       │
    │       └── Zone CA (us-west-2.node-group.ai)
    │
    └── Regional CA (eu-west.node-group.ai)
```

### mTLS Handshake

```
Client Node                              Server Node
     │                                        │
     │ ClientHello + supported_versions       │
     │───────────────────────────────────────►│
     │                                        │
     │ ServerHello + certificate + cert_req   │
     │◄───────────────────────────────────────│
     │                                        │
     │ Client certificate + verify            │
     │───────────────────────────────────────►│
     │                                        │
     │ Finished (encrypted)                   │
     │◄──────────────────────────────────────►│
     │                                        │
     │ Application data (encrypted)           │
     │◄──────────────────────────────────────►│
```

## Access Control

### Node-Level ACL

Each node owner controls access:

```yaml
# ~/.node-group-ai/access.yaml
access:
  mode: allowlist  # allowlist | blocklist | public

  allowlist:
    # By IP/CIDR
    - ip: 192.168.1.0/24
      permissions: [inference, embedding]

    # By user ID
    - user: user_xyz
      permissions: [inference, training]

    # By node ID (for private meshes)
    - node: node_abc123
      permissions: [all]

  blocklist:
    - ip: 10.0.0.0/8
    - user: banned_user

  rate_limits:
    default:
      requests_per_minute: 60
      concurrent_tasks: 4

    premium:  # For high-credit users
      requests_per_minute: 600
      concurrent_tasks: 20
```

### Task Authorization

```
Task submitted
      │
      ▼
┌──────────────┐
│ Check sender │
│   identity   │
└──────┬───────┘
       │
       ▼
┌──────────────┐     No
│ On allowlist?│────────► Reject
└──────┬───────┘
       │ Yes
       ▼
┌──────────────┐     No
│ Has required │────────► Reject
│ permission?  │
└──────┬───────┘
       │ Yes
       ▼
┌──────────────┐     No
│ Within rate  │────────► Queue/Reject
│   limits?    │
└──────┬───────┘
       │ Yes
       ▼
    Execute
```

## Task Isolation

### Container Sandbox

All tasks run in sandboxed containers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Host System                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 gVisor / Firecracker                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Task Container                      │  │  │
│  │  │                                                  │  │  │
│  │  │  • Isolated filesystem (tmpfs)                  │  │  │
│  │  │  • No host network access                       │  │  │
│  │  │  • Limited syscalls (seccomp)                   │  │  │
│  │  │  • Read-only model weights                      │  │  │
│  │  │  • Time-limited execution                       │  │  │
│  │  │                                                  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Host GPU (passed through via GPU isolation)                │
└─────────────────────────────────────────────────────────────┘
```

### Sandbox Configuration

```yaml
sandbox:
  runtime: gvisor  # gvisor | firecracker | kata

  filesystem:
    root: tmpfs
    size: 10GB
    read_only_paths:
      - /models
    writable_paths:
      - /tmp
      - /workspace

  network:
    mode: none  # none | restricted | full
    allowed_hosts:  # Only if mode=restricted
      - api.openai.com
      - huggingface.co

  resources:
    cpu_limit: 4
    memory_limit: 32GB
    gpu_memory_limit: 20GB
    time_limit: 3600s

  seccomp:
    profile: strict
    allowed_syscalls:
      - read, write, open, close
      - mmap, munmap, mprotect
      - futex, nanosleep
      # GPU-specific
      - ioctl  # Required for CUDA
```

### GPU Isolation

For multi-tenant GPU sharing:

```
Option 1: MIG (Multi-Instance GPU) - A100/H100
  └── Hardware-level isolation
  └── 7 isolated instances per GPU
  └── Memory and compute separated

Option 2: vGPU (Virtual GPU)
  └── Driver-level isolation
  └── Time-sliced sharing
  └── Works on any NVIDIA GPU

Option 3: Exclusive (default for consumer GPUs)
  └── One task per GPU at a time
  └── Simplest, most secure
```

## Data Protection

### End-to-End Encryption

For sensitive tasks, prompts are encrypted client-to-node:

```
User                        Gateway                    Node
  │                            │                         │
  │ Generate ephemeral keypair │                         │
  │ E_pub, E_priv              │                         │
  │                            │                         │
  │ Encrypt prompt:            │                         │
  │ ciphertext = encrypt(      │                         │
  │   prompt,                  │                         │
  │   ECDH(E_priv, Node_pub)  │                         │
  │ )                          │                         │
  │                            │                         │
  │ Submit: {E_pub, ciphertext}│                         │
  │───────────────────────────►│                         │
  │                            │ Forward (can't decrypt) │
  │                            │────────────────────────►│
  │                            │                         │
  │                            │     Decrypt:            │
  │                            │     key = ECDH(Node_priv, E_pub)
  │                            │     prompt = decrypt(ciphertext, key)
  │                            │                         │
  │                            │     Execute + encrypt result
  │                            │◄────────────────────────│
  │◄───────────────────────────│                         │
```

### Prompt Anonymization

Optional privacy feature:

```python
# Client-side
client.inference(
    model="llama-3.3-70b",
    prompt="My SSN is 123-45-6789. What are my tax options?",
    anonymize=True
)

# Before sending:
# "My SSN is [REDACTED_SSN_1]. What are my tax options?"

# After result, client re-substitutes locally
```

### Result Encryption

Results are encrypted before leaving the node:

```python
# On node, after execution
result_ciphertext = encrypt(
    result,
    user_public_key  # From task metadata
)

# Only user can decrypt
```

## Audit Logging

### Node Audit Log

Every task execution is logged locally:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "task_id": "task_abc123",
  "user_id": "user_xyz",
  "user_ip": "203.0.113.42",
  "task_type": "inference",
  "model": "llama-3.3-70b",
  "input_tokens": 150,
  "output_tokens": 500,
  "duration_ms": 2300,
  "gpu_memory_peak_mb": 18432,
  "result": "success",
  "credits_charged": 1
}
```

Prompts/results NOT logged by default (privacy). Opt-in for debugging.

### Anomaly Detection

```python
def detect_anomalies(node_logs):
    alerts = []

    # Unusual request patterns
    if requests_per_minute > 10 * baseline:
        alerts.append("Possible DoS attempt")

    # High failure rate
    if failure_rate > 0.2:
        alerts.append("High failure rate - possible attack or bug")

    # Unusual task types
    if task_type not in node.allowed_types:
        alerts.append("Unauthorized task type attempted")

    # Resource abuse
    if avg_gpu_util > 95 for extended_period:
        alerts.append("Possible resource abuse")

    return alerts
```

## Reputation System

### Node Reputation Score

```python
reputation = (
    uptime_ratio * 0.25 +           # Availability
    task_success_rate * 0.25 +      # Reliability
    latency_score * 0.20 +          # Performance
    verification_pass_rate * 0.20 + # Honesty
    age_score * 0.10                # Longevity
)
```

### Reputation Effects

| Score | Label | Effects |
|-------|-------|---------|
| 0.9+ | Excellent | SuperNode eligible, priority routing |
| 0.7-0.9 | Good | Normal operation |
| 0.5-0.7 | Fair | Increased verification rate |
| 0.3-0.5 | Poor | Rate limited, no priority tasks |
| <0.3 | Bad | Removed from network |

### Recovery

Nodes can recover reputation:

```
Poor → Fair: 7 days of good behavior
Fair → Good: 14 days of good behavior
Bad → Poor: Manual appeal + 30 days probation
```

## Incident Response

### Automated Response

| Trigger | Action |
|---------|--------|
| Node reputation < 0.3 | Auto-remove from routing |
| 3 failed verifications | Suspend pending review |
| Abuse report | Rate limit + investigate |
| Anomaly alert | Notify owner + reduce traffic |

### Manual Response

```
1. Incident detected (alert, report, anomaly)
2. Triage: severity assessment
3. Containment: isolate affected nodes/users
4. Investigation: log analysis, verification
5. Resolution: fix, ban, or clear
6. Post-mortem: document lessons
```

## Compliance

### Data Handling

| Data Type | Retention | Encryption | Access |
|-----------|-----------|------------|--------|
| Audit logs | 90 days | At rest | Node owner |
| Prompts | Not stored | In transit | User only |
| Results | Not stored | In transit | User only |
| Node telemetry | 30 days | At rest | Network ops |
| Credit history | 7 years | At rest | User + compliance |

### User Rights (GDPR/CCPA)

- **Access**: Export all data via API
- **Deletion**: Delete account + data within 30 days
- **Portability**: Export credits, history in JSON
- **Opt-out**: Disable telemetry, anonymize prompts

## Related Documentation

- [Node Discovery](04-node-discovery.md) - Identity and authentication
- [Credit Economy](06-credit-economy.md) - Account security
- [API Reference](08-api-reference.md) - Security headers and auth
