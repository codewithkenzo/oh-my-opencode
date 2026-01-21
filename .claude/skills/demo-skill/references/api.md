# API Reference

This content comes from `references/api.md` and should be merged into the skill.

## Available Endpoints

- `GET /api/status` - Check system status
- `POST /api/task` - Create a new task
- `GET /api/session/:id` - Get session info

## Authentication

All endpoints require a Bearer token in the Authorization header.

```typescript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```
