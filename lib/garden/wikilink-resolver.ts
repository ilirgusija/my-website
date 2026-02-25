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

// Regex to match [[Target]] and ![[Target]] (embed) — both become links
// Also [[Target|Display]] and [[Target#anchor]] and [[Target#anchor|Display]]
const WIKILINK_REGEX = /!?\[\[([^\]]+)\]\]/g;

function parseWikilink(raw: string): { target: string; display: string; anchor: string } {
  // Split on pipe first for display text
  const pipeIndex = raw.indexOf('|');
  let targetPart: string;
  let display: string;

  if (pipeIndex !== -1) {
    targetPart = raw.substring(0, pipeIndex).trim();
    display = raw.substring(pipeIndex + 1).trim();
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
    // Handle full path links like [[School/Math/Analysis/.../Continuous]]
    const lastSlash = target.lastIndexOf('/');
    display = lastSlash !== -1 ? target.substring(lastSlash + 1) : target;
  }

  return { target, display, anchor };
}

export function resolveWikilinks(
  markdownContent: string,
  manifest: Manifest,
  currentNoteFolder: string,
  imageMap?: Record<string, string>
): WikilinkResolutionResult {
  const outlinks: string[] = [];
  const unresolvedLinks: string[] = [];

  const transformed = markdownContent.replace(WIKILINK_REGEX, (fullMatch, rawLink: string) => {
    const isEmbed = fullMatch.startsWith('!');
    const { target, display, anchor } = parseWikilink(rawLink);

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
      return `[${display}](${url})`;
    } else {
      // Unresolved link — render as styled span (will be gray in the UI)
      unresolvedLinks.push(target);
      return `<span class="wikilink-unresolved" title="Note not published">${display}</span>`;
    }
  });

  return {
    content: transformed,
    outlinks: [...new Set(outlinks)],
    unresolvedLinks: [...new Set(unresolvedLinks)],
  };
}
