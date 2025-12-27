export const HOOK_NAME = "skill-enforcer"

export const ERROR_TRIGGERS = [
  "Error:", "error:", "failed", "FAIL", "TypeError", "ReferenceError"
]

export const REMINDER_TEMPLATE = `
[SKILL RECOMMENDATION]
Based on your current work, consider loading these skills:
{{skills}}
Use: skill(name="{{first_skill}}")
`
