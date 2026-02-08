# Understanding the Orchestration System

Oh My OpenCode's orchestration system turns a single agent loop into a coordinated multi-agent workflow. This guide explains how **Musashi - plan -> Musashi - boulder -> specialist agents** produces high-quality, verifiable output at scale.

---

## The Core Philosophy

Traditional "user asks -> agent responds" loops degrade on large tasks because of:

1. **Context overload**: large tasks exceed practical working context
2. **Goal drift**: execution diverges from intent
3. **Verification gaps**: completion claims are not always validated
4. **Human bottlenecks**: too much manual steering

The orchestration system solves this with **role separation + explicit delegation + independent verification**.

---

## The Three-Layer Architecture

```mermaid
flowchart TB
    subgraph Planning["Planning Layer (Human + Musashi - plan)"]
        User[("User")]
        Plan["Musashi - plan<br/>Planner"]
        Consultant["Musashi - plan<br/>Consultant mode"]
        Reviewer["Musashi - plan<br/>Review mode"]
    end

    subgraph Execution["Execution Layer"]
        Boulder["Musashi - boulder<br/>Conductor"]
    end

    subgraph Workers["Specialist Layer (8-Agent Architecture)"]
        Musashi["Musashi<br/>Primary orchestrator"]
        K9["K9 - advisor<br/>Strategic consultant"]
        X1["X1 - explorer<br/>Fast exploration"]
        R2["R2 - researcher<br/>Docs + OSS research"]
        T4["T4 - frontend builder<br/>Category-routed"]
        D5["D5 - backend builder<br/>Category-routed"]
    end

    User -->|"Describe work"| Plan
    Plan -->|"Consult"| Consultant
    Consultant --> Plan
    Plan -->|"High-accuracy review"| Reviewer
    Reviewer --> Plan
    Plan -->|"Generate plan"| PlanFile[".sisyphus/plans/*.md"]

    User -->|"/start-work"| Boulder
    PlanFile -->|"Read"| Boulder

    Boulder -->|"delegate_task(agent/category)"| Musashi
    Boulder -->|"delegate_task(agent)"| K9
    Boulder -->|"delegate_task(agent)"| X1
    Boulder -->|"delegate_task(agent)"| R2
    Boulder -->|"delegate_task(category)"| T4
    Boulder -->|"delegate_task(category)"| D5

    Musashi -->|"Results"| Boulder
    K9 -->|"Advice"| Boulder
    X1 -->|"Code patterns"| Boulder
    R2 -->|"Documentation"| Boulder
    T4 -->|"UI output"| Boulder
    D5 -->|"Backend/general output"| Boulder
```

---

## Layer 1: Planning (Musashi - plan)

### Musashi - plan: Strategic Planner

Musashi - plan is an interviewer-first planner. It does not rush into implementation.

**Interview loop:**

```mermaid
stateDiagram-v2
    [*] --> Interview: User describes work
    Interview --> Research: Launch X1 / R2 for context
    Research --> Interview: Gather evidence
    Interview --> ClearanceCheck: After each response

    ClearanceCheck --> Interview: Requirements unclear
    ClearanceCheck --> PlanGeneration: Requirements clear

    PlanGeneration --> ConsultantPass: Gap detection
    ConsultantPass --> WritePlan: Integrate findings
    WritePlan --> ReviewChoice: High-accuracy requested?

    ReviewChoice --> ReviewPass: Yes
    ReviewChoice --> Done: No

    ReviewPass --> WritePlan: REJECT - revise
    ReviewPass --> Done: OKAY - approved

    Done --> [*]: Hand off to /start-work
```

**Intent-specific behavior:**

| Intent | Planner Focus | Typical Questions |
|--------|---------------|------------------|
| Refactoring | Behavior safety | "What tests prove current behavior?" |
| New feature | Scope boundaries | "What is explicitly out of scope?" |
| Architecture | Long-term fit | "What scale/lifespan assumptions matter?" |
| Mid-sized change | Guardrails | "What must not be modified?" |

### Consultant and Review Modes

Consultant mode and review mode are now internal Musashi - plan passes:

- **Consultant mode**: catches ambiguity, hidden requirements, over-engineering risk
- **Review mode**: validates clarity, acceptance criteria, references, and rollout safety
- **Outcome**: a plan file in `.sisyphus/plans/` that can be executed without guesswork

---

## Layer 2: Execution (Musashi - boulder)

### The Conductor Mindset

