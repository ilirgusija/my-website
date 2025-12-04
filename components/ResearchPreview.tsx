import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Link,
  Icon,
  Button,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { Research } from "../lib/research";
import { FiFileText, FiClock, FiInfo } from "react-icons/fi";
import { PDFPreview } from "./PDFPreview";

interface ResearchPreviewProps {
  research: Research;
}

function getStatusColor(status: Research["status"]): string {
  switch (status) {
    case "published":
      return "green";
    case "submitted":
      return "blue";
    case "in-progress":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusLabel(status: Research["status"]): string {
  switch (status) {
    case "published":
      return "Published";
    case "submitted":
      return "Submitted";
    case "in-progress":
      return "Work in Progress";
    default:
      return status;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ResearchPreview({ research }: ResearchPreviewProps) {
  const isInProgress = research.status === "in-progress";

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={6}
      _hover={{ shadow: "md", borderColor: "blue.300" }}
      transition="all 0.2s"
      bg="white"
      position="relative"
    >
      {isInProgress && (
        <Alert status="info" mb={4} borderRadius="md" fontSize="sm">
          <AlertIcon />
          This is ongoing research work. Results and conclusions may change as the work progresses.
        </Alert>
      )}

      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between" align="flex-start">
            <Heading size="md" flex={1}>
              {research.title}
            </Heading>
            <Badge colorScheme={getStatusColor(research.status)} fontSize="sm" px={2} py={1}>
              {getStatusLabel(research.status)}
            </Badge>
          </HStack>

          <Text fontSize="sm" color="gray.600" fontStyle="italic">
            {research.authors.join(", ")}
          </Text>
        </VStack>

        {/* Abstract */}
        <Text fontSize="sm" color="gray.700" noOfLines={3} lineHeight="tall">
          {research.abstract}
        </Text>

        {/* PDF Preview */}
        {research.pdfUrl && (
          <Box mt={2}>
            <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">
              Preview
            </Text>
            <PDFPreview
              pdfUrl={research.pdfUrl}
              title={research.title}
              height={{ base: "250px", md: "300px" }}
            />
          </Box>
        )}

        {/* Footer */}
        <HStack justify="space-between" pt={2} borderTopWidth="1px" borderColor="gray.100">
          <HStack spacing={4} fontSize="xs" color="gray.500">
            {research.lastUpdated && (
              <HStack spacing={1}>
                <Icon as={FiClock} boxSize={3} />
                <Text>Updated {formatDate(research.lastUpdated)}</Text>
              </HStack>
            )}
            {research.arxivId && (
              <Link
                href={`https://arxiv.org/abs/${research.arxivId}`}
                isExternal
                _hover={{ color: "blue.600" }}
              >
                <HStack spacing={1}>
                  <Icon as={FiInfo} boxSize={3} />
                  <Text>arXiv</Text>
                </HStack>
              </Link>
            )}
          </HStack>

          {research.pdfUrl ? (
            <Button
              as={Link}
              href={research.pdfUrl}
              isExternal
              size="sm"
              colorScheme="blue"
              variant="outline"
              leftIcon={<Icon as={FiFileText} />}
            >
              View PDF
            </Button>
          ) : isInProgress ? (
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              PDF coming soon
            </Text>
          ) : null}
        </HStack>
      </VStack>
    </Box>
  );
}
