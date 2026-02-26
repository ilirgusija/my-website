import {
  Box,
  Icon,
  HStack,
  Flex,
  Heading,
  Image,
  Center,
  useSize,
  useBreakpointValue,
} from "@chakra-ui/react";
import React from "react";
import { Book } from "../lib/books";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRouter } from "next/router";

interface BookshelfProps {
  books: Book[];
}

export function Bookshelf({ books }: BookshelfProps) {
  const router = useRouter();
  const [bookIndex, setBookIndex] = React.useState(-1);
  const [scroll, setScroll] = React.useState(0);

  const bookshelfRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const scrollRightRef = React.useRef<HTMLDivElement>(null);
  const scrollLeftRef = React.useRef<HTMLDivElement>(null);
  const viewportDimensions = useSize(viewportRef);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollEvents = useBreakpointValue({
    base: { start: "touchstart", stop: "touchend" },
    sm: { start: "mouseenter", stop: "mouseleave" },
  }) || { start: "mouseenter", stop: "mouseleave" }; // Fallback for desktop

  const width = 41.5;
  const interBookGap = 4;
  const height = 220;

  const spineWidth = `${width}px`;
  const coverWidth = `${width * 4}px`;
  const bookWidth = `${width * 5}px`;
  const bookHeight = `${height}px`;

  const minScroll = 0;
  const viewportWidth = viewportDimensions?.width ?? 0;
  const openBookExtraWidth = width * 4;
  const contentWidth = React.useMemo(() => {
    if (books.length === 0) return 0;
    return (
      books.length * width +
      Math.max(0, books.length - 1) * interBookGap +
      (bookIndex > -1 ? openBookExtraWidth : 0)
    );
  }, [bookIndex, books.length]);

  const maxScroll = React.useMemo(() => {
    return Math.max(0, contentWidth - viewportWidth);
  }, [contentWidth, viewportWidth]);

  const clampScroll = React.useCallback(
    (value: number) => Math.max(minScroll, Math.min(maxScroll, value)),
    [maxScroll]
  );

  const boundedScroll = (scrollX: number) => {
    setScroll(clampScroll(scrollX));
  };

  const boundedRelativeScroll = React.useCallback(
    (incrementX: number) => {
      setScroll((_scroll) =>
        clampScroll(_scroll + incrementX)
      );
    },
    [clampScroll]
  );

  const targetScrollForOpenBook = React.useCallback(
    (index: number, currentScroll: number) => {
      if (index < 0 || viewportWidth <= 0) return 0;
      const bookLeft = index * (width + interBookGap);
      const openBookWidth = width * 5;
      const bookRight = bookLeft + openBookWidth;

      // Keep the opened book fully visible first with minimal scroll movement.
      // This avoids the progressive drift from repeatedly re-centering.
      const leftPadding = 8;
      const rightPadding = 8;
      const minScrollToShowRightEdge = bookRight - (viewportWidth - rightPadding);
      const maxScrollToShowLeftEdge = bookLeft - leftPadding;

      let target = currentScroll;
      if (target < minScrollToShowRightEdge) {
        target = minScrollToShowRightEdge;
      }
      if (target > maxScrollToShowLeftEdge) {
        target = maxScrollToShowLeftEdge;
      }

      return clampScroll(target);
    },
    [clampScroll, viewportWidth]
  );

  React.useEffect(() => {
    const slugParam = router.query.slug;
    if (slugParam && Array.isArray(slugParam) && slugParam.length > 0) {
      const currentSlug = slugParam[0];
      const fullSlug = currentSlug.startsWith('/books/') ? currentSlug : `/books/${currentSlug}`;
      const idx = books.findIndex((b) => b.slug === fullSlug);
      if (idx !== -1 && idx !== bookIndex) {
        setBookIndex(idx);
      }
    } else if (slugParam && typeof slugParam === 'string') {
      // Single segment can be string in some cases
      const fullSlug = slugParam.startsWith('/books/') ? slugParam : `/books/${slugParam}`;
      const idx = books.findIndex((b) => b.slug === fullSlug);
      if (idx !== -1 && idx !== bookIndex) {
        setBookIndex(idx);
      }
    } else {
      // If there's no slug in the URL, ensure bookIndex is -1
      if (bookIndex !== -1) {
        setBookIndex(-1);
      }
    }
  }, [router.query.slug, books]);

  React.useEffect(() => {
    setScroll((current) => {
      if (bookIndex === -1) {
        return clampScroll(current);
      }
      return targetScrollForOpenBook(bookIndex, current);
    });
  }, [bookIndex, clampScroll, targetScrollForOpenBook]);

  React.useEffect(() => {
    setScroll((current) => {
      if (bookIndex === -1) {
        return clampScroll(current);
      }
      return targetScrollForOpenBook(bookIndex, current);
    });
  }, [bookIndex, clampScroll, targetScrollForOpenBook, maxScroll, viewportWidth]);

  // Scroll interval ref to manage the scrolling animation
  const scrollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startScrollingRight = React.useCallback(() => {
    setIsScrolling(true);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    scrollIntervalRef.current = setInterval(() => {
      boundedRelativeScroll(3);
    }, 10);
  }, [boundedRelativeScroll]);

  const startScrollingLeft = React.useCallback(() => {
    setIsScrolling(true);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    scrollIntervalRef.current = setInterval(() => {
      boundedRelativeScroll(-3);
    }, 10);
  }, [boundedRelativeScroll]);

  const stopScrolling = React.useCallback(() => {
    setIsScrolling(false);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      <svg
        style={{
          position: "absolute",
          inset: 0,
          visibility: "hidden",
        }}
      >
        <defs>
          <filter id="paper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="8"
              result="noise"
            />
            <feDiffuseLighting
              in="noise"
              lightingColor="white"
              surfaceScale="1"
              result="diffLight"
            >
              <feDistantLight azimuth="45" elevation="35" />
            </feDiffuseLighting>
          </filter>
        </defs>
      </svg>

      <Box position="relative" ref={bookshelfRef}>
        <Box
          position="absolute"
          left={{ base: "-28px", md: "-36px" }}
          height="100%"
          display={scroll > minScroll ? "block" : "none"}
        >
          <Center
            ref={scrollLeftRef}
            borderRadius="md"
            height="100%"
            width="28px"
            _hover={{ bg: "bg.surface" }}
            borderRightRadius={{ base: 0, md: undefined }}
            as="div"
            cursor="pointer"
            onMouseEnter={startScrollingLeft}
            onMouseLeave={stopScrolling}
            onTouchStart={startScrollingLeft}
            onTouchEnd={stopScrolling}
          >
            <Icon as={FaChevronLeft} boxSize={3} />
          </Center>
        </Box>
        <HStack
          alignItems="center"
          gap={`${interBookGap}px`}
          overflowX="hidden"
          cursor="grab"
          ref={viewportRef}
        >
          {books.map((book, index) => {
            return (
              <button
                key={book.title}
                onClick={() => {
                  if (index === bookIndex) {
                    // Close the book - update router to clear the slug
                    // The useEffect will handle updating bookIndex to -1
                    router.replace('/books');
                  } else {
                    setBookIndex(index);
                    router.push(book.slug);
                  }
                }}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  outline: "none",
                  flexShrink: 0,
                  transform: `translateX(-${scroll}px)`,
                  width: bookIndex === index ? bookWidth : spineWidth,
                  perspective: "1000px",
                  WebkitPerspective: "1000px",
                  gap: "0px",
                  transition: isScrolling
                    ? `transform 100ms linear`
                    : `all 500ms ease`,
                  willChange: "auto",
                }}
              >
                <Flex
                  alignItems="flex-start"
                  justifyContent="center"
                  width={spineWidth}
                  height={bookHeight}
                  flexShrink={0}
                  transformOrigin="right"
                  backgroundColor={book.spineColor}
                  color={book.textColor}
                  transform={`translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(${bookIndex === index ? "-60deg" : "0deg"
                    }) rotateZ(0deg) skew(0deg, 0deg)`}
                  transition={"all 500ms ease"}
                  willChange="auto"
                  filter="brightness(0.8) contrast(2)"
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                >
                  <span
                    style={{
                      pointerEvents: "none",
                      position: "fixed",
                      top: 0,
                      left: 0,
                      zIndex: 50,
                      height: bookHeight,
                      width: spineWidth,
                      opacity: 0.4,
                      filter: "url(#paper)",
                    }}
                  />
                  <Heading
                    mt="12px"
                    as="h2"
                    fontSize="xs"
                    fontFamily={`"DM Sans", sans-serif`}
                    style={{ writingMode: "vertical-rl" }}
                    userSelect="none"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    maxHeight={`${height - 24}px`}
                  >
                    {book.title}
                  </Heading>
                </Flex>
                <Box
                  position="relative"
                  flexShrink={0}
                  overflow="hidden"
                  transformOrigin="left"
                  transform={`translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(${bookIndex === index ? "30deg" : "88.8deg"
                    }) rotateZ(0deg) skew(0deg, 0deg)`}
                  transition={"all 500ms ease"}
                  willChange="auto"
                  filter="brightness(0.8) contrast(2)"
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                >
                  <span
                    style={{
                      pointerEvents: "none",
                      position: "fixed",
                      top: 0,
                      right: 0,
                      zIndex: 50,
                      height: bookHeight,
                      width: coverWidth,
                      opacity: 0.4,
                      filter: "url(#paper)",
                    }}
                  />
                  <span
                    style={{
                      pointerEvents: "none",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: 50,
                      height: bookHeight,
                      width: coverWidth,
                      background: `linear-gradient(to right, rgba(255, 255, 255, 0) 2px, rgba(255, 255, 255, 0.5) 3px, rgba(255, 255, 255, 0.25) 4px, rgba(255, 255, 255, 0.25) 6px, transparent 7px, transparent 9px, rgba(255, 255, 255, 0.25) 9px, transparent 12px)`,
                    }}
                  />
                  <Image
                    src={book.coverImage}
                    alt={book.title}
                    width={coverWidth}
                    height={bookHeight}
                    style={{
                      transition: "all 500ms ease",
                      willChange: "auto",
                    }}
                    onError={(e) => {
                      // Fallback to a placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = '/books/null.jpg';
                    }}
                    crossOrigin="anonymous"
                  />
                </Box>
              </button>
            );
          })}
        </HStack>
        <Box
          position="absolute"
          right={{ base: "-28px", md: "-36px" }}
          pl="10px"
          height="100%"
          top={0}
          display={scroll < maxScroll ? "block" : "none"}
        >
          <Center
            borderLeftRadius={{ base: 0, md: undefined }}
            ref={scrollRightRef}
            height="100%"
            borderRadius="md"
            width="28px"
            _hover={{ bg: "bg.surface" }}
            as="div"
            cursor="pointer"
            onMouseEnter={startScrollingRight}
            onMouseLeave={stopScrolling}
            onTouchStart={startScrollingRight}
            onTouchEnd={stopScrolling}
          >
            <Icon as={FaChevronRight} boxSize={3} />
          </Center>
        </Box>
      </Box>
    </>
  );
}