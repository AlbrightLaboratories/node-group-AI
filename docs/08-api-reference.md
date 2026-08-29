# API Reference

Complete API documentation for node-group-AI.

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.node-group.ai/v1` |
| Staging | `https://staging-api.node-group.ai/v1` |
| Local | `http://localhost:8080/v1` |

## Authentication

### API Keys

```bash
# Header authentication
curl -H "Authorization: Bearer ng_live_abc123..." \
  https://api.node-group.ai/v1/inference
```

### Key Types

| Type | Prefix | Permissions |
|------|--------|-------------|
| Live | `ng_live_` | Full access, deducts credits |
| Test | `ng_test_` | Sandbox, no credits |
| Node | `ng_node_` | Node-to-node communication |

### Rate Limits

| Tier | Requests/min | Concurrent | Notes |
|------|-------------|------------|-------|
| Free | 10 | 1 | Rate limited heavily |
| Starter | 60 | 4 | $10/month minimum |
| Pro | 600 | 20 | $100/month minimum |
| Enterprise | Custom | Custom | Contact sales |

## Endpoints

### Inference

**POST /v1/inference**

Run inference on the distributed network.

```bash
curl -X POST https://api.node-group.ai/v1/inference \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    "max_tokens": 1000,
    "temperature": 0.7
  }'
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `messages` | array | Yes | Conversation history |
| `max_tokens` | int | No | Max output tokens (default: 1000) |
| `temperature` | float | No | Sampling temperature 0-2 (default: 1) |
| `top_p` | float | No | Nucleus sampling (default: 1) |
| `stream` | bool | No | Stream response (default: false) |
| `priority_bid` | int | No | Extra credits for priority (0-100) |

**Response**

```json
{
  "id": "inf_abc123",
  "model": "llama-3.3-70b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing uses quantum mechanics..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 230,
    "total_tokens": 275
  },
  "credits_charged": 1,
  "node_id": "node_xyz789",
  "latency_ms": 1250
}
```

**Streaming**

For `stream: true`, responses are Server-Sent Events:

```
data: {"id":"inf_abc123","choices":[{"delta":{"content":"Quantum"}}]}

data: {"id":"inf_abc123","choices":[{"delta":{"content":" computing"}}]}

data: {"id":"inf_abc123","choices":[{"delta":{"content":" uses"}}]}

data: [DONE]
```

---

### Embeddings

**POST /v1/embeddings**

Generate vector embeddings for text.

```bash
curl -X POST https://api.node-group.ai/v1/embeddings \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "bge-large-en-v1.5",
    "input": ["Hello world", "How are you?"]
  }'
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Embedding model identifier |
| `input` | string/array | Yes | Text(s) to embed |
| `encoding_format` | string | No | `float` or `base64` (default: float) |

**Response**

```json
{
  "id": "emb_abc123",
  "model": "bge-large-en-v1.5",
  "data": [
    {
      "index": 0,
      "embedding": [0.0023, -0.0145, 0.0067, ...],
      "object": "embedding"
    },
    {
      "index": 1,
      "embedding": [0.0012, -0.0089, 0.0034, ...],
      "object": "embedding"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  },
  "credits_charged": 0.1
}
```

---

### Compute

**POST /v1/compute**

Run arbitrary compute tasks in containers.

```bash
curl -X POST https://api.node-group.ai/v1/compute \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "container": "python:3.12",
    "command": "python -c \"print(sum(range(1000000)))\"",
    "gpu_count": 0,
    "timeout": 60
  }'
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `container` | string | Yes | Docker image |
| `command` | string | Yes | Command to execute |
| `gpu_count` | int | No | GPUs required (default: 0) |
| `memory_gb` | int | No | Memory limit (default: 8) |
| `timeout` | int | No | Timeout seconds (default: 300) |
| `env` | object | No | Environment variables |
| `files` | object | No | Files to mount (base64 encoded) |

**Response**

```json
{
  "id": "cmp_abc123",
  "status": "completed",
  "exit_code": 0,
  "stdout": "499999500000\n",
  "stderr": "",
  "duration_ms": 1523,
  "node_id": "node_xyz789",
  "credits_charged": 1
}
```

---

### Training

**POST /v1/training**

Submit distributed training jobs.

```bash
curl -X POST https://api.node-group.ai/v1/training \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "base_model": "llama-3.3-8b",
    "dataset": "https://storage.node-group.ai/datasets/my-data.jsonl",
    "method": "lora",
    "epochs": 3,
    "gpu_hours_max": 10
  }'
