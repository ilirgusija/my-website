import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import type { GardenNoteData } from '../../lib/garden/index';
import { LinkPreviewPopup } from './LinkPreviewPopup';

interface PopupEntry {
  slug: string;
  anchor?: string;
}

interface LinkPreviewContextValue {
  fetchNote: (slug: string) => Promise<GardenNoteData | null>;
  openPopup: (slug: string, anchor?: string) => void;
}

const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

export function useLinkPreview() {
  return useContext(LinkPreviewContext);
}

export function LinkPreviewProvider({ children }: { children: React.ReactNode }) {
  const noteCacheRef = useRef<Record<string, GardenNoteData>>({});
  const [popupStack, setPopupStack] = useState<PopupEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNote = useCallback(async (slug: string): Promise<GardenNoteData | null> => {
    if (noteCacheRef.current[slug]) return noteCacheRef.current[slug];
    try {
      const res = await fetch(`/api/garden/note/${slug}`);
      if (!res.ok) return null;
      const data: GardenNoteData = await res.json();
      noteCacheRef.current[slug] = data;
      return data;
    } catch {
      return null;
    }
  }, []);

  // Push a new popup onto the stack (recursive rabbithole)
  const openPopup = useCallback((slug: string, anchor?: string) => {
    setPopupStack(prev => {
      // Don't open duplicate of what's already on top
      if (prev.length > 0 && prev[prev.length - 1].slug === slug) return prev;
      return [...prev, { slug, anchor }];
    });
    fetchNote(slug);
  }, [fetchNote]);

  // Close the topmost popup (back one level in the rabbithole)
  const closeTopPopup = useCallback(() => {
    setPopupStack(prev => prev.slice(0, -1));
  }, []);

  // Close all popups (click on backdrop to exit rabbithole)
  const closeAllPopups = useCallback(() => {
    setPopupStack([]);
  }, []);

  // Intercept clicks on garden links in the base article
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/garden/"]') as HTMLAnchorElement | null;
      if (!link || !container!.contains(link)) return;

      // Don't intercept links inside popups (popups handle their own clicks)
      if (link.closest('[data-popup-layer]')) return;

      e.preventDefault();
      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/garden\/(.+)/);
      if (!match) return;

      const fullSlug = match[1];
      const anchorIdx = fullSlug.indexOf('#');
      const slug = anchorIdx !== -1 ? fullSlug.substring(0, anchorIdx) : fullSlug;
      const anchor = anchorIdx !== -1 ? fullSlug.substring(anchorIdx + 1) : undefined;

      openPopup(slug, anchor);
    }

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [openPopup]);

  return (
    <LinkPreviewContext.Provider value={{ fetchNote, openPopup }}>
      <div ref={containerRef} style={{ position: 'relative' }}>
        {children}

        {/* Backdrop: dims the page and closes all popups on click */}
        {popupStack.length > 0 && (
          <div
            onClick={closeAllPopups}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(1px)',
            }}
          />
        )}

        {/* Render the popup stack — each layer offset slightly */}
        {popupStack.map((entry, index) => (
          <LinkPreviewPopup
            key={`${entry.slug}-${index}`}
            slug={entry.slug}
            anchor={entry.anchor}
            depth={index}
            totalDepth={popupStack.length}
            fetchNote={fetchNote}
            noteCache={noteCacheRef.current}
            onClose={closeTopPopup}
            onNavigate={openPopup}
          />
        ))}
      </div>
    </LinkPreviewContext.Provider>
  );
}
