/**
 * Context for skill variable substitution at invocation time.
 */
export interface SubstitutionContext {
	/** Current session ID from getSessionID() callback */
	sessionId?: string
	// Future: skillDir, projectRoot (but NOT in v1)
}

/**
 * Substitutes skill variables at invocation time.
 *
 * Currently supported:
 * - ${CLAUDE_SESSION_ID} → session ID
 *
 * NOT touched:
 * - $ARGUMENTS → passed through for LLM interpretation
 * - ${UNKNOWN} → left unchanged
 *
 * @param content The skill body content
 * @param context Substitution context with session info
 * @returns Content with variables substituted
 */
export function substituteSkillVariables(
	content: string,
	context: SubstitutionContext,
): string {
	let result = content

	if (context.sessionId) {
		result = result.replace(/\$\{CLAUDE_SESSION_ID\}/g, context.sessionId)
	} else {
		// Substitute empty string + warn
		if (result.includes("${CLAUDE_SESSION_ID}")) {
			console.warn(
				"[skill-loader] ${CLAUDE_SESSION_ID} used but no session available",
			)
			result = result.replace(/\$\{CLAUDE_SESSION_ID\}/g, "")
		}
	}

	return result
}