Musashi - boulder coordinates execution, does independent verification, and keeps state across sessions.

```mermaid
flowchart LR
    subgraph Boulder["Musashi - boulder"]
        Read["1. Read plan"]
        Analyze["2. Analyze tasks"]
        Delegate["3. Delegate"]
        Verify["4. Verify"]
        Report["5. Report"]
    end

    Read --> Analyze
    Analyze --> Delegate
    Delegate --> Verify
    Verify -->|"more tasks"| Delegate
    Verify -->|"done"| Report
```

**What Musashi - boulder does directly:**
- Reads plan and repository context
- Runs diagnostics/tests for independent verification
- Tracks execution state in `boulder.json`

**What Musashi - boulder delegates:**
- Feature implementation and edits
- Large refactors and test authoring
- Domain-specific tasks (frontend, writing, architecture deep dives)

### Wisdom Accumulation

Every delegation cycle appends operational memory:

```text
.sisyphus/notepads/{plan-name}/
├── learnings.md
├── decisions.md
├── issues.md
├── verification.md
└── problems.md
```

This prevents repeated mistakes and stabilizes long-running work.

---

## Layer 3: Specialist Execution (Category-Routed + Named Agents)

### Category Routing (replaces fixed "junior" worker)

There is no standalone junior executor agent in the current architecture. Execution is routed by category:

| Category | Routed Agent | Auto Skills |
|----------|--------------|-------------|
| `visual-engineering` | `T4 - frontend builder` | `frontend-ui-ux`, `frontend-stack`, `component-stack` |
| `ultrabrain` | `D5 - backend builder` | `blueprint-architect`, `effect-ts-expert` |
| `artistry` | `T4 - frontend builder` | creative/design skills |
| `quick` | `D5 - backend builder` | `git-master`, `git-workflow` |
| `most-capable` | `D5 - backend builder` | `blueprint-architect`, `testing-stack` |
| `writing` | `D5 - backend builder` | `kenzo-agents-md`, `research-tools` |
| `general` | `D5 - backend builder` | `linearis`, `git-workflow`, `research-tools` |

### Named Agent Delegation

Use direct agent targeting when category routing is not enough:

- `K9 - advisor` for read-only strategic analysis
- `X1 - explorer` for fast local exploration
- `R2 - researcher` for external docs and OSS patterns
- `Musashi` for high-capability orchestration tasks

---

## The Orchestration Workflow

```mermaid
sequenceDiagram
    participant User
    participant Plan as Musashi - plan
    participant Boulder as Musashi - boulder
    participant Worker as Routed Agent (T4/D5 or Named)
    participant Notepad as .sisyphus/notepads/

    User->>Plan: planning request
    Plan->>Plan: interview + consultant/review passes
    Plan->>User: plan ready in .sisyphus/plans/*.md

    User->>Boulder: /start-work
    Boulder->>Boulder: read plan + build execution map

    loop each task (parallel where possible)
        Boulder->>Notepad: read accumulated wisdom
        Boulder->>Worker: delegate_task(category/agent, prompt)
        Worker->>Worker: execute + verify locally
        Worker->>Notepad: append learnings/decisions
        Worker->>Boulder: results
        Boulder->>Boulder: verify independently
    end

    Boulder->>User: final report
```

---

## Why This Architecture Works

1. **Separation of concerns**
   - Planning: Musashi - plan
   - Execution control: Musashi - boulder
   - Implementation: routed specialists

2. **Category abstraction over hardcoded workers**
   - Routing is intent-based, not tied to one fixed executor identity

3. **Verification-first completion**
   - Orchestrator validates outputs rather than trusting completion claims

4. **Cost/performance balance**
   - Expensive models used where strategic depth matters
   - High-throughput models used for execution and exploration

---

## Getting Started

1. **Enter planning mode**: Press **Tab** for Musashi - plan
2. **Describe the work**: include goals, scope, constraints
3. **Answer interview prompts**: clarify requirements and trade-offs
4. **Review plan**: check `.sisyphus/plans/*.md`
5. **Run `/start-work`**: let Musashi - boulder orchestrate
6. **Track progress**: inspect `.sisyphus/notepads/*` artifacts
7. **Ship**: after verification passes

---

## Further Reading

- [Overview](./overview.md) - Quick start
- [Ultrawork Manifesto](../ultrawork-manifesto.md) - Philosophy
- [Installation Guide](./installation.md) - Installation workflow
- [Configuration](../configurations.md) - Agent/category tuning
