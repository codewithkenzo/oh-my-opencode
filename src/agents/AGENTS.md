# AGENTS KNOWLEDGE BASE

## OVERVIEW

8 AI agents (7 + boulder mode) for multi-model orchestration. Musashi (primary), K9 (consultant), X1 (explorer), R2 (researcher), T4 (frontend), D5 (backend), Musashi-plan (planner), Musashi-boulder (autonomous).

## STRUCTURE

```
agents/
├── sisyphus.ts                 # Musashi main prompt (450 lines)
├── orchestrator-sisyphus.ts    # Musashi orchestrator/boulder (1600 lines)
├── sisyphus-prompt-builder.ts  # Dynamic prompt generation (359 lines)
├── atlas.ts                    # Boulder mode agent (572 lines)
├── oracle.ts                   # K9 advisor base (used for K9, T4, D5)
├── kenja-advisor.ts            # K9 advisor reference
├── librarian.ts                # R2 researcher (326 lines)
├── explore.ts                  # X1 explorer (fast grep)
├── takumi-builder.ts           # T4 frontend builder
├── builder.ts                  # D5 backend builder
├── prometheus-prompt.ts        # Musashi-plan planning (1196 lines)
├── metis.ts                    # Plan consultant (315 lines)
├── momus.ts                    # Plan reviewer (444 lines)
├── build-prompt.ts             # Prompt building helper
├── dynamic-agent-prompt-builder.ts  # Dynamic prompt generation (359 lines)
├── types.ts                    # BuiltinAgentName, AgentPromptMetadata
├── utils.ts                    # createBuiltinAgents(), LEGACY_TO_MUSASHI_NAME
└── index.ts                    # Barrel exports
```

## AGENT MODELS

| Agent | Internal Name | Model | Temp | Purpose |
|-------|---------------|-------|------|---------|
| Musashi | Musashi | claude-opus-4-6 | 0.1 | Primary orchestrator |
| Boulder | Musashi - boulder | claude-opus-4-6 | 0.1 | Autonomous execution |
| Planner | Musashi - plan | claude-opus-4-6 | 0.1 | Strategic planning |
| K9 | K9 - advisor | kimi-for-coding/k2p5 | 0.1 | Consultation, debugging, architecture |
| X1 | X1 - explorer | gemini-3-flash | 0.1 | Fast contextual grep |
| R2 | R2 - researcher | kimi-for-coding/k2p5 | 0.1 | Docs, GitHub search, web research |
| T4 | T4 - frontend builder | kimi-for-coding/k2p5 | 0.1 | UI/UX, vision, browser |
| D5 | D5 - backend builder | kimi-for-coding/k2p5 | 0.1 | API, database, server logic |

## HOW TO ADD

1. Create `src/agents/my-agent.ts` exporting factory + metadata
2. Add to `agentSources` in `src/agents/utils.ts`
3. Update `AgentNameSchema` in `src/config/schema.ts`
4. Register in `src/index.ts` initialization

## TOOL RESTRICTIONS

| Agent | Denied Tools |
|-------|-------------|
| K9 - advisor | write, edit, task, delegate_task |
| R2 - researcher | write, edit, task, delegate_task, call_omo_agent |
| X1 - explorer | write, edit, task, delegate_task, call_omo_agent |
| T4 - frontend builder | task, delegate_task |
| D5 - backend builder | task, delegate_task |

## PATTERNS

- **Factory**: `createXXXAgent(model?: string): AgentConfig`
- **Metadata**: `XXX_PROMPT_METADATA` with category, cost, triggers
- **Tool restrictions**: `createAgentToolRestrictions(tools)` or `createAgentToolAllowlist(tools)`
- **Thinking**: 32k budget tokens for Musashi, K9, Planner, Boulder
- **Legacy compat**: `LEGACY_TO_MUSASHI_NAME` maps 30+ old names to v4 names

## ANTI-PATTERNS

- **Trust reports**: NEVER trust "I'm done" - verify outputs
- **High temp**: Don't use >0.3 for code agents
- **Sequential calls**: Use `delegate_task` with `run_in_background`

## BACKWARD COMPATIBILITY

Legacy agent names (sisyphus, oracle, librarian, explore, atlas, etc.) are auto-mapped via `LEGACY_TO_MUSASHI_NAME` in utils.ts and `SCHEMA_AGENT_NAME_MAP` in config/schema.ts.
