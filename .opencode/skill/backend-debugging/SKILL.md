---
name: backend-debugging
description: Backend debugging patterns for APIs, databases, servers, and system-level issues. Load when debugging non-visual issues like 500 errors, DB problems, or server crashes.
---

# Backend Debugging Skill

Systematic debugging for backend systems. Use when:
- API returns unexpected errors
- Database queries fail or perform poorly
- Server crashes or hangs
- Auth/permissions issues
- Performance problems
- Integration failures

## Debugging Methodology

### 1. OBSERVE - Gather ALL Evidence First

**Never guess. Collect data.**

```bash
# Check logs
bun run dev 2>&1 | tail -100
cat logs/error.log | tail -50

# Check recent changes
git log --oneline -10
git diff HEAD~3..HEAD --stat

# Check environment
env | grep -E "(DB|API|AUTH|SECRET)"

# Check process state
lsof -i :3000  # port usage
ps aux | grep bun
```

### 2. HYPOTHESIZE - Rank by Likelihood

| Layer | Common Issues |
|-------|---------------|
| **Config** | Wrong env var, missing secret, typo in URL |
| **Database** | Connection failed, migration missing, schema mismatch |
| **API** | Route not registered, middleware order, missing handler |
| **Auth** | Token expired, wrong scope, CORS misconfigured |
| **Async** | Unhandled promise, race condition, timeout |
| **Memory** | Leak, OOM, pool exhaustion |

### 3. ISOLATE - Test in Minimal Context

```bash
# Test single endpoint
curl -X GET http://localhost:3000/api/health -v

# Test DB connection
bun run --eval "import { db } from './src/db'; console.log(await db.query.users.findFirst())"

# Test with minimal payload
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"test"}'
```

### 4. TRACE - Follow the Data

```typescript
// Add strategic logging
console.log("[DEBUG] Input:", JSON.stringify(input, null, 2));
console.log("[DEBUG] DB Query:", query.toSQL());
console.log("[DEBUG] Response:", JSON.stringify(response, null, 2));
```

### 5. FIX - Minimal Change

- Fix ONLY the root cause
- No refactoring during bugfix
- Add test that catches this bug
- Document the issue

## Common Issue Patterns

### Database Issues

**Connection Failed**
```typescript
// Check: Is DATABASE_URL set?
// Check: Is DB server running?
// Check: Firewall/network access?

// Fix: Validate connection on startup
import { db } from './db';
await db.execute('SELECT 1'); // Will throw if can't connect
```

**Migration Not Applied**
```bash
# Check migration status
bunx drizzle-kit check
bunx drizzle-kit push

# If schema mismatch, regenerate
bunx drizzle-kit generate
```

**N+1 Query**
```typescript
// BAD: Fetches users, then loops to fetch posts
const users = await db.query.users.findMany();
for (const user of users) {
  user.posts = await db.query.posts.findMany({ where: eq(posts.userId, user.id) });
}

// GOOD: Single query with relation
const users = await db.query.users.findMany({
  with: { posts: true }
});
```

### API Issues

**404 on Valid Route**
```typescript
// Check: Route registration order matters!
// Specific routes before wildcards

// BAD:
app.get('/users/:id', handler);
app.get('/users/me', handler); // Never reached!

// GOOD:
app.get('/users/me', handler);
app.get('/users/:id', handler);
```

**500 Internal Error**
```typescript
// Check: Async error handling
// BAD:
app.get('/api/data', (c) => {
  const data = db.query(); // Throws, crashes server!
  return c.json(data);
});

// GOOD:
app.get('/api/data', async (c) => {
  try {
    const data = await db.query();
    return c.json(data);
  } catch (error) {
    console.error('[API Error]', error);
    return c.json({ error: 'Internal error' }, 500);
  }
});
```

**CORS Issues**
```typescript
// Check: Middleware order - CORS must be FIRST
import { cors } from 'hono/cors';

// GOOD:
const app = new Hono();
app.use('*', cors({ origin: '*' })); // First!
app.use('*', authMiddleware);
app.get('/api/data', handler);
```

### Auth Issues

**Token Validation Fails**
```typescript
// Check: Token format
// Check: Secret key matches
// Check: Token not expired
// Check: Correct algorithm

// Debug:
import jwt from 'jsonwebtoken';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('[AUTH] Token valid:', decoded);
} catch (e) {
  console.log('[AUTH] Token error:', e.message);
}
```

### Performance Issues

**Slow Endpoint**
```typescript
// Profile with timing
const start = performance.now();
const result = await expensiveOperation();
console.log(`[PERF] Operation took ${performance.now() - start}ms`);

// Check for:
// - N+1 queries
// - Missing indexes
// - Blocking operations
// - Large payloads
```

## Tools Reference

| Tool | Use For |
|------|---------|
| `bash` | Run commands, check logs, curl endpoints |
| `read` | Read source files, configs |
| `grep` | Search for error patterns, env usage |
| `lsp_diagnostics` | Find type errors |
| `lsp_find_references` | Trace where function is called |
| `lsp_goto_definition` | Jump to implementation |

## Anti-Patterns

❌ **DO NOT** guess the cause without evidence
❌ **DO NOT** apply random fixes hoping something works
❌ **DO NOT** ignore stack traces
❌ **DO NOT** refactor while fixing bugs
❌ **DO NOT** skip adding prevention tests

## Workflow with Koji - debugger

When stuck, delegate to Koji:

```typescript
call_omo_agent({
  subagent_type: "Koji - debugger", // Backend specialist
  prompt: `
    LOAD SKILL: backend-debugging

    ERROR: [paste exact error]
    STACK TRACE: [paste stack]

    CONTEXT:
    - Endpoint: POST /api/users
    - Recent changes: Added validation middleware
    - Environment: Local dev

    Diagnose root cause and provide fix.
  `
})
```
