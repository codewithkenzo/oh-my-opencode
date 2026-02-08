import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { dirname } from "path"
import {
  runwareGenerateDef,
  runwareRemoveBgDef,
  runwareUpscaleDef,
  runwareModelSearchDef,
  runwareImg2ImgDef,
  runwareVideoGenerateDef,
  runwareVideoFromImageDef,
} from "./def"
import {
  generateImage,
  removeBackground,
  upscaleImage,
  searchModels,
  img2img,
  generateVideo,
} from "./client"

export const runwareGenerate: ToolDefinition = tool({
  ...runwareGenerateDef,
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
  ...runwareRemoveBgDef,
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
  ...runwareUpscaleDef,
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
  ...runwareModelSearchDef,
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
  ...runwareImg2ImgDef,
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
  ...runwareVideoGenerateDef,
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
  ...runwareVideoFromImageDef,
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