```

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `base_model` | string | Yes | Starting model |
| `dataset` | string | Yes | URL to training data |
| `method` | string | No | `full`, `lora`, `qlora` (default: lora) |
| `epochs` | int | No | Training epochs (default: 1) |
| `batch_size` | int | No | Batch size (default: auto) |
| `learning_rate` | float | No | LR (default: 1e-4) |
| `gpu_hours_max` | int | Yes | Max GPU hours (budget cap) |
| `checkpoint_interval` | int | No | Hours between checkpoints |

**Response**

```json
{
  "id": "trn_abc123",
  "status": "queued",
  "estimated_duration_hours": 4.5,
  "estimated_credits": 45,
  "checkpoint_urls": [],
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Training Status**

**GET /v1/training/{job_id}**

```json
{
  "id": "trn_abc123",
  "status": "running",
  "progress": 0.45,
  "current_epoch": 2,
  "current_loss": 0.342,
  "gpu_hours_used": 2.1,
  "checkpoint_urls": [
    "https://storage.node-group.ai/checkpoints/trn_abc123/epoch-1.pt"
  ],
  "nodes": ["node_xyz789", "node_def456"]
}
```

---

### Models

**GET /v1/models**

List available models.

```bash
curl https://api.node-group.ai/v1/models \
  -H "Authorization: Bearer ng_live_abc123"
```

**Response**

```json
{
  "models": [
    {
      "id": "llama-3.3-70b",
      "name": "Llama 3.3 70B",
      "type": "chat",
      "context_length": 128000,
      "cost_per_1k_tokens": 1,
      "availability": 0.95,
      "avg_latency_ms": 1200
    },
    {
      "id": "qwen-72b",
      "name": "Qwen 72B",
      "type": "chat",
      "context_length": 32000,
      "cost_per_1k_tokens": 1,
      "availability": 0.88,
      "avg_latency_ms": 1400
    }
  ]
}
```

---

### Credits

**GET /v1/credits**

Get current credit balance.

```bash
curl https://api.node-group.ai/v1/credits \
  -H "Authorization: Bearer ng_live_abc123"
```

**Response**

```json
{
  "balance": 2450,
  "earned_today": 120,
  "spent_today": 45,
  "pending_earnings": 30,
  "tier": "pro"
}
```

**POST /v1/credits/transfer**

Transfer credits to another user.

```bash
curl -X POST https://api.node-group.ai/v1/credits/transfer \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "to_user": "user_xyz",
    "amount": 500,
    "memo": "Payment for services"
  }'
```

**Response**

```json
{
  "transfer_id": "txf_abc123",
  "amount": 500,
  "fee": 25,
  "net_amount": 475,
  "new_balance": 1950,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### Nodes

**GET /v1/nodes/status**

Get status of your nodes.

```bash
curl https://api.node-group.ai/v1/nodes/status \
  -H "Authorization: Bearer ng_live_abc123"
```

**Response**

```json
{
  "nodes": [
    {
      "node_id": "node_abc123",
      "name": "my-gpu-server",
      "status": "online",
      "gpu": "RTX 4090",
      "vram_gb": 24,
      "utilization": 0.45,
      "tasks_completed_24h": 342,
      "credits_earned_24h": 85,
      "uptime_percent": 99.2,
      "reputation": 0.92,
      "region": "us-west-1",
      "last_seen": "2025-01-15T10:29:55Z"
    }
  ]
}
```

**POST /v1/nodes/configure**

Update node configuration.

```bash
curl -X POST https://api.node-group.ai/v1/nodes/configure \
  -H "Authorization: Bearer ng_node_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "max_concurrent_tasks": 4,
    "accept_task_types": ["inference", "embedding"],
    "max_gpu_utilization": 0.8
  }'
