import { tool } from "@opencode-ai/plugin/tool";

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
};

export const ripple_collectionsDef = {
  description:
    "List all Raindrop.io bookmark collections. Returns collection names, IDs, and bookmark counts.",
  args: {
    ...formatArg,
  },
};

export const ripple_searchDef = {
  description: `Search and filter Raindrop.io bookmarks. 
Supports search operators: tag:name, type:link/article/image/video/document, domain:example.com, -notag, match:"phrase".
Collection IDs: 0=all, -1=unsorted, -99=trash.`,
  args: {
    collection: tool.schema
      .number()
      .optional()
      .describe("Collection ID (0=all, -1=unsorted, -99=trash). Default: 0"),
    search: tool.schema
      .string()
      .optional()
      .describe("Search query with optional operators like tag:api, domain:github.com"),
    sort: tool.schema
      .enum(["-created", "created", "title", "-title", "score", "-sort", "domain"])
      .optional()
      .describe("Sort order. Default: -created (newest first)"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results (1-50). Default: 25"),
    page: tool.schema.number().optional().describe("Page number (0-based). Default: 0"),
    ...formatArg,
  },
};

export const ripple_getDef = {
  description: "Get detailed information about a single Raindrop bookmark by ID.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    ...formatArg,
  },
};

export const ripple_createDef = {
  description:
    "Create a new Raindrop bookmark. The server will automatically parse the URL for title, excerpt, and cover if not provided.",
  args: {
    url: tool.schema.string().describe("URL to bookmark (required)"),
    title: tool.schema.string().optional().describe("Custom title (auto-parsed if omitted)"),
    note: tool.schema.string().optional().describe("Personal notes"),
    tags: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Tags to apply"),
    collection: tool.schema
      .number()
      .optional()
      .describe("Collection ID to save to. Default: unsorted (-1)"),
    important: tool.schema.boolean().optional().describe("Mark as important/favorite"),
    ...formatArg,
  },
};

export const ripple_tagsDef = {
  description: "List all tags or tags within a specific collection.",
  args: {
    collection: tool.schema
      .number()
      .optional()
      .describe("Collection ID to get tags from. Omit for all tags."),
    ...formatArg,
  },
};

export const ripple_tag_addDef = {
  description: "Add tags to an existing bookmark. Merges with existing tags.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    tags: tool.schema.array(tool.schema.string()).describe("Tags to add"),
    ...formatArg,
  },
};

export const ripple_tag_removeDef = {
  description: "Remove tags from an existing bookmark.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    tags: tool.schema.array(tool.schema.string()).describe("Tags to remove"),
    ...formatArg,
  },
};

export const ripple_bulk_createDef = {
  description: "Create multiple bookmarks at once (up to 100). URLs are auto-parsed for metadata.",
  args: {
    urls: tool.schema.array(tool.schema.string()).describe("Array of URLs to bookmark"),
    tags: tool.schema.array(tool.schema.string()).optional().describe("Tags to apply to all bookmarks"),
    collection: tool.schema.number().optional().describe("Collection ID for all bookmarks"),
    ...formatArg,
  },
};

export const ripple_bulk_updateDef = {
  description: "Update multiple bookmarks at once. Filter by collection, search query, or specific IDs.",
  args: {
    collection: tool.schema.number().describe("Collection ID to update from"),
    ids: tool.schema.array(tool.schema.number()).optional().describe("Specific bookmark IDs to update"),
    search: tool.schema.string().optional().describe("Search filter for bookmarks to update"),
    nested: tool.schema.boolean().optional().describe("Include nested collections"),
    tags: tool.schema.array(tool.schema.string()).optional().describe("Tags to append (empty array removes all)"),
    important: tool.schema.boolean().optional().describe("Set favorite status"),
    move_to: tool.schema.number().optional().describe("Move to this collection ID"),
  },
};

export const ripple_deleteDef = {
  description: "Delete a single bookmark (moves to Trash, or permanently if already in Trash).",
  args: {
    id: tool.schema.number().describe("Bookmark ID to delete"),
  },
};

export const ripple_bulk_deleteDef = {
  description: "Delete multiple bookmarks. Filter by IDs or search. Use collection -99 to permanently delete from Trash.",
  args: {
    collection: tool.schema.number().describe("Collection ID (-99 for permanent delete from Trash)"),
    ids: tool.schema.array(tool.schema.number()).optional().describe("Specific bookmark IDs"),
    search: tool.schema.string().optional().describe("Search filter"),
    nested: tool.schema.boolean().optional().describe("Include nested collections"),
  },
};

export const ripple_suggestDef = {
  description: "Get AI-suggested collections and tags for a URL or existing bookmark.",
  args: {
    url: tool.schema.string().optional().describe("URL to get suggestions for"),
    id: tool.schema.number().optional().describe("Existing bookmark ID to get suggestions for"),
    ...formatArg,
  },
};

export const raindropToolDefs = {
  ripple_collections: ripple_collectionsDef,
  ripple_search: ripple_searchDef,
  ripple_get: ripple_getDef,
  ripple_create: ripple_createDef,
  ripple_tags: ripple_tagsDef,
  ripple_tag_add: ripple_tag_addDef,
  ripple_tag_remove: ripple_tag_removeDef,
  ripple_bulk_create: ripple_bulk_createDef,
  ripple_bulk_update: ripple_bulk_updateDef,
  ripple_delete: ripple_deleteDef,
  ripple_bulk_delete: ripple_bulk_deleteDef,
  ripple_suggest: ripple_suggestDef,
};
