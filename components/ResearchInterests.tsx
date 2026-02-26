import { VStack, HStack, Text, Box, Badge } from "@chakra-ui/react";

interface ResearchInterestsProps {
  interests: string[];
}

export function ResearchInterests({ interests }: ResearchInterestsProps) {
  if (interests.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={3}>
      <Text fontSize="lg" fontWeight="semibold" mb={2}>
        Research Interests
      </Text>
      <HStack spacing={2} flexWrap="wrap">
        {interests.map((interest, index) => (
          <Badge
            key={index}
            px={3}
            py={1}
            borderRadius="full"
            color="accent.link"
            bg="bg.surface"
            border="1px solid"
            borderColor="border.subtle"
            fontSize="sm"
          >
            {interest}
          </Badge>
        ))}
      </HStack>
    </VStack>
  );
}


