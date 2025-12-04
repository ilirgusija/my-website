import { VStack, Box, Text } from "@chakra-ui/react";
import { Research } from "../lib/research";
import { ResearchPreview } from "./ResearchPreview";

interface ResearchListProps {
  research: Research[];
}

export function ResearchList({ research }: ResearchListProps) {
  if (research.length === 0) {
    return (
      <Box>
        <Text color="gray.500" fontStyle="italic">
          No research projects available yet. Check back soon!
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      {research.map((item) => (
        <ResearchPreview key={item.slug} research={item} />
      ))}
    </VStack>
  );
}
