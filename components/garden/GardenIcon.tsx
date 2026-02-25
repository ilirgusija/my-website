import React from 'react';
import { Icon, Text, Box } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import {
  LuOrbit, LuCode, LuBrainCircuit, LuInfinity, LuBraces,
  LuImage, LuFilter, LuHighlighter, LuCalendarDays, LuRotate3D,
  LuDonut, LuMusic,
} from 'react-icons/lu';

/**
 * Lucide icon fallback map — for Li-prefixed icons that don't have
 * local SVGs in the vault. All other icon packs use inline SVGs
 * extracted during sync.
 */
const LUCIDE_FALLBACK: Record<string, IconType> = {
  LiOrbit: LuOrbit,
  LiCode: LuCode,
  LiBrainCircuit: LuBrainCircuit,
  LiInfinity: LuInfinity,
  LiBraces: LuBraces,
  LiImage: LuImage,
  LiFunnel: LuFilter,
  LiHighlighter: LuHighlighter,
  LiCalendarDays: LuCalendarDays,
  LiRotate3d: LuRotate3D,
  LiTorus: LuDonut,
  LiPiano: LuMusic,
};

interface GardenIconProps {
  /** Raw SVG string extracted from vault icon packs */
  svg?: string;
  /** Emoji icon string */
  emoji?: string;
  /** Fallback icon identifier (for Lucide react-icons fallback) */
  name?: string;
  size?: number;
}

export function GardenIcon({ svg, emoji, name, size = 16 }: GardenIconProps) {
  // Inline SVG from vault (most icons)
  if (svg) {
    // Sanitize: strip script tags and event handlers
    const cleanSvg = svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\s+on\w+="[^"]*"/gi, '');
    return (
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          '& svg': {
            width: `${size}px`,
            height: `${size}px`,
            fill: 'currentColor',
            stroke: 'currentColor',
          },
        }}
        dangerouslySetInnerHTML={{ __html: cleanSvg }}
      />
    );
  }

  // Emoji icon
  if (emoji) {
    return (
      <Text as="span" fontSize={`${size}px`} lineHeight={1}>
        {emoji}
      </Text>
    );
  }

  // Lucide react-icons fallback (for Li-prefixed icons without local SVGs)
  if (name) {
    const LucideIcon = LUCIDE_FALLBACK[name];
    if (LucideIcon) {
      return <Icon as={LucideIcon} boxSize={`${size}px`} />;
    }
  }

  return null;
}
