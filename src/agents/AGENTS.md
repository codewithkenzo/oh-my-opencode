# AGENTS KNOWLEDGE BASE

## OVERVIEW

8 AI agents for multi-model orchestration using Musashi-style naming.

This module was compressed from 23 -> 8 built-ins (Sprint 1). Sprint 4.2 adds category/skill routing in `delegate_task` so orchestration can select agent + skills by domain.

## AGENT ROSTER

| Role | Agent | Purpose |
|------|-------|---------|
| Orchestration | `Musashi` | Primary orchestrator for direct user interaction |
| Orchestration | `Musashi - boulder` | Master orchestrator (Atlas) that executes plans via `delegate_task()` |
| Orchestration | `Musashi - plan` | Planning mode using `createMetisAgent` (Prometheus pre-planning flow) |
| Advisors | `K9 - advisor` | Read-only strategic consultant for architecture/debugging |
| Explorers | `X1 - explorer` | Internal codebase exploration and contextual search |
| Explorers | `R2 - researcher` | External docs/OSS research and multi-repo analysis |
| Builders | `T4 - frontend builder` | Frontend-oriented Oracle alias; behavior/model comes from overrides/category |
| Builders | `D5 - backend builder` | Backend-oriented Oracle alias; behavior/model comes from overrides/category |

## CATEGORY ROUTING

Default category -> agent routing is defined in `src/tools/delegate-task/constants.ts` (`CATEGORY_AGENTS`):

| Category | Routed Agent | Notes |
|----------|--------------|-------|
| `visual-engineering` | `T4 - frontend builder` | UI/UX and visual execution |
| `ultrabrain` | `D5 - backend builder` | High-complexity architecture/business logic |
| `artistry` | `T4 - frontend builder` | Creative visual tasks |
| `quick` | `D5 - backend builder` | Fast/low-overhead implementation |
| `most-capable` | `D5 - backend builder` | High-capability execution path |
| `writing` | `D5 - backend builder` | Documentation, prose, technical writing (W7 is legacy config alias) |
| `general` | `D5 - backend builder` | Default general-purpose route |

User category config can override routing per category via `categories.<name>.agent` (see `resolveCategoryConfig()` in `src/tools/delegate-task/tools.ts`).

## CATEGORY SKILLS

Category auto-injected skills are defined in `src/tools/delegate-task/constants.ts` (`CATEGORY_SKILLS`).
If `delegate_task` is called with both category and explicit `skills`, the final set is merged and deduplicated.

| Category | Auto Skills |
|----------|-------------|
| `visual-engineering` | `frontend-ui-ux`, `frontend-stack`, `component-stack`, `kenzo-tailwind`, `motion-system`, `visual-assets` |
| `ultrabrain` | `blueprint-architect`, `effect-ts-expert`, `remeda-utils`, `zod-patterns` |
| `artistry` | `frontend-ui-ux`, `kenzo-design-tokens`, `motion-system`, `visual-assets`, `kenzo-portfolio-craft`, `ui-designer` |
| `quick` | `git-master`, `git-workflow` |
| `most-capable` | `blueprint-architect`, `effect-ts-expert`, `testing-stack`, `research-tools`, `backend-debugging` |
| `writing` | `kenzo-agents-md`, `kenzo-seo-geo`, `research-tools` |
| `general` | `linearis`, `git-workflow`, `research-tools`, `zod-patterns` |

## FILE STRUCTURE

Current `src/agents/*.ts` files:

```
agents/
├── atlas.ts
├── explore.ts
├── index.ts
├── librarian.ts
├── metis.ts
├── momus.test.ts
├── momus.ts
├── oracle.ts
├── prometheus-prompt.test.ts
├── prometheus-prompt.ts
├── sisyphus-prompt-builder.ts
├── sisyphus.ts
├── types.ts
├── utils.test.ts
└── utils.ts
```

`BuiltinAgentName` is defined in `src/agents/types.ts` and contains 8 entries only.

## AGENT MODELS

Model resolution is runtime-based (`resolveModelWithFallback`) and configurable by `agents.<name>.model` in `~/.config/opencode/oh-my-opencode.json`.

| Agent | Default Fallback Chain (first preferred) | Temperature |
|-------|------------------------------------------|-------------|
| `Musashi` | `claude-opus-4-5` -> `glm-4.7` -> `gpt-5.2-codex` -> `gemini-3-pro` | not fixed in factory |
| `Musashi - boulder` | `claude-sonnet-4-5` -> `gpt-5.2` -> `gemini-3-pro` | `0.1` |
| `Musashi - plan` | `claude-opus-4-5` -> `gpt-5.2` -> `gemini-3-pro` | `0.3` |
| `K9 - advisor` | `gpt-5.2` -> `claude-opus-4-5` -> `gemini-3-pro` | `0.1` |
| `X1 - explorer` | `claude-haiku-4-5` -> `gpt-5-nano` | `0.1` |
| `R2 - researcher` | `glm-4.7` -> `big-pickle` -> `claude-sonnet-4-5` | `0.1` |
| `T4 - frontend builder` | system default unless overridden (Oracle alias) | `0.1` |
| `D5 - backend builder` | system default unless overridden (Oracle alias) | `0.1` |

