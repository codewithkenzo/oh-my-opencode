import { tool } from "@opencode-ai/plugin/tool"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { dirname } from "path"
import {
  TOOL_DESCRIPTION,
  TOOL_DESCRIPTION_REMOVE_BG,
  TOOL_DESCRIPTION_UPSCALE,
  TOOL_DESCRIPTION_MODEL_SEARCH,
  TOOL_DESCRIPTION_IMG2IMG,
} from "./constants"
import {
  generateImage,
  removeBackground,
  upscaleImage,
  searchModels,
  img2img,
} from "./client"

export const runwareGenerate = tool({
  description: TOOL_DESCRIPTION,
  args: {
    prompt: tool.schema.string().describe("Image generation prompt (be detailed)"),
    negative_prompt: tool.schema.string().optional().describe("What to avoid in the image"),
    model: tool.schema.string().optional().describe("AIR model ID (default: runware:101@1 FLUX.1 Dev)"),
    width: tool.schema.number().optional().describe("Width in pixels (default: 1024, must be multiple of 64)"),
    height: tool.schema.number().optional().describe("Height in pixels (default: 1024, must be multiple of 64)"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-{timestamp}.jpg)"),
  },
  async execute(args) {
    try {
      const result = await generateImage({
        prompt: args.prompt,
        negativePrompt: args.negative_prompt,
        model: args.model,
        width: args.width,
        height: args.height,
      })

      const filename = args.output_path || `tmp/runware-${Date.now()}.jpg`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const imageResponse = await fetch(result.imageURL)
      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      const costInfo = result.cost ? ` (cost: $${result.cost.toFixed(4)})` : ""
      return `Image generated and saved to: ${filename}${costInfo}\n\nURL: ${result.imageURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})

export const runwareRemoveBg = tool({
  description: TOOL_DESCRIPTION_REMOVE_BG,
  args: {
    input_image: tool.schema.string().describe("URL or base64 of image"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-nobg-{timestamp}.png)"),
  },
  async execute(args) {
    try {
      const result = await removeBackground({
        inputImage: args.input_image,
      })

      const filename = args.output_path || `tmp/runware-nobg-${Date.now()}.png`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const imageResponse = await fetch(result.imageURL)
      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      return `Background removed and saved to: ${filename}\n\nURL: ${result.imageURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})

export const runwareUpscale = tool({
  description: TOOL_DESCRIPTION_UPSCALE,
  args: {
    input_image: tool.schema.string().describe("URL or base64 of image"),
    upscale_factor: tool.schema.number().optional().describe("Upscale factor (2 or 4)"),
    output_path: tool.schema.string().optional().describe("Save path"),
  },
  async execute(args) {
    try {
      const result = await upscaleImage({
        inputImage: args.input_image,
        upscaleFactor: args.upscale_factor as 2 | 4 | undefined,
      })

      const filename = args.output_path || `tmp/runware-upscaled-${Date.now()}.png`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const imageResponse = await fetch(result.imageURL)
      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      return `Image upscaled and saved to: ${filename}\n\nURL: ${result.imageURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})

export const runwareModelSearch = tool({
  description: TOOL_DESCRIPTION_MODEL_SEARCH,
  args: {
    query: tool.schema.string().describe("Search query for models"),
    category: tool.schema.string().optional().describe("Category: checkpoint | lora | controlnet | vae"),
    architecture: tool.schema.string().optional().describe("Architecture: flux1d | sdxl | sd15 | sd21"),
    limit: tool.schema.number().optional().describe("Max results (default: 10)"),
  },
  async execute(args) {
    try {
      const result = await searchModels({
        query: args.query,
        category: args.category,
        architecture: args.architecture,
        limit: args.limit,
      })

      if (result.results.length === 0) {
        return "No models found matching your search criteria"
      }

      const resultText = result.results
        .map((m: any) => `- ${m.name} (${m.modelID})\n  Category: ${m.category}, Architecture: ${m.architecture}`)
        .join("\n")

      return `Found ${result.results.length} model(s):\n${resultText}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})

export const runwareImg2Img = tool({
  description: TOOL_DESCRIPTION_IMG2IMG,
  args: {
    prompt: tool.schema.string().describe("Transformation prompt"),
    input_image: tool.schema.string().describe("Source image URL"),
    strength: tool.schema.number().optional().describe("Strength 0.0-1.0, lower preserves more original (default: 0.6)"),
    model: tool.schema.string().optional().describe("AIR model ID"),
    output_path: tool.schema.string().optional().describe("Save path"),
  },
  async execute(args) {
    try {
      const result = await img2img({
        prompt: args.prompt,
        inputImage: args.input_image,
        strength: args.strength,
        model: args.model,
      })

      const filename = args.output_path || `tmp/runware-img2img-${Date.now()}.jpg`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const imageResponse = await fetch(result.imageURL)
      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      const costInfo = result.cost ? ` (cost: $${result.cost.toFixed(4)})` : ""
      return `Image transformed and saved to: ${filename}${costInfo}\n\nURL: ${result.imageURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})
