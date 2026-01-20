export const ALLOWED_AGENTS = ["X1 - explorer", "R2 - researcher"] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn X1 - explorer or R2 - researcher agent. run_in_background REQUIRED (true=async with task_id, false=sync).

Available: {agents}

Pass \`resume=session_id\` to continue previous agent with full context. Prompts MUST be in English. Use \`background_output\` for async results.`
