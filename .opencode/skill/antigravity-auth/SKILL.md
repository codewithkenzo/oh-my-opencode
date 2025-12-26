---
name: antigravity-auth
description: Google Antigravity OAuth authentication for accessing Claude and Gemini models via Google's API. Use when debugging auth issues, quota problems, or extending multi-account support.
---

# Antigravity Auth System

## Architecture

```
src/auth/antigravity/
├── plugin.ts          # OpenCode auth plugin entry
├── oauth.ts           # OAuth 2.0 + PKCE flow
├── fetch.ts           # Request interceptor (main logic)
├── response.ts        # Response transformation, SSE handling
├── thinking.ts        # Extended thinking blocks
├── message-converter.ts  # OpenAI ↔ Gemini format
├── project.ts         # GCP project resolution
├── token.ts           # Token refresh/validation
├── thought-signature-store.ts  # Signature caching
└── constants.ts       # Endpoints, headers, scopes
```

## Request Flow

1. OpenCode calls fetch() with OpenAI-format request
2. `createAntigravityFetch()` intercepts
3. Token validation/refresh if needed
4. Convert OpenAI messages → Gemini contents
5. Try endpoints: daily → autopush → prod
6. Transform response back to OpenAI format
7. Extract/store thinking signatures for multi-turn

## Critical Rules

### Thinking Block Order
Claude API requires thinking blocks FIRST in assistant messages:
```typescript
// WRONG: [text, thinking] → Error
// RIGHT: [thinking, text] → OK
reorderThinkingBlocksFirst(parts)  // Always reorder
```

### Signature Preservation
Signatures must be in AI SDK namespace:
```typescript
providerMetadata: {
  anthropic: { signature: "..." }
}
```

### Error Handling
- 429 → Retry with exponential backoff
- 403 SUBSCRIPTION_REQUIRED → Try next endpoint
- 401 → Refresh token and retry

## Debug Mode
```bash
ANTIGRAVITY_DEBUG=1 opencode
```

## Multi-Account
Accounts stored in `~/.local/share/opencode/auth.json`:
```json
{
  "google": {
    "type": "oauth",
    "email": "user@example.com"
  }
}
```

Re-auth: Delete auth.json and restart OpenCode.
