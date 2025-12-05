import React, { useState, useCallback } from 'react';
import {
    Flex,
    Heading,
    Image,
    Stack,
    VStack,
    Text,
    Divider,
    Link,
    HStack,
    Button,
    Box,
    useBreakpointValue,
    Input,
    FormControl,
    FormLabel,
} from "@chakra-ui/react";
import { Book } from "../lib/books";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface PaginatedBooksListProps {
    books: Book[];
    booksPerPage?: number;
}

export function PaginatedBooksList({ books, booksPerPage = 5 }: PaginatedBooksListProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [jumpToPage, setJumpToPage] = useState('');

    // Calculate pagination
    const totalPages = Math.ceil(books.length / booksPerPage);
    const startIndex = (currentPage - 1) * booksPerPage;
    const endIndex = startIndex + booksPerPage;
    const currentBooks = books.slice(startIndex, endIndex);

    // Responsive button sizes
    const buttonSize = useBreakpointValue({ base: "sm", md: "md" });
    const isMobile = useBreakpointValue({ base: true, md: false });

    const goToPage = useCallback((page: number) => {
        setCurrentPage((prevPage) => {
            const newPage = Math.max(1, Math.min(page, totalPages));
            // Scroll to top when changing pages
            if (newPage !== prevPage) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return newPage;
        });
    }, [totalPages]);

    const goToPreviousPage = useCallback(() => {
        setCurrentPage((prev) => {
            const newPage = Math.max(1, Math.min(prev - 1, totalPages));
            if (newPage !== prev) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return newPage;
        });
    }, [totalPages]);

    const goToNextPage = useCallback(() => {
        setCurrentPage((prev) => {
            const newPage = Math.max(1, Math.min(prev + 1, totalPages));
            if (newPage !== prev) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return newPage;
        });
    }, [totalPages]);

    const handleJumpToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page >= 1 && page <= totalPages) {
            goToPage(page);
            setJumpToPage('');
        }
    };

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPreviousPage();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPreviousPage, goToNextPage]);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = isMobile ? 3 : 5;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages around current page
            let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let end = Math.min(totalPages, start + maxVisiblePages - 1);

            // Adjust if we're near the end
            if (end === totalPages) {
                start = Math.max(1, end - maxVisiblePages + 1);
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    return (
        <Stack spacing={8}>
            {/* Books List */}
            <Stack spacing={6}>
                {currentBooks.map((book, index) => (
                    <Stack key={book.title} scrollMarginTop={20}>
                        <Stack>
                            {index > 0 && <Divider mb={3} width="100%" />}
                            <Box position="relative">
                                <Image
                                    border="1px solid"
                                    borderColor="gray.200"
                                    src={book.coverImage}
                                    alt={book.title}
                                    height={{ base: "100px", sm: "140px", md: "160px" }}
                                    float={{ base: "none", md: "left" }}
                                    mr={{ base: 0, md: 8 }}
                                    mb={{ base: 4, md: 4 }}
                                    display={{ base: "block", md: "inline" }}
                                    onError={(e) => {
                                        // Fallback to a placeholder if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/books/null.jpg';
                                    }}
                                    crossOrigin="anonymous"
                                />

                                <Box>
                                    <Link href={book.slug}>
                                        <Heading size="md">{book.title}</Heading>
                                    </Link>
                                    <Text color="#999" size="md">
                                        {book.author}
                                    </Text>
                                    <Text color="#666" mb={4}>
                                        Read: {book.date} • Rating: {book.rating}/10
                                    </Text>
                                    <Box>
                                        <MarkdownRenderer>{book.summary}</MarkdownRenderer>
                                    </Box>
                                </Box>

                                <Box style={{ clear: 'both' }} />
                            </Box>
                        </Stack>
                    </Stack>
                ))}
            </Stack>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Box>
                    <Divider mb={6} />
                    <Flex
                        justify="center"
                        align="center"
                        gap={4}
                        flexWrap="wrap"
                    >
                        {/* Previous Button */}
                        <Button
                            size={buttonSize}
                            variant="outline"
                            onClick={goToPreviousPage}
                            isDisabled={currentPage === 1}
                            leftIcon={<FaChevronLeft />}
                        >
                            {!isMobile && "Previous"}
                        </Button>

                        {/* Page Numbers */}
                        <HStack spacing={2}>
                            {getPageNumbers().map((pageNum) => (
                                <Button
                                    key={pageNum}
                                    size={buttonSize}
                                    variant={currentPage === pageNum ? "solid" : "outline"}
                                    onClick={() => goToPage(pageNum)}
                                    minW={isMobile ? "40px" : "44px"}
                                >
                                    {pageNum}
                                </Button>
                            ))}
                        </HStack>

                        {/* Next Button */}
                        <Button
                            size={buttonSize}
                            variant="outline"
                            onClick={goToNextPage}
                            isDisabled={currentPage === totalPages}
                            rightIcon={<FaChevronRight />}
                        >
                            {!isMobile && "Next"}
                        </Button>
                    </Flex>

                    {/* Page Info */}
                    <Text
                        textAlign="center"
                        color="gray.500"
                        fontSize="sm"
                        mt={2}
                    >
                        Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, books.length)} of {books.length} books
                    </Text>

                    {/* Jump to Page Form */}
                    {totalPages > 5 && (
                        <Flex justify="center" mt={3}>
                            <form onSubmit={handleJumpToPage}>
                                <HStack spacing={2}>
                                    <FormControl w="auto">
                                        <FormLabel fontSize="sm" mb={1}>
                                            Jump to page:
                                        </FormLabel>
                                    </FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        size="sm"
                                        w="80px"
                                        placeholder="Page #"
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="outline"
                                        isDisabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                                    >
                                        Go
                                    </Button>
                                </HStack>
                            </form>
                        </Flex>
                    )}
                </Box>
            )}
        </Stack>
    );
}
