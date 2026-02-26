import React, { useMemo } from 'react';
import Link from 'next/link';
import { Box } from '@chakra-ui/react';
import parse, { domToReact, type DOMNode, type Element } from 'html-react-parser';

interface GardenNoteRendererProps {
  html: string;
  onLinkClick?: (slug: string) => void;
}

export function GardenNoteRenderer({ html, onLinkClick }: GardenNoteRendererProps) {
  const parsed = useMemo(() => {
    const options = {
      replace(domNode: DOMNode) {
        if (!(domNode as Element).attribs || (domNode as Element).name !== 'a') return;
        const node = domNode as Element;
        const href = node.attribs?.href;
        if (href?.startsWith('/garden')) {
          const { class: className } = node.attribs;
          const slug = href.replace(/^\/garden\/?/, '');

          // If an onLinkClick handler is provided, use it instead of Next.js navigation.
          if (onLinkClick) {
            const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              onLinkClick(slug);
            };

            return (
              <a
                href={href}
                className={className || undefined}
                data-garden-link="true"
                onClick={handleClick}
              >
                {domToReact(node.children as DOMNode[], options)}
              </a>
            );
          }

          // Default: use Next.js Link for client-side navigation.
          return (
            <Link
              href={href}
              className={className || undefined}
              data-garden-link="true"
              prefetch={false}
            >
              {domToReact(node.children as DOMNode[], options)}
            </Link>
          );
        }
      },
    };
    return parse(html, options);
  }, [html, onLinkClick]);

  return (
    <Box
      className="garden-note-content"
      suppressHydrationWarning
      sx={{
        // Typography
        'h1': { fontSize: 'xl', fontWeight: 600, mt: 6, mb: 4, letterSpacing: '-0.02em' },
        'h2': { fontSize: 'lg', fontWeight: 600, mt: 5, mb: 3, letterSpacing: '-0.02em' },
        'h3': { fontSize: 'md', fontWeight: 600, mt: 4, mb: 2 },
        'h4': { fontSize: 'sm', fontWeight: 600, mt: 3, mb: 2 },
        'p': { mb: 3, lineHeight: 1.7, fontSize: 'md' },

        // Links (resolved wikilinks)
        'a': {
          color: 'accent.link',
          textDecoration: 'none',
          borderBottom: '1px dotted',
          borderColor: 'border.subtle',
          _hover: { color: 'accent.linkHover', borderColor: 'accent.link' },
        },

        // Callout reference links (![[concept]] → link to concept page)
        'a.garden-callout-ref': {
          display: 'inline-block',
          px: 2,
          py: 1,
          mb: 2,
          mr: 2,
          fontSize: 'sm',
          fontWeight: 500,
          color: 'accent.link',
          bg: 'transparent',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: 'border.subtle',
          _hover: { bg: 'bg.surface', color: 'accent.linkHover', borderColor: 'accent.link' },
        },

        // Unresolved wikilinks
        '.wikilink-unresolved': {
          color: 'gray.400',
          fontStyle: 'italic',
          cursor: 'default',
          borderBottom: '1px dashed',
          borderColor: 'gray.300',
        },

        // Lists
        'ul': { mb: 3, pl: 6 },
        'ol': { mb: 3, pl: 6 },
        'li': { mb: 1 },

        // Code
        'code': { fontSize: '0.875em', px: 1, py: 0.5, bg: 'gray.100', borderRadius: 'sm' },
        'pre': {
          bg: 'gray.50', p: 4, borderRadius: 'md', overflowX: 'auto', mb: 3,
          fontSize: '0.875em', lineHeight: 1.5,
          'code': { bg: 'transparent', p: 0 },
        },

        // Blockquotes (non-callout)
        'blockquote': {
          borderLeft: '4px solid',
          borderColor: 'gray.300',
          pl: 4, py: 2, my: 4,
          bg: 'gray.50',
          borderRadius: 'md',
          fontStyle: 'italic',
        },

        // Callout blocks — restrained LaTeX-like theorem environment styling
        '.callout': {
          border: '1px solid',
          borderLeftWidth: '3px',
          borderColor: 'border.subtle',
          borderRadius: 'sm',
          my: 4,
          p: 3,
          position: 'relative',
          bg: 'transparent',
          lineHeight: 1.65,
        },
        // Theorem-like callouts use a serif body similar to standard math papers.
        '.callout-definition, .callout-theorem, .callout-proposition, .callout-lemma, .callout-corollary, .callout-proof, .callout-axiom, .callout-remark': {
          fontFamily: '"CMU Serif", "Times New Roman", Times, Georgia, serif',
          fontSize: '1.02em',
        },
        '.callout-definition': { borderLeftColor: 'blue.500' },
        '.callout-theorem': { borderLeftColor: 'green.600' },
        '.callout-proposition, .callout-prp': { borderLeftColor: 'cyan.600' },
        '.callout-lemma, .callout-lem': { borderLeftColor: 'green.500' },
        '.callout-corollary': { borderLeftColor: 'green.500' },
        '.callout-proof': { borderLeftColor: 'purple.500', fontStyle: 'italic' },
        '.callout-example': { borderLeftColor: 'yellow.600' },
        '.callout-note': { borderLeftColor: 'gray.500', bg: 'transparent' },
        '.callout-warning': { borderLeftColor: 'orange.500', bg: 'transparent' },
        '.callout-tip': { borderLeftColor: 'teal.500', bg: 'transparent' },
        '.callout-important': { borderLeftColor: 'red.500', bg: 'transparent' },
        '.callout-axiom': { borderLeftColor: 'orange.600' },
        '.callout-remark': { borderLeftColor: 'gray.500' },

        // Callout titles are emitted as real HTML in sync, so LaTeX can render.
        '.callout .callout-title': {
          display: 'block',
          fontWeight: 700,
          fontSize: '0.92em',
          letterSpacing: '0.02em',
          mb: 1.5,
          fontFamily: '"CMU Serif", "Times New Roman", Times, Georgia, serif',
        },
        '.callout > p:first-of-type': {
          mb: 2,
        },

        // Bold and italic
        'strong': { fontWeight: 'bold' },
        'em': { fontStyle: 'italic' },

        // Horizontal rule
        'hr': { my: 4, borderColor: 'border.subtle' },

        // KaTeX overrides
        '.katex-display': {
          overflowX: 'auto',
          overflowY: 'hidden',
          py: 2,
        },

        // Tables
        'table': { width: '100%', mb: 4, borderCollapse: 'collapse' },
        'th': { bg: 'bg.surface', p: 2, borderBottom: '2px solid', borderColor: 'border.subtle', textAlign: 'left' },
        'td': { p: 2, borderBottom: '1px solid', borderColor: 'border.subtle' },

        // Images
        'img': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          mx: 'auto',
          my: 4,
          borderRadius: 'md',
        },
      }}
    >
      {parsed}
    </Box>
  );
}
