import React, { useMemo } from 'react';
import Link from 'next/link';
import { Box } from '@chakra-ui/react';
import parse, { domToReact, type DOMNode, type Element } from 'html-react-parser';

interface GardenNoteRendererProps {
  html: string;
}

/**
 * Renders pre-processed garden note HTML.
 * Internal /garden links are replaced with Next.js Link for client-side navigation.
 * Hover popups are handled by LinkPreviewProvider via event delegation.
 */
export function GardenNoteRenderer({ html }: GardenNoteRendererProps) {
  const parsed = useMemo(() => {
    const options = {
      replace(domNode: DOMNode) {
        if (!(domNode as Element).attribs || (domNode as Element).name !== 'a') return;
        const node = domNode as Element;
        const href = node.attribs?.href;
        if (href?.startsWith('/garden')) {
          const { class: className } = node.attribs;
          return (
            <Link href={href} className={className || undefined} prefetch={false}>
              {domToReact(node.children as DOMNode[], options)}
            </Link>
          );
        }
      },
    };
    return parse(html, options);
  }, [html]);

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
          color: 'blue.500',
          textDecoration: 'none',
          borderBottom: '1px dotted',
          borderColor: 'blue.300',
          _hover: { color: 'blue.600', borderColor: 'blue.500' },
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
          color: 'blue.600',
          bg: 'blue.50',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: 'blue.200',
          _hover: { bg: 'blue.100', color: 'blue.700', borderColor: 'blue.300' },
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

        // Callout blocks — LaTeX theorem referencer–inspired styling
        '.callout': {
          borderLeft: '4px solid',
          borderRadius: 'md',
          my: 4,
          overflow: 'hidden',
          p: 4,
          position: 'relative',
        },
        // Theorem-like callouts: serif font (CMU Serif, Times, Georgia)
        '.callout-definition, .callout-theorem, .callout-proposition, .callout-lemma, .callout-corollary, .callout-proof, .callout-axiom, .callout-remark': {
          fontFamily: '"CMU Serif", "Times New Roman", Times, Georgia, serif',
        },
        '.callout-definition': { borderColor: 'blue.500', bg: 'blue.50' },
        '.callout-theorem': { borderColor: 'green.600', bg: 'green.50' },
        '.callout-proposition': { borderColor: 'cyan.600', bg: 'cyan.50' },
        '.callout-lemma, .callout-lem': { borderColor: 'green.500', bg: 'green.50' },
        '.callout-corollary': { borderColor: 'green.500', bg: 'green.50' },
        '.callout-proof': { borderColor: 'purple.500', bg: 'purple.50', fontStyle: 'italic' },
        '.callout-example': { borderColor: 'yellow.500', bg: 'yellow.50' },
        '.callout-note': { borderColor: 'gray.400', bg: 'gray.50' },
        '.callout-warning': { borderColor: 'orange.500', bg: 'orange.50' },
        '.callout-tip': { borderColor: 'teal.500', bg: 'teal.50' },
        '.callout-important': { borderColor: 'red.500', bg: 'red.50' },
        '.callout-axiom': { borderColor: 'orange.600', bg: 'orange.50' },
        '.callout-remark': { borderColor: 'gray.500', bg: 'gray.50' },
        '.callout-prp': { borderColor: 'cyan.600', bg: 'cyan.50', fontFamily: '"CMU Serif", "Times New Roman", Times, Georgia, serif' },

        // Callout titles — bold label + optional title
        '.callout[data-callout-title]::before': {
          content: 'attr(data-callout-title)',
          display: 'block',
          fontWeight: 700,
          fontSize: 'sm',
          mb: 2,
          fontFamily: '"CMU Serif", "Times New Roman", Times, Georgia, serif',
        },

        // Bold and italic
        'strong': { fontWeight: 'bold' },
        'em': { fontStyle: 'italic' },

        // Horizontal rule
        'hr': { my: 4, borderColor: 'gray.300' },

        // KaTeX overrides
        '.katex-display': {
          overflowX: 'auto',
          overflowY: 'hidden',
          py: 2,
        },

        // Tables
        'table': { width: '100%', mb: 4, borderCollapse: 'collapse' },
        'th': { bg: 'gray.100', p: 2, borderBottom: '2px solid', borderColor: 'gray.300', textAlign: 'left' },
        'td': { p: 2, borderBottom: '1px solid', borderColor: 'gray.200' },

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
