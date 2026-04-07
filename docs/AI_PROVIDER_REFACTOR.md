# AI Provider System Refactor

## Summary

The AI provider system has been successfully refactored to support multiple providers with automatic cascading fallback. The system now supports Zhipu GLM-4 (primary), DeepSeek (secondary), OpenAI (optional), Ollama (local), and Mock mode (development).

---

## File Structure

```
src/lib/ai/
├── index.ts              # AIProviderManager - Main unified service layer
├── providers.ts          # Provider types, pricing, and configuration
├── openai.ts            # OpenAI provider client
├── deepseek.ts          # DeepSeek provider client (NEW)
├── ollama.ts            # Ollama local provider client
└── glm/client.ts        # Zhipu GLM-4 provider client

src/app/api/literature/[id]/
├── summary/route.ts     # Summary generation endpoint
├── chat/route.ts        # Chat with paper endpoint (UPDATED)
└── insights/route.ts    # Extract insights endpoint (UPDATED)
```

---

## Implementation Details

### 1. AIProviderManager (`src/lib/ai/index.ts`)

Main unified service that provides:
- **Automatic provider detection** based on available API keys
- **Cascading fallback** in order: Zhipu → DeepSeek → OpenAI → Ollama → Mock
- **Provider selection** via environment variable or programmatic configuration
- **Summary generation** with three length levels (short, medium, detailed)
- **Chat with paper** functionality (OpenAI & DeepSeek)
- **Extract insights** functionality (OpenAI & DeepSeek)

#### Key Methods:
```typescript
// Get singleton instance (auto-detects provider)
const aiManager = getAIManager();

// Generate summary with automatic fallback
const result = await aiManager.generateSummary(title, abstract, 'medium');

// Use specific provider without fallback
const result = await aiManager.generateSummaryWithProvider('zhipu', title, abstract, 'medium');

// Chat with paper
const result = await aiManager.chatWithPaper(question, title, abstract, chatHistory);

// Extract insights
const result = await aiManager.extractInsights(title, abstract);
```

### 2. Provider Configuration (`src/lib/ai/providers.ts`)

Defines:
- `AIProviderType` - Union type of all supported providers
- `PROVIDER_FALLBACK_ORDER` - Cascading fallback order
- `PRICING` - Cost comparison for all providers (RMB/1M tokens)
- `ESTIMATED_TOKENS_PER_SUMMARY` - Token usage estimates
- `calculateCost()` - Cost calculation helper

### 3. DeepSeek Client (`src/lib/ai/deepseek.ts`) - NEW

Implements DeepSeek API support:
- Base URL: `https://api.deepseek.com`
- Model: `deepseek-chat`
- Pricing: ~¥1 input/1M tokens, ~¥2 output/1M tokens
- Supports: `generateSummary()`, `extractInsights()`, `chatWithPaper()`

### 4. Environment Variables (`.env.example`)

```bash
# Choose provider (optional - auto-detected if not set)
AI_PROVIDER=zhipu

# Primary: Zhipu GLM-4 (recommended for China)
ZHIPU_GLM_API_KEY=your_key_here

# Secondary: DeepSeek (high cost-performance)
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com  # Optional

# Optional: OpenAI (best quality, requires proxy in China)
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional

# Local: Ollama (free, requires local installation)
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# Development: Mock mode (no API required)
# AI_PROVIDER=mock
```

---

## Cost Comparison (1000 summaries, medium length)

| Provider    | Cost (RMB) | Notes                      |
|-------------|------------|----------------------------|
| Zhipu GLM   | ~¥0.50     | Recommended for China      |
| DeepSeek    | ~¥1.00     | High cost-performance      |
| OpenAI      | ~¥7.00     | Best quality               |
| Claude      | ~¥21.00    | Long text processing       |
| Ollama      | Free       | Local, requires resources  |
| Mock        | Free       | Development only           |

---

## API Routes

All routes now use `getAIManager()` for automatic provider selection and fallback.

### POST `/api/literature/[id]/summary`
Generate AI summary with automatic fallback.

```json
{
  "length_level": "medium"
}
```

