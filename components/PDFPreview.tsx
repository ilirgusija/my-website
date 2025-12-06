import { Box, Flex, Icon, Text, ResponsiveValue } from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { FiExternalLink, FiFileText } from "react-icons/fi";
import Image from "next/image";

interface PDFPreviewProps {
  pdfUrl: string;
  title: string;
  width?: ResponsiveValue<string | number>;
  height?: ResponsiveValue<string | number>;
}

export function PDFPreview({ pdfUrl, title, width = "100%", height = "400px" }: PDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate thumbnail client-side using PDF.js
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [pdfViewUrl, setPdfViewUrl] = useState<string>(pdfUrl);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullPdfUrl = pdfUrl.startsWith("/") 
        ? `${window.location.origin}${pdfUrl}`
        : pdfUrl;
      
      setPdfViewUrl(`/api/research/pdf-proxy?url=${encodeURIComponent(fullPdfUrl)}`);
    }
  }, [pdfUrl]);

  // Load PDF.js from CDN and generate thumbnail client-side
  useEffect(() => {
    if (!containerRef.current || thumbnailDataUrl) return;

    // Load PDF.js from CDN
    const loadPDFJS = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if ((window as any).pdfjsLib) {
          resolve((window as any).pdfjsLib);
          return;
        }

        // Load the script
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
    };

    const observer = new IntersectionObserver(
      async (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !thumbnailDataUrl) {
            observer.disconnect();
            setShouldLoad(true);
            
            try {
              // Load PDF.js from CDN
              const pdfjsLib = await loadPDFJS();

              // Get PDF URL (use proxy for CORS)
              const fullPdfUrl = pdfUrl.startsWith("/") 
                ? `${window.location.origin}${pdfUrl}`
                : pdfUrl;
              const proxyUrl = `/api/research/pdf-proxy?url=${encodeURIComponent(fullPdfUrl)}`;

              // Load PDF
              const loadingTask = pdfjsLib.getDocument(proxyUrl);
              const pdf = await loadingTask.promise;

              // Get first page
              const page = await pdf.getPage(1);
              
              // Calculate scale for thumbnail
              const viewport = page.getViewport({ scale: 1.5 });
              const targetWidth = 800;
              const scale = targetWidth / viewport.width;
              const scaledViewport = page.getViewport({ scale: scale * 1.5 });

              // Create canvas
              const canvas = document.createElement("canvas");
              canvas.width = scaledViewport.width;
              canvas.height = scaledViewport.height;
              const context = canvas.getContext("2d");

              if (!context) {
                throw new Error("Could not get canvas context");
              }

              // Fill white background
              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, canvas.width, canvas.height);

              // Render PDF page to canvas
              await page.render({
                canvasContext: context,
                viewport: scaledViewport,
              }).promise;

              // Convert to data URL (JPEG, 85% quality)
              const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
              setThumbnailDataUrl(dataUrl);
              setIsLoading(false);
            } catch (error) {
              console.error("Error generating PDF thumbnail:", error);
              setHasError(true);
              setIsLoading(false);
            }
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [pdfUrl, thumbnailDataUrl]);

  return (
    <Box
      ref={containerRef}
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
      onClick={() => window.open(pdfViewUrl, "_blank")}
      role="button"
      aria-label={`Preview of ${title}. Click to open full PDF.`}
    >
      {/* Loading state */}
      {isLoading && shouldLoad && (
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

      {/* Thumbnail image - generated client-side, no iframe! */}
      {thumbnailDataUrl && !hasError && (
        <Box position="relative" width="100%" height="100%">
          <Box
            as="img"
            src={thumbnailDataUrl}
            alt={`Preview of ${title}`}
            width="100%"
            height="100%"
            objectFit="contain"
            bg="white"
          />
          {/* Click overlay hint */}
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.600"
            opacity={0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.2s"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            <Flex direction="column" align="center" gap={2} color="white">
              <Icon as={FiExternalLink} boxSize={6} />
              <Text fontSize="sm" fontWeight="medium">
                Click to view full PDF
              </Text>
            </Flex>
          </Box>
        </Box>
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

      {/* Click overlay with hint */}
      {!hasError && (
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
      )}
    </Box>
  );
}

