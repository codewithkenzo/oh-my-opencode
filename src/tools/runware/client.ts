import { API_URL, DEFAULT_MODEL } from "./constants"
import type {
  RunwareImageParams,
  RunwareImageResult,
  RunwareRemoveBgParams,
  RunwareRemoveBgResult,
  RunwareUpscaleParams,
  RunwareUpscaleResult,
  RunwareModelSearchParams,
  RunwareModelSearchResult,
  RunwareImg2ImgParams,
  RunwareImg2ImgResult,
} from "./types"

export async function generateImage(params: RunwareImageParams): Promise<RunwareImageResult> {
  const apiKey = process.env.RUNWARE_API_KEY
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY environment variable not set")
  }

  const taskUUID = crypto.randomUUID()

  const payload = [
    { taskType: "authentication", apiKey },
    {
      taskType: "imageInference",
      taskUUID,
      positivePrompt: params.prompt,
      negativePrompt: params.negativePrompt || "",
      model: params.model || DEFAULT_MODEL,
      width: params.width || 1024,
      height: params.height || 1024,
      steps: params.steps || 25,
      outputType: "URL",
      outputFormat: params.outputFormat || "jpg",
      numberResults: 1,
      includeCost: true,
    }
  ]

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const responseJson = await response.json() as { data?: any[], errors?: any[] }

  if (responseJson.errors && responseJson.errors.length > 0) {
    const errorMsg = responseJson.errors.map((e: any) => e.message).join(", ")
    throw new Error(`Runware API error: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status} ${response.statusText}`)
  }

  const result = responseJson.data?.find((d: any) => d.taskType === "imageInference")

  if (!result) {
    throw new Error("No image result returned")
  }

  return {
    imageURL: result.imageURL,
    cost: result.cost,
  }
}

export async function removeBackground(params: RunwareRemoveBgParams): Promise<RunwareRemoveBgResult> {
  const apiKey = process.env.RUNWARE_API_KEY
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY environment variable not set")
  }

  const taskUUID = crypto.randomUUID()

  const payload = [
    { taskType: "authentication", apiKey },
    {
      taskType: "removeBackground",
      taskUUID,
      inputImage: params.inputImage,
      outputFormat: "png",
      outputType: "URL",
    }
  ]

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const responseJson = await response.json() as { data?: any[], errors?: any[] }

  if (responseJson.errors && responseJson.errors.length > 0) {
    const errorMsg = responseJson.errors.map((e: any) => e.message).join(", ")
    throw new Error(`Runware API error: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status} ${response.statusText}`)
  }

  const result = responseJson.data?.find((d: any) => d.taskType === "removeBackground")

  if (!result) {
    throw new Error("No background removal result returned")
  }

  return {
    imageURL: result.imageURL,
  }
}

export async function upscaleImage(params: RunwareUpscaleParams): Promise<RunwareUpscaleResult> {
  const apiKey = process.env.RUNWARE_API_KEY
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY environment variable not set")
  }

  const taskUUID = crypto.randomUUID()

  const payload = [
    { taskType: "authentication", apiKey },
    {
      taskType: "upscale",
      taskUUID,
      inputImage: params.inputImage,
      upscaleFactor: params.upscaleFactor || 2,
      outputFormat: "png",
      outputType: "URL",
    }
  ]

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const responseJson = await response.json() as { data?: any[], errors?: any[] }

  if (responseJson.errors && responseJson.errors.length > 0) {
    const errorMsg = responseJson.errors.map((e: any) => e.message).join(", ")
    throw new Error(`Runware API error: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status} ${response.statusText}`)
  }

  const result = responseJson.data?.find((d: any) => d.taskType === "upscale")

  if (!result) {
    throw new Error("No upscale result returned")
  }

  return {
    imageURL: result.imageURL,
  }
}

export async function searchModels(params: RunwareModelSearchParams): Promise<RunwareModelSearchResult> {
  const apiKey = process.env.RUNWARE_API_KEY
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY environment variable not set")
  }

  const taskUUID = crypto.randomUUID()

  const payload = [
    { taskType: "authentication", apiKey },
    {
      taskType: "modelSearch",
      taskUUID,
      search: params.query,
      category: params.category || "checkpoint",
      architecture: params.architecture,
      limit: params.limit || 10,
    }
  ]

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const responseJson = await response.json() as { data?: any[], errors?: any[] }

  if (responseJson.errors && responseJson.errors.length > 0) {
    const errorMsg = responseJson.errors.map((e: any) => e.message).join(", ")
    throw new Error(`Runware API error: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status} ${response.statusText}`)
  }

  const result = responseJson.data?.find((d: any) => d.taskType === "modelSearch")

  if (!result) {
    throw new Error("No model search results returned")
  }

  return {
    results: result.results || [],
  }
}

export async function img2img(params: RunwareImg2ImgParams): Promise<RunwareImg2ImgResult> {
  const apiKey = process.env.RUNWARE_API_KEY
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY environment variable not set")
  }

  const taskUUID = crypto.randomUUID()

  const payload = [
    { taskType: "authentication", apiKey },
    {
      taskType: "imageInference",
      taskUUID,
      positivePrompt: params.prompt,
      model: params.model || DEFAULT_MODEL,
      inputImage: params.inputImage,
      strength: params.strength || 0.6,
      outputType: "URL",
      outputFormat: "jpg",
      numberResults: 1,
      includeCost: true,
    }
  ]

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const responseJson = await response.json() as { data?: any[], errors?: any[] }

  if (responseJson.errors && responseJson.errors.length > 0) {
    const errorMsg = responseJson.errors.map((e: any) => e.message).join(", ")
    throw new Error(`Runware API error: ${errorMsg}`)
  }

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status} ${response.statusText}`)
  }

  const result = responseJson.data?.find((d: any) => d.taskType === "imageInference")

  if (!result) {
    throw new Error("No img2img result returned")
  }

  return {
    imageURL: result.imageURL,
    cost: result.cost,
  }
}
