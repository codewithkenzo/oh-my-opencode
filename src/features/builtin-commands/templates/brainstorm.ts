export const BRAINSTORM_TEMPLATE = `# Brainstorm Command

Use this command to run structured discovery before implementation.

## Core Rule

- No implementation until design is validated by the user.
- Do not write code, edit files, or run destructive actions in brainstorming mode.

## Phase 1: Understand Intent

1. Restate the topic from user arguments in one sentence.
2. Ask targeted clarifying questions to resolve ambiguity.
3. Identify explicit success criteria from the user.

If critical details are missing, continue clarification before moving forward.

## Phase 2: Explore Constraints and Edge Cases

1. List constraints (technical, product, time, compatibility, security).
2. Identify edge cases, failure paths, and operational risks.
3. Capture assumptions and mark each as confirmed vs unconfirmed.

## Phase 3: Propose Alternatives with Trade-offs

1. Present 2-4 viable approaches.
2. For each approach, include benefits, drawbacks, complexity, and risk.
3. Recommend one option and explain why it is the best default.

## Phase 4: Confirmation Gate

Before any implementation planning, ask the user to confirm one path.

Only after confirmation:
1. Convert the selected approach into an implementation plan.
2. Define milestones, verification steps, and acceptance criteria.

## Output Format

Return sections in this order:
1. Topic Understanding
2. Clarifying Questions
3. Constraints and Edge Cases
4. Options and Trade-offs
5. Recommended Direction
6. Confirmation Request
`
