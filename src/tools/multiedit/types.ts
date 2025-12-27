import { z } from "zod"

export const MultiEditParamsSchema = z.object({
  filePath: z.string().describe("The absolute path to the file to modify"),
  edits: z
    .array(
      z.object({
        oldString: z.string().describe("The text to replace"),
        newString: z.string().describe("The text to replace it with (must be different from oldString)"),
        replaceAll: z.boolean().optional().describe("Replace all occurrences of oldString (default false)"),
      }),
    )
    .describe("Array of edit operations to perform sequentially on the file"),
})

export type MultiEditParams = z.infer<typeof MultiEditParamsSchema>

export interface EditResult {
  success: boolean
  message: string
  oldString: string
  newString: string
}
