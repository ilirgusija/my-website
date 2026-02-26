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
import { useRouter } from 'next/router';

interface PopupEntry {
  slug: string;
  anchor?: string;
  triggerRect?: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
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
  const router = useRouter();
  const noteCacheRef = useRef<Record<string, GardenNoteData>>({});
  const [popupStack, setPopupStack] = useState<PopupEntry[]>([]);
  const [previewMode, setPreviewMode] = useState<'hover' | 'click' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredLinkRef = useRef<HTMLAnchorElement | null>(null);
  const hoverPopupHoveredRef = useRef(false);

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
    setPreviewMode('click');
    setPopupStack(prev => {
      // Don't open duplicate of what's already on top
      if (prev.length > 0 && prev[prev.length - 1].slug === slug) return prev;
      return [...prev, { slug, anchor }];
    });
    fetchNote(slug);
  }, [fetchNote]);

  // Hover preview: single preview popup that can be dismissed by moving away.
  const openHoverPopup = useCallback((
    slug: string,
    anchor?: string,
    triggerRect?: PopupEntry['triggerRect']
  ) => {
    setPreviewMode('hover');
    setPopupStack((prev) => {
      if (
        prev.length === 1 &&
        prev[0].slug === slug &&
        prev[0].anchor === anchor &&
        prev[0].triggerRect?.top === triggerRect?.top &&
        prev[0].triggerRect?.left === triggerRect?.left
      ) {
        return prev;
      }
      return [{ slug, anchor, triggerRect }];
    });
    fetchNote(slug);
  }, [fetchNote]);

  // Close the topmost popup (back one level in the rabbithole)
  const closeTopPopup = useCallback(() => {
    setPopupStack(prev => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setPreviewMode(null);
      return next;
    });
  }, []);

  // Close all popups (click on backdrop to exit rabbithole)
  const closeAllPopups = useCallback(() => {
    setPopupStack([]);
    setPreviewMode(null);
  }, []);

  const scheduleHoverClose = useCallback(() => {
    if (previewMode !== 'hover') return;
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(() => {
      const linkStillHovered = !!hoveredLinkRef.current?.matches(':hover');
      if (linkStillHovered || hoverPopupHoveredRef.current) return;
      setPopupStack([]);
      setPreviewMode(null);
    }, 80);
  }, [previewMode]);

  // Hover previews for garden links in the base article
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const parseGardenHref = (href: string) => {
      const match = href.match(/^\/garden\/(.+)/);
      if (!match) return null;
      const fullSlug = match[1];
      const anchorIdx = fullSlug.indexOf('#');
      const slug = anchorIdx !== -1 ? fullSlug.substring(0, anchorIdx) : fullSlug;
      const anchor = anchorIdx !== -1
        ? decodeURIComponent(fullSlug.substring(anchorIdx + 1))
        : undefined;
      return { slug, anchor };
    };

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/garden/"]') as HTMLAnchorElement | null;
      if (!link || !container!.contains(link)) return;
      if (link.closest('[data-popup-layer]')) return;

      // Clicking should open the persistent card stack.
      if (hoverOpenTimerRef.current) {
        clearTimeout(hoverOpenTimerRef.current);
        hoverOpenTimerRef.current = null;
      }
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      hoveredLinkRef.current = null;
      hoverPopupHoveredRef.current = false;
      if (previewMode === 'hover') {
        setPopupStack([]);
        setPreviewMode(null);
      }

      const href = link.getAttribute('href') || '';
      const parsed = parseGardenHref(href);
      if (!parsed) return;

      // Respect expected browser behavior for modified/non-left clicks.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      openPopup(parsed.slug, parsed.anchor);
    }

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/garden/"]') as HTMLAnchorElement | null;
      if (!link || !container!.contains(link)) return;
      if (link.closest('[data-popup-layer]')) return;
      if (previewMode === 'click') return;
      hoveredLinkRef.current = link;

      const href = link.getAttribute('href') || '';
      const parsed = parseGardenHref(href);
      if (!parsed) return;

      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      if (hoverOpenTimerRef.current) clearTimeout(hoverOpenTimerRef.current);
      const scheduledLink = link;
      hoverOpenTimerRef.current = setTimeout(() => {
        // Only open if pointer is still on the same link.
        if (hoveredLinkRef.current !== scheduledLink || !scheduledLink.matches(':hover')) return;
        const rect = link.getBoundingClientRect();
        openHoverPopup(parsed.slug, parsed.anchor, {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
      }, 500);
    }

    function handleMouseOut(e: MouseEvent) {
      if (previewMode !== 'hover') return;
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.('[data-popup-layer]')) return;
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/garden/"]') as HTMLAnchorElement | null;
      if (link && hoveredLinkRef.current === link) {
        hoveredLinkRef.current = null;
      }
      scheduleHoverClose();
    }

    function handleMouseLeaveWindow() {
      // If cursor leaves the viewport, hover UI should never linger.
      if (hoverOpenTimerRef.current) {
        clearTimeout(hoverOpenTimerRef.current);
        hoverOpenTimerRef.current = null;
      }
      if (previewMode === 'hover') {
        hoveredLinkRef.current = null;
        hoverPopupHoveredRef.current = false;
        setPopupStack([]);
        setPreviewMode(null);
      }
    }

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    window.addEventListener('blur', handleMouseLeaveWindow);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      window.removeEventListener('blur', handleMouseLeaveWindow);
    };
  }, [openHoverPopup, openPopup, previewMode, scheduleHoverClose]);

  useEffect(() => () => {
    if (hoverOpenTimerRef.current) clearTimeout(hoverOpenTimerRef.current);
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
  }, []);

  // Close hover popups on scroll to avoid stale floating previews.
  useEffect(() => {
    if (previewMode !== 'hover') return;
    const onScroll = () => {
      setPopupStack([]);
      setPreviewMode(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [previewMode]);

  // Be strict: close all preview UI immediately during route transitions.
  useEffect(() => {
    const handleRouteChange = () => {
      setPopupStack([]);
      setPreviewMode(null);
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  return (
    <LinkPreviewContext.Provider value={{ fetchNote, openPopup }}>
      <div ref={containerRef} style={{ position: 'relative' }}>
        {children}

        {/* Backdrop: dims the page and closes all popups on click */}
        {previewMode === 'click' && popupStack.length > 0 && (
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
            triggerRect={entry.triggerRect}
            depth={index}
            totalDepth={popupStack.length}
            fetchNote={fetchNote}
            noteCache={noteCacheRef.current}
            onClose={closeTopPopup}
            onNavigate={openPopup}
            onOpenFullPage={closeAllPopups}
            onPopupMouseEnter={() => {
              hoverPopupHoveredRef.current = true;
              if (hoverCloseTimerRef.current) {
                clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onPopupMouseLeave={() => {
              hoverPopupHoveredRef.current = false;
              scheduleHoverClose();
            }}
            showHeaderActions={previewMode !== 'hover'}
          />
        ))}
      </div>
    </LinkPreviewContext.Provider>
  );
}
