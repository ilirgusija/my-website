/**
 * Supabase client and helpers for garden data.
 * Uses service role key for server-side access (sync, build).
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { GardenNoteData, GardenManifest } from './garden/index';
import type { Graph } from './garden/build-graph';

let _client: SupabaseClient | null = null;
let _clientCacheKey = '';

function readSupabaseConfig(): { url: string; serviceKey: string } | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.DB_SUPA_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_DB_SUPA_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.DB_SUPA_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = readSupabaseConfig();
  if (!config) return null;

  const cacheKey = `${config.url}|${config.serviceKey}`;
  if (!_client || _clientCacheKey !== cacheKey) {
    _client = createClient(config.url, config.serviceKey);
    _clientCacheKey = cacheKey;
  }
  return _client;
}

export function hasSupabaseConfig(): boolean {
  return readSupabaseConfig() !== null;
}

function shouldLogSupabaseMetrics(): boolean {
  return process.env.SUPABASE_METRICS === '1';
}

function estimatePayloadBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return 0;
  }
}

function logSupabaseMetric(label: string, details: {
  rows?: number;
  bytes?: number;
  elapsedMs?: number;
}) {
  if (!shouldLogSupabaseMetrics()) return;
  const parts = [
    `label=${label}`,
    details.rows !== undefined ? `rows=${details.rows}` : null,
    details.bytes !== undefined ? `kb=${(details.bytes / 1024).toFixed(1)}` : null,
    details.elapsedMs !== undefined ? `ms=${details.elapsedMs}` : null,
  ].filter(Boolean);
  console.log(`[supabase-metrics] ${parts.join(' ')}`);
}

async function withRetry<T = any>(
  operation: () => PromiseLike<T> | T,
  attempts = 3,
  label = 'operation'
): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await Promise.resolve(operation());
    } catch (error) {
      lastError = error;
      if (i < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 300 * i));
      }
    }
  }
  throw new Error(`Supabase ${label} failed after ${attempts} attempts: ${String(lastError)}`);
}

// DB row shape (snake_case)
interface GardenNoteRow {
  slug: string;
  title: string;
  html: string;
  markdown: string;
  tags: string[];
  folder: string;
  note_type: string;
  aliases: string[];
  outlinks: string[];
  status: string;
  last_modified: string;
}

function rowToNote(row: GardenNoteRow): GardenNoteData {
  return {
    slug: row.slug,
    title: row.title,
    html: row.html,
    markdown: row.markdown,
    tags: row.tags || [],
    folder: row.folder,
    noteType: row.note_type as 'concept' | 'theorem' | 'other',
    aliases: row.aliases || [],
    outlinks: row.outlinks || [],
    status: (row.status as 'seedling' | 'budding' | 'evergreen') || 'seedling',
    lastModified: row.last_modified,
  };
}

function rowToNotePreview(row: Omit<GardenNoteRow, 'markdown'>): Omit<GardenNoteData, 'markdown'> {
  return {
    slug: row.slug,
    title: row.title,
    html: row.html,
    tags: row.tags || [],
    folder: row.folder,
    noteType: row.note_type as 'concept' | 'theorem' | 'other',
    aliases: row.aliases || [],
    outlinks: row.outlinks || [],
    status: (row.status as 'seedling' | 'budding' | 'evergreen') || 'seedling',
    lastModified: row.last_modified,
  };
}

function noteToRow(note: GardenNoteData): Omit<GardenNoteRow, 'last_modified'> & { last_modified?: string } {
  return {
    slug: note.slug,
    title: note.title,
    html: note.html,
    markdown: note.markdown,
    tags: note.tags,
    folder: note.folder,
    note_type: note.noteType,
    aliases: note.aliases,
    outlinks: note.outlinks,
    status: note.status,
    last_modified: note.lastModified,
  };
}

export async function fetchGardenManifest(): Promise<GardenManifest | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const started = Date.now();
  const { data, error } = await supabase
    .from('garden_meta')
    .select('data')
    .eq('key', 'manifest')
    .single();
  if (error || !data?.data) return null;
  logSupabaseMetric('fetchGardenManifest', {
    rows: 1,
    bytes: estimatePayloadBytes(data?.data),
    elapsedMs: Date.now() - started,
  });
  return data.data as GardenManifest;
}

export async function fetchGardenGraph(): Promise<Graph | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const started = Date.now();
  const { data, error } = await supabase
    .from('garden_meta')
    .select('data')
    .eq('key', 'graph')
    .single();
  if (error || !data?.data) return null;
  logSupabaseMetric('fetchGardenGraph', {
    rows: 1,
    bytes: estimatePayloadBytes(data?.data),
    elapsedMs: Date.now() - started,
  });
  return data.data as Graph;
}

export async function fetchGardenNote(slug: string): Promise<GardenNoteData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const started = Date.now();
  const { data, error } = await supabase
    .from('garden_notes')
    .select('slug,title,html,markdown,tags,folder,note_type,aliases,outlinks,status,last_modified')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  logSupabaseMetric('fetchGardenNote', {
    rows: 1,
    bytes: estimatePayloadBytes(data),
    elapsedMs: Date.now() - started,
  });
  return rowToNote(data as GardenNoteRow);
}

export async function fetchGardenNotePreview(slug: string): Promise<Omit<GardenNoteData, 'markdown'> | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const started = Date.now();
  const { data, error } = await supabase
    .from('garden_notes')
    .select('slug,title,html,tags,folder,note_type,aliases,outlinks,status,last_modified')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  logSupabaseMetric('fetchGardenNotePreview', {
    rows: 1,
    bytes: estimatePayloadBytes(data),
    elapsedMs: Date.now() - started,
  });
  return rowToNotePreview(data as Omit<GardenNoteRow, 'markdown'>);
}

export interface GardenNoteGraphSnapshot {
  slug: string;
  title: string;
  outlinks: string[];
  tags: string[];
}

/** Fetch minimal fields needed to rebuild graph in incremental sync */
export async function fetchGardenNoteGraphSnapshots(): Promise<Map<string, GardenNoteGraphSnapshot>> {
  const supabase = getSupabaseClient();
  const map = new Map<string, GardenNoteGraphSnapshot>();
  if (!supabase) return map;

  const pageSize = 1000;
  let from = 0;
  let totalRows = 0;
  let totalBytes = 0;
  const started = Date.now();

  while (true) {
    const pageStarted = Date.now();
    const { data, error } = await supabase
      .from('garden_notes')
      .select('slug,title,outlinks,tags')
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    totalRows += data.length;
    totalBytes += estimatePayloadBytes(data);
    logSupabaseMetric('fetchGardenNoteGraphSnapshots.page', {
      rows: data.length,
      bytes: estimatePayloadBytes(data),
      elapsedMs: Date.now() - pageStarted,
    });

    for (const row of data as Array<Pick<GardenNoteRow, 'slug' | 'title' | 'outlinks' | 'tags'>>) {
      map.set(row.slug, {
        slug: row.slug,
        title: row.title,
        outlinks: row.outlinks || [],
        tags: row.tags || [],
      });
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  logSupabaseMetric('fetchGardenNoteGraphSnapshots.total', {
    rows: totalRows,
    bytes: totalBytes,
    elapsedMs: Date.now() - started,
  });

  return map;
}

/** Upsert notes, delete removed slugs, update manifest and graph */
export async function syncGardenToSupabase(
  notes: GardenNoteData[],
  manifest: GardenManifest,
  graph: Graph,
  slugsToDelete: string[]
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  const started = Date.now();
  let upsertRows = 0;
  let upsertBytes = 0;

  // Upsert notes in conservative batches. Large HTML payloads can exceed
  // PostgREST request limits, so keep batches small and degrade gracefully.
  const BATCH_SIZE = 20;
  for (let i = 0; i < notes.length; i += BATCH_SIZE) {
    const batch = notes.slice(i, i + BATCH_SIZE).map((n) => noteToRow(n));
    upsertRows += batch.length;
    upsertBytes += estimatePayloadBytes(batch);
    try {
      const { error } = await withRetry(
        () =>
          supabase.from('garden_notes').upsert(batch, {
            onConflict: 'slug',
          }),
        3,
        'batch upsert'
      );
      if (error) throw error;
    } catch (batchError: any) {
      // Fallback: if a batch fails (often payload-related), write rows one by one.
      for (const row of batch) {
        const { error } = await withRetry(
          () =>
            supabase
              .from('garden_notes')
              .upsert(row, { onConflict: 'slug' }),
          3,
          `single upsert (${row.slug})`
        );
        if (error) {
          throw new Error(
            `Failed to upsert note "${row.slug}": ${error.message || String(batchError)}`
          );
        }
      }
    }
  }

  // Delete removed notes
  if (slugsToDelete.length > 0) {
    const { error } = await withRetry(
      () =>
        supabase
          .from('garden_notes')
          .delete()
          .in('slug', slugsToDelete),
      3,
      'delete removed notes'
    );
    if (error) throw new Error(`Failed to delete notes: ${error.message}`);
  }

  // Upsert manifest and graph
  const { error: metaError } = await withRetry(
    () =>
      supabase
        .from('garden_meta')
        .upsert(
          [
            { key: 'manifest', data: manifest, updated_at: new Date().toISOString() },
            { key: 'graph', data: graph, updated_at: new Date().toISOString() },
          ],
          { onConflict: 'key' }
        ),
    3,
    'meta upsert'
  );
  if (metaError) throw new Error(`Failed to upsert meta: ${metaError.message}`);
  logSupabaseMetric('syncGardenToSupabase', {
    rows: upsertRows + slugsToDelete.length + 2,
    bytes: upsertBytes + estimatePayloadBytes(manifest) + estimatePayloadBytes(graph),
    elapsedMs: Date.now() - started,
  });
}

/** Sync state for incremental runs (stores last vault commit) */
export interface GardenSyncState {
  vaultCommit: string;
  lastSync: string;
}

export async function fetchGardenSyncState(): Promise<GardenSyncState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('garden_meta')
    .select('data')
    .eq('key', 'sync_state')
    .single();
  if (error || !data?.data) return null;
  return data.data as GardenSyncState;
}

export async function saveGardenSyncState(state: GardenSyncState): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('garden_meta').upsert(
    {
      key: 'sync_state',
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
}

// --- Image Storage ---

function getImageMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

/** Create the garden-images storage bucket if it doesn't exist */
export async function ensureGardenImagesBucket(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.storage.createBucket('garden-images', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
  });
  if (error && !error.message.includes('already exists')) {
    console.warn(`  Warning: Could not create garden-images bucket: ${error.message}`);
  }
}

/** Upload images to Supabase Storage, returns filename → public URL map */
export async function uploadGardenImages(
  images: { relativePath: string; buffer: Buffer }[]
): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};

  const imageMap: Record<string, string> = {};
  const CONCURRENCY = 10;

  for (let i = 0; i < images.length; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ relativePath, buffer }) => {
        const { error } = await supabase.storage
          .from('garden-images')
          .upload(relativePath, buffer, {
            upsert: true,
            contentType: getImageMimeType(relativePath),
          });

        if (error) {
          console.warn(`  ⚠ Failed to upload ${relativePath}: ${error.message}`);
          return;
        }

        const { data } = supabase.storage
          .from('garden-images')
          .getPublicUrl(relativePath);
        const filename = relativePath.split('/').pop() || relativePath;
        imageMap[filename] = data.publicUrl;
      })
    );
  }

  return imageMap;
}
