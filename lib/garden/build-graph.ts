/**
 * Builds a bidirectional link graph from the processed notes.
 * Each node contains its outlinks and computed backlinks.
 */

export interface GraphNode {
  title: string;
  slug: string;
  outlinks: string[];    // slugs this note links to
  backlinks: string[];   // slugs that link to this note
  tags: string[];
  folder: string;
  noteType: 'concept' | 'theorem' | 'other';
}

export interface Graph {
  nodes: Record<string, GraphNode>;
  totalNotes: number;
  totalLinks: number;
}

interface NoteData {
  slug: string;
  title: string;
  outlinks: string[];
  tags: string[];
  folder: string;
  noteType: 'concept' | 'theorem' | 'other';
}

export function buildGraph(notes: NoteData[]): Graph {
  const nodes: Record<string, GraphNode> = {};

  // First pass: create all nodes with outlinks
  for (const note of notes) {
    nodes[note.slug] = {
      title: note.title,
      slug: note.slug,
      outlinks: note.outlinks,
      backlinks: [],
      tags: note.tags,
      folder: note.folder,
      noteType: note.noteType,
    };
  }

  // Second pass: compute backlinks
  let totalLinks = 0;
  for (const note of notes) {
    for (const outlinkSlug of note.outlinks) {
      if (nodes[outlinkSlug]) {
        nodes[outlinkSlug].backlinks.push(note.slug);
        totalLinks++;
      }
    }
  }

  return {
    nodes,
    totalNotes: notes.length,
    totalLinks,
  };
}

// Get backlinks for a specific note from the graph
export function getBacklinks(graph: Graph, slug: string): { slug: string; title: string }[] {
  const node = graph.nodes[slug];
  if (!node) return [];

  return node.backlinks
    .map(backlinkSlug => {
      const backlinkNode = graph.nodes[backlinkSlug];
      if (!backlinkNode) return null;
      return { slug: backlinkSlug, title: backlinkNode.title };
    })
    .filter((b): b is { slug: string; title: string } => b !== null);
}
