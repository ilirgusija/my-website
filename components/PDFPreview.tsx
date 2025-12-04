import { Box, Flex, Icon, Text, useDisclosure } from "@chakra-ui/react";
import { useState } from "react";
import { FiExternalLink, FiFileText } from "react-icons/fi";

interface PDFPreviewProps {
  pdfUrl: string;
  title: string;
  width?: string | number;
  height?: string | number;
}

export function PDFPreview({ pdfUrl, title, width = "100%", height = "400px" }: PDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use proxy API for better CORS handling, or direct URL if it's a local file
  const previewUrl = pdfUrl.startsWith("/") 
    ? pdfUrl 
    : `/api/research/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;

  return (
    <Box
      position="relative"
      width={width}
      height={height}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      bg="gray.50"
      _hover={{
        borderColor: "blue.300",
        shadow: "md",
      }}
      transition="all 0.2s"
      cursor="pointer"
      onClick={() => window.open(pdfUrl, "_blank")}
      role="button"
      aria-label={`Preview of ${title}. Click to open full PDF.`}
    >
      {/* Loading state */}
      {isLoading && (
        <Flex
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="gray.50"
          zIndex={1}
        >
          <Flex direction="column" align="center" gap={2}>
            <Icon as={FiFileText} boxSize={8} color="gray.400" />
            <Text fontSize="sm" color="gray.500">
              Loading preview...
            </Text>
          </Flex>
        </Flex>
      )}

      {/* Error state */}
      {hasError && (
        <Flex
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="gray.50"
          zIndex={1}
          direction="column"
          gap={2}
          p={4}
        >
          <Icon as={FiFileText} boxSize={8} color="gray.400" />
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Preview unavailable
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Click to open PDF
          </Text>
        </Flex>
      )}

      {/* PDF Preview iframe */}
      <Box
        as="iframe"
        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`}
        width="100%"
        height="100%"
        border="none"
        display={hasError ? "none" : "block"}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        title={`PDF preview: ${title}`}
        allow="fullscreen"
      />

      {/* Click overlay with hint */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="blackAlpha.700"
        color="white"
        p={2}
        fontSize="xs"
        textAlign="center"
        opacity={0}
        _hover={{ opacity: 1 }}
        transition="opacity 0.2s"
        pointerEvents="none"
      >
        <Flex align="center" justify="center" gap={1}>
          <Icon as={FiExternalLink} boxSize={3} />
          <Text>Click to open full PDF</Text>
        </Flex>
      </Box>
    </Box>
  );
}

