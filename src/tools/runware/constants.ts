export const TOOL_NAME = "runware_generate"

export const TOOL_DESCRIPTION = `Generate images using Runware Sonic Inference Engine.

Supports FLUX, Imagen 4, and 400k+ community models. Sub-second cold starts.

API key loaded from RUNWARE_API_KEY env var.

Common AIR model IDs:
- runware:106@1 (Juggernaut Flux - photorealistic)
- runware:100@1 (FLUX.1 Pro)
- runware:101@1 (FLUX.1 Dev)

LoRA support: Pass lora array with model AIR IDs and weights.
Example LoRA: civitai:298301@335071 (NSFW filter, weight=2)

Output saved to tmp/ directory.`

export const TOOL_DESCRIPTION_REMOVE_BG = `Remove background from images using Bria RMBG 2.0.

Supports URLs and base64 encoded images.

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

export const TOOL_DESCRIPTION_UPSCALE = `Upscale images to higher resolution.

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

export const TOOL_DESCRIPTION_MODEL_SEARCH = `Search for models, LoRAs, ControlNets by name/category/architecture.

API key loaded from RUNWARE_API_KEY env var.`

export const TOOL_DESCRIPTION_IMG2IMG = `Transform existing images with a prompt (img2img).

API key loaded from RUNWARE_API_KEY env var.

Output saved to tmp/ directory.`

export const DEFAULT_MODEL = "runware:101@1"
export const API_URL = "https://api.runware.ai/v1"
