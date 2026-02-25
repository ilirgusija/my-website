import React from 'react';
import { Box, Heading, VStack, Text } from '@chakra-ui/react';
import Link from 'next/link';

interface Backlink {
  slug: string;
  title: string;
}

export function BacklinksSection({ backlinks }: { backlinks: Backlink[] }) {
  if (backlinks.length === 0) return null;

  return (
    <Box
      mt={10}
      pt={6}
      borderTop="1px solid"
      borderColor="gray.200"
    >
      <Heading as="h3" size="sm" color="gray.500" mb={3} textTransform="uppercase" letterSpacing="wider">
        Linked from
      </Heading>
      <VStack align="flex-start" spacing={1}>
        {backlinks.map(({ slug, title }) => (
          <Link key={slug} href={`/garden/${slug}`}>
            <Text
              color="blue.500"
              fontSize="sm"
              _hover={{ textDecoration: 'underline', color: 'blue.600' }}
              cursor="pointer"
            >
              {title}
            </Text>
          </Link>
        ))}
      </VStack>
    </Box>
  );
}
