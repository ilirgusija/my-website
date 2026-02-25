/**
 * Pre-processes Obsidian callout syntax into HTML that can be styled by React components.
 *
 * Obsidian callouts look like:
 *   >[!def] Title
 *   >Content line 1
 *   >Content line 2
 *
 * We convert them to custom HTML divs that the GardenMarkdownRenderer can style:
 *   <div class="callout callout-definition" data-callout-type="definition" data-callout-title="Title">
 *   Content line 1
 *   Content line 2
 *   </div>
 */

const CALLOUT_TYPE_MAP: Record<string, string> = {
  'def': 'definition',
  'definition': 'definition',
  'thm': 'theorem',
  'theorem': 'theorem',
  'proof': 'proof',
  'example': 'example',
  'note': 'note',
  'warning': 'warning',
  'tip': 'tip',
  'important': 'important',
  'lemma': 'theorem',
  'corollary': 'theorem',
  'proposition': 'theorem',
  'remark': 'note',
  'claim': 'theorem',
};

export function processCallouts(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts a callout: >[!type] or > [!type]
    const calloutMatch = line.match(/^>\s*\[!(\w+)\]\s*(.*)?$/);

    if (calloutMatch) {
      const rawType = calloutMatch[1].toLowerCase();
      const title = calloutMatch[2]?.trim() || '';
      const calloutType = CALLOUT_TYPE_MAP[rawType] || rawType;

      // Collect all subsequent lines that are part of this blockquote
      // Stop if we hit another callout start (>[!type])
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        // Check if this is a new callout start — if so, stop and let the outer loop handle it
        if (nextLine.match(/^>\s*\[!\w+\]/)) {
          break;
        }
        // Lines starting with > (possibly with content after) are part of the callout
        if (nextLine.match(/^>/)) {
          // Remove the leading > and optional space
          calloutLines.push(nextLine.replace(/^>\s?/, ''));
          i++;
        } else if (nextLine.trim() === '') {
          // Empty line might end the callout or be inside it
          // Check if the next non-empty line continues the blockquote
          if (i + 1 < lines.length && lines[i + 1].match(/^>/)) {
            calloutLines.push('');
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const calloutContent = calloutLines.join('\n');
      const titleAttr = title ? ` data-callout-title="${title.replace(/"/g, '&quot;')}"` : '';

      result.push(`<div class="callout callout-${calloutType}" data-callout-type="${calloutType}"${titleAttr}>`);
      result.push('');
      result.push(calloutContent);
      result.push('');
      result.push('</div>');
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}
