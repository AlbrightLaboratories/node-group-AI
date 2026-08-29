<!-- toc-backlink -->
> 📚 **Master TOC:** [Org-wide repo index](https://github.com/AlbrightLaboratories/daxxon-ai-gpu-01/issues/17) — auto-updated every 15 min from this repo's commit stream. No manual entry needed; just write commit subjects that read well as one-line bullets.

# node-group-AI

A decentralized GPU compute network that enables millions of users to pool their AI hardware into a collective intelligence mesh. Join via web form, contribute your GPU, and access distributed AI capabilities far beyond any single system.

## Join the Network

**No CLI required. Just fill out a form.**

```
┌─────────────────────────────────────────────────────────────┐
│                    join.node-group.ai                        │
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ Hardware│──►│Use Cases│──►│ Access  │──►│ Install │     │
│  │  (30s)  │   │  (30s)  │   │  (30s)  │   │  (auto) │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                              │
│  ◄───────────── Under 5 minutes ────────────────►           │
└─────────────────────────────────────────────────────────────┘
```

1. **Go to** [join.node-group.ai](https://join.node-group.ai)
2. **Answer 3 questions** — What hardware? What use cases? Who can access?
3. **Run the installer** — One command, pre-configured for your setup
4. **You're live** — Dashboard shows status, credits, and tasks

That's it. AI prompts, models, and network config are pre-configured. You can start using the network immediately.

## What You Can Do

### As a Contributor (Have GPU)
Earn credits by sharing idle GPU cycles. Your hardware helps power the collective while you're not using it.

### As a Consumer (Need AI)
Spend credits to run AI workloads across the distributed network — inference, embeddings, training, and more.

### Pre-configured AI Templates
No prompt engineering required. Select a use case, get a working AI assistant:

| Template | What It Does |
|----------|--------------|
| **Code Assistant** | Write, debug, and explain code |
| **Data Analyst** | Analyze datasets, create visualizations |
| **Research Helper** | Summarize papers, answer technical questions |
| **Creative Writing** | Stories, scripts, content |
| **Custom** | Bring your own system prompt |

## Network Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        node-group-AI Mesh                        │
│                                                                  │
│   10M+ Nodes    ───►    Hierarchical DHT    ───►    Your Task   │
│   Global Pool          O(log n) Routing           < 100ms p99   │
│                                                                  │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│   │Consumer │     │ Gaming  │     │ Server  │     │ Data    │  │
│   │ GPUs    │     │  PCs    │     │ Racks   │     │ Centers │  │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘  │
│        │               │               │               │        │
│        └───────────────┴───────┬───────┴───────────────┘        │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │    Distributed AI     │                    │
│                    │  Inference, Training  │                    │
│                    │  Embeddings, Compute  │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Form-based onboarding** | Join in 5 minutes, no CLI required |
| **Pre-configured AI** | Ready-to-use prompts and models |
| **10M+ node scale** | Hierarchical DHT for massive networks |
| **Credit economy** | Earn by contributing, spend on AI tasks |
| **Security-first** | mTLS, sandboxed execution, per-node ACLs |
| **Multi-GPU support** | RTX, A100, H100, any CUDA-capable GPU |

## Quick API Example

```python
from node_group_ai import Client

client = Client()  # Uses your node credentials

# Run inference across the mesh
response = client.inference(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Explain quantum computing"}]
)
print(response.choices[0].message.content)

# Check your credits
print(f"Balance: {client.credits.balance()} credits")
```

## Credit Economy

| Action | Credits |
|--------|---------|
| Contribute 1 GPU-hour | +10 |
| Run inference (1K tokens) | -1 |
| Run training (1 GPU-hour) | -10 |
| Priority boost | -1 to -100 |

No hardware? Purchase credit packages starting at $10.

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture Overview](docs/01-architecture-overview.md) | System design and components |
| [Scale-Out Architecture](docs/02-scale-out-architecture.md) | How we scale to 10M+ nodes |
| [Form Wizard Onboarding](docs/03-form-wizard-onboarding.md) | How the join flow works |
| [Node Discovery](docs/04-node-discovery.md) | DHT and gossip protocols |
| [Task Routing](docs/05-task-routing.md) | How tasks find nodes |
| [Credit Economy](docs/06-credit-economy.md) | Earning and spending credits |
| [Security Model](docs/07-security-model.md) | mTLS, sandboxing, access control |
| [API Reference](docs/08-api-reference.md) | Complete API documentation |
| [Distributed Inference](docs/09-distributed-inference.md) | How frontier models work across nodes |
| [Granular Participation](docs/10-granular-participation.md) | How 1GB-8GB nodes contribute to 70B models |
| [Streaming Inference](docs/11-streaming-inference.md) | Torrent-style weight streaming for any node |
| [Collective Intelligence](docs/12-collective-intelligence.md) | How the network learns and grows |

## Node Types

| Type | Description | Requirements |
|------|-------------|--------------|
| **Contributor** | Share GPU, earn credits | Any CUDA GPU |
| **Consumer** | Use AI, spend credits | Network only |
| **Hybrid** | Both (default) | Any CUDA GPU |
| **SuperNode** | Help coordinate network | High uptime, 8+ cores |

## Security

Your node, your rules:

```yaml
# ~/.node-group-ai/access.yaml
access:
  mode: allowlist
  allowed_ips:
    - 192.168.1.0/24  # Your LAN
    - 10.0.0.0/8       # Your VPN
```

- **IP gating** — Control who accesses your GPU
- **mTLS** — All traffic encrypted and authenticated
- **Sandboxed execution** — Tasks run in isolated containers
- **Audit logs** — Full visibility into what runs on your hardware

## Roadmap

- [x] Core mesh networking
- [x] GPU resource sharing
- [x] Form wizard onboarding
- [x] Pre-configured AI templates
- [x] Landing page (site/)
- [ ] Broker/coordination service
- [ ] Credit marketplace
- [ ] Model marketplace
- [ ] Mobile companion app
- [ ] Hardware attestation

## Website

The `site/` directory contains a GitHub Pages landing page. To enable:

1. Go to repo Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select branch `main` and folder `/site`
4. Save

**Note**: The broker service should be built first before activating the public site.

## Contributing

```bash
git clone https://github.com/AlbrightLaboratories/node-group-AI.git
cd node-group-AI
make dev-setup
make test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

**Join the mesh. Pool your power. Build the future of distributed AI.**

[join.node-group.ai](https://join.node-group.ai)
