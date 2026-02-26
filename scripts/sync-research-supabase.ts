import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { getSupabaseClient, hasSupabaseConfig } from '../lib/supabase-garden';

dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env.local' });

interface ResearchRow {
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  status: 'in-progress' | 'submitted' | 'published';
  arxiv_id: string | null;
  pdf_path: string | null;
  pdf_url: string | null;
  last_updated: string | null;
  updated_at: string;
}

function parseArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  return arg?.split('=').slice(1).join('=');
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function walkPdfFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPdfFiles(full));
    else if (entry.name.toLowerCase().endsWith('.pdf')) out.push(full);
  }
  return out;
}

function toStoragePublicUrl(
  supabaseUrl: string,
  bucket: string,
  objectPath: string
): string {
  const normalized = objectPath
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${normalized}`;
}

async function main() {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase env vars missing.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client unavailable.');

  const metadataDir =
    parseArg('--metadata-dir') || path.join(process.cwd(), 'content', 'research');
  const pdfRoot =
    parseArg('--pdf-dir') || path.join(process.cwd(), 'research-repo');
  const dryRun = flag('--dry-run');

  const bucket = process.env.SUPABASE_RESEARCH_BUCKET || 'research';
  const rawPrefix = process.env.SUPABASE_RESEARCH_STORAGE_PREFIX || '';
  const prefix = rawPrefix
    ? rawPrefix.replace(/^\/+/, '').replace(/\/+$/, '') + '/'
    : '';
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.DB_SUPA_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_DB_SUPA_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');

  if (!fs.existsSync(metadataDir)) {
    throw new Error(`Metadata directory not found: ${metadataDir}`);
  }

  const metadataFiles = fs
    .readdirSync(metadataDir)
    .filter((f) => f.endsWith('.md'));

  const pdfFiles = walkPdfFiles(pdfRoot);
  const pdfByRelative = new Map<string, string>();
  for (const pdfFullPath of pdfFiles) {
    const rel = path.relative(pdfRoot, pdfFullPath).replace(/\\/g, '/');
    pdfByRelative.set(rel, pdfFullPath);
  }

  const rows: ResearchRow[] = [];
  const slugs: string[] = [];
  let uploadedPdfs = 0;
  const errors: string[] = [];

  for (const file of metadataFiles) {
    const slug = file.replace(/\.md$/, '');
    if (slug.toLowerCase().includes('example')) continue;

    const full = path.join(metadataDir, file);
    const raw = fs.readFileSync(full, 'utf8');
    const { data } = matter(raw);

    const title = String((data as any).title || '');
    if (title.toLowerCase().includes('example')) continue;

    const pdfPath = ((data as any).pdfPath || '') as string;
    const normalizedPdfPath = pdfPath.replace(/^\/+/, '');
    let pdfUrl: string | null = null;

    if (normalizedPdfPath) {
      const localPdf = pdfByRelative.get(normalizedPdfPath);
      if (localPdf) {
        const objectPath = `${prefix}${normalizedPdfPath}`;
        pdfUrl = toStoragePublicUrl(supabaseUrl, bucket, objectPath);
        if (!dryRun) {
          try {
            const pdfBuffer = fs.readFileSync(localPdf);
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(objectPath, pdfBuffer, {
                upsert: true,
                contentType: 'application/pdf',
              });
            if (uploadError) {
              errors.push(`PDF upload failed (${slug}): ${uploadError.message}`);
            } else {
              uploadedPdfs++;
            }
          } catch (err: any) {
            errors.push(`PDF upload failed (${slug}): ${err?.message || String(err)}`);
          }
        }
      } else {
        errors.push(`PDF missing in repo for ${slug}: ${normalizedPdfPath}`);
      }
    }

    rows.push({
      slug,
      title,
      authors: ((data as any).authors ?? []) as string[],
      abstract: String((data as any).abstract || ''),
      status: ((data as any).status || 'in-progress') as
        | 'in-progress'
        | 'submitted'
        | 'published',
      arxiv_id: ((data as any).arxivId || null) as string | null,
      pdf_path: normalizedPdfPath || null,
      pdf_url: pdfUrl,
      last_updated: ((data as any).lastUpdated || null) as string | null,
      updated_at: new Date().toISOString(),
    });
    slugs.push(slug);
  }

  if (!dryRun && rows.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await supabase.from('research_items').upsert(chunk, {
        onConflict: 'slug',
      });
      if (error) throw new Error(`Failed upserting research metadata: ${error.message}`);
    }

    const { data: existing, error: readError } = await supabase
      .from('research_items')
      .select('slug');
    if (!readError && existing) {
      const stale = existing
        .map((r: any) => r.slug as string)
        .filter((s) => !slugs.includes(s));
      if (stale.length > 0) {
        const { error: delError } = await supabase
          .from('research_items')
          .delete()
          .in('slug', stale);
        if (delError) {
          errors.push(`Failed deleting stale research rows: ${delError.message}`);
        }
      }
    }
  }

  console.log(`Research metadata files: ${metadataFiles.length}`);
  console.log(`Research rows prepared: ${rows.length}`);
  console.log(`PDFs uploaded: ${uploadedPdfs}`);
  if (errors.length > 0) {
    console.warn(`Warnings/errors (${errors.length}):`);
    for (const err of errors.slice(0, 20)) console.warn(`- ${err}`);
    if (errors.length > 20) console.warn(`...and ${errors.length - 20} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

