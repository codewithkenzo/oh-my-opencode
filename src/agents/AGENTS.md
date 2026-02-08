# AGENTS KNOWLEDGE BASE

## OVERVIEW

23 AI agents for multi-model orchestration using Musashi-style naming convention.

## AGENT ROSTER

| ID | Name | Purpose |
|----|------|---------|
| **Orchestration** | | |
| | `Musashi` | Primary agent |
| | `Musashi - boulder` | Execution mode (orchestrator) |
| | `Musashi - plan` | Planning mode (Prometheus) |
| **Validation** | | |
| | `M1 - analyst` | Pre-planning analysis (Metis) |
| | `M2 - reviewer` | Plan validation (Momus) |
| **Execution** | | |
| | `J1 - junior` | Delegated task executor |
| | `K9 - advisor` | Strategic advisor (Kenja) |
| **Explorers** | | |
| | `X1 - explorer` | Codebase exploration (fast contextual grep) |
| | `R2 - researcher` | External docs/OSS research (librarian) |
| | `V1 - viewer` | Multimodal/PDF analysis |
| **Builders** | | |
| | `T4 - frontend builder` | UI/UX (Takumi) - Oracle alias, configured via overrides |
| | `D5 - backend builder` | APIs/databases (Daiku) - Oracle alias, configured via overrides |
| | `H3 - bulk builder` | Bulk operations (Hayai) |
| | `F1 - fast builder` | Fast scaffolding |
| | `S6 - designer` | Design work (Shokunin) |
| **Specialists** | | |
| | `G5 - debugger` | Visual + backend debugging |
| | `W7 - writer` | Documentation |
| | `M10 - critic` | Visual critique (Miru) |
| | `B3 - security` | Security scanning |
| | `O9 - specialist` | Domain specialist (Opus) |
| **Growth** | | |
| | `Senshi - distributor` | Distribution |
| | `Seichou - growth` | Growth hacking |
| | `Tsunagi - networker` | Networking |

## WORKFLOW PHASES

For complex tasks, follow this phase-based approach:

### Phase 1: SPEC (Context Gathering)
- `X1 - explorer` for codebase patterns (background)
- `R2 - researcher` for external docs/OSS (background)

### Phase 2: ANALYZE (Requirements)
- `M1 - analyst` for gap analysis

### Phase 3: DESIGN (Architecture/Visual)
- **Frontend**: `S6 - designer` → `M10 - critic` for review
- **Backend**: `D5 - backend builder` with architecture skills

### Phase 4: REVIEW (Validation)
- `M2 - reviewer` validates plan/design

### Phase 5: BUILD (Execution)
- `T4 - frontend builder` for UI
- `D5 - backend builder` for APIs/DB
- `J1 - junior` for delegated subtasks

### Phase 6: DEBUG (if needed)
- `G5 - debugger` with visual-debug + debugging skills
- `K9 - advisor` after 2+ failed fix attempts

## STRUCTURE

```
agents/
├── orchestrator-sisyphus.ts    # Orchestrator (1531 lines) - 6-phase delegation
├── sisyphus.ts                 # Main prompt (640 lines)
├── sisyphus-junior.ts          # Delegated task executor (J1)
├── sisyphus-prompt-builder.ts  # Dynamic prompt generation
├── kenja-advisor.ts            # Strategic advisor (K9)
├── librarian.ts                # Research agent (R2)
├── explore.ts                  # Fast grep (X1)
├── takumi-builder.ts           # Frontend builder (T4)
├── builder.ts                  # Backend builder (D5)
├── shokunin-designer.ts        # Designer (S6)
├── g5-debugger.ts              # Debugger (G5)
├── w7-writer.ts                # Technical writer (W7)
├── m10-critic.ts               # Visual critic (M10)
├── b3-security.ts              # Security specialist (B3)
├── o9-specialist.ts            # Domain specialist (O9)
├── multimodal-looker.ts        # Media analyzer (V1)
├── prometheus-prompt.ts        # Planning (1196 lines) - interview mode
├── metis.ts                    # Plan consultant (M1)
├── momus.ts                    # Plan reviewer (M2)
├── hayai-builder.ts            # Bulk builder (H3)
├── f1-fast-builder.ts          # Fast builder (F1)
├── senshi-distributor.ts       # Distribution (Senshi)
├── seichou-growth.ts           # Growth (Seichou)
├── tsunagi-networker.ts        # Networking (Tsunagi)
├── types.ts                    # AgentModelConfig interface
├── utils.ts                    # createBuiltinAgents(), normalizeAgentName()
└── index.ts                    # builtinAgents export
```

