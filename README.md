<!-- toc-backlink -->
> 📚 **Master TOC:** [Org-wide repo index](https://github.com/AlbrightLaboratories/daxxon-ai-gpu-01/issues/17) — auto-updated every 15 min from this repo's commit stream. No manual entry needed; just write commit subjects that read well as one-line bullets.

# node-group-AI

A decentralized GPU compute network that enables users to pool their AI hardware into a collective intelligence mesh. Connect your GPU, join the network, and gain access to distributed AI capabilities far beyond what any single system can provide.

## Overview

node-group-AI creates a peer-to-peer network where participants contribute their GPU resources to a shared compute pool. Each node maintains sovereignty over its own system while participating in a federated "master brain" that can tackle any computational task — from hardware diagnostics to software development, database operations, and AI inference.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        node-group-AI Mesh                           │
│                                                                     │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐      │
│   │  Node A │◄───►│  Node B │◄───►│  Node C │◄───►│  Node D │      │
│   │  RTX 4090│     │  A100   │     │  H100   │     │  DGX    │      │
│   └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘      │
│        │               │               │               │           │
│        └───────────────┴───────┬───────┴───────────────┘           │
│                                │                                    │
│                    ┌───────────▼───────────┐                       │
│                    │    Master Brain       │                       │
│                    │  (Distributed LLM)    │                       │
│                    └───────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

### Distributed GPU Pooling
- **Tensor parallelism** across nodes for large model inference
- **Pipeline parallelism** for high-throughput batch processing
- **Dynamic load balancing** based on node availability and capability
- **Heterogeneous hardware support** — mix RTX, Tesla, A100, H100, and consumer GPUs

### Security-First Architecture
- **IP-gated access control** — each node owner controls who can access their resources
- **Zero-trust networking** — all inter-node communication is encrypted and authenticated
- **Sandboxed execution** — tasks run in isolated containers with no host access
- **Audit logging** — complete visibility into what tasks ran on your hardware

### Capabilities
Once connected, the collective network can perform:

| Domain | Capabilities |
|--------|-------------|
| **Hardware** | Remote diagnostics, GPU monitoring, thermal management, driver updates |
| **Software** | Code generation, compilation, testing, deployment automation |
| **Database** | Distributed queries, schema migrations, backup/restore, replication |
| **AI/ML** | Model training, fine-tuning, inference, embedding generation, RAG pipelines |
| **General** | Any compute task that can be containerized and parallelized |

## Quick Start

### 1. Install the node agent

```bash
curl -fsSL https://node-group.ai/install.sh | bash
```

### 2. Initialize your node

```bash
node-group-ai init --gpu auto-detect
```

### 3. Configure access gates

```bash
# Allow specific IPs
node-group-ai access allow 192.168.1.0/24

# Or join the public mesh (opt-in)
node-group-ai mesh join --public
```

### 4. Connect to the network

```bash
node-group-ai connect
```

Your GPU is now part of the collective. You can submit tasks and your idle cycles contribute to others' workloads.

## Architecture

### Node Types

| Type | Description | Requirements |
|------|-------------|--------------|
| **Contributor** | Donates GPU cycles, earns compute credits | Any CUDA-capable GPU |
| **Consumer** | Uses network resources, spends credits | Network connection |
| **Hybrid** | Both contributes and consumes (default) | Any CUDA-capable GPU |
| **Orchestrator** | Routes tasks, manages mesh topology | 8+ cores, 32GB RAM |

### Network Topology

```
                    ┌──────────────────┐
                    │   Orchestrator   │
                    │    (Optional)    │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ Region  │        │ Region  │        │ Region  │
    │  West   │◄──────►│ Central │◄──────►│  East   │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                  │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │  Nodes  │        │  Nodes  │        │  Nodes  │
    └─────────┘        └─────────┘        └─────────┘
```

### Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Node                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  IP Gateway                          │   │
│  │  • Allowlist / Blocklist                            │   │
│  │  • Rate limiting                                    │   │
│  │  • Geographic restrictions                          │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │              Authentication Layer                    │   │
│  │  • mTLS certificates                                │   │
│  │  • Node identity verification                       │   │
│  │  • Task signing                                     │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │              Sandboxed Runtime                       │   │
│  │  • Container isolation (gVisor/Firecracker)         │   │
│  │  • Resource limits (CPU, memory, GPU)               │   │
│  │  • No host filesystem access                        │   │
│  │  • Network egress controls                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Basic Configuration (`~/.node-group-ai/config.yaml`)

```yaml
node:
  name: "my-gpu-node"
  region: "us-west"

gpu:
  devices: auto          # or [0, 1] for specific GPUs
  max_utilization: 80    # reserve 20% for local tasks

access:
  mode: allowlist        # allowlist | blocklist | public
  allowed_ips:
    - 192.168.1.0/24
    - 10.0.0.0/8

resources:
  max_concurrent_tasks: 4
  memory_limit: 64GB

credits:
  earn_rate: 1.0         # multiplier for contributions
  spend_limit: 1000      # daily credit cap
```

### Advanced: Task Policies

```yaml
policies:
  # What tasks you'll accept
  accept:
    - type: inference
      models: ["llama-*", "mistral-*", "qwen-*"]
    - type: training
      max_duration: 1h
    - type: embedding

  # What you won't run
  reject:
    - type: crypto_mining
    - type: password_cracking
    - untrusted_containers: true
```

## API Usage

### Submit a task to the network

```python
from node_group_ai import Client

client = Client()

# Run inference across the mesh
response = client.inference(
    model="llama-3.3-70b",
    prompt="Explain distributed computing",
    parallelism="auto"  # spreads across available nodes
)

# Execute arbitrary compute
result = client.compute(
    container="python:3.12",
    command="python train.py --epochs 100",
    gpu_count=4,
    timeout="2h"
)
```

### Monitor your node

```python
from node_group_ai import NodeStatus

status = NodeStatus.local()
print(f"GPU Utilization: {status.gpu_util}%")
print(f"Tasks completed: {status.tasks_completed}")
print(f"Credits earned: {status.credits_earned}")
print(f"Connected peers: {status.peer_count}")
```

## Economics

### Credit System

| Action | Credits |
|--------|---------|
| Contribute 1 GPU-hour | +10 credits |
| Run inference (per 1K tokens) | -1 credit |
| Run training (per GPU-hour) | -10 credits |
| Orchestrator bonus | +2 credits/hour |

### Fair Scheduling

The network uses a weighted fair-queue scheduler:
- Higher contributors get priority
- Idle resources are offered to anyone
- Emergency tasks can bid for priority

## Roadmap

- [x] Core mesh networking
- [x] GPU resource sharing
- [x] Basic security gates
- [ ] Credit economy (Q1)
- [ ] Model marketplace (Q2)
- [ ] Training job orchestration (Q2)
- [ ] Mobile node support (Q3)
- [ ] Hardware attestation (Q3)

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone and set up dev environment
git clone https://github.com/AlbrightLaboratories/node-group-AI.git
cd node-group-AI
make dev-setup
make test
```

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

**Join the mesh. Pool your power. Build the future of distributed AI.**
