import { VStack, Box, Text, Link, HStack, Icon } from "@chakra-ui/react";
import { NewsItem } from "../lib/news";
import { FiExternalLink, FiAward, FiBook, FiMic, FiBriefcase, FiInfo } from "react-icons/fi";

interface NewsTimelineProps {
  items: NewsItem[];
}

function getIconForType(type: NewsItem["type"]) {
  switch (type) {
    case "publication":
      return FiBook;
    case "talk":
      return FiMic;
    case "award":
      return FiAward;
    case "position":
      return FiBriefcase;
    default:
      return FiInfo;
  }
}

function getTypeLabel(type: NewsItem["type"]): string {
  switch (type) {
    case "publication":
      return "Publication";
    case "talk":
      return "Talk";
    case "award":
      return "Award";
    case "position":
      return "Position";
    default:
      return "News";
  }
}

function formatDate(dateString: string): string {
  // Parse date as local date (not UTC) to avoid timezone issues
  // If dateString is "YYYY-MM-DD", parse it as local date
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function NewsTimeline({ items }: NewsTimelineProps) {
  if (items.length === 0) {
    return (
      <Box>
        <Text color="gray.500" fontStyle="italic">
          No news items yet. Check back soon!
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      {items.map((item, index) => {
        const IconComponent = getIconForType(item.type);
        const isLast = index === items.length - 1;

        return (
          <Box key={item.slug} position="relative" pl={8}>
            {/* Timeline line */}
            {!isLast && (
              <Box
                position="absolute"
                left="11px"
                top="24px"
                bottom="-24px"
                width="2px"
                bg="gray.200"
              />
            )}

            {/* Icon */}
            <Box
              position="absolute"
              left={0}
              top={0}
              w={6}
              h={6}
              borderRadius="full"
              bg="blue.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={1}
            >
              <Icon as={IconComponent} color="blue.600" boxSize={4} />
            </Box>

            {/* Content */}
            <VStack align="stretch" spacing={1}>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                  {formatDate(item.date)}
                </Text>
                <Text fontSize="sm" color="blue.600" fontWeight="medium">
                  {getTypeLabel(item.type)}
                </Text>
              </HStack>

              <Text fontSize="lg" fontWeight="semibold">
                {item.link ? (
                  <Link href={item.link} isExternal color="blue.600" _hover={{ textDecoration: "underline" }}>
                    {item.title}
                    <Icon as={FiExternalLink} ml={1} boxSize={3} display="inline" />
                  </Link>
                ) : (
                  item.title
                )}
              </Text>

              {item.venue && (
                <Text fontSize="sm" color="gray.600" fontStyle="italic">
                  {item.venue}
                </Text>
              )}

              {item.description && (
                <Text fontSize="md" color="gray.700" mt={1}>
                  {item.description}
                </Text>
              )}
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
}


