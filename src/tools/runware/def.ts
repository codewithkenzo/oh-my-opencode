import { tool } from "@opencode-ai/plugin/tool"

const RUNWARE_GENERATE_DESCRIPTION = `Generate images using Runware Sonic Inference Engine.

Supports FLUX, Imagen 4, and 400k+ community models. Sub-second cold starts.

API key loaded from RUNWARE_API_KEY env var.

Common AIR model IDs:
- runware:106@1 (Juggernaut Flux - photorealistic)
- runware:100@1 (FLUX.1 Pro)
- runware:101@1 (FLUX.1 Dev)

LoRA support: Pass lora array with model AIR IDs and weights.
Example LoRA: civitai:298301@335071 (NSFW filter, weight=2)

Output saved to tmp/ directory.`

const RUNWARE_REMOVE_BG_DESCRIPTION = `Remove background from images using Bria RMBG 2.0.

Supports URLs and base64 encoded images.

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

const RUNWARE_UPSCALE_DESCRIPTION = `Upscale images to higher resolution.

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

const RUNWARE_MODEL_SEARCH_DESCRIPTION = `Search for models, LoRAs, ControlNets by name/category/architecture.

API key loaded from RUNWARE_API_KEY env var.`

const RUNWARE_IMG2IMG_DESCRIPTION = `Transform existing images with a prompt (img2img).

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

const RUNWARE_VIDEO_DESCRIPTION = `Generate videos using Runware Video Inference API.

Supports WanVideo, KlingAI, and other video models. Async generation with internal polling.

API key loaded from RUNWARE_API_KEY env var.

Common video models:
- alibaba:wan@2.6 (WanVideo 2.2 - supports NSFW LoRA)
- klingai:5@3 (Kling v2.1 Master)
- google:veo@2 (Veo 2)

Video LoRA for NSFW: civitai:1307155@2073605 (trigger: nsfwsks)

NOTE: Video generation takes 30s-3min. Tool blocks until complete.
Output saved to tmp/ directory.`

const RUNWARE_VIDEO_FROM_IMAGE_DESCRIPTION = `Generate video from image (image-to-video).

Animates a still image based on prompt description.

Provide first frame image, optionally last frame for guided interpolation.

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

export const runwareGenerateDef = {
  description: RUNWARE_GENERATE_DESCRIPTION,
  args: {
    prompt: tool.schema.string().describe("Image generation prompt (be detailed)"),
    negative_prompt: tool.schema.string().optional().describe("What to avoid in the image"),
    model: tool.schema.string().optional().describe("AIR model ID (default: runware:101@1 FLUX.1 Dev)"),
    width: tool.schema.number().optional().describe("Width in pixels (default: 1024, must be multiple of 64)"),
    height: tool.schema.number().optional().describe("Height in pixels (default: 1024, must be multiple of 64)"),
    lora: tool.schema.string().optional().describe("LoRA config as JSON array: [{\"model\":\"civitai:298301@335071\",\"weight\":2}]"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-{timestamp}.jpg)"),
  },
}

export const runwareRemoveBgDef = {
  description: RUNWARE_REMOVE_BG_DESCRIPTION,
  args: {
    input_image: tool.schema.string().describe("URL or base64 of image"),
    output_path: tool.schema.string().optional().describe("Save path (default: tmp/runware-nobg-{timestamp}.png)"),
  },
}

export const runwareUpscaleDef = {
  description: RUNWARE_UPSCALE_DESCRIPTION,
  args: {
    input_image: tool.schema.string().describe("URL or base64 of image"),
    upscale_factor: tool.schema.number().optional().describe("Upscale factor (2 or 4)"),
    output_path: tool.schema.string().optional().describe("Save path"),
  },
}

export const runwareModelSearchDef = {
  description: RUNWARE_MODEL_SEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Search query for models"),
    category: tool.schema.string().optional().describe("Category: checkpoint | lora | controlnet | vae"),
    architecture: tool.schema.string().optional().describe("Architecture: flux1d | sdxl | sd15 | sd21"),
    limit: tool.schema.number().optional().describe("Max results (default: 10)"),
  },
}

export const runwareImg2ImgDef = {
  description: RUNWARE_IMG2IMG_DESCRIPTION,
  args: {
    prompt: tool.schema.string().describe("Transformation prompt"),
    input_image: tool.schema.string().describe("Source image URL"),
    strength: tool.schema.number().optional().describe("Strength 0.0-1.0, lower preserves more original (default: 0.6)"),
    model: tool.schema.string().optional().describe("AIR model ID"),
    output_path: tool.schema.string().optional().describe("Save path"),
  },
}

export const runwareVideoGenerateDef = {
  description: RUNWARE_VIDEO_DESCRIPTION,
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
}

export const runwareVideoFromImageDef = {
  description: RUNWARE_VIDEO_FROM_IMAGE_DESCRIPTION,
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
}

export const runwareToolDefs = {
  runwareGenerate: runwareGenerateDef,
  runwareRemoveBg: runwareRemoveBgDef,
  runwareUpscale: runwareUpscaleDef,
  runwareModelSearch: runwareModelSearchDef,
  runwareImg2Img: runwareImg2ImgDef,
  runwareVideoGenerate: runwareVideoGenerateDef,
  runwareVideoFromImage: runwareVideoFromImageDef,
}
