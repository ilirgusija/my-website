import React, { useEffect, useState, useRef } from 'react';
import { Box, Heading, Spinner, Flex, IconButton } from '@chakra-ui/react';
import { createPortal } from 'react-dom';
import { GardenNoteRenderer } from './GardenNoteRenderer';
import { BacklinksSection } from './BacklinksSection';
import type { GardenNoteData } from '../../lib/garden/index';
import Link from 'next/link';

interface LinkPreviewPopupProps {
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
  depth: number;
  totalDepth: number;
  fetchNote: (slug: string) => Promise<GardenNoteData | null>;
  noteCache: Record<string, GardenNoteData>;
  onClose: () => void;
  onNavigate: (slug: string, anchor?: string) => void;
  onPopupMouseEnter?: () => void;
  onPopupMouseLeave?: () => void;
  showHeaderActions?: boolean;
  onOpenFullPage?: () => void;
}

const POPUP_WIDTH = 550;
const POPUP_MAX_HEIGHT_VH = 70;
const OFFSET_PER_DEPTH = 0;

export function LinkPreviewPopup({
  slug,
  anchor,
  triggerRect,
  depth,
  fetchNote,
  noteCache,
  onClose,
  onNavigate,
  onPopupMouseEnter,
  onPopupMouseLeave,
  showHeaderActions = true,
  onOpenFullPage,
}: LinkPreviewPopupProps) {
  const [note, setNote] = useState<GardenNoteData | null>(noteCache[slug] || null);
  const [loading, setLoading] = useState(!noteCache[slug]);
  const popupRef = useRef<HTMLDivElement>(null);

  const popupWidth = Math.min(POPUP_WIDTH, typeof window !== 'undefined' ? window.innerWidth * 0.9 : POPUP_WIDTH);
  const popupMaxHeightPx = typeof window !== 'undefined'
    ? Math.floor((POPUP_MAX_HEIGHT_VH / 100) * window.innerHeight)
    : 560;
  const isHoverPreview = !showHeaderActions && !!triggerRect;

  // Fetch note data
  useEffect(() => {
    if (noteCache[slug]) {
      setNote(noteCache[slug]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNote(slug).then(data => {
      if (!cancelled) {
        setNote(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [slug, fetchNote, noteCache]);

  // Scroll to anchor after content loads
  useEffect(() => {
    if (!anchor || loading || !popupRef.current) return;
    const el = popupRef.current.querySelector(`[id="${anchor}"]`);
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      (el as HTMLElement).style.outline = '2px solid #3182ce';
      (el as HTMLElement).style.outlineOffset = '4px';
      setTimeout(() => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.outlineOffset = '';
      }, 1500);
    }
  }, [anchor, loading, note]);

  // Handle link clicks inside the popup — push onto rabbithole stack
  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/garden/"]') as HTMLAnchorElement | null;
      if (!link || !popup!.contains(link)) return;
      if (link.dataset.popupOpenFull === 'true') return;

      e.preventDefault();
      e.stopPropagation();

      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/garden\/(.+)/);
      if (!match) return;

      const fullSlug = match[1];
      const anchorIdx = fullSlug.indexOf('#');
      const clickedSlug = anchorIdx !== -1 ? fullSlug.substring(0, anchorIdx) : fullSlug;
      const clickedAnchor = anchorIdx !== -1
        ? decodeURIComponent(fullSlug.substring(anchorIdx + 1))
        : undefined;

      onNavigate(clickedSlug, clickedAnchor);
    }

    popup.addEventListener('click', handleClick);
    return () => popup.removeEventListener('click', handleClick);
  }, [onNavigate]);

  if (typeof window === 'undefined') return null;

  // Position:
  // - hover previews fold out near the hovered link (above/below, non-occluding)
  // - click popups use centered stack behavior
  let top: string | undefined;
  let left: string | undefined;
  let transform: string | undefined;
  if (isHoverPreview && triggerRect) {
    const gap = 10;
    const viewportPadding = 8;
    const candidateBelow = triggerRect.bottom + gap;
    const candidateAbove = triggerRect.top - gap - popupMaxHeightPx;
    const resolvedTop = (candidateBelow + popupMaxHeightPx <= window.innerHeight - viewportPadding)
      ? candidateBelow
      : Math.max(viewportPadding, candidateAbove);
    const preferredLeft = triggerRect.left;
    const maxLeft = window.innerWidth - popupWidth - viewportPadding;
    const resolvedLeft = Math.max(viewportPadding, Math.min(maxLeft, preferredLeft));
    top = `${resolvedTop}px`;
    left = `${resolvedLeft}px`;
    transform = 'none';
  } else {
    const offsetX = depth * OFFSET_PER_DEPTH;
    const offsetY = depth * OFFSET_PER_DEPTH;
    top = `calc(${15 + offsetY}vh)`;
    left = '50%';
    transform = `translateX(calc(-50% + ${offsetX}px))`;
  }

  let renderHtml = note?.html || '';
  if (note?.html && anchor && typeof window !== 'undefined') {
    const selectorSafeAnchor = anchor.replace(/"/g, '\\"');
    const temp = document.createElement('div');
    temp.innerHTML = note.html;
    const target = temp.querySelector(`[id="${selectorSafeAnchor}"]`) as HTMLElement | null;
    if (target && isHoverPreview) {
      let callout = target.classList.contains('callout') ? target : target.closest('.callout');
      if (!callout) {
        // Obsidian block refs are often emitted as a standalone anchor right
        // after a callout block. In that case, preview the immediately preceding
        // callout element for block-only hover behavior.
        const parent = target.parentElement;
        const previous =
          (parent?.previousElementSibling as HTMLElement | null) ||
          (target.previousElementSibling as HTMLElement | null);
        if (previous?.classList.contains('callout')) {
          callout = previous;
        }
      }
      if (callout) {
        // Hover should preview only the referenced block/callout.
        renderHtml = callout.outerHTML;
      }
    }
  }

  return createPortal(
    <Box
      ref={popupRef}
      data-popup-layer={depth}
      position="fixed"
      top={top}
      left={left}
      transform={transform}
      width={`${popupWidth}px`}
      maxH={`${POPUP_MAX_HEIGHT_VH}vh`}
      overflowY="auto"
      bg="bg.surface"
      color="text.primary"
      borderRadius="xl"
      boxShadow="dark-lg"
      border="1px solid"
      borderColor="border.subtle"
      zIndex={1000 + depth}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onMouseEnter={onPopupMouseEnter}
      onMouseLeave={onPopupMouseLeave}
    >
      {/* Header with title, close button, and link to full page */}
      <Flex
        position="sticky"
        top={0}
        bg="bg.surface"
        zIndex={1}
        align="center"
        justify="space-between"
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor="border.subtle"
        borderTopRadius="xl"
      >
        <Heading size="sm" noOfLines={1} flex={1}>
          {loading ? 'Loading...' : note?.title || 'Not found'}
        </Heading>
        {showHeaderActions && (
          <Flex align="center" gap={2} ml={3}>
            {note && (
              <Link href={`/garden/${slug}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`} data-popup-open-full="true">
                <Box
                  as="span"
                  fontSize="xs"
                  color="text.muted"
                  _hover={{ color: 'accent.link' }}
                  title="Open full page"
                  onClick={() => onOpenFullPage?.()}
                >
                  ↗
                </Box>
              </Link>
            )}
            <IconButton
              aria-label="Close popup"
              size="xs"
              variant="ghost"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose(); }}
              icon={<span>✕</span>}
            />
          </Flex>
        )}
      </Flex>

      {/* Content */}
      <Box px={5} py={4}>
        {loading ? (
          <Flex justify="center" align="center" minH="120px">
            <Spinner size="md" color="accent.link" />
          </Flex>
        ) : note ? (
          <Box fontSize="sm" sx={{ 'p': { fontSize: 'sm', mb: 2 }, 'h1': { fontSize: 'md' }, 'h2': { fontSize: 'sm' } }}>
            <GardenNoteRenderer html={renderHtml} />
          </Box>
        ) : (
          <Box color="text.muted" fontSize="sm" py={8} textAlign="center">
            Note not found
          </Box>
        )}
      </Box>
    </Box>,
    document.body
  );
}
