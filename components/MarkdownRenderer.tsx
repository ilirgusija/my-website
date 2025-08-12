import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Heading, Text, Link, UnorderedList, OrderedList, ListItem, Code, Divider } from '@chakra-ui/react';

interface MarkdownRendererProps {
    children: string;
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            components={{
                // Custom heading components
                h1: ({ children }) => (
                    <Heading as="h1" size="xl" mb={4} mt={6}>
                        {children}
                    </Heading>
                ),
                h2: ({ children }) => (
                    <Heading as="h2" size="lg" mb={3} mt={5}>
                        {children}
                    </Heading>
                ),
                h3: ({ children }) => (
                    <Heading as="h3" size="md" mb={2} mt={4}>
                        {children}
                    </Heading>
                ),
                h4: ({ children }) => (
                    <Heading as="h4" size="sm" mb={2} mt={3}>
                        {children}
                    </Heading>
                ),
                h5: ({ children }) => (
                    <Heading as="h5" size="xs" mb={1} mt={2}>
                        {children}
                    </Heading>
                ),
                h6: ({ children }) => (
                    <Heading as="h6" size="xs" mb={1} mt={2}>
                        {children}
                    </Heading>
                ),

                // Custom paragraph component
                p: ({ children }) => (
                    <Text mb={3} lineHeight="1.6">
                        {children}
                    </Text>
                ),

                // Custom link component
                a: ({ href, children }) => (
                    <Link href={href} color="blue.500" textDecoration="underline" _hover={{ color: "blue.600" }}>
                        {children}
                    </Link>
                ),

                // Custom list components
                ul: ({ children }) => (
                    <UnorderedList mb={3} pl={4}>
                        {children}
                    </UnorderedList>
                ),
                ol: ({ children }) => (
                    <OrderedList mb={3} pl={4}>
                        {children}
                    </OrderedList>
                ),
                li: ({ children }) => (
                    <ListItem mb={1}>
                        {children}
                    </ListItem>
                ),

                // Custom code components
                code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                        <Code fontSize="0.875em" px={1} py={0.5} bg="gray.100" borderRadius="sm">
                            {children}
                        </Code>
                    ) : (
                        <Box
                            as="pre"
                            bg="gray.50"
                            p={4}
                            borderRadius="md"
                            overflowX="auto"
                            mb={3}
                            fontSize="0.875em"
                            lineHeight="1.5"
                        >
                            <Code bg="transparent" p={0}>
                                {children}
                            </Code>
                        </Box>
                    );
                },

                // Custom blockquote component
                blockquote: ({ children }) => (
                    <Box
                        as="blockquote"
                        borderLeft="4px solid"
                        borderColor="gray.300"
                        pl={4}
                        py={2}
                        my={4}
                        bg="gray.50"
                        borderRadius="md"
                        fontStyle="italic"
                    >
                        {children}
                    </Box>
                ),

                // Custom strong component
                strong: ({ children }) => (
                    <Text as="span" fontWeight="bold">
                        {children}
                    </Text>
                ),

                // Custom emphasis component
                em: ({ children }) => (
                    <Text as="span" fontStyle="italic">
                        {children}
                    </Text>
                ),

                // Custom horizontal rule component
                hr: () => (
                    <Divider my={4} borderColor="gray.300" />
                ),
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
