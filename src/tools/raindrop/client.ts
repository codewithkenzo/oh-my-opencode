import {
  CollectionsResponseSchema,
  RaindropsResponseSchema,
  SingleRaindropResponseSchema,
  TagsResponseSchema,
  RaindropAPIError,
  type SearchParams,
  type CreateRaindropInput,
  type RateLimitInfo,
  type Collection,
  type Raindrop,
  type Tag,
} from "./types";

const API_BASE = "https://api.raindrop.io/rest/v1";

function getToken(): string {
  const token = process.env.RAINDROP_TOKEN ?? Bun.env.RAINDROP_TOKEN;
  if (!token) {
    throw new RaindropAPIError("RAINDROP_TOKEN environment variable not set", 401);
  }
  return token;
}

function parseRateLimit(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
  }
  return undefined;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T; rateLimit?: RateLimitInfo }> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const rateLimit = parseRateLimit(response.headers);

  if (!response.ok) {
    if (response.status === 429) {
      const resetTime = rateLimit?.reset
        ? new Date(rateLimit.reset * 1000).toISOString()
        : "unknown";
      throw new RaindropAPIError(
        `Rate limit exceeded. Resets at ${resetTime}`,
        429,
        rateLimit
      );
    }
    const errorText = await response.text();
    throw new RaindropAPIError(
      `API error: ${response.status} - ${errorText}`,
      response.status,
      rateLimit
    );
  }

  const json = await response.json();
  const data = schema.parse(json);

  return { data, rateLimit };
}

// === Collections ===
export async function getCollections(): Promise<Collection[]> {
  const { data } = await request("/collections", {}, CollectionsResponseSchema);
  return data.items;
}

export async function getChildCollections(parentId: number): Promise<Collection[]> {
  const { data } = await request(
    `/collections/childrens?parent=${parentId}`,
    {},
    CollectionsResponseSchema
  );
  return data.items;
}

// === Raindrops ===
export async function getRaindrops(
  params: SearchParams
): Promise<{ items: Raindrop[]; count: number }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.sort) searchParams.set("sort", params.sort);
  searchParams.set("page", String(params.page));
  searchParams.set("perpage", String(params.perpage));

  const query = searchParams.toString();
  const { data } = await request(
    `/raindrops/${params.collection}${query ? `?${query}` : ""}`,
    {},
    RaindropsResponseSchema
  );

  return { items: data.items, count: data.count };
}

export async function getRaindrop(id: number): Promise<Raindrop> {
  const { data } = await request(`/raindrop/${id}`, {}, SingleRaindropResponseSchema);
  return data.item;
}

// === Create ===
export async function createRaindrop(input: CreateRaindropInput): Promise<Raindrop> {
  const body: Record<string, unknown> = {
    link: input.link,
    pleaseParse: input.pleaseParse ?? {},
  };
  if (input.title) body.title = input.title;
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.note) body.note = input.note;
  if (input.tags) body.tags = input.tags;
  if (input.collection !== undefined) body.collection = { $id: input.collection };
  if (input.type) body.type = input.type;
  if (input.important !== undefined) body.important = input.important;

  const { data } = await request(
    "/raindrop",
    { method: "POST", body: JSON.stringify(body) },
    SingleRaindropResponseSchema
  );
  return data.item;
}

// === Tags ===
export async function getTags(collectionId?: number): Promise<Tag[]> {
  const endpoint = collectionId !== undefined ? `/tags/${collectionId}` : "/tags";
  const { data } = await request(endpoint, {}, TagsResponseSchema);
  return data.items;
}

// === Update (for tag management) ===
export async function updateRaindrop(
  id: number,
  update: { tags?: string[]; note?: string; title?: string; important?: boolean }
): Promise<Raindrop> {
  const { data } = await request(
    `/raindrop/${id}`,
    { method: "PUT", body: JSON.stringify(update) },
    SingleRaindropResponseSchema
  );
  return data.item;
}
