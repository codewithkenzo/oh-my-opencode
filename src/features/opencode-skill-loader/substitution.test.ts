import { describe, test, expect, spyOn } from "bun:test"
import { substituteSkillVariables } from "./substitution"

describe("substituteSkillVariables", () => {
	test("replaces ${CLAUDE_SESSION_ID} with session ID", () => {
		const content = "Session: ${CLAUDE_SESSION_ID}"
		const result = substituteSkillVariables(content, { sessionId: "ses_abc123" })
		expect(result).toBe("Session: ses_abc123")
	})

	test("replaces multiple occurrences of ${CLAUDE_SESSION_ID}", () => {
		const content = "ID: ${CLAUDE_SESSION_ID}, Again: ${CLAUDE_SESSION_ID}"
		const result = substituteSkillVariables(content, { sessionId: "ses_xyz" })
		expect(result).toBe("ID: ses_xyz, Again: ses_xyz")
	})

	test("$ARGUMENTS is NOT substituted (passed through)", () => {
		const content = "User request: $ARGUMENTS"
		const result = substituteSkillVariables(content, { sessionId: "ses_123" })
		expect(result).toBe("User request: $ARGUMENTS")
	})

	test("unknown variables like ${UNKNOWN} are left unchanged", () => {
		const content = "Unknown: ${UNKNOWN} and ${OTHER}"
		const result = substituteSkillVariables(content, { sessionId: "ses_123" })
		expect(result).toBe("Unknown: ${UNKNOWN} and ${OTHER}")
	})

	test("missing session context substitutes empty string and warns", () => {
		const warnSpy = spyOn(console, "warn").mockImplementation(() => {})

		const content = "Session: ${CLAUDE_SESSION_ID}"
		const result = substituteSkillVariables(content, {})

		expect(result).toBe("Session: ")
		expect(warnSpy).toHaveBeenCalledWith(
			"[skill-loader] ${CLAUDE_SESSION_ID} used but no session available",
		)

		warnSpy.mockRestore()
	})

	test("content without variables is returned unchanged", () => {
		const content = "Plain content with no variables"
		const result = substituteSkillVariables(content, { sessionId: "ses_123" })
		expect(result).toBe("Plain content with no variables")
	})
})
