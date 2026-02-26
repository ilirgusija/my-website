/**
 * Garden data access layer.
 * Reads from Supabase (production) or content/garden/ (local dev fallback).
 * No md/json in repo - compiled data lives in Supabase.
 * Used by getStaticProps and getStaticPaths in pages/garden/[...slug].tsx.
 */

import fs from 'fs';
import path from 'path';
import { Graph } from './build-graph';
import { ManifestEntry } from './slugify';
import {
  hasSupabaseConfig,
  fetchGardenManifest as supabaseFetchManifest,
  fetchGardenGraph as supabaseFetchGraph,
  fetchGardenNote as supabaseFetchNote,
  fetchGardenNotePreview as supabaseFetchNotePreview,
} from '../supabase-garden';

// Types for the processed note data
export interface GardenNoteData {
  slug: string;
  title: string;
  html: string;           // pre-rendered HTML with resolved wikilinks and callouts
  markdown: string;        // original markdown (with wikilinks resolved) for re-rendering client-side if needed
  tags: string[];
  folder: string;
  noteType: 'concept' | 'theorem' | 'other';
  aliases: string[];
  outlinks: string[];
  status: 'seedling' | 'budding' | 'evergreen';
  lastModified: string;
}

export interface GardenManifest {
  entries: ManifestEntry[];
  folderIcons?: Record<string, {
    icon?: string;
    iconSvg?: string;
    iconEmoji?: string;
  }>;
  generatedAt: string;
  totalNotes: number;
}

// Local garden dir (compiled output, committed to repo)
const LOCAL_GARDEN_DIR = path.join(process.cwd(), 'content/garden');

// In-memory cache for build
let manifestCache: GardenManifest | null = null;
let graphCache: Graph | null = null;
let supabaseManifestCache: { data: GardenManifest; fetchedAt: number } | null = null;
let supabaseGraphCache: { data: Graph; fetchedAt: number } | null = null;

const SUPABASE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get the garden manifest (list of all notes with metadata).
 */
export async function getGardenManifest(): Promise<GardenManifest | null> {
  if (hasSupabaseConfig()) {
    if (
      supabaseManifestCache &&
      Date.now() - supabaseManifestCache.fetchedAt < SUPABASE_CACHE_TTL_MS
    ) {
      return supabaseManifestCache.data;
    }
    const data = await supabaseFetchManifest();
    if (data) {
      supabaseManifestCache = { data, fetchedAt: Date.now() };
      return data;
    }
  }
  return getLocalManifest();
}

/**
 * Get the backlink graph.
 */
export async function getGardenGraph(): Promise<Graph | null> {
  if (hasSupabaseConfig()) {
    if (
      supabaseGraphCache &&
      Date.now() - supabaseGraphCache.fetchedAt < SUPABASE_CACHE_TTL_MS
    ) {
      return supabaseGraphCache.data;
    }
    const data = await supabaseFetchGraph();
    if (data) {
      supabaseGraphCache = { data, fetchedAt: Date.now() };
      return data;
    }
  }
  return getLocalGraph();
}

/**
 * Get a single note's data by slug.
 */
export async function getGardenNote(slug: string): Promise<GardenNoteData | null> {
  if (hasSupabaseConfig()) {
    const data = await supabaseFetchNote(slug);
    if (data) return data;
  }
  return getLocalNote(slug);
}

export async function getGardenNotePreview(
  slug: string
): Promise<Omit<GardenNoteData, 'markdown'> | null> {
  if (hasSupabaseConfig()) {
    const data = await supabaseFetchNotePreview(slug);
    if (data) return data;
  }
  const local = getLocalNote(slug);
  if (!local) return null;
  const { markdown, ...noteWithoutMarkdown } = local;
  return noteWithoutMarkdown;
}

/**
 * Get all note slugs for getStaticPaths.
 */
export async function getAllGardenSlugs(): Promise<string[]> {
  const manifest = await getGardenManifest();
  if (!manifest) return [];
  return manifest.entries.map(e => e.slug);
}

/**
 * Get all folder paths that should have index pages.
 */
export async function getAllGardenFolders(): Promise<string[]> {
  const manifest = await getGardenManifest();
  if (!manifest) return [];

  const folders = new Set<string>();
  for (const entry of manifest.entries) {
    // Add the folder and all parent folders
    const parts = entry.folder.split('/');
    for (let i = 1; i <= parts.length; i++) {
      folders.add(parts.slice(0, i).join('/'));
    }
  }
  return [...folders];
}

/**
 * Get backlink data for a specific note.
 */
export async function getBacklinksForNote(slug: string): Promise<{ slug: string; title: string }[]> {
  const graph = await getGardenGraph();
  if (!graph || !graph.nodes[slug]) return [];

  const seen = new Set<string>();
  return graph.nodes[slug].backlinks
    .map(backlinkSlug => {
      const node = graph.nodes[backlinkSlug];
      if (!node || seen.has(backlinkSlug)) return null;
      seen.add(backlinkSlug);
      return { slug: backlinkSlug, title: node.title };
    })
    .filter((b): b is { slug: string; title: string } => b !== null);
}

// --- Local dev helpers ---

function getLocalManifest(): GardenManifest | null {
  if (manifestCache) return manifestCache;

  const manifestPath = path.join(LOCAL_GARDEN_DIR, '_manifest.json');
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifestCache = JSON.parse(raw);
    return manifestCache;
  } catch {
    return null;
  }
}

function getLocalGraph(): Graph | null {
  if (graphCache) return graphCache;

  const graphPath = path.join(LOCAL_GARDEN_DIR, '_graph.json');
  if (!fs.existsSync(graphPath)) return null;

  try {
    const raw = fs.readFileSync(graphPath, 'utf8');
    graphCache = JSON.parse(raw);
    return graphCache;
  } catch {
    return null;
  }
}

function getLocalNote(slug: string): GardenNoteData | null {
  const notePath = path.join(LOCAL_GARDEN_DIR, 'notes', `${slug}.json`);
  if (!fs.existsSync(notePath)) return null;

  try {
    const raw = fs.readFileSync(notePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
