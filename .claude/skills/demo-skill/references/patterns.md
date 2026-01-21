# Coding Patterns

This content comes from `references/patterns.md` and should be merged into the skill.

## Error Handling Pattern

Always use typed errors:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

## Async Pattern

Use async/await with proper error boundaries:

```typescript
async function safeExecute<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null]
  } catch (error) {
    return [null, error as Error]
  }
}
```

## Validation Pattern

Always validate inputs at boundaries:

```typescript
import { z } from 'zod'

const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  status: z.enum(['pending', 'in_progress', 'completed'])
})
```
