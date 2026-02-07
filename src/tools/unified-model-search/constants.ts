export const UNIFIED_MODEL_SEARCH_DESCRIPTION = `Search for AI models across both Civitai and Runware model catalogs in a single query.

Returns normalized results with AIR-compatible model IDs (civitai:MODEL_ID@VERSION_ID or Runware native modelID).
Searches both sources in parallel via Promise.allSettled - partial failures are handled gracefully.

Supports filtering by source ("all", "civitai", "runware"), category, and architecture.
Use this tool when you need to find models across multiple providers without making separate calls.`
