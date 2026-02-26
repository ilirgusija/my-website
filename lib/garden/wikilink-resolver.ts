/**
 * Processes raw markdown content to resolve Obsidian wikilinks into standard markdown links.
 * This runs as a pre-processing step (string transformation) before the remark pipeline,
 * since wikilinks are not standard markdown and remark wouldn't parse them.
 */

import { Manifest, resolveWikilink } from './slugify';

interface ResolvedLink {
  target: string;    // resolved slug
  display: string;   // display text
  anchor: string;    // optional #anchor
}

interface WikilinkResolutionResult {
  content: string;                    // transformed markdown with standard links
  outlinks: string[];                 // list of resolved slugs this note links to
  unresolvedLinks: string[];          // list of unresolved wikilink targets
}

interface ResolveWikilinksOptions {
  // Map key format: "<resolved-slug>#^<blockid>" -> preferred display label
  blockReferenceTitles?: Record<string, string>;
  // Map key format: "<target-note-lower>#^<blockid>" -> preferred display label
  // This is a robust fallback when title resolution chooses a different slug variant.
  blockReferenceTitlesByTarget?: Record<string, string>;
}

// Regex to match [[Target]] and ![[Target]] (embed) — both become links
// Also [[Target|Display]] and [[Target#anchor]] and [[Target#anchor|Display]]
const WIKILINK_REGEX = /!?\[\[([^\]]+)\]\]/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render display text that may include inline LaTeX ($...$) to HTML.
 * Example: "density of $\\mathcal{E}$" -> text + <span class="math inline">...</span>
 */
function displayToHtml(display: string): string {
  const parts = display.split(/(\$[^$]+\$)/g).filter(Boolean);
  return parts
    .map((part) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const latex = part.slice(1, -1);
        return `<span class="math inline">${escapeHtml(latex)}</span>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function hasInlineMath(display: string): boolean {
  return /\$[^$]+\$/.test(display);
}

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/]/g, '\\]');
}

function parseWikilink(raw: string): { target: string; display: string; anchor: string; explicitDisplay: boolean } {
  // Split on pipe first for display text
  const pipeIndex = raw.indexOf('|');
  let targetPart: string;
  let display: string;
  let explicitDisplay = false;

  if (pipeIndex !== -1) {
    targetPart = raw.substring(0, pipeIndex).trim();
    display = raw.substring(pipeIndex + 1).trim();
    explicitDisplay = true;
  } else {
    targetPart = raw.trim();
    display = '';
  }

  // Split target on # for anchor
  const hashIndex = targetPart.indexOf('#');
  let target: string;
  let anchor: string;

  if (hashIndex !== -1) {
    target = targetPart.substring(0, hashIndex).trim();
    anchor = targetPart.substring(hashIndex).trim(); // includes the #
  } else {
    target = targetPart;
    anchor = '';
  }

  // If no explicit display text, use the target name (without path)
  if (!display) {
    if (anchor && !anchor.startsWith('#^')) {
      // Prefer semantic section anchors over note title for display text.
      // Example: [[Predictable sets#Proposition (Density of $\\mathcal{E}$)]]
      display = anchor.slice(1).trim();
    } else {
    // Handle full path links like [[School/Math/Analysis/.../Continuous]]
      const lastSlash = target.lastIndexOf('/');
      display = lastSlash !== -1 ? target.substring(lastSlash + 1) : target;
    }
  }

  return { target, display, anchor, explicitDisplay };
}

export function resolveWikilinks(
  markdownContent: string,
  manifest: Manifest,
  currentNoteFolder: string,
  imageMap?: Record<string, string>,
  options?: ResolveWikilinksOptions
): WikilinkResolutionResult {
  const outlinks: string[] = [];
  const unresolvedLinks: string[] = [];

  const transformed = markdownContent.replace(WIKILINK_REGEX, (fullMatch, rawLink: string) => {
    const isEmbed = fullMatch.startsWith('!');
    const { target, display, anchor, explicitDisplay } = parseWikilink(rawLink);

    // Image embeds: ![[image.png]] → ![alt](url)
    if (isEmbed && imageMap) {
      const filename = target.split('/').pop() || target;
      if (imageMap[filename]) {
        return `![${display}](${imageMap[filename]})`;
      }
    }

    // Try to resolve the target as a note
    const resolvedSlug = resolveWikilink(target, manifest, currentNoteFolder);

    if (resolvedSlug) {
      outlinks.push(resolvedSlug);
      const url = `/garden/${resolvedSlug}${anchor}`;
      let resolvedDisplay = display;
      let displayFromBlockTitle = false;

      // For block refs like [[Predictable sets#^3f95ee]], prefer the target block's
      // title (if known) rather than the containing note title.
      if (!explicitDisplay && anchor.startsWith('#^')) {
        const key = `${resolvedSlug}${anchor.toLowerCase()}`;
        const targetKey = `${target.toLowerCase()}${anchor.toLowerCase()}`;
        const blockTitle =
          options?.blockReferenceTitles?.[key] ??
          options?.blockReferenceTitlesByTarget?.[targetKey];
        if (blockTitle && blockTitle.trim()) {
          resolvedDisplay = blockTitle.trim();
          displayFromBlockTitle = true;
        }
      }

      // Keep resolved links in markdown form so Pandoc can parse math inside
      // link labels correctly (raw HTML <span class=\"math inline\">...</span>
      // inside link text gets stripped by Pandoc).
      return `[${escapeMarkdownLinkText(resolvedDisplay)}](${url})`;
    } else {
      // Unresolved link — render as styled span (will be gray in the UI)
      unresolvedLinks.push(target);
      if (hasInlineMath(display)) {
        return `<span class="wikilink-unresolved" title="Note not published">${displayToHtml(display)}</span>`;
      }
      return `<span class="wikilink-unresolved" title="Note not published">${display}</span>`;
    }
  });

  return {
    content: transformed,
    outlinks: [...new Set(outlinks)],
    unresolvedLinks: [...new Set(unresolvedLinks)],
  };
}
