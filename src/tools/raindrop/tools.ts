import { tool } from "@opencode-ai/plugin/tool";
import type { ToolDefinition } from "@opencode-ai/plugin/tool";
import * as api from "./client";
import {
  ripple_bulk_createDef,
  ripple_bulk_deleteDef,
  ripple_bulk_updateDef,
  ripple_collectionsDef,
  ripple_createDef,
  ripple_deleteDef,
  ripple_getDef,
  ripple_searchDef,
  ripple_suggestDef,
  ripple_tag_addDef,
  ripple_tag_removeDef,
  ripple_tagsDef,
} from "./def";
import * as format from "./formatters";
import { OutputFormat, RaindropAPIError, SearchParamsSchema } from "./types";

// === ripple_collections ===
export const ripple_collections: ToolDefinition = tool({
  ...ripple_collectionsDef,
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
export const ripple_search: ToolDefinition = tool({
  ...ripple_searchDef,
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
export const ripple_get: ToolDefinition = tool({
  ...ripple_getDef,
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
export const ripple_create: ToolDefinition = tool({
  ...ripple_createDef,
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
export const ripple_tags: ToolDefinition = tool({
  ...ripple_tagsDef,
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
export const ripple_tag_add: ToolDefinition = tool({
  ...ripple_tag_addDef,
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
export const ripple_tag_remove: ToolDefinition = tool({
  ...ripple_tag_removeDef,
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
export const ripple_bulk_create: ToolDefinition = tool({
  ...ripple_bulk_createDef,
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
export const ripple_bulk_update: ToolDefinition = tool({
  ...ripple_bulk_updateDef,
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
export const ripple_delete: ToolDefinition = tool({
  ...ripple_deleteDef,
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
export const ripple_bulk_delete: ToolDefinition = tool({
  ...ripple_bulk_deleteDef,
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
export const ripple_suggest: ToolDefinition = tool({
  ...ripple_suggestDef,
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
export const rippleTools: Record<string, ToolDefinition> = {
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
