/**
 * Vault Sync Script
 *
 * Reads Obsidian vault notes from published directories, processes them
 * (resolve wikilinks, render HTML via Pandoc, build graph), and outputs
 * to Supabase (production) or content/garden/ (local dev fallback).
 *
 * Incremental mode: when vault is a git repo, uses git diff to only
 * re-process changed notes instead of the entire garden.
 *
 * Uses Pandoc for markdown→HTML conversion. Pandoc natively handles:
 *   - Inline and display math ($..$ and $$..$$) inside blockquotes
 *   - Complex LaTeX without preprocessing
 * A Lua filter (scripts/obsidian-callouts.lua) converts Obsidian callout
 * blockquotes (>[!type] Title) to styled <div> elements.
 * KaTeX is used server-side to render Pandoc's math spans to HTML.
 *
 * Usage:
 *   tsx scripts/sync-vault.ts           # incremental if vault has .git
 *   tsx scripts/sync-vault.ts --full    # force full sync
 *
 * Environment:
 *   OBSIDIAN_VAULT_PATH - path to vault root (defaults to iCloud path)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - for production output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import matter from 'gray-matter';
import katex from 'katex';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
    pathToSlug,
    fileNameToTitle,
    detectNoteType,
    buildManifest,
    extractTags,
    ManifestEntry,
} from '../lib/garden/slugify';
import { resolveWikilinks } from '../lib/garden/wikilink-resolver';
import { buildGraph } from '../lib/garden/build-graph';
import type { GardenNoteData, GardenManifest } from '../lib/garden/index';
import {
    hasSupabaseConfig,
    fetchAllGardenNotes,
    syncGardenToSupabase,
    fetchGardenSyncState,
    saveGardenSyncState,
    ensureGardenImagesBucket,
    uploadGardenImages,
} from '../lib/supabase-garden';

// Load defaults first, then let .env.local override (vercel env pull target)
dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env.local' });

// --- Configuration ---

const DEFAULT_VAULT_PATH = path.join(
    process.env.HOME || '',
    'Library/Mobile Documents/iCloud~md~obsidian/Documents/vault'
);

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || DEFAULT_VAULT_PATH;
const LOCAL_OUTPUT_DIR = path.join(process.cwd(), 'content/garden');
const SYNC_STATE_PATH = path.join(process.cwd(), '.garden-sync-state');
const PUBLISHED_DIRS = ['Math', 'Engineering', 'Machine Learning'];
const LUA_FILTER_PATH = path.join(__dirname, 'obsidian-callouts.lua');

const forceFull = process.argv.includes('--full');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

// --- Sync state (for incremental) ---

interface SyncState {
    vaultCommit: string;
    lastSync: string;
}

async function loadSyncState(): Promise<SyncState | null> {
    if (hasSupabaseConfig()) {
        return await fetchGardenSyncState();
    }
    if (!fs.existsSync(SYNC_STATE_PATH)) return null;
    try {
        const raw = fs.readFileSync(SYNC_STATE_PATH, 'utf8');
        return JSON.parse(raw) as SyncState;
    } catch {
        return null;
    }
}

async function saveSyncState(state: SyncState): Promise<void> {
    if (hasSupabaseConfig()) {
        await saveGardenSyncState(state);
        return;
    }
    fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * Get changed/deleted paths in vault since last sync, using git diff.
 * Returns null if incremental is not possible (no .git, no previous state, etc).
 */
async function getChangedPaths(vaultPath: string): Promise<{
    changed: Set<string>;
    deleted: Set<string>;
    currentCommit: string;
} | null> {
    const gitDir = path.join(vaultPath, '.git');
    if (!fs.existsSync(gitDir)) return null;

    const state = await loadSyncState();
    const lastCommit = state?.vaultCommit;
    if (!lastCommit) return null;

    try {
        const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: vaultPath,
            encoding: 'utf8',
        }).trim();

        // Changed or added files under published directories
        const diffPaths = PUBLISHED_DIRS.map(d => d + '/');
        const diffOutput = execFileSync(
            'git',
            ['diff', '--name-only', '--diff-filter=ACMR', lastCommit, 'HEAD', '--', ...diffPaths],
            { cwd: vaultPath, encoding: 'utf8' }
        );
        const changed = new Set(
            diffOutput
                .split('\n')
                .map((p) => p.trim())
                .filter((p) => p.endsWith('.md'))
        );

        // Deleted files
        const deletedOutput = execFileSync(
            'git',
            ['diff', '--name-only', '--diff-filter=D', lastCommit, 'HEAD', '--', ...diffPaths],
            { cwd: vaultPath, encoding: 'utf8' }
        );
        const deleted = new Set(
            deletedOutput
                .split('\n')
                .map((p) => p.trim())
                .filter((p) => p.endsWith('.md'))
        );

        return { changed, deleted, currentCommit };
    } catch {
        return null;
    }
}

