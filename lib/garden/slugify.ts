/**
 * Utilities for converting Obsidian note names and paths to URL-safe slugs,
 * and maintaining a bidirectional lookup map between original names and slugs.
 */

// Slugify a single filename (without extension)
export function slugifyName(name: string): string {
  // Normalize Unicode accents/diacritics so "Itô" becomes "ito" instead of "it".
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalized
    .toLowerCase()
    .replace(/['"]/g, '')            // remove quotes/apostrophes
    .replace(/[^a-z0-9\s-]/g, '')    // remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens
}

// Convert a vault-relative path like "Math/Probability/Concepts/Chebyshev.md"
// to a slug like "math/probability/concepts/chebyshev"
export function pathToSlug(vaultRelativePath: string): string {
  // Remove .md extension
  let cleaned = vaultRelativePath
    .replace(/\.md$/, '');

  // Slugify each path segment
  return cleaned
    .split('/')
    .map(slugifyName)
    .filter(Boolean)
    .join('/');
}

// Extract the note title from a filename (without extension)
export function fileNameToTitle(fileName: string): string {
  return fileName.replace(/\.md$/, '');
}

export interface ManifestEntry {
  slug: string;
  originalTitle: string;
  aliases: string[];
  tags: string[];
  folder: string;        // parent folder slug (e.g., "math/probability/concepts")
  noteType: 'concept' | 'theorem' | 'other';
  sourceFile: string;    // original vault-relative path
  icon?: string;         // Obsidian icon identifier (emoji or icon pack ID)
  iconSvg?: string;      // Raw SVG string extracted from vault icon packs
  iconEmoji?: string;    // Emoji icon (if icon is an emoji)
}

export interface Manifest {
  entries: ManifestEntry[];
  // Lookup maps built from entries for fast resolution
  bySlug: Record<string, ManifestEntry>;
  byTitle: Record<string, ManifestEntry[]>;   // lowercase title -> entries (may have duplicates)
  byAlias: Record<string, ManifestEntry[]>;   // lowercase alias -> entries
}

// Determine note type from folder path
export function detectNoteType(folderPath: string): 'concept' | 'theorem' | 'other' {
  const lower = folderPath.toLowerCase();
  if (lower.includes('/concepts/') || lower.includes('/concepts')) return 'concept';
  if (lower.includes('/theorems/') || lower.includes('/theorems')) return 'theorem';
  return 'other';
}

// Build a manifest from a list of entries
export function buildManifest(entries: ManifestEntry[]): Manifest {
  const bySlug: Record<string, ManifestEntry> = {};
  const byTitle: Record<string, ManifestEntry[]> = {};
  const byAlias: Record<string, ManifestEntry[]> = {};

  for (const entry of entries) {
    bySlug[entry.slug] = entry;

    const titleKey = entry.originalTitle.toLowerCase();
    if (!byTitle[titleKey]) byTitle[titleKey] = [];
    byTitle[titleKey].push(entry);

    for (const alias of entry.aliases) {
      const aliasKey = alias.toLowerCase();
      if (!byAlias[aliasKey]) byAlias[aliasKey] = [];
      byAlias[aliasKey].push(entry);
    }
  }

  return { entries, bySlug, byTitle, byAlias };
}

// Resolve a wikilink target to a slug, given a manifest and the current note's folder
// Returns null if unresolved
export function resolveWikilink(
  target: string,
  manifest: Manifest,
  currentFolder: string
): string | null {
  // Strip anchor/heading references for resolution
  const [noteName] = target.split('#');
  const cleanName = noteName.trim();
  if (!cleanName) return null;

  const lowerName = cleanName.toLowerCase();

  // 1. Try exact slug match (if someone links by slug)
  const slugified = slugifyName(lowerName);
  if (manifest.bySlug[slugified]) return slugified;

  // 2. Try title match
  const titleMatches = manifest.byTitle[lowerName] || [];

  // 3. Try alias match
  const aliasMatches = manifest.byAlias[lowerName] || [];

  const allMatches = [...titleMatches, ...aliasMatches];

  if (allMatches.length === 0) return null;
  if (allMatches.length === 1) return allMatches[0].slug;

  // Disambiguate: prefer notes in the same subtree
  // Score by how many path segments match the current folder
  const currentParts = currentFolder.split('/');
  let bestMatch = allMatches[0];
  let bestScore = -1;

  for (const match of allMatches) {
    const matchParts = match.folder.split('/');
    let score = 0;
    for (let i = 0; i < Math.min(currentParts.length, matchParts.length); i++) {
      if (currentParts[i] === matchParts[i]) score++;
      else break;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = match;
    }
  }

  return bestMatch.slug;
}

// Extract tags from note content (lines starting with # that aren't headings)
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  // Match hashtags that appear at start of line or after whitespace
  // but not markdown headings (# followed by space)
  const tagRegex = /(?:^|\s)#([A-Za-z][A-Za-z0-9_/]*)/gm;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }
  return [...new Set(tags)];
}
