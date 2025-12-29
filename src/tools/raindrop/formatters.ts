import type { Collection, Raindrop, Tag, OutputFormat } from "./types";

// === Collection Formatters ===
export function formatCollections(collections: Collection[], format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify({ count: collections.length, items: collections }, null, 2);
  }

  if (format === "compact") {
    return collections
      .map((c) => `[${c._id}] ${c.title} (${c.count} items)`)
      .join("\n");
  }

  // markdown
  let md = `## Collections (${collections.length})\n\n`;
  for (const c of collections) {
    md += `### ${c.title}\n`;
    md += `- **ID**: ${c._id}\n`;
    md += `- **Count**: ${c.count} bookmarks\n`;
    if (c.color) md += `- **Color**: ${c.color}\n`;
    if (c.public) md += `- **Public**: Yes\n`;
    md += "\n";
  }
  return md.trim();
}

// === Raindrop Formatters ===
export function formatRaindrops(
  raindrops: Raindrop[],
  format: OutputFormat,
  query?: string
): string {
  if (format === "json") {
    return JSON.stringify({ count: raindrops.length, query, items: raindrops }, null, 2);
  }

  if (format === "compact") {
    return raindrops
      .map((r) => `[${r._id}] ${r.title} | ${r.link} | ${r.tags.join(",")}`)
      .join("\n");
  }

  // markdown
  const header = query ? `## Bookmarks: ${query}` : "## Bookmarks";
  let md = `${header}\n\n`;

  for (const r of raindrops) {
    md += `### ${r.title}\n`;
    md += `- **ID**: ${r._id}\n`;
    md += `- **URL**: ${r.link}\n`;
    if (r.tags.length) md += `- **Tags**: ${r.tags.join(", ")}\n`;
    if (r.excerpt) md += `- **Excerpt**: ${r.excerpt}\n`;
    if (r.note) md += `- **Notes**: ${r.note}\n`;
    if (r.domain) md += `- **Domain**: ${r.domain}\n`;
    md += `- **Saved**: ${r.created.split("T")[0]}\n`;
    if (r.important) md += `- **Important**: ⭐\n`;
    if (r.highlights?.length) {
      md += `- **Highlights**:\n`;
      for (const h of r.highlights) {
        md += `  - "${h.text}"${h.note ? ` (${h.note})` : ""}\n`;
      }
    }
    md += "\n---\n\n";
  }
  return md.trim();
}

export function formatRaindrop(raindrop: Raindrop, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify(raindrop, null, 2);
  }

  if (format === "compact") {
    return `[${raindrop._id}] ${raindrop.title} | ${raindrop.link} | ${raindrop.tags.join(",")}`;
  }

  // markdown - detailed single view
  let md = `## ${raindrop.title}\n\n`;
  md += `**URL**: ${raindrop.link}\n\n`;

  if (raindrop.excerpt) md += `> ${raindrop.excerpt}\n\n`;

  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| ID | ${raindrop._id} |\n`;
  md += `| Type | ${raindrop.type} |\n`;
  md += `| Tags | ${raindrop.tags.join(", ") || "none"} |\n`;
  md += `| Domain | ${raindrop.domain || "n/a"} |\n`;
  md += `| Saved | ${raindrop.created} |\n`;
  md += `| Updated | ${raindrop.lastUpdate || "n/a"} |\n`;
  md += `| Important | ${raindrop.important ? "Yes" : "No"} |\n`;
  md += `| Collection | ${raindrop.collection.$id} |\n`;

  if (raindrop.note) {
    md += `\n### Notes\n${raindrop.note}\n`;
  }

  if (raindrop.highlights?.length) {
    md += `\n### Highlights\n`;
    for (const h of raindrop.highlights) {
      md += `- "${h.text}"`;
      if (h.note) md += ` — *${h.note}*`;
      md += "\n";
    }
  }

  if (raindrop.cover) {
    md += `\n### Cover\n![cover](${raindrop.cover})\n`;
  }

  return md.trim();
}

// === Tag Formatters ===
export function formatTags(tags: Tag[], format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify({ count: tags.length, items: tags }, null, 2);
  }

  if (format === "compact") {
    return tags.map((t) => `${t._id}${t.count ? ` (${t.count})` : ""}`).join(", ");
  }

  // markdown
  let md = `## Tags (${tags.length})\n\n`;
  for (const t of tags) {
    md += `- **${t._id}**${t.count ? ` — ${t.count} bookmarks` : ""}\n`;
  }
  return md.trim();
}
