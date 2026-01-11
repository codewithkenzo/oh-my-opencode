import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { dirname } from "path"
import {
  TOOL_DESCRIPTION,
  TOOL_DESCRIPTION_REMOVE_BG,
  TOOL_DESCRIPTION_UPSCALE,
  TOOL_DESCRIPTION_MODEL_SEARCH,
  TOOL_DESCRIPTION_IMG2IMG,
  TOOL_DESCRIPTION_VIDEO,
  TOOL_DESCRIPTION_VIDEO_I2V,
} from "./constants"
import {
  generateImage,
  removeBackground,
  upscaleImage,
  searchModels,
  img2img,
  generateVideo,
} from "./client"

export const runwareGenerate: ToolDefinition = tool({
  description: TOOL_DESCRIPTION,
  args: {
    prompt: tool.schema.string().describe("Image generation prompt (be detailed)"),
    negative_prompt: tool.schema.string().optional().describe("What to avoid in the image"),
    model: tool.schema.string().optional().describe("AIR model ID (default: runware:101@1 FLUX.1 Dev)"),
    width: tool.schema.number().optional().describe("Width in pixels (default: 1024, must be multiple of 64)"),
    height: tool.schema.number().optional().describe("Height in pixels (default: 1024, must be multiple of 64)"),
    lora: tool.schema.string().optional().describe("LoRA config as JSON array: [{\"model\":\"civitai:298301@335071\",\"weight\":2}]"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-{timestamp}.jpg)"),
  },
  async execute(args) {
    try {
      let loraConfig: Array<{model: string, weight?: number}> | undefined
      if (args.lora) {
        try {
          loraConfig = typeof args.lora === 'string' ? JSON.parse(args.lora) : args.lora
        } catch {
          return "Error: Invalid LoRA JSON format. Use: [{\"model\":\"civitai:ID@VERSION\",\"weight\":2}]"
        }
      }
      
      const result = await generateImage({
        prompt: args.prompt,
        negativePrompt: args.negative_prompt,
        model: args.model,
        width: args.width,
        height: args.height,
        lora: loraConfig,
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

export const runwareRemoveBg: ToolDefinition = tool({
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

export const runwareUpscale: ToolDefinition = tool({
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

export const runwareModelSearch: ToolDefinition = tool({
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

export const runwareImg2Img: ToolDefinition = tool({
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

export const runwareVideoGenerate: ToolDefinition = tool({
  description: TOOL_DESCRIPTION_VIDEO,
  args: {
    prompt: tool.schema.string().describe("Video generation prompt (describe action, scene, camera movement)"),
    negative_prompt: tool.schema.string().optional().describe("What to avoid - USE THIS for video quality"),
    model: tool.schema.string().optional().describe("AIR model ID (default: alibaba:wan@2.6 WanVideo)"),
    width: tool.schema.number().optional().describe("Width (default: 1280)"),
    height: tool.schema.number().optional().describe("Height (default: 720)"),
    duration: tool.schema.number().optional().describe("Duration 1-10 seconds (default: 5)"),
    fps: tool.schema.number().optional().describe("Frame rate (model-specific, not all models support this)"),
    lora: tool.schema.string().optional().describe("LoRA config JSON: [{\"model\":\"civitai:1307155@2073605\",\"weight\":1}]"),
    seed: tool.schema.number().optional().describe("Seed for reproducibility"),
    timeout_seconds: tool.schema.number().optional().describe("Max wait time (default: 300)"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-video-{timestamp}.mp4)"),
  },
  async execute(args) {
    try {
      let loraConfig: Array<{model: string, weight?: number}> | undefined
      if (args.lora) {
        try {
          loraConfig = typeof args.lora === 'string' ? JSON.parse(args.lora) : args.lora
        } catch {
          return "Error: Invalid LoRA JSON format. Use: [{\"model\":\"civitai:ID@VERSION\",\"weight\":1}]"
        }
      }

      const result = await generateVideo({
        prompt: args.prompt,
        negativePrompt: args.negative_prompt,
        model: args.model,
        width: args.width,
        height: args.height,
        duration: args.duration,
        fps: args.fps,
        lora: loraConfig,
        seed: args.seed,
        timeoutMs: args.timeout_seconds ? args.timeout_seconds * 1000 : undefined,
      })

      const filename = args.output_path || `tmp/runware-video-${Date.now()}.mp4`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const videoResponse = await fetch(result.videoURL)
      const buffer = Buffer.from(await videoResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      const costInfo = result.cost ? ` (cost: $${result.cost.toFixed(4)})` : ""
      return `Video generated (${result.duration}s) and saved to: ${filename}${costInfo}\n\nURL: ${result.videoURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})

export const runwareVideoFromImage: ToolDefinition = tool({
  description: TOOL_DESCRIPTION_VIDEO_I2V,
  args: {
    prompt: tool.schema.string().describe("Animation prompt (describe motion, not just appearance)"),
    input_image: tool.schema.string().describe("First frame image URL or base64"),
    last_image: tool.schema.string().optional().describe("Optional last frame image URL for guided interpolation"),
    negative_prompt: tool.schema.string().optional().describe("What to avoid"),
    model: tool.schema.string().optional().describe("AIR model ID (default: alibaba:wan@2.6)"),
    duration: tool.schema.number().optional().describe("Duration 1-10 seconds (default: 5)"),
    lora: tool.schema.string().optional().describe("LoRA config JSON"),
    timeout_seconds: tool.schema.number().optional().describe("Max wait time (default: 300)"),
    output_path: tool.schema.string().optional().describe("Save path"),
  },
  async execute(args) {
    try {
      const frameImages: Array<{ inputImage: string; frame: "first" | "last" }> = [
        { inputImage: args.input_image, frame: "first" }
      ]
      if (args.last_image) {
        frameImages.push({ inputImage: args.last_image, frame: "last" })
      }

      let loraConfig: Array<{model: string, weight?: number}> | undefined
      if (args.lora) {
        try {
          loraConfig = typeof args.lora === 'string' ? JSON.parse(args.lora) : args.lora
        } catch {
          return "Error: Invalid LoRA JSON format"
        }
      }

      const result = await generateVideo({
        prompt: args.prompt,
        negativePrompt: args.negative_prompt,
        model: args.model,
        duration: args.duration,
        frameImages,
        lora: loraConfig,
        timeoutMs: args.timeout_seconds ? args.timeout_seconds * 1000 : undefined,
      })

      const filename = args.output_path || `tmp/runware-video-i2v-${Date.now()}.mp4`

      const dir = dirname(filename)
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const videoResponse = await fetch(result.videoURL)
      const buffer = Buffer.from(await videoResponse.arrayBuffer())
      writeFileSync(filename, buffer)

      const costInfo = result.cost ? ` (cost: $${result.cost.toFixed(4)})` : ""
      return `Video generated from image (${result.duration}s) saved to: ${filename}${costInfo}\n\nURL: ${result.videoURL}`
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})
