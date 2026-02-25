import React, { useCallback } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useStackedNotes } from './StackedNotesContext';
import { NoteColumn, NOTE_WIDTH } from './NoteColumn';
import type { GardenNoteData } from '../../lib/garden/index';

interface StackedNotesContainerProps {
    rootNote: GardenNoteData;
    rootBacklinks: { slug: string; title: string }[];
}

export function StackedNotesContainer({
    rootNote,
    rootBacklinks,
}: StackedNotesContainerProps) {
    const {
        stackedSlugs,
        noteCache,
        loadingSlug,
        pushNote,
        closeNote,
        scrollContainerRef,
    } = useStackedNotes();

    // Create link click handler for a specific column index
    const makeLinkClickHandler = useCallback(
        (columnIndex: number) => (slug: string) => {
            pushNote(slug, columnIndex + 1);
        },
        [pushNote]
    );

    return (
        <Box
            ref={scrollContainerRef}
            overflowX="auto"
            overflowY="hidden"
            h="100vh"
            css={{
                scrollBehavior: 'smooth',
                '&::-webkit-scrollbar': {
                    height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#CBD5E0',
                    borderRadius: '3px',
                },
            }}
        >
            <Flex
                direction="row"
                h="100%"
                w="fit-content"
            >
                {/* Root note — always first */}
                <NoteColumn
                    note={rootNote}
                    backlinks={rootBacklinks}
                    index={0}
                    isRoot
                    onLinkClick={makeLinkClickHandler(0)}
                />

                {/* Stacked notes */}
                {stackedSlugs.map((slug, i) => {
                    const note = noteCache[slug] || null;
                    const isLoading = loadingSlug === slug && !note;

                    return (
                        <NoteColumn
                            key={slug}
                            note={note}
                            index={i + 1}
                            isLoading={isLoading}
                            onClose={() => closeNote(i)}
                            onLinkClick={makeLinkClickHandler(i + 1)}
                        />
                    );
                })}
            </Flex>
        </Box>
    );
}
