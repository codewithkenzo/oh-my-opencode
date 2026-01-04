import { sendSystemNotification } from "../../tools/system-notify"
import { RUNWARE_TOOLS } from "./constants"

interface ToolExecuteAfterInput {
  name: string
  input: Record<string, unknown>
  output: string
}

function extractPathFromOutput(output: string): string | null {
  const savedMatch = output.match(/saved to: ([^\s\n]+)/)
  if (savedMatch) return savedMatch[1]
  
  const urlMatch = output.match(/URL: (https?:\/\/[^\s\n]+)/)
  if (urlMatch) return urlMatch[1]
  
  return null
}

function getNotificationTitle(toolName: string): string {
  if (toolName.includes("Video")) return "Video Ready"
  if (toolName.includes("RemoveBg")) return "Background Removed"
  if (toolName.includes("Upscale")) return "Image Upscaled"
  if (toolName.includes("Img2Img")) return "Image Transformed"
  return "Image Generated"
}

export function createRunwareNotificationHook() {
  return {
    "tool.execute.after": async (input: ToolExecuteAfterInput) => {
      const { name, output } = input
      
      if (!RUNWARE_TOOLS.includes(name)) return
      if (output.startsWith("Error:")) return
      
      const path = extractPathFromOutput(output)
      const title = getNotificationTitle(name)
      
      await sendSystemNotification({
        title,
        message: path ? `Ready: ${path}` : "Generation complete",
        imagePath: path && !path.startsWith("http") ? path : undefined,
        pathToOpen: path || undefined,
      })
    },
  }
}
