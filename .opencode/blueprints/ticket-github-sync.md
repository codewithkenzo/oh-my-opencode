# Blueprint: Ticket → GitHub Projects V2 Sync

## Summary

Sync local markdown tickets (`.tickets/*.md`) to GitHub Projects V2 as **private draft items**. Enables visual kanban view in GitHub UI while maintaining local-first, offline-capable workflow via Syncthing. Push-only sync treats GitHub as a read-only projection of local state.

## Acceptance Criteria

- [ ] `ticket_sync` command pushes local tickets to GitHub Projects V2
- [ ] GitHub Project is PRIVATE even on public repos
- [ ] Auto-creates project if not present (`--create-project` flag)
- [ ] Uses draft items (not Issues) to avoid cluttering repo
- [ ] Incremental sync based on `last_synced_at` timestamp
- [ ] Maps ticket status to project columns (Todo/In Progress/Done)
- [ ] Stores `github_item_id` in ticket frontmatter for mapping
- [ ] Retry with exponential backoff on API failures
- [ ] Clear error messages for permission/scope issues

## Technical Approach

### Chosen: Push-only sync with frontmatter ID mapping

**Architecture:**
```
.tickets/bvt-6966.md  ←── Local-first (Syncthing)
         │
         ▼
    ticket_sync()  ──→  GitHub Project (PRIVATE)
         │                   │
         │              Draft Items (not Issues)
         ▼                   ▼
    tk CLI tools        GitHub Projects UI
```

**Why push-only:**
- Local-first philosophy: local files are source of truth
- GitHub is view-only for collaborators without repo clone
- No conflict resolution complexity
- Simpler implementation, fewer failure modes

### Rejected Alternatives

| Alternative | Why Rejected |
|-------------|--------------|
| Bidirectional sync | Adds conflict resolution complexity; GitHub draft items are read-only anyway |
| Create GitHub Issues | Clutters repo issue tracker; want private visibility |
| Separate mapping file | Co-location in frontmatter is simpler, no file sync issues |
| Full sync every time | Inefficient for 100+ tickets; timestamp-based is O(changed) not O(all) |
| beads_sync pattern | Requires mandatory sync; tickets should be commit-when-ready |

## Implementation

### Phase 1: Config & Frontmatter (S - <1h)

**Extended frontmatter in `.tickets/*.md`:**
```yaml
---
id: bvt-6966
title: Add GitHub sync
status: open
priority: 2
type: feature
github_item_id: "PVTI_xxxxx"    # Added: maps to GitHub draft item
last_synced_at: "2026-01-05T10:30:00Z"  # Added: incremental sync
---
```

**Project config in `.tickets/.github.yaml`:**
```yaml
owner: "codewithkenzo"          # GitHub user or org
project_name: "oh-my-opencode"  # Project title (created if missing)
visibility: private             # PRIVATE even on public repo
sync_on_close: false            # Optional: auto-sync on ticket_close

# Status field mapping
columns:
  open: "Todo"
  in_progress: "In Progress"
  closed: "Done"
```

**Token storage:** `~/.config/tk/github-token` (not committed)

### Phase 2: GitHub Client (M - 1 day)

**New file: `src/tools/ticket/github.ts`**

```typescript
import { Effect, Schedule, Duration, Data } from "effect"

// Error types
class GitHubApiError extends Data.TaggedError("GitHubApiError")<{
  readonly message: string
  readonly status?: number
}> {}

class GitHubAuthError extends Data.TaggedError("GitHubAuthError")<{
  readonly message: string
  readonly requiredScopes: string[]
}> {}

// GraphQL mutations
const CREATE_PROJECT = `
  mutation CreateProject($ownerId: ID!, $title: String!) {
    createProjectV2(input: { ownerId: $ownerId, title: $title }) {
      projectV2 { id url number }
    }
  }
`

const ADD_DRAFT_ITEM = `
  mutation AddDraftItem($projectId: ID!, $title: String!, $body: String) {
    addProjectV2DraftIssue(input: { 
      projectId: $projectId, 
      title: $title, 
      body: $body 
    }) {
      projectItem { id }
    }
  }
`

const UPDATE_ITEM_STATUS = `
  mutation UpdateStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) {
      projectV2Item { id }
    }
  }
`

// Retry policy
const retryPolicy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3)),
  Schedule.whileInput((error: GitHubApiError) => 
    error.status === 429 || (error.status ?? 0) >= 500
  )
)
```

### Phase 3: Sync Tool (M - 1 day)

**New tool: `ticket_sync`**

```typescript
interface SyncOptions {
  create_project?: boolean  // Auto-create if missing
  force?: boolean           // Ignore last_synced_at
}

interface SyncResult {
  created: number
  updated: number
  failed: string[]  // Ticket IDs that failed
  project_url: string
}
```

