# Form Wizard Onboarding

The form wizard is the primary way users join node-group-AI. It eliminates CLI complexity and enables self-service onboarding at scale.

## Why Form-First?

| Approach | Time to Join | Technical Skill | Support Cost |
|----------|-------------|-----------------|--------------|
| CLI + Config | 30+ minutes | High | High |
| **Form Wizard** | **< 5 minutes** | **None** | **Low** |
| Managed Service | Minutes | None | Medium |

The form wizard removes the human bottleneck from onboarding. With self-service, we can scale to millions of users without scaling support staff.

## User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    join.node-group.ai                        │
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │  Step 1 │──►│  Step 2 │──►│  Step 3 │──►│  Step 4 │     │
│  │Hardware │   │Use Cases│   │ Access  │   │ Install │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                              │
│  ◄─────────────── 3-5 minutes ───────────────►             │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Hardware Profile

**Question**: What kind of system are you connecting?

| Option | Description | Config Generated |
|--------|-------------|------------------|
| Gaming PC | RTX 3000/4000 series | Consumer GPU mode |
| Workstation | RTX A-series, Quadro | Prosumer mode |
| Server | Tesla, A100, H100 | Enterprise mode |
| Cloud VM | AWS, GCP, Azure GPU | Cloud mode |
| Data Center | Multiple GPUs, rack | Datacenter mode |
| Access Only | No GPU, just consume | Consumer-only mode |

### Auto-Detection
If the user runs from their target machine, we can auto-detect:
```bash
# Browser-based detection via WebGPU
navigator.gpu.requestAdapter() → GPU model

# Or via one-liner probe
curl -s https://node-group.ai/probe | bash
# Returns: {"gpu": "RTX 4090", "vram": "24GB", "cuda": "12.1"}
```

## Step 2: Use Cases

**Question**: What do you want to do?

### For Contributors
- [ ] **Earn credits** - Share idle GPU cycles
- [ ] **Host models** - Run specific models for the network
- [ ] **Training jobs** - Accept distributed training work
- [ ] **Run orchestrator** - Help coordinate the network (high uptime required)

### For Consumers
- [ ] **Chat/Code AI** - Interactive AI assistance
- [ ] **Image generation** - Stable Diffusion, DALL-E style
- [ ] **Embeddings/RAG** - Vector search and retrieval
- [ ] **Custom models** - Run your own fine-tuned models
- [ ] **Training** - Train models on the network

### Pre-configured Prompts
Each use case comes with an optimized system prompt:

| Use Case | Pre-configured Prompt |
|----------|----------------------|
| Code Assistant | "You are an expert programmer. Help the user write, debug, and explain code..." |
| Data Analyst | "You are a data analysis expert. Help analyze datasets, create visualizations..." |
| Research Helper | "You are a research assistant. Summarize papers, answer technical questions..." |
| Creative Writing | "You are a creative writing assistant. Help with stories, scripts, content..." |
| Custom | User provides their own system prompt |

## Step 3: Access Control

**Question**: Who can use your resources?

| Option | Description | Use Case |
|--------|-------------|----------|
| **Private** | Only your IPs | Personal use |
| **Friends** | Invite links (expire) | Small team |
| **Regional** | Your geographic region | Community |
| **Public** | Global mesh | Maximum earning |

### IP Allowlist Builder
For Private/Friends mode, we provide an interactive IP builder:
```
Your current IP: 203.0.113.42 [Add]

Allowed IPs:
• 203.0.113.42 (You)          [Remove]
• 192.168.1.0/24 (Home LAN)   [Remove]

[+ Add IP/Range]  [+ Generate Invite Link]
```

### Invite Links
For Friends mode, generate time-limited invite URLs:
```
https://node-group.ai/join/abc123xyz
├── Expires: 7 days
├── Uses: Unlimited / 10 / 1
└── Access level: Consumer only / Full
```

## Step 4: Install

Based on previous steps, we generate a personalized install command.

### One-Line Install
```bash
curl -fsSL https://node-group.ai/j/USER_TOKEN | bash
```

The token encodes:
- Hardware profile from Step 1
- Use cases from Step 2
- Access settings from Step 3
- User identity (email/GitHub)

### What the Installer Does
1. Detects OS and architecture
2. Downloads appropriate agent binary
3. Configures based on encoded token
4. Starts node agent service
5. Connects to nearest SuperNode
6. Reports ready status

### Alternative Install Methods

**Docker** (for servers):
```bash
docker run -d --gpus all \
  -e NODE_TOKEN=USER_TOKEN \
  ghcr.io/albrightlaboratories/node-group-ai:latest
```

**Kubernetes** (for clusters):
```yaml
# Helm chart
helm install node-group-ai oci://ghcr.io/albrightlaboratories/charts/node-group-ai \
  --set token=USER_TOKEN
```

**Browser Terminal** (no local install):
For "Access Only" users, we provide a web-based terminal that connects to the mesh without local installation.

## Post-Install Dashboard

After installation, users see their dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│  node-group.ai Dashboard                    [Settings] [?]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Node Status: ● Online (us-west-2)                          │
│  GPU: RTX 4090 (24GB) @ 45% utilization                     │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Credits   │  │    Tasks    │  │   Uptime    │         │
│  │    1,234    │  │     567     │  │   99.2%     │         │
│  │   +42/hr    │  │  completed  │  │  this week  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Quick Actions:                                              │
│  [Start Chat] [Generate Image] [Run Code] [API Keys]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Form Submission Flow
```
Browser                API Gateway              Backend
   │                       │                       │
   │ POST /wizard/submit   │                       │
   │ {hardware, uses, acl} │                       │
   │──────────────────────►│                       │
   │                       │ Validate + Generate   │
   │                       │──────────────────────►│
   │                       │                       │
   │                       │ Token + Install URL   │
   │                       │◄──────────────────────│
   │                       │                       │
   │ {token, install_cmd}  │                       │
   │◄──────────────────────│                       │
```

### Token Structure
```json
{
  "v": 1,
  "uid": "user_abc123",
  "hw": "consumer_gpu",
  "uses": ["inference", "earn_credits"],
  "acl": {
    "mode": "private",
    "ips": ["203.0.113.42"]
  },
  "region": "us-west",
  "exp": 1735689600
}
```

Token is signed (Ed25519) and base64url encoded. Valid for 24 hours.

### Install Script Behavior
```bash
#!/bin/bash
# https://node-group.ai/j/TOKEN

set -e

# Decode token (embedded in URL path)
TOKEN="$1"

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Download agent
curl -fsSL "https://releases.node-group.ai/agent/${OS}/${ARCH}/latest" \
  -o /tmp/node-group-agent

# Install
sudo install -m 755 /tmp/node-group-agent /usr/local/bin/

# Configure from token
node-group-agent init --token "$TOKEN"

# Start service
sudo node-group-agent service install
sudo node-group-agent service start

echo "✓ Connected to node-group-AI mesh"
echo "  Dashboard: https://node-group.ai/dashboard"
```

## Analytics & Conversion

Track wizard funnel:
1. **Landed** - Visited join page
2. **Started** - Selected hardware type
3. **Configured** - Completed use cases
4. **Access Set** - Completed ACL
5. **Installed** - Ran install command
6. **Connected** - Node reported online

Target: 60%+ conversion from Started → Connected

## Related Documentation

- [Architecture Overview](01-architecture-overview.md) - System design
- [Security Model](07-security-model.md) - How we protect your node
- [API Reference](08-api-reference.md) - Programmatic access
