import { tool } from "@opencode-ai/plugin/tool";
import * as api from "./client";
import * as format from "./formatters";
import { OutputFormat, RaindropAPIError, SearchParamsSchema } from "./types";

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
};

// === ripple_collections ===
export const ripple_collections = tool({
  description:
    "List all Raindrop.io bookmark collections. Returns collection names, IDs, and bookmark counts.",
  args: {
    ...formatArg,
  },
  async execute({ format: fmt = "markdown" }) {
    try {
      const collections = await api.getCollections();
      return format.formatCollections(collections, fmt as OutputFormat);
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_search ===
export const ripple_search = tool({
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
  async execute({ collection = 0, search, sort, limit = 25, page = 0, format: fmt = "markdown" }) {
    try {
      const params = SearchParamsSchema.parse({
        collection,
        search,
        sort,
        page,
        perpage: Math.min(50, Math.max(1, limit)),
      });
      const { items, count } = await api.getRaindrops(params);
      const result = format.formatRaindrops(items, fmt as OutputFormat, search);
      if (fmt === "markdown") {
        return `${result}\n\n*Showing ${items.length} of ${count} total*`;
      }
      return result;
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_get ===
export const ripple_get = tool({
  description: "Get detailed information about a single Raindrop bookmark by ID.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    ...formatArg,
  },
  async execute({ id, format: fmt = "markdown" }) {
    try {
      const raindrop = await api.getRaindrop(id);
      return format.formatRaindrop(raindrop, fmt as OutputFormat);
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_create ===
export const ripple_create = tool({
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
  async execute({
    url,
    title,
    note,
    tags,
    collection,
    important,
    format: fmt = "markdown",
  }) {
    try {
      const raindrop = await api.createRaindrop({
        link: url,
        title,
        note,
        tags,
        collection: collection ?? -1,
        important,
        pleaseParse: {},
      });
      const result = format.formatRaindrop(raindrop, fmt as OutputFormat);
      return `✓ Bookmark created!\n\n${result}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_tags ===
export const ripple_tags = tool({
  description: "List all tags or tags within a specific collection.",
  args: {
    collection: tool.schema
      .number()
      .optional()
      .describe("Collection ID to get tags from. Omit for all tags."),
    ...formatArg,
  },
  async execute({ collection, format: fmt = "markdown" }) {
    try {
      const tags = await api.getTags(collection);
      return format.formatTags(tags, fmt as OutputFormat);
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_tag_add ===
export const ripple_tag_add = tool({
  description: "Add tags to an existing bookmark. Merges with existing tags.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    tags: tool.schema.array(tool.schema.string()).describe("Tags to add"),
    ...formatArg,
  },
  async execute({ id, tags, format: fmt = "markdown" }) {
    try {
      // Get current tags first
      const current = await api.getRaindrop(id);
      const mergedTags = [...new Set([...current.tags, ...tags])];
      const updated = await api.updateRaindrop(id, { tags: mergedTags });
      const result = format.formatRaindrop(updated, fmt as OutputFormat);
      return `✓ Added tags: ${tags.join(", ")}\n\n${result}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_tag_remove ===
export const ripple_tag_remove = tool({
  description: "Remove tags from an existing bookmark.",
  args: {
    id: tool.schema.number().describe("Raindrop bookmark ID"),
    tags: tool.schema.array(tool.schema.string()).describe("Tags to remove"),
    ...formatArg,
  },
  async execute({ id, tags, format: fmt = "markdown" }) {
    try {
      const current = await api.getRaindrop(id);
      const remainingTags = current.tags.filter((t) => !tags.includes(t));
      const updated = await api.updateRaindrop(id, { tags: remainingTags });
      const result = format.formatRaindrop(updated, fmt as OutputFormat);
      return `✓ Removed tags: ${tags.join(", ")}\n\n${result}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) {
        return `Error: ${e.message}`;
      }
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_bulk_create ===
export const ripple_bulk_create = tool({
  description: "Create multiple bookmarks at once (up to 100). URLs are auto-parsed for metadata.",
  args: {
    urls: tool.schema.array(tool.schema.string()).describe("Array of URLs to bookmark"),
    tags: tool.schema.array(tool.schema.string()).optional().describe("Tags to apply to all bookmarks"),
    collection: tool.schema.number().optional().describe("Collection ID for all bookmarks"),
    ...formatArg,
  },
  async execute({ urls, tags, collection, format: fmt = "markdown" }) {
    try {
      const items = urls.map(url => ({
        link: url,
        tags,
        collection,
        pleaseParse: {},
      }));
      const created = await api.createManyRaindrops(items);
      const result = format.formatRaindrops(created, fmt as OutputFormat, `${urls.length} URLs`);
      return `✓ Created ${created.length} bookmarks\n\n${result}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) return `Error: ${e.message}`;
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_bulk_update ===
export const ripple_bulk_update = tool({
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
  async execute({ collection, ids, search, nested, tags, important, move_to }) {
    try {
      const modified = await api.updateManyRaindrops({
        collectionId: collection,
        ids,
        search,
        nested,
        tags,
        important,
        collection: move_to,
      });
      return `✓ Updated ${modified} bookmarks`;
    } catch (e) {
      if (e instanceof RaindropAPIError) return `Error: ${e.message}`;
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_delete ===
export const ripple_delete = tool({
  description: "Delete a single bookmark (moves to Trash, or permanently if already in Trash).",
  args: {
    id: tool.schema.number().describe("Bookmark ID to delete"),
  },
  async execute({ id }) {
    try {
      await api.deleteRaindrop(id);
      return `✓ Deleted bookmark ${id}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) return `Error: ${e.message}`;
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_bulk_delete ===
export const ripple_bulk_delete = tool({
  description: "Delete multiple bookmarks. Filter by IDs or search. Use collection -99 to permanently delete from Trash.",
  args: {
    collection: tool.schema.number().describe("Collection ID (-99 for permanent delete from Trash)"),
    ids: tool.schema.array(tool.schema.number()).optional().describe("Specific bookmark IDs"),
    search: tool.schema.string().optional().describe("Search filter"),
    nested: tool.schema.boolean().optional().describe("Include nested collections"),
  },
  async execute({ collection, ids, search, nested }) {
    try {
      const deleted = await api.deleteManyRaindrops(collection, { ids, search, nested });
      const action = collection === -99 ? "permanently deleted" : "moved to Trash";
      return `✓ ${deleted} bookmarks ${action}`;
    } catch (e) {
      if (e instanceof RaindropAPIError) return `Error: ${e.message}`;
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === ripple_suggest ===
export const ripple_suggest = tool({
  description: "Get AI-suggested collections and tags for a URL or existing bookmark.",
  args: {
    url: tool.schema.string().optional().describe("URL to get suggestions for"),
    id: tool.schema.number().optional().describe("Existing bookmark ID to get suggestions for"),
    ...formatArg,
  },
  async execute({ url, id, format: fmt = "markdown" }) {
    try {
      if (!url && !id) return "Error: Provide either url or id";
      
      const result = url 
        ? await api.suggestForUrl(url)
        : await api.suggestForRaindrop(id!);
      
      if (fmt === "json") {
        return JSON.stringify(result, null, 2);
      }
      if (fmt === "compact") {
        return `Collections: ${result.collections.join(", ")} | Tags: ${result.tags.join(", ")}`;
      }
      
      let md = "## Suggestions\n\n";
      md += `**Collections**: ${result.collections.join(", ") || "none"}\n`;
      md += `**Tags**: ${result.tags.join(", ") || "none"}\n`;
      return md;
    } catch (e) {
      if (e instanceof RaindropAPIError) return `Error: ${e.message}`;
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// === Export all tools ===
export const rippleTools = {
  ripple_collections,
  ripple_search,
  ripple_get,
  ripple_create,
  ripple_tags,
  ripple_tag_add,
  ripple_tag_remove,
  ripple_bulk_create,
  ripple_bulk_update,
  ripple_delete,
  ripple_bulk_delete,
  ripple_suggest,
};