```

---

### Health

**GET /v1/health**

Check API health (no auth required).

```bash
curl https://api.node-group.ai/v1/health
```

**Response**

```json
{
  "status": "healthy",
  "version": "1.2.3",
  "regions": {
    "us-west": "healthy",
    "us-east": "healthy",
    "eu-west": "degraded",
    "ap-east": "healthy"
  },
  "total_nodes": 45230,
  "available_gpu_hours": 12500
}
```

---

## SDK Examples

### Python

```python
from node_group_ai import Client

client = Client(api_key="ng_live_abc123")

# Inference
response = client.inference(
    model="llama-3.3-70b",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)

# Streaming
for chunk in client.inference(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
):
    print(chunk.choices[0].delta.content, end="")

# Embeddings
embeddings = client.embeddings(
    model="bge-large-en-v1.5",
    input=["Hello world"]
)
print(embeddings.data[0].embedding[:5])

# Check balance
balance = client.credits.balance()
print(f"Credits: {balance.balance}")
```

### JavaScript

```javascript
import NodeGroupAI from 'node-group-ai';

const client = new NodeGroupAI({ apiKey: 'ng_live_abc123' });

// Inference
const response = await client.inference({
  model: 'llama-3.3-70b',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});
console.log(response.choices[0].message.content);

// Streaming
const stream = await client.inference({
  model: 'llama-3.3-70b',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content);
}
```

### cURL

```bash
# Set API key
export NODE_GROUP_AI_KEY="ng_live_abc123"

# Inference
curl -X POST https://api.node-group.ai/v1/inference \
  -H "Authorization: Bearer $NODE_GROUP_AI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hi"}]}'
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `invalid_api_key` | 401 | API key invalid or expired |
| `insufficient_credits` | 402 | Not enough credits |
| `rate_limited` | 429 | Too many requests |
| `model_not_found` | 404 | Model doesn't exist |
| `node_unavailable` | 503 | No nodes available for task |
| `task_timeout` | 504 | Task exceeded timeout |
| `validation_error` | 400 | Invalid request body |

**Error Response Format**

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "You need 10 credits but only have 5",
    "param": null,
    "type": "credits_error"
  }
}
```

---

## Webhooks

Configure webhooks for async events.

**POST /v1/webhooks**

```bash
curl -X POST https://api.node-group.ai/v1/webhooks \
  -H "Authorization: Bearer ng_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://my-app.com/webhooks/node-group",
    "events": ["training.completed", "training.failed", "node.offline"]
  }'
```

**Event Types**

| Event | Description |
|-------|-------------|
| `training.completed` | Training job finished |
| `training.failed` | Training job failed |
| `training.checkpoint` | Checkpoint saved |
| `node.online` | Node came online |
| `node.offline` | Node went offline |
| `credits.low` | Balance below threshold |

**Webhook Payload**

```json
{
  "id": "evt_abc123",
  "type": "training.completed",
  "created_at": "2025-01-15T10:30:00Z",
  "data": {
    "job_id": "trn_abc123",
    "model_url": "https://storage.node-group.ai/models/trn_abc123/final.pt",
    "final_loss": 0.234,
    "gpu_hours_used": 4.2,
    "credits_charged": 42
  }
}
```

---

## Related Documentation

- [Architecture Overview](01-architecture-overview.md) - System design
- [Credit Economy](06-credit-economy.md) - Credit system details
- [Security Model](07-security-model.md) - Authentication and security
