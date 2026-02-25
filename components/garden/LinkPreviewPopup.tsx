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
  depth: number;
  totalDepth: number;
  fetchNote: (slug: string) => Promise<GardenNoteData | null>;
  noteCache: Record<string, GardenNoteData>;
  onClose: () => void;
  onNavigate: (slug: string, anchor?: string) => void;
}

const POPUP_WIDTH = 550;
const POPUP_MAX_HEIGHT_VH = 70;
const OFFSET_PER_DEPTH = 24;

export function LinkPreviewPopup({
  slug,
  anchor,
  depth,
  fetchNote,
  noteCache,
  onClose,
  onNavigate,
}: LinkPreviewPopupProps) {
  const [note, setNote] = useState<GardenNoteData | null>(noteCache[slug] || null);
  const [loading, setLoading] = useState(!noteCache[slug]);
  const popupRef = useRef<HTMLDivElement>(null);

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

      e.preventDefault();
      e.stopPropagation();

      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/garden\/(.+)/);
      if (!match) return;

      const fullSlug = match[1];
      const anchorIdx = fullSlug.indexOf('#');
      const clickedSlug = anchorIdx !== -1 ? fullSlug.substring(0, anchorIdx) : fullSlug;
      const clickedAnchor = anchorIdx !== -1 ? fullSlug.substring(anchorIdx + 1) : undefined;

      onNavigate(clickedSlug, clickedAnchor);
    }

    popup.addEventListener('click', handleClick);
    return () => popup.removeEventListener('click', handleClick);
  }, [onNavigate]);

  if (typeof window === 'undefined') return null;

  // Position: centered with slight offset per depth for stacking effect
  const offsetX = depth * OFFSET_PER_DEPTH;
  const offsetY = depth * OFFSET_PER_DEPTH;

  return createPortal(
    <Box
      ref={popupRef}
      data-popup-layer={depth}
      position="fixed"
      top={`calc(${15 + offsetY}vh)`}
      left="50%"
      transform={`translateX(calc(-50% + ${offsetX}px))`}
      width={`min(${POPUP_WIDTH}px, 90vw)`}
      maxH={`${POPUP_MAX_HEIGHT_VH}vh`}
      overflowY="auto"
      bg="white"
      borderRadius="xl"
      boxShadow="dark-lg"
      border="1px solid"
      borderColor="gray.200"
      zIndex={1000 + depth}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {/* Header with title, close button, and link to full page */}
      <Flex
        position="sticky"
        top={0}
        bg="white"
        zIndex={1}
        align="center"
        justify="space-between"
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.100"
        borderTopRadius="xl"
      >
        <Heading size="sm" noOfLines={1} flex={1}>
          {loading ? 'Loading...' : note?.title || 'Not found'}
        </Heading>
        <Flex align="center" gap={2} ml={3}>
          {note && (
            <Link href={`/garden/${slug}`}>
              <Box
                as="span"
                fontSize="xs"
                color="gray.400"
                _hover={{ color: 'blue.500' }}
                title="Open full page"
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
      </Flex>

      {/* Content */}
      <Box px={5} py={4}>
        {loading ? (
          <Flex justify="center" align="center" minH="120px">
            <Spinner size="md" color="blue.400" />
          </Flex>
        ) : note ? (
          <Box fontSize="sm" sx={{ 'p': { fontSize: 'sm', mb: 2 }, 'h1': { fontSize: 'md' }, 'h2': { fontSize: 'sm' } }}>
            <GardenNoteRenderer html={note.html} />
          </Box>
        ) : (
          <Box color="gray.400" fontSize="sm" py={8} textAlign="center">
            Note not found
          </Box>
        )}
      </Box>
    </Box>,
    document.body
  );
}
