import { z } from "zod"

// === Model Types ===
export const ModelTypeSchema = z.enum([
  "Checkpoint",
  "TextualInversion",
  "Hypernetwork",
  "AestheticGradient",
  "LORA",
  "Controlnet",
  "Poses",
])
export type ModelType = z.infer<typeof ModelTypeSchema>

export const SortSchema = z.enum(["Highest Rated", "Most Downloaded", "Newest"])
export type Sort = z.infer<typeof SortSchema>

export const PeriodSchema = z.enum(["AllTime", "Year", "Month", "Week", "Day"])
export type Period = z.infer<typeof PeriodSchema>

// === Model Version ===
export const ModelVersionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  downloadUrl: z.string().optional(),
  trainedWords: z.array(z.string()).optional(),
  baseModel: z.string().optional(),
  createdAt: z.string().optional(),
  images: z.array(z.object({
    url: z.string(),
    nsfw: z.boolean().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
})
export type ModelVersion = z.infer<typeof ModelVersionSchema>

// === Model Stats ===
export const ModelStatsSchema = z.object({
  downloadCount: z.number(),
  favoriteCount: z.number(),
  commentCount: z.number().optional(),
  rating: z.number(),
  ratingCount: z.number().optional(),
})
export type ModelStats = z.infer<typeof ModelStatsSchema>

// === Model ===
export const ModelSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: ModelTypeSchema,
  nsfw: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  creator: z.object({
    username: z.string(),
    image: z.string().nullable().optional(),
  }).optional(),
  stats: ModelStatsSchema.optional(),
  modelVersions: z.array(ModelVersionSchema).optional(),
})
export type Model = z.infer<typeof ModelSchema>

// === API Responses ===
export const ModelsResponseSchema = z.object({
  items: z.array(ModelSchema),
  metadata: z.object({
    totalItems: z.number().optional(),
    currentPage: z.number().optional(),
    pageSize: z.number().optional(),
    totalPages: z.number().optional(),
    nextPage: z.string().optional(),
    prevPage: z.string().optional(),
  }).optional(),
})
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>

// === Tags ===
export const TagSchema = z.object({
  name: z.string(),
  modelCount: z.number(),
  link: z.string().optional(),
})
export type Tag = z.infer<typeof TagSchema>

export const TagsResponseSchema = z.object({
  items: z.array(TagSchema),
  metadata: z.object({
    totalItems: z.number().optional(),
  }).optional(),
})
export type TagsResponse = z.infer<typeof TagsResponseSchema>

// === Search Input ===
export const SearchModelsInputSchema = z.object({
  query: z.string().optional().describe("Search models by name"),
  tag: z.string().optional().describe("Filter by tag"),
  username: z.string().optional().describe("Filter by creator username"),
  types: z.array(ModelTypeSchema).optional().describe("Filter by model types"),
  sort: SortSchema.optional().describe("Sort order"),
  period: PeriodSchema.optional().describe("Time period for stats"),
  nsfw: z.boolean().optional().describe("Include NSFW models"),
  limit: z.number().min(1).max(100).optional().describe("Results per page (1-100)"),
  page: z.number().optional().describe("Page number"),
})
export type SearchModelsInput = z.infer<typeof SearchModelsInputSchema>

// === Get Model Input ===
export const GetModelInputSchema = z.object({
  id: z.number().describe("Model ID"),
})
export type GetModelInput = z.infer<typeof GetModelInputSchema>

// === Search Tags Input ===
export const SearchTagsInputSchema = z.object({
  query: z.string().optional().describe("Filter tags by name"),
  limit: z.number().min(1).max(200).optional().describe("Results per page (1-200)"),
  page: z.number().optional().describe("Page number"),
})
export type SearchTagsInput = z.infer<typeof SearchTagsInputSchema>
