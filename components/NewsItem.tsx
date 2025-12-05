import { Box, Text, Link, HStack, Icon } from "@chakra-ui/react";
import { NewsItem as NewsItemType } from "../lib/news";
import { FiExternalLink } from "react-icons/fi";

interface NewsItemProps {
  item: NewsItemType;
}

function formatDate(dateString: string): string {
  // Parse date as local date (not UTC) to avoid timezone issues
  // If dateString is "YYYY-MM-DD", parse it as local date
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function NewsItem({ item }: NewsItemProps) {
  return (
    <Box>
      <HStack spacing={2} mb={1}>
        <Text fontSize="sm" color="gray.500">
          {formatDate(item.date)}
        </Text>
        <Text fontSize="sm" color="blue.600" fontWeight="medium">
          {item.type}
        </Text>
      </HStack>
      <Text fontSize="md" fontWeight="semibold">
        {item.link ? (
          <Link href={item.link} isExternal color="blue.600">
            {item.title}
            <Icon as={FiExternalLink} ml={1} boxSize={3} display="inline" />
          </Link>
        ) : (
          item.title
        )}
      </Text>
      {item.description && (
        <Text fontSize="sm" color="gray.600" mt={1}>
          {item.description}
        </Text>
      )}
    </Box>
  );
}


