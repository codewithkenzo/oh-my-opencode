import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { tool } from "@opencode-ai/plugin/tool"
import type { EditResult } from "./types"
import { MULTIEDIT_DESCRIPTION } from "./constants"

function applyEdit(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false
): { content: string; success: boolean; message: string } {
  if (oldString === newString) {
    return { content, success: false, message: "oldString and newString are the same" }
  }

  if (oldString === "") {
    return { content: content + newString, success: true, message: "Appended content" }
  }

  if (!content.includes(oldString)) {
    return { content, success: false, message: `oldString not found in content` }
  }

  if (replaceAll) {
    const newContent = content.split(oldString).join(newString)
    const count = (content.match(new RegExp(escapeRegex(oldString), "g")) || []).length
    return { content: newContent, success: true, message: `Replaced ${count} occurrence(s)` }
  }

  const occurrences = content.split(oldString).length - 1
  if (occurrences > 1) {
    return {
      content,
      success: false,
      message: `oldString found ${occurrences} times. Use replaceAll=true or provide more context to uniquely identify.`
    }
  }

  const newContent = content.replace(oldString, newString)
  return { content: newContent, success: true, message: "Replaced 1 occurrence" }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const multiedit = tool({
  description: MULTIEDIT_DESCRIPTION,
  args: {
    filePath: tool.schema.string().describe("The absolute path to the file to modify"),
    edits: tool.schema
      .array(
        tool.schema.object({
          oldString: tool.schema.string().describe("The text to replace"),
          newString: tool.schema
            .string()
            .describe("The text to replace it with (must be different from oldString)"),
          replaceAll: tool.schema
            .boolean()
            .optional()
            .describe("Replace all occurrences of oldString (default false)"),
        })
      )
      .describe("Array of edit operations to perform sequentially on the file"),
  },
  execute: async (args) => {
    const { filePath, edits } = args

    if (!filePath.startsWith("/")) {
      return "Error: filePath must be absolute (start with /)"
    }

    let content: string
    if (existsSync(filePath)) {
      content = readFileSync(filePath, "utf-8")
    } else {
      content = ""
    }

    const results: EditResult[] = []

    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i]
      const result = applyEdit(content, edit.oldString, edit.newString, edit.replaceAll)

      results.push({
        success: result.success,
        message: result.message,
        oldString: edit.oldString.slice(0, 50) + (edit.oldString.length > 50 ? "..." : ""),
        newString: edit.newString.slice(0, 50) + (edit.newString.length > 50 ? "..." : ""),
      })

      if (!result.success) {
        return `Edit ${i + 1}/${edits.length} failed: ${result.message}\n\nNo changes were made (atomic operation).`
      }

      content = result.content
    }

    writeFileSync(filePath, content, "utf-8")

    const summary = results.map((r, i) => `Edit ${i + 1}: ${r.message}`).join("\n")

    return `Successfully applied ${edits.length} edit(s):\n${summary}`
  },
})