Response:
```json
{
  "summary": "...",
  "length_level": "medium",
  "created_at": "2024-03-07T...",
  "cached": false,
  "usage": {
    "prompt_tokens": 400,
    "completion_tokens": 600,
    "total_tokens": 1000
  },
  "provider": "zhipu",
  "estimatedCost": 0.0005
}
```

### POST `/api/literature/[id]/chat`
Chat with paper (supports OpenAI & DeepSeek with fallback).

```json
{
  "question": "What is the main contribution?",
  "chat_history": []
}
```

### GET `/api/literature/[id]/insights`
Extract structured insights (supports OpenAI & DeepSeek with fallback).

---

## Usage Examples

### 1. Auto-detect provider (recommended)
```typescript
import { getAIManager } from '@/lib/ai';

const aiManager = getAIManager();
const result = await aiManager.generateSummary(title, abstract, 'medium');
```

### 2. Use specific provider with fallback
```typescript
import { getAIManagerWithProvider } from '@/lib/ai';

const aiManager = getAIManagerWithProvider('zhipu', {
  fallbackEnabled: true
});
const result = await aiManager.generateSummary(title, abstract, 'medium');
```

### 3. Check available providers
```typescript
import { getAvailableProviders } from '@/lib/ai';

const providers = getAvailableProviders();
// Returns: ['zhipu', 'deepseek', 'mock']
```

### 4. Get provider info
```typescript
const aiManager = getAIManager();
const info = aiManager.getProviderInfo();
// Returns: { provider, pricing, estimatedCosts, fallbackEnabled }
```

---

## Fallback Behavior

When `fallbackEnabled: true` (default):

1. Try primary provider (e.g., Zhipu)
2. If failed, try DeepSeek
3. If failed, try OpenAI
4. If failed, try Ollama (if enabled)
5. If failed, fall back to Mock mode
6. Log all attempts and errors

When `fallbackEnabled: false`:
- Only use the specified provider
- Throw error if provider fails

---

## Development Workflow

1. **Local Development (Free)**:
   ```bash
   AI_PROVIDER=mock
   # No API key required
   ```

2. **Ollama (Free, Local)**:
   ```bash
   # Install Ollama: https://ollama.ai
   ollama serve
   ollama pull qwen2.5:7b

   # In .env.local
   OLLAMA_ENABLED=true
   ```

3. **Production (China)**:
   ```bash
   AI_PROVIDER=zhipu
   ZHIPU_GLM_API_KEY=your_key
   DEEPSEEK_API_KEY=your_key  # Backup
   ```

4. **Production (International)**:
   ```bash
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_key
   DEEPSEEK_API_KEY=your_key  # Backup
   ```

---

## Compatibility Notes

- **Summary generation**: All providers supported
- **Chat with paper**: OpenAI & DeepSeek only (requires structured conversation)
- **Extract insights**: OpenAI & DeepSeek only (requires JSON response format)

---

## Testing

To test the system:

1. **Test mock mode** (no API required):
   ```bash
   AI_PROVIDER=mock
   ```

2. **Test specific provider**:
   ```bash
   AI_PROVIDER=zhipu
   ZHIPU_GLM_API_KEY=your_key
   ```

3. **Test fallback**:
   ```bash
   AI_PROVIDER=zhipu
   ZHIPU_GLM_API_KEY=invalid_key  # Will fallback to deepseek
   DEEPSEEK_API_KEY=valid_key
   ```

---

## Troubleshooting

**Problem**: All providers failing
**Solution**: Check API keys, network connection, and verify endpoints

**Problem**: OpenAI timeout in China
**Solution**: Use `OPENAI_BASE_URL` with a proxy, or switch to Zhipu/DeepSeek

**Problem**: Ollama connection failed
**Solution**: Ensure `ollama serve` is running and model is downloaded

**Problem**: High costs
**Solution**: Switch to Zhipu (¥0.5/1M) or DeepSeek (¥1-2/1M)

---

## Future Enhancements

- Add support for Claude (Anthropic) in chat and insights
- Add caching layer to reduce API calls
- Add rate limiting and quota management
- Add telemetry for provider performance monitoring
- Support for custom providers via plugin system