**Sync algorithm:**
```typescript
const syncTickets = Effect.gen(function* () {
  const config = yield* loadGitHubConfig()
  const tickets = yield* readAllTickets()
  
  // Get or create project
  const project = yield* getOrCreateProject(config)
  
  // Filter to changed tickets (unless --force)
  const toSync = options.force 
    ? tickets 
    : tickets.filter(t => needsSync(t))
  
  const results = { created: 0, updated: 0, failed: [] }
  
  for (const ticket of toSync) {
    const result = yield* syncSingleTicket(ticket, project).pipe(
      Effect.retry(retryPolicy),
      Effect.catchTag("GitHubApiError", (e) => {
        results.failed.push(ticket.id)
        return Effect.logError(`Failed: ${ticket.id} - ${e.message}`)
      })
    )
    
    if (result) {
      ticket.github_item_id ? results.updated++ : results.created++
      yield* updateTicketFrontmatter(ticket, result.itemId)
    }
  }
  
  return results
})
```

### Phase 4: Tool Registration (S - 2h)

**Add to `src/tools/ticket/tools.ts`:**
```typescript
export const ticketSyncTool = createTool({
  name: "ticket_sync",
  description: "Sync tickets to GitHub Projects V2. Creates private project if needed.",
  parameters: z.object({
    create_project: z.boolean().optional().describe("Create project if missing"),
    force: z.boolean().optional().describe("Force full sync, ignore timestamps"),
  }),
  execute: async (params) => {
    const result = await Effect.runPromise(syncTickets(params))
    return formatSyncResult(result)
  }
})
```

## Tasks

| # | Task | Size | Agent | Skills |
|---|------|------|-------|--------|
| 1 | Add github_item_id/last_synced_at to Ticket type | S | D5 | effect-ts |
| 2 | Create .github.yaml config parser | S | D5 | zod-patterns |
| 3 | Implement GitHub GraphQL client with Effect | M | D5 | effect-ts |
| 4 | Add getOrCreateProject mutation | S | D5 | - |
| 5 | Add addDraftItem mutation | S | D5 | - |
| 6 | Add updateItemStatus mutation | S | D5 | - |
| 7 | Implement syncTickets algorithm | M | D5 | effect-ts |
| 8 | Register ticket_sync tool | S | D5 | - |
| 9 | Update ticket frontmatter parser for new fields | S | D5 | - |
| 10 | Add retry policy and error handling | S | D5 | effect-ts |
| 11 | Write tests for sync logic | M | D5 | testing-stack |
| 12 | Update skill/ticket-workflow docs | S | W7 | - |

**Total estimate:** 2-3 days

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token missing `project` scope | High | Validate scopes on first call, clear error message with fix URL |
| GitHub API rate limits | Medium | Exponential backoff with jitter, max 3 retries |
| Project not found | Medium | `--create-project` flag, auto-create with PRIVATE visibility |
| Network failure mid-sync | Low | Continue with other tickets, report failures, re-run is idempotent |
| Large ticket count (100+) | Low | Incremental sync only processes changed tickets |
| Concurrent file modification | Low | Timestamp-based; latest local version wins |

## API Requirements

**GitHub Token Scopes:**
- Classic PAT: `project` (full) or `read:project` + `write:project`
- Fine-grained PAT: `Projects: Read and Write`

**GraphQL Endpoints Used:**
- `createProjectV2` - Create new project
- `addProjectV2DraftIssue` - Add ticket as draft item
- `updateProjectV2ItemFieldValue` - Update status column
- `viewer { id }` - Get owner ID for project creation

## Config Examples

**Minimal `.tickets/.github.yaml`:**
```yaml
owner: codewithkenzo
project_name: my-project
```

**Full config:**
```yaml
owner: codewithkenzo
project_name: my-project
visibility: private
sync_on_close: false

columns:
  open: Todo
  in_progress: In Progress
  closed: Done

# Optional: custom field mapping
fields:
  priority:
    field_name: Priority
    mapping:
      0: P0 - Critical
      1: P1 - High
      2: P2 - Medium
      3: P3 - Low
```

## Usage

```bash
# First time: create project and sync all
ticket_sync --create-project

# Regular sync: only changed tickets
ticket_sync

# Force full resync
ticket_sync --force

# Check sync status
tk show bvt-6966  # Shows github_item_id if synced
```

## Future Enhancements (Not in Scope)

- `--watch` mode for auto-sync on file changes
- Bidirectional sync (pull from GitHub)
- Multi-project sync
- Custom field sync (priority, type as project fields)
- Webhook for real-time GitHub → local updates

## Research Sources

- [GitHub Projects V2 GraphQL API](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-projects)
- [createProjectV2 mutation](https://docs.github.com/en/graphql/reference/mutations#createprojectv2)
- [addProjectV2DraftIssue mutation](https://docs.github.com/en/graphql/reference/mutations#addprojectv2draftissue)
- [Managing project visibility](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects)
- [Effect-TS retry scheduling](https://effect.website/docs/scheduling/retry)
