import type {
  SearchModelsInput,
  GetModelInput,
  SearchTagsInput,
  Model,
  ModelsResponse,
  TagsResponse,
} from "./types"

const BASE_URL = "https://civitai.com/api/v1"

interface FetchOptions {
  timeout?: number
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item))
      }
    } else {
      searchParams.append(key, String(value))
    }
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export async function searchModels(
  input: SearchModelsInput
): Promise<ModelsResponse> {
  const queryString = buildQueryString({
    query: input.query,
    tag: input.tag,
    username: input.username,
    types: input.types,
    sort: input.sort,
    period: input.period,
    nsfw: input.nsfw,
    limit: input.limit ?? 20,
    page: input.page,
  })

  const response = await fetchWithTimeout(`${BASE_URL}/models${queryString}`)

  if (!response.ok) {
    throw new Error(`Civitai API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<ModelsResponse>
}

export async function getModel(input: GetModelInput): Promise<Model> {
  const response = await fetchWithTimeout(`${BASE_URL}/models/${input.id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Model not found: ${input.id}`)
    }
    throw new Error(`Civitai API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<Model>
}

export async function searchTags(
  input: SearchTagsInput
): Promise<TagsResponse> {
  const queryString = buildQueryString({
    query: input.query,
    limit: input.limit ?? 20,
    page: input.page,
  })

  const response = await fetchWithTimeout(`${BASE_URL}/tags${queryString}`)

  if (!response.ok) {
    throw new Error(`Civitai API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<TagsResponse>
}
