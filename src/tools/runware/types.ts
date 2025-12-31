export interface RunwareImageParams {
  prompt: string
  negativePrompt?: string
  model?: string
  width?: number
  height?: number
  steps?: number
  outputFormat?: "jpg" | "png" | "webp"
}

export interface RunwareImageResult {
  imageURL: string
  cost?: number
}

export interface RunwareRemoveBgParams {
  inputImage: string
  outputPath?: string
}

export interface RunwareRemoveBgResult {
  imageURL: string
}

export interface RunwareUpscaleParams {
  inputImage: string
  upscaleFactor?: 2 | 4
  outputPath?: string
}

export interface RunwareUpscaleResult {
  imageURL: string
}

export interface RunwareModelSearchParams {
  query: string
  category?: string
  architecture?: string
  limit?: number
}

export interface RunwareModelSearchResult {
  results: Array<{
    name: string
    modelID: string
    category: string
    architecture: string
  }>
}

export interface RunwareImg2ImgParams {
  prompt: string
  inputImage: string
  strength?: number
  model?: string
  outputPath?: string
}

export interface RunwareImg2ImgResult {
  imageURL: string
  cost?: number
}