// --- Helpers ---

function walkDir(dir: string, baseDir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip hidden directories and Obsidian config
            if (
                entry.name.startsWith('.') ||
                entry.name === 'Misc' ||
                entry.name === 'Templates'
            )
                continue;
            results.push(...walkDir(fullPath, baseDir));
        } else if (entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
            const relativePath = path.relative(baseDir, fullPath);
            results.push(relativePath);
        }
    }
    return results;
}

/** Walk a directory for image files, returning relative paths */
function walkImages(dir: string, baseDir?: string): { relativePath: string; fullPath: string }[] {
    const results: { relativePath: string; fullPath: string }[] = [];
    if (!fs.existsSync(dir)) return results;
    const root = baseDir || dir;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!entry.name.startsWith('.')) {
                results.push(...walkImages(fullPath, root));
            }
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.has(ext)) {
                results.push({
                    relativePath: path.relative(root, fullPath),
                    fullPath,
                });
            }
        }
    }
    return results;
}

function extractBlockReferenceTitles(
    noteSlug: string,
    markdown: string
): Record<string, string> {
    const map: Record<string, string> = {};
    const lines = markdown.split('\n');

    let lastHeading = '';
    let lastCalloutTitle = '';
    let inCallout = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
        if (headingMatch) {
            lastHeading = headingMatch[1].trim();
        }

        const calloutTitleMatch = line.match(/^>\s*\[![^\]]+\]\s*(.*)$/);
        if (calloutTitleMatch) {
            inCallout = true;
            lastCalloutTitle = calloutTitleMatch[1].trim();
        } else if (inCallout && line !== '' && !line.startsWith('>')) {
            inCallout = false;
        }

        const blockRefMatch = line.match(/^\^([a-f0-9]{6})$/i);
        if (!blockRefMatch) continue;

        const blockId = blockRefMatch[1].toLowerCase();
        const preferredTitle = (lastCalloutTitle || lastHeading).trim();
        if (!preferredTitle) continue;

        map[`${noteSlug}#^${blockId}`] = preferredTitle;
    }

    return map;
}

/**
 * Render markdown to HTML using Pandoc.
 *
 * Pandoc handles:
 *   - tex_math_dollars: inline $..$ and display $$..$$
 *   - Math inside blockquotes (no preprocessing needed!)
 *   - Standard markdown features
 *
 * The Lua filter converts >[!type] callouts to styled divs.
 * --katex flag outputs math as <span class="math inline/display">LaTeX</span>
 * which we then render server-side with KaTeX.
 */
function renderWithPandoc(markdown: string): string {
    try {
        const result = execFileSync(
            'pandoc',
            [
                '--from',
                'markdown+lists_without_preceding_blankline+tex_math_dollars+pipe_tables+strikeout+task_lists-yaml_metadata_block-blank_before_header',
                '--to',
                'html',
                '--katex',
                '--lua-filter',
                LUA_FILTER_PATH,
                '--wrap=none',
            ],
            {
                input: markdown,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024, // 10MB
                timeout: 30000, // 30 seconds
            }
        );
        return result;
    } catch (err: any) {
        throw new Error(
            `Pandoc failed: ${err.stderr || err.message}`
        );
    }
}

/**
 * Render KaTeX math spans produced by Pandoc's --katex output.
 *
 * Pandoc outputs:
 *   <span class="math inline">LaTeX</span>   → inline math
 *   <span class="math display">LaTeX</span>  → display math
 *
 * We replace these with KaTeX-rendered HTML.
 */
