import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
} from 'react';
import { useRouter } from 'next/router';
import type { GardenNoteData } from '../../lib/garden/index';

interface StackedNotesContextValue {
    /** Slugs of stacked notes (does NOT include the root note) */
    stackedSlugs: string[];
    /** Cached note data keyed by slug */
    noteCache: Record<string, GardenNoteData>;
    /** Slug currently being fetched */
    loadingSlug: string | null;
    /** Push a note onto the stack. If fromIndex given, closes everything after it first. */
    pushNote: (slug: string, fromIndex?: number) => void;
    /** Close note at index and all notes after it */
    closeNote: (index: number) => void;
    /** Scroll to a specific note column */
    scrollToNote: (slug: string) => void;
    /** Ref for the scrolling container */
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    /** Whether stacking is enabled (desktop only) */
    isStackingEnabled: boolean;
}

const StackedNotesContext = createContext<StackedNotesContextValue | null>(null);

export function useStackedNotes() {
    const ctx = useContext(StackedNotesContext);
    if (!ctx) {
        throw new Error('useStackedNotes must be used within StackedNotesProvider');
    }
    return ctx;
}

interface StackedNotesProviderProps {
    children: React.ReactNode;
    rootNote: GardenNoteData;
}

export function StackedNotesProvider({ children, rootNote }: StackedNotesProviderProps) {
    const router = useRouter();
    const [stackedSlugs, setStackedSlugs] = useState<string[]>([]);
    const [noteCache, setNoteCache] = useState<Record<string, GardenNoteData>>({
        [rootNote.slug]: rootNote,
    });
    const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
    const [isStackingEnabled, setIsStackingEnabled] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // Detect screen size for stacking
    useEffect(() => {
        const checkSize = () => setIsStackingEnabled(window.innerWidth >= 800);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    // Fetch a note by slug
    const fetchNote = useCallback(async (slug: string): Promise<GardenNoteData | null> => {
        // Check cache first
        if (noteCache[slug]) return noteCache[slug];

        setLoadingSlug(slug);
        try {
            const res = await fetch(`/api/garden/note/${slug}`);
            if (!res.ok) return null;
            const data: GardenNoteData = await res.json();
            setNoteCache(prev => ({ ...prev, [slug]: data }));
            return data;
        } catch {
            return null;
        } finally {
            setLoadingSlug(null);
        }
    }, [noteCache]);

    // Initialize from URL on mount
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const { stack } = router.query;
        if (!stack) return;

        const slugs = Array.isArray(stack)
            ? stack
            : typeof stack === 'string'
                ? stack.split(',').map(s => s.trim()).filter(Boolean)
                : [];
        const validSlugs = slugs.filter(s => s && s.trim());
        if (validSlugs.length === 0) return;

        setStackedSlugs(validSlugs);

        // Fetch all stacked notes
        Promise.all(validSlugs.map(slug => fetchNote(slug)));
    }, [router.query, fetchNote]);

    // Sync state to URL
    const syncToUrl = useCallback((newSlugs: string[]) => {
        const query: Record<string, string | string[]> = {};
        // Preserve non-stack query params
        for (const [key, val] of Object.entries(router.query)) {
            if (key !== 'stack' && key !== 'slug') {
                query[key] = val as string;
            }
        }
        if (newSlugs.length > 0) {
            query.stack = newSlugs;
        }
        router.push(
            { pathname: router.pathname, query: { slug: router.query.slug, ...query } },
            undefined,
            { shallow: true }
        );
    }, [router]);

    // Scroll to a column by slug
    const scrollToNote = useCallback((slug: string) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Find the column element by data attribute
        const col = container.querySelector(`[data-note-slug="${slug}"]`) as HTMLElement;
        if (col) {
            col.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }
    }, []);

    // Push a note onto the stack
    const pushNote = useCallback((slug: string, fromIndex?: number) => {
        if (!isStackingEnabled) {
            // On mobile, just navigate
            router.push(`/garden/${slug}`);
            return;
        }

        // If already in stack (or is root), scroll to it
        if (slug === rootNote.slug) {
            scrollToNote(slug);
            return;
        }
        const existingIdx = stackedSlugs.indexOf(slug);
        if (existingIdx !== -1) {
            scrollToNote(slug);
            return;
        }

        // If fromIndex provided, close everything after it
        let newSlugs: string[];
        if (fromIndex !== undefined && fromIndex >= 0) {
            // fromIndex is relative to the full stack (0 = root note)
            // stackedSlugs doesn't include root, so adjust
            const stackCutoff = fromIndex; // fromIndex 0 = root → keep 0 stacked, fromIndex 1 = first stacked → keep 1
            newSlugs = [...stackedSlugs.slice(0, stackCutoff), slug];
        } else {
            newSlugs = [...stackedSlugs, slug];
        }

        setStackedSlugs(newSlugs);
        syncToUrl(newSlugs);

        // Fetch the note
        fetchNote(slug).then(() => {
            // Scroll to the new note after a brief delay for render
            setTimeout(() => scrollToNote(slug), 100);
        });
    }, [isStackingEnabled, rootNote.slug, stackedSlugs, syncToUrl, fetchNote, scrollToNote, router]);

    // Close a note and all after it
    const closeNote = useCallback((index: number) => {
        // index is 0-based within stackedSlugs
        const newSlugs = stackedSlugs.slice(0, index);
        setStackedSlugs(newSlugs);
        syncToUrl(newSlugs);
    }, [stackedSlugs, syncToUrl]);

    return (
        <StackedNotesContext.Provider
            value={{
                stackedSlugs,
                noteCache,
                loadingSlug,
                pushNote,
                closeNote,
                scrollToNote,
                scrollContainerRef,
                isStackingEnabled,
            }}
        >
            {children}
        </StackedNotesContext.Provider>
    );
}
