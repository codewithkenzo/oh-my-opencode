import { z } from "zod";

// === Output Format ===
export const OutputFormat = z.enum(["markdown", "json", "compact"]);
export type OutputFormat = z.infer<typeof OutputFormat>;

// === Collection ===
export const CollectionSchema = z.object({
  _id: z.number(),
  title: z.string(),
  count: z.number(),
  cover: z.array(z.string()).optional(),
  color: z.string().optional(),
  view: z.string().optional(),
  sort: z.number().optional(),
  public: z.boolean().optional(),
  expanded: z.boolean().optional(),
  creatorRef: z.number().optional(),
  lastUpdate: z.string().optional(),
  created: z.string().optional(),
  parent: z.object({ $id: z.number() }).optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(CollectionSchema),
});

// === Raindrop (Bookmark) ===
export const RaindropTypeSchema = z.enum(["link", "article", "image", "video", "document", "audio"]);
export type RaindropType = z.infer<typeof RaindropTypeSchema>;

export const MediaSchema = z.object({
  link: z.string(),
  type: z.string().optional(),
});

export const RaindropSchema = z.object({
  _id: z.number(),
  link: z.string(),
  title: z.string(),
  excerpt: z.string().optional(),
  note: z.string().optional(),
  type: RaindropTypeSchema,
  tags: z.array(z.string()),
  cover: z.string().optional(),
  media: z.array(MediaSchema).optional(),
  collection: z.object({ $id: z.number() }),
  removed: z.boolean().optional(),
  important: z.boolean().optional(),
  created: z.string(),
  lastUpdate: z.string().optional(),
  domain: z.string().optional(),
  creatorRef: z.number().optional(),
  sort: z.number().optional(),
  highlights: z.array(z.object({
    _id: z.string(),
    text: z.string(),
    note: z.string().optional(),
    color: z.string().optional(),
    created: z.string().optional(),
  })).optional(),
});

export type Raindrop = z.infer<typeof RaindropSchema>;

export const RaindropsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(RaindropSchema),
  count: z.number(),
  collectionId: z.number().optional(),
});

export const SingleRaindropResponseSchema = z.object({
  result: z.boolean(),
  item: RaindropSchema,
});

// === Tags ===
export const TagSchema = z.object({
  _id: z.string(),
  count: z.number().optional(),
});

export type Tag = z.infer<typeof TagSchema>;

export const TagsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(TagSchema),
});

// === Create Raindrop ===
export const CreateRaindropInputSchema = z.object({
  link: z.string().url(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collection: z.number().optional(), // $id
  type: RaindropTypeSchema.optional(),
  pleaseParse: z.object({}).optional(), // Trigger server-side parsing
  important: z.boolean().optional(),
});

export type CreateRaindropInput = z.infer<typeof CreateRaindropInputSchema>;

// === Search/Filter Params ===
export const SearchParamsSchema = z.object({
  collection: z.number().default(0), // 0=all, -1=unsorted, -99=trash
  search: z.string().optional(),
  sort: z.enum(["-created", "created", "title", "-title", "score", "-sort", "domain"]).optional(),
  page: z.number().min(0).default(0),
  perpage: z.number().min(1).max(50).default(25),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// === Rate Limit ===
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // UTC epoch seconds
}

// === API Error ===
export class RaindropAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimit?: RateLimitInfo
  ) {
    super(message);
    this.name = "RaindropAPIError";
  }
}