function renderKatexInHtml(html: string): string {
    return html.replace(
        /<span class="math (inline|display)">([\s\S]*?)<\/span>/g,
        (_match, mode: string, latex: string) => {
            const displayMode = mode === 'display';
            // Decode HTML entities that Pandoc may have produced
            const decodedLatex = latex
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
            try {
                return katex.renderToString(decodedLatex, {
                    displayMode,
                    strict: false,
                    throwOnError: false,
                    trust: false,
                });
            } catch {
                // If KaTeX fails, return the raw LaTeX in a styled span
                const cssClass = displayMode
                    ? 'katex-error katex-display'
                    : 'katex-error';
                return `<span class="${cssClass}" title="KaTeX parse error">${latex}</span>`;
            }
        }
    );
}

function loadExistingNoteLocal(slug: string): GardenNoteData | null {
    const notePath = path.join(LOCAL_OUTPUT_DIR, 'notes', `${slug}.json`);
    if (!fs.existsSync(notePath)) return null;
    try {
        const raw = fs.readFileSync(notePath, 'utf8');
        return JSON.parse(raw) as GardenNoteData;
    } catch {
        return null;
    }
}

// --- Main Pipeline ---

async function syncVault() {
    console.log(`\n📚 Garden Sync: Processing vault at ${VAULT_PATH}\n`);

    // 1. Discover all notes under published directories
    let notePaths: string[] = [];
    for (const dir of PUBLISHED_DIRS) {
        const dirPath = path.join(VAULT_PATH, dir);
        if (!fs.existsSync(dirPath)) {
            console.warn(`   ⚠ Published directory not found: ${dirPath}`);
            continue;
        }
        notePaths.push(...walkDir(dirPath, VAULT_PATH));
    }
    if (notePaths.length === 0) {
        console.error(`❌ No notes found in published directories: ${PUBLISHED_DIRS.join(', ')}`);
        process.exit(1);
    }
    console.log(`   Found ${notePaths.length} notes`);

    // 1b. Discover and upload images from Misc/Images/
    const imagesDir = path.join(VAULT_PATH, 'Misc', 'Images');
    let imageMap: Record<string, string> = {};
    const imageFiles = walkImages(imagesDir);
    if (imageFiles.length > 0) {
        console.log(`   Found ${imageFiles.length} images in Misc/Images/`);

        if (hasSupabaseConfig()) {
            await ensureGardenImagesBucket();
            const imagesToUpload = imageFiles.map(({ relativePath, fullPath }) => ({
                relativePath,
                buffer: fs.readFileSync(fullPath),
            }));
            imageMap = await uploadGardenImages(imagesToUpload);
            console.log(`   ✓ Uploaded ${Object.keys(imageMap).length} images to Supabase Storage`);
        } else {
            // Local dev: copy to public/garden-images/
            const localImagesDir = path.join(process.cwd(), 'public', 'garden-images');
            fs.mkdirSync(localImagesDir, { recursive: true });
            for (const { relativePath, fullPath } of imageFiles) {
                const destPath = path.join(localImagesDir, relativePath);
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.copyFileSync(fullPath, destPath);
                const filename = path.basename(relativePath);
                imageMap[filename] = `/garden-images/${relativePath}`;
            }
            console.log(`   ✓ Copied ${imageFiles.length} images to public/garden-images/`);
        }
    } else {
        console.log(`   No images found in Misc/Images/ (path: ${imagesDir})`);
    }

    // 2. Incremental?: get changed paths from git diff
    const diffResult =
        !forceFull && fs.existsSync(path.join(VAULT_PATH, '.git'))
            ? await getChangedPaths(VAULT_PATH)
            : null;

    const incremental =
        diffResult !== null &&
        diffResult.changed.size + diffResult.deleted.size < notePaths.length;

    if (incremental) {
        console.log(
            `   Incremental: ${diffResult!.changed.size} changed, ${diffResult!.deleted.size} deleted\n`
        );
    } else {
        console.log(`   Full sync\n`);
    }

    // 3. Build manifest entries from all notes (lightweight – no Pandoc yet)
    const manifestEntries: ManifestEntry[] = [];
    const rawNotes: Array<{
        entry: ManifestEntry;
        rawContent: string;
        frontmatter: Record<string, any>;
        bodyContent: string;
    }> = [];

    for (const relativePath of notePaths) {
        const fullPath = path.join(VAULT_PATH, relativePath);
        const rawContent = fs.readFileSync(fullPath, 'utf8');
        const { data: frontmatter, content: bodyContent } = matter(rawContent);

        const slug = pathToSlug(relativePath);
        const fileName = path.basename(relativePath);
        const title = fileNameToTitle(fileName);
        const folderSlug = pathToSlug(path.dirname(relativePath));
        const tags = extractTags(bodyContent);
        const aliases = (frontmatter.aliases as string[]) || [];
        const noteType = detectNoteType(relativePath);

        const entry: ManifestEntry = {
            slug,
            originalTitle: title,
            aliases: aliases.filter((a) => a && a.trim()),
            tags,
            folder: folderSlug,
            noteType,
            sourceFile: relativePath,
        };

        manifestEntries.push(entry);
        rawNotes.push({ entry, rawContent, frontmatter, bodyContent });
    }

    // 3b. Load Obsidian icon assignments, extract SVGs, and apply to entries
    const folderIcons: Record<string, { icon?: string; iconSvg?: string; iconEmoji?: string }> = {};
    const iconDataPath = path.join(VAULT_PATH, '.obsidian', 'plugins', 'obsidian-icon-folder', 'data.json');
    const iconsBaseDir = path.join(VAULT_PATH, '.obsidian', 'icons');
    if (fs.existsSync(iconDataPath)) {
        try {
            const iconData = JSON.parse(fs.readFileSync(iconDataPath, 'utf8'));

            // Prefix → icon pack directory mapping
            const ICON_PREFIX_MAP: Record<string, string> = {
                'Ti': 'tabler-icons',
                'Li': 'lucide',      // Li icons may not have local SVGs — fallback to react-icons
                'Ri': 'remix-icons',
                'Fas': 'font-awesome-solid',
                'Fab': 'font-awesome-brands',
                'Co': 'coolicons',
                'Oc': 'octicons',
                'Ma': 'math',
                'Ib': 'icon-brew',
                'Ra': 'rpg-awesome',
                'Si': 'simple-icons',
                'Bx': 'boxicons',
            };

            // Resolve an icon identifier to SVG content or emoji
            function resolveIconToSvg(identifier: string): { svg?: string; emoji?: string; lucideId?: string } {
                // Check if emoji (non-ASCII first char)
                if (identifier.codePointAt(0)! > 127) {
                    return { emoji: identifier };
                }

                // Try each prefix (longest first to match Fas before Fa)
                const prefixes = Object.keys(ICON_PREFIX_MAP).sort((a, b) => b.length - a.length);
                for (const prefix of prefixes) {
                    if (identifier.startsWith(prefix)) {
                        const iconName = identifier.slice(prefix.length);
                        const packDir = ICON_PREFIX_MAP[prefix];

                        // Special case: Lucide icons might not have local SVGs
                        if (prefix === 'Li') {
                            for (const tryDir of ['feather-icons', 'lucide']) {
                                const svgPath = path.join(iconsBaseDir, tryDir, `${iconName}.svg`);
                                if (fs.existsSync(svgPath)) {
                                    return { svg: fs.readFileSync(svgPath, 'utf8') };
                                }
                            }
                            // No local SVG — pass through lucide identifier for react-icons fallback
                            return { lucideId: iconName };
                        }

                        const svgPath = path.join(iconsBaseDir, packDir, `${iconName}.svg`);
                        if (fs.existsSync(svgPath)) {
                            return { svg: fs.readFileSync(svgPath, 'utf8') };
                        }
                        break;
                    }
                }
                return {};
            }

            // Build a map of vault-relative paths → icon identifiers
            const iconPathMap: Record<string, string> = {};
            for (const [key, val] of Object.entries(iconData)) {
                if (key === 'settings' || typeof val !== 'string') continue;
                iconPathMap[key] = val;
            }

            // Apply rule-based icons (sorted by order)
            const rules: Array<{ icon: string; rule: string; for: string; order: number; useFilePath?: boolean }> =
                (iconData.settings?.rules || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

            // Match icons to manifest entries
            // Priority: 1) direct file match, 2) rules (pattern match), 3) folder walk (inheritance)
            for (const entry of manifestEntries) {
                const vaultFilePath = entry.sourceFile.replace(/\.md$/, '');
                const folderPath = path.dirname(entry.sourceFile);
                let iconId: string | null = null;

                // 1. Try exact file path match (with and without .md)
                if (iconPathMap[entry.sourceFile]) {
                    iconId = iconPathMap[entry.sourceFile];
                } else if (iconPathMap[vaultFilePath]) {
                    iconId = iconPathMap[vaultFilePath];
                }

                // 2. Try rule-based matching
                if (!iconId) {
                    for (const rule of rules) {
                        // Plugin stores escaped spaces as `\ ` — unescape to plain space
                        const pattern = rule.rule.replace(/\\ /g, ' ');
                        const matchTarget = rule.useFilePath ? entry.sourceFile : entry.originalTitle;
                        if (matchTarget.includes(pattern)) {
                            iconId = rule.icon;
                            break;
                        }
                    }
                }

                // 3. Try folder path match — walk up the tree for inheritance
                if (!iconId) {
                    let current = folderPath;
                    while (current && current !== '.') {
                        if (iconPathMap[current]) {
                            iconId = iconPathMap[current];
                            break;
                        }
                        current = path.dirname(current);
                    }
                }

                // Resolve to SVG or emoji
                if (iconId) {
                    entry.icon = iconId;
                    const resolved = resolveIconToSvg(iconId);
                    if (resolved.svg) {
                        entry.iconSvg = resolved.svg;
                    } else if (resolved.emoji) {
                        entry.iconEmoji = resolved.emoji;
                    } else if (resolved.lucideId) {
                        // Store lucide identifier for react-icons fallback on frontend
                        entry.icon = `Li${resolved.lucideId}`;
                    }
                }
            }

            // Build explicit folder icon map so /garden folder nodes don't have to infer icons
            // from arbitrary descendant notes.
            const folderPathCandidates = new Set<string>();
            for (const entry of manifestEntries) {
                let current = path.dirname(entry.sourceFile);
                while (current && current !== '.') {
                    folderPathCandidates.add(current);
                    current = path.dirname(current);
                }
            }

            for (const folderPath of folderPathCandidates) {
                let iconId: string | null = null;

                // 1) Exact folder assignment
                if (iconPathMap[folderPath]) {
                    iconId = iconPathMap[folderPath];
                }

                // 2) Rule fallback for folders (before inheritance)
                if (!iconId) {
                    for (const rule of rules) {
                        const pattern = rule.rule.replace(/\\ /g, ' ');
                        const matchTarget = rule.useFilePath
                            ? `${folderPath}/`
                            : path.basename(folderPath);
                        if (matchTarget.includes(pattern)) {
                            iconId = rule.icon;
                            break;
                        }
                    }
                }

                // 3) Folder inheritance from parent folders
                if (!iconId) {
                    let current = path.dirname(folderPath);
                    while (current && current !== '.') {
                        if (iconPathMap[current]) {
                            iconId = iconPathMap[current];
                            break;
                        }
                        current = path.dirname(current);
                    }
                }

                if (!iconId) continue;

                const slugFolderPath = pathToSlug(folderPath);
                const resolved = resolveIconToSvg(iconId);
                folderIcons[slugFolderPath] = {
                    icon: iconId,
                    iconSvg: resolved.svg,
                    iconEmoji: resolved.emoji,
                };
            }

            const iconsAssigned = manifestEntries.filter(e => e.iconSvg || e.iconEmoji || e.icon).length;
            console.log(`   Assigned icons to ${iconsAssigned}/${manifestEntries.length} entries`);
        } catch (err) {
            console.warn(`   ⚠ Could not parse icon data: ${err}`);
        }
    }

    // 4. Build manifest for wikilink resolution
    const manifest = buildManifest(manifestEntries);
    console.log(`   Built manifest: ${manifestEntries.length} entries`);
    console.log(
        `   Unique titles: ${Object.keys(manifest.byTitle).length}`
    );
    console.log(
        `   Aliases: ${Object.keys(manifest.byAlias).length}\n`
    );

    const blockReferenceTitles: Record<string, string> = {};
    const blockReferenceTitlesByTarget: Record<string, string> = {};
    for (const { entry, bodyContent } of rawNotes) {
        const titles = extractBlockReferenceTitles(entry.slug, bodyContent);
        Object.assign(blockReferenceTitles, titles);
        for (const [key, value] of Object.entries(titles)) {
            const anchorIdx = key.indexOf('#^');
            if (anchorIdx === -1) continue;
            const anchor = key.substring(anchorIdx).toLowerCase();
            blockReferenceTitlesByTarget[`${entry.originalTitle.toLowerCase()}${anchor}`] = value;
            for (const alias of entry.aliases || []) {
                const aliasKey = alias.trim().toLowerCase();
                if (aliasKey) {
                    blockReferenceTitlesByTarget[`${aliasKey}${anchor}`] = value;
                }
            }
        }
    }

    // 5. Process notes: full process for changed, load existing for unchanged
    const processedNotes: GardenNoteData[] = [];
    const graphData: Array<{
        slug: string;
        title: string;
        outlinks: string[];
        tags: string[];
        folder: string;
        noteType: 'concept' | 'theorem' | 'other';
    }> = [];

    const toProcess =
        incremental && diffResult
            ? new Set(diffResult.changed)
            : null;
    // For incremental + Supabase: pre-fetch existing notes from DB
    let existingNotesMap = new Map<string, GardenNoteData>();
    if (incremental && hasSupabaseConfig()) {
        console.log('   Fetching existing notes from Supabase...');
        existingNotesMap = await fetchAllGardenNotes();
        console.log(`   Loaded ${existingNotesMap.size} existing notes\n`);
    }
    let toDelete: Set<string>;
    if (incremental && diffResult) {
        toDelete = new Set([...diffResult.deleted].map((p) => pathToSlug(p)));
    } else {
        // Full sync: remove any existing notes not in current manifest
        const currentSlugs = new Set(manifestEntries.map((e) => e.slug));
        toDelete = new Set<string>();
        const notesDir = path.join(LOCAL_OUTPUT_DIR, 'notes');
        if (fs.existsSync(notesDir)) {
            const walk = (dir: string): void => {
                for (const name of fs.readdirSync(dir)) {
                    const full = path.join(dir, name);
                    if (fs.statSync(full).isDirectory()) walk(full);
                    else if (name.endsWith('.json')) {
                        const slug = path.relative(notesDir, full).replace(/\.json$/, '').replace(/\\/g, '/');
                        if (!currentSlugs.has(slug)) toDelete.add(slug);
                    }
                }
            };
            walk(notesDir);
        }
    }

    let totalUnresolved = 0;
    const allUnresolved: Array<{ note: string; targets: string[] }> = [];

    console.log('   Processing notes...');

    for (const { entry, rawContent, frontmatter, bodyContent } of rawNotes) {
        // Skip if incremental and unchanged – load from Supabase or local
        if (toProcess !== null && !toProcess.has(entry.sourceFile)) {
            const existing =
                existingNotesMap.get(entry.slug) ??
                loadExistingNoteLocal(entry.slug);
            if (existing) {
                processedNotes.push(existing);
                graphData.push({
                    slug: entry.slug,
                    title: existing.title,
                    outlinks: existing.outlinks,
                    tags: existing.tags,
                    folder: entry.folder,
                    noteType: entry.noteType,
                });
            }
            continue;
        }
        // Step A: Resolve wikilinks (converts [[Target]] to [Target](/garden/slug))
        // Image embeds ![[img.png]] resolve to real image URLs via imageMap
        const {
            content: resolvedContent,
            outlinks,
            unresolvedLinks,
        } = resolveWikilinks(bodyContent, manifest, entry.folder, imageMap, {
            blockReferenceTitles,
            blockReferenceTitlesByTarget,
        });

        if (unresolvedLinks.length > 0) {
            totalUnresolved += unresolvedLinks.length;
            allUnresolved.push({
                note: entry.slug,
                targets: unresolvedLinks,
            });
        }

        // Step B: Clean content — remove tag lines and block reference IDs
        const cleanedContent = resolvedContent
            .split('\n')
            .filter((line) => !line.match(/^#[A-Za-z]/)) // remove tag-only lines (not headings)
            .filter((line) => !line.trim().match(/^\^[a-f0-9]{6}$/)) // remove Obsidian block refs
            .join('\n');

        // Step C: Render to HTML via Pandoc + Lua filter
        // No math preprocessing needed — Pandoc handles $..$ and $$..$$
        // inside blockquotes natively!
        let html: string;
        try {
            html = renderWithPandoc(cleanedContent);
        } catch (err) {
            console.warn(`   ⚠ Failed to render ${entry.slug}: ${err}`);
            html = `<p>Error rendering note</p>`;
        }

        // Step D: Render KaTeX math from Pandoc's <span class="math ..."> output
        html = renderKatexInHtml(html);

        // Step E: Remove any block reference paragraphs that slipped through
        html = html.replace(/<p>\^[a-f0-9]{6}<\/p>\s*/g, '');

        const noteData: GardenNoteData = {
            slug: entry.slug,
            title: entry.originalTitle,
            html,
            markdown: cleanedContent,
            tags: entry.tags,
            folder: entry.folder,
            noteType: entry.noteType,
            aliases: entry.aliases,
            outlinks,
            status:
                (frontmatter.status as
                    | 'seedling'
                    | 'budding'
                    | 'evergreen') || 'seedling',
            lastModified: new Date().toISOString(),
        };

        processedNotes.push(noteData);
        graphData.push({
            slug: entry.slug,
            title: entry.originalTitle,
            outlinks,
            tags: entry.tags,
            folder: entry.folder,
            noteType: entry.noteType,
        });
    }

    console.log(`   ✓ Processed ${processedNotes.length} notes`);
    if (totalUnresolved > 0) {
        console.log(
            `   ⚠ ${totalUnresolved} unresolved wikilinks across ${allUnresolved.length} notes`
        );
        for (const { note, targets } of allUnresolved.slice(0, 5)) {
            console.log(`     - ${note}: ${targets.join(', ')}`);
        }
        if (allUnresolved.length > 5) {
            console.log(
                `     ... and ${allUnresolved.length - 5} more notes with unresolved links`
            );
        }
    }

    // 6. Build graph
    const graph = buildGraph(graphData);
    console.log(
        `\n   Graph: ${graph.totalNotes} nodes, ${graph.totalLinks} links`
    );

    // 7. Build manifest data
    const gardenManifest: GardenManifest = {
        entries: manifestEntries,
        folderIcons,
        generatedAt: new Date().toISOString(),
        totalNotes: manifestEntries.length,
    };

    // 8. Output: Supabase (production) or local (dev)
    if (hasSupabaseConfig()) {
        console.log('\n   Uploading to Supabase...');
        await syncGardenToSupabase(
            processedNotes,
            gardenManifest,
            graph,
            [...toDelete]
        );
        console.log(`   ✓ Upserted ${processedNotes.length} notes`);
        if (toDelete.size > 0) console.log(`   ✓ Deleted ${toDelete.size} notes`);
        console.log('   ✓ Updated manifest and graph');
    } else {
        await writeLocal(processedNotes, gardenManifest, graph, toDelete);
    }

    // 9. Save sync state (for next incremental run)
    if (fs.existsSync(path.join(VAULT_PATH, '.git'))) {
        try {
            const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
                cwd: VAULT_PATH,
                encoding: 'utf8',
            }).trim();
            await saveSyncState({
                vaultCommit: currentCommit,
                lastSync: new Date().toISOString(),
            });
        } catch {
            // ignore
        }
    }

    console.log('\n✅ Garden sync complete!\n');
}

// --- Output: Local filesystem ---

async function writeLocal(
    notes: GardenNoteData[],
    manifest: GardenManifest,
    graph: any,
    toDelete: Set<string> = new Set()
) {
    console.log(`\n   Writing to ${LOCAL_OUTPUT_DIR}...`);

    const notesDir = path.join(LOCAL_OUTPUT_DIR, 'notes');
    fs.mkdirSync(notesDir, { recursive: true });

    // Write manifest and graph
    fs.writeFileSync(
        path.join(LOCAL_OUTPUT_DIR, '_manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    fs.writeFileSync(
        path.join(LOCAL_OUTPUT_DIR, '_graph.json'),
        JSON.stringify(graph, null, 2)
    );

    // Write note JSON files
    for (const note of notes) {
        const noteDir = path.join(notesDir, path.dirname(note.slug));
        fs.mkdirSync(noteDir, { recursive: true });
        fs.writeFileSync(
            path.join(notesDir, `${note.slug}.json`),
            JSON.stringify(note, null, 2)
        );
    }

    // Delete removed notes
    let deleted = 0;
    for (const slug of toDelete) {
        const notePath = path.join(notesDir, `${slug}.json`);
        if (fs.existsSync(notePath)) {
            fs.unlinkSync(notePath);
            deleted++;
        }
    }

    console.log(`   ✓ Wrote ${notes.length} note files`);
    if (deleted > 0) console.log(`   ✓ Deleted ${deleted} removed notes`);
    console.log(`   ✓ Wrote manifest and graph`);
}

// --- Run ---

syncVault().catch((err) => {
    console.error('❌ Garden sync failed:', err);
    process.exit(1);
});