## AGENT MODELS

Models are configurable via `~/.config/opencode/oh-my-opencode.json` under `agents.<name>.model`.

| Agent | Default Model | Temperature | Purpose |
|-------|---------------|-------------|---------|
| Musashi | system default | 0.1 | Primary orchestrator |
| Musashi - boulder | system default | 0.1 | Execution orchestrator |
| Musashi - plan | system default | 0.1 | Strategic planning |
| M1 - analyst | system default | 0.1 | Pre-planning analysis |
| M2 - reviewer | system default | 0.1 | Plan validation |
| K9 - advisor | system default | 0.1 | Read-only consultation |
| X1 - explorer | system default | 0.1 | Fast contextual grep |
| R2 - researcher | system default | 0.1 | Docs, GitHub search |
| V1 - viewer | system default | 0.1 | PDF/image analysis |
| T4 - frontend builder | system default | 0.7 | UI generation |
| D5 - backend builder | zai-coding-plan/glm-4.7 | 0.1 | Backend logic |
| H3 - bulk builder | opencode/grok-code | 0.1 | Bulk operations |
| F1 - fast builder | system default | 0.3 | Fast scaffolding |
| S6 - designer | system default | 0.7 | Design systems |
| G5 - debugger | system default | 0.1 | Debugging |
| W7 - writer | system default | 0.3 | Documentation |
| M10 - critic | system default | 0.5 | Visual critique |
| B3 - security | system default | 0.1 | Security assessment |
| O9 - specialist | anthropic/claude-opus-4-5 | 0.1 | Complex problems |

Example config override:
```json
{
  "agents": {
    "X1 - explorer": { "model": "google/antigravity-gemini-3-flash" },
    "R2 - researcher": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

## LEGACY NAME MAPPING

Backward compatibility for older configurations:

| Legacy Name | Musashi Name |
|-------------|--------------|
| `explore` | `X1 - explorer` |
| `librarian` | `R2 - researcher` |
| `oracle` | `K9 - advisor` |
| `frontend-ui-ux-engineer` | `T4 - frontend builder` |
| `document-writer` | `W7 - writer` |
| `multimodal-looker` | `V1 - viewer` |

## HOW TO ADD

1. Create `src/agents/my-agent.ts` exporting `AgentConfig`
2. Add to `agentSources` in `src/agents/utils.ts`
3. Add metadata to `agentMetadata` in `src/agents/utils.ts`
4. Update `BuiltinAgentName` type in `src/agents/types.ts`
5. Register in `src/agents/index.ts`

## TOOL RESTRICTIONS

| Agent | Denied Tools |
|-------|-------------|
| K9 - advisor | write, edit, task, delegate_task |
| R2 - researcher | write, edit, task, delegate_task, call_omo_agent |
| X1 - explorer | write, edit, task, delegate_task, call_omo_agent |
| V1 - viewer | Allowlist: read, glob, grep |

## KEY PATTERNS

- **Factory**: `createXXXAgent(model?: string): AgentConfig`
- **Metadata**: `XXX_PROMPT_METADATA: AgentPromptMetadata`
- **Tool restrictions**: `permission: { edit: "deny", bash: "ask" }`
- **Thinking**: 32k budget tokens for Musashi, K9 - advisor, Prometheus
- **Skills auto-load**: Define in `agentMetadata.skills[]`

## ANTI-PATTERNS

- **Trust reports**: NEVER trust subagent "I'm done" - verify outputs
- **High temp**: Don't use >0.3 for code agents
- **Sequential calls**: Use `delegate_task` with `run_in_background`