Notes:
- `T4 - frontend builder` and `D5 - backend builder` intentionally use `createOracleAgent` in `agentSources`.
- They are differentiated by category routing and user overrides (model, prompt append, variant), not by separate factory code.

## LEGACY NAME MAPPING

Backward compatibility map from `LEGACY_TO_MUSASHI_NAME` in `src/agents/utils.ts`:

| Legacy Name | Current Builtin |
|-------------|-----------------|
| `sisyphus` | `Musashi` |
| `Sisyphus` | `Musashi` |
| `oracle` | `K9 - advisor` |
| `Oracle` | `K9 - advisor` |
| `librarian` | `R2 - researcher` |
| `Librarian` | `R2 - researcher` |
| `explore` | `X1 - explorer` |
| `Explore` | `X1 - explorer` |
| `atlas` | `Musashi - boulder` |
| `Atlas` | `Musashi - boulder` |
| `metis` | `Musashi - plan` |
| `momus` | `Musashi - plan` |
| `multimodal-looker` | `T4 - frontend builder` |
| `Sisyphus-Junior` | `D5 - backend builder` |
| `J1 - junior` | `D5 - backend builder` |
| `M1 - analyst` | `Musashi - plan` |
| `M2 - reviewer` | `Musashi - plan` |
| `V1 - viewer` | `T4 - frontend builder` |
| `H3 - bulk builder` | `D5 - backend builder` |
| `F1 - fast builder` | `D5 - backend builder` |
| `S6 - designer` | `T4 - frontend builder` |
| `G5 - debugger` | `K9 - advisor` |
| `W7 - writer` | `D5 - backend builder` |
| `M10 - critic` | `T4 - frontend builder` |
| `B3 - security` | `K9 - advisor` |
| `O9 - specialist` | `K9 - advisor` |
| `Senshi - distributor` | `Musashi` |
| `Seichou - growth` | `Musashi` |
| `Tsunagi - networker` | `Musashi` |

## HOW TO ADD

1. Create agent factory file in `src/agents/` returning `AgentConfig`.
2. Add entry to `agentSources` in `src/agents/utils.ts`.
3. Add/adjust metadata in `agentMetadata` in `src/agents/utils.ts` when it should appear in dynamic prompt sections.
4. Update `BuiltinAgentName` in `src/agents/types.ts`.
5. Export from `src/agents/index.ts` if public surface should include it.
6. Add model fallback entry in `src/shared/model-requirements.ts` when the agent should not use plain system default.
7. If category-routable, wire default in `CATEGORY_AGENTS` and optional skills in `CATEGORY_SKILLS` (`src/tools/delegate-task/constants.ts`).

## TOOL RESTRICTIONS

Derived from each agent factory permission config:

| Agent | Restricted Tools |
|-------|------------------|
| `Musashi` | `call_omo_agent` denied (question tool explicitly allowed) |
| `Musashi - boulder` | `task`, `call_omo_agent` denied |
| `Musashi - plan` | `write`, `edit`, `task`, `delegate_task` denied |
| `K9 - advisor` | `write`, `edit`, `task`, `delegate_task` denied |
| `X1 - explorer` | `write`, `edit`, `task`, `delegate_task`, `call_omo_agent` denied |
| `R2 - researcher` | `write`, `edit`, `task`, `delegate_task`, `call_omo_agent` denied |
| `T4 - frontend builder` | same restrictions as `K9 - advisor` (Oracle alias) |
| `D5 - backend builder` | same restrictions as `K9 - advisor` (Oracle alias) |

## KEY PATTERNS

- **Factory pattern**: `createXXXAgent(modelOrContext): AgentConfig`.
- **Source registry**: `agentSources` is the single built-in agent map.
- **Prompt metadata**: `AgentPromptMetadata` powers dynamic Sisyphus/Atlas prompt sections.
- **Model routing**: `resolveModelWithFallback` + `AGENT_MODEL_REQUIREMENTS`.
- **Alias strategy**: T4/D5 reuse Oracle factory intentionally; behavior split is config/category-driven.
- **Category composition**: `CATEGORY_AGENTS` picks executor, `CATEGORY_SKILLS` injects domain guidance.

## ANTI-PATTERNS

- **Trusting subagent completion blindly**: always verify outputs independently.
- **High temperature for code-heavy tasks**: keep coding agents low-temp unless category explicitly requires creativity.
- **Sequential exploration**: launch exploration/research in parallel whenever independent.
- **Hardcoding legacy names in new logic**: always normalize via mapping/config migration paths.
