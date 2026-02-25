import React from 'react';
import {
    Box,
    Flex,
    Heading,
    Badge,
    HStack,
    Text,
    IconButton,
    Spinner,
} from '@chakra-ui/react';
import { GardenNoteRenderer } from './GardenNoteRenderer';
import { BacklinksSection } from './BacklinksSection';
import type { GardenNoteData } from '../../lib/garden/index';

const NOTE_WIDTH = 625;

const NOTE_TYPE_COLORS: Record<string, string> = {
    concept: 'blue',
    theorem: 'green',
    other: 'gray',
};

const NOTE_TYPE_LABELS: Record<string, string> = {
    concept: 'Definition',
    theorem: 'Theorem',
    other: '',
};

const STATUS_ICONS: Record<string, string> = {
    seedling: '🌱',
    budding: '🌿',
    evergreen: '🌳',
};

interface NoteColumnProps {
    note: GardenNoteData | null;
    backlinks?: { slug: string; title: string }[];
    index: number;
    isRoot?: boolean;
    isLoading?: boolean;
    onClose?: () => void;
    onLinkClick?: (slug: string) => void;
}

export function NoteColumn({
    note,
    backlinks = [],
    index,
    isRoot = false,
    isLoading = false,
    onClose,
    onLinkClick,
}: NoteColumnProps) {
    if (isLoading) {
        return (
            <Box
                data-note-slug="loading"
                w={`${NOTE_WIDTH}px`}
                minW={`${NOTE_WIDTH}px`}
                h="100vh"
                borderLeft={index > 0 ? '1px solid' : 'none'}
                borderColor="gray.200"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="white"
                position="relative"
                boxShadow={index > 0 ? '-4px 0 12px rgba(0,0,0,0.06)' : 'none'}
            >
                <Spinner size="lg" color="blue.400" />
            </Box>
        );
    }

    if (!note) return null;

    return (
        <Box
            data-note-slug={note.slug}
            w={`${NOTE_WIDTH}px`}
            minW={`${NOTE_WIDTH}px`}
            h="100vh"
            overflowY="auto"
            borderLeft={index > 0 ? '1px solid' : 'none'}
            borderColor="gray.200"
            bg="white"
            position="relative"
            boxShadow={index > 0 ? '-4px 0 12px rgba(0,0,0,0.06)' : 'none'}
        >
            {/* Sticky header */}
            <Flex
                position="sticky"
                top={0}
                bg="white"
                zIndex={10}
                px={6}
                py={3}
                borderBottom="1px solid"
                borderColor="gray.100"
                align="center"
                justify="space-between"
            >
                <Flex align="center" gap={2} flex={1} minW={0}>
                    <Heading
                        size="sm"
                        noOfLines={1}
                        flex={1}
                        minW={0}
                    >
                        {note.title}
                    </Heading>
                    <Text fontSize="sm" title={note.status} flexShrink={0}>
                        {STATUS_ICONS[note.status] || STATUS_ICONS.seedling}
                    </Text>
                </Flex>
                {!isRoot && onClose && (
                    <IconButton
                        aria-label="Close note"
                        icon={<Text fontSize="lg">×</Text>}
                        size="xs"
                        variant="ghost"
                        onClick={onClose}
                        ml={2}
                        flexShrink={0}
                    />
                )}
            </Flex>

            {/* Note content */}
            <Box px={6} py={4}>
                {NOTE_TYPE_LABELS[note.noteType] && (
                    <Badge colorScheme={NOTE_TYPE_COLORS[note.noteType]} mb={3}>
                        {NOTE_TYPE_LABELS[note.noteType]}
                    </Badge>
                )}
                {note.tags.length > 0 && (
                    <HStack spacing={2} mb={4} flexWrap="wrap">
                        {note.tags.map(tag => (
                            <Badge key={tag} variant="outline" colorScheme="gray" fontSize="xs">
                                {tag}
                            </Badge>
                        ))}
                    </HStack>
                )}

                <GardenNoteRenderer html={note.html} onLinkClick={onLinkClick} />
                <BacklinksSection backlinks={backlinks} onLinkClick={onLinkClick} />
            </Box>
        </Box>
    );
}

export { NOTE_WIDTH };
