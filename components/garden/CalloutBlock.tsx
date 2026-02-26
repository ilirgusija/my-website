import React, { useState } from 'react';
import { Box, Heading, Collapse, Flex, Text } from '@chakra-ui/react';

interface CalloutBlockProps {
  type: string;
  title?: string;
  children: React.ReactNode;
}

const CALLOUT_STYLES: Record<string, { borderColor: string; bg: string; titleColor: string; icon: string }> = {
  definition: { borderColor: 'blue.400', bg: 'blue.50', titleColor: 'blue.700', icon: '📘' },
  theorem: { borderColor: 'green.400', bg: 'green.50', titleColor: 'green.700', icon: '📗' },
  proof: { borderColor: 'purple.400', bg: 'purple.50', titleColor: 'purple.700', icon: '📐' },
  example: { borderColor: 'yellow.400', bg: 'yellow.50', titleColor: 'yellow.700', icon: '💡' },
  note: { borderColor: 'gray.400', bg: 'gray.50', titleColor: 'gray.700', icon: '📝' },
  warning: { borderColor: 'orange.400', bg: 'orange.50', titleColor: 'orange.700', icon: '⚠️' },
  tip: { borderColor: 'teal.400', bg: 'teal.50', titleColor: 'teal.700', icon: '💡' },
  important: { borderColor: 'red.400', bg: 'red.50', titleColor: 'red.700', icon: '❗' },
};

export function CalloutBlock({ type, title, children }: CalloutBlockProps) {
  const [isOpen, setIsOpen] = useState(type !== 'proof');
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.note;
  const isCollapsible = type === 'proof';

  return (
    <Box
      borderLeft="4px solid"
      borderColor={style.borderColor}
      bg={style.bg}
      borderRadius="md"
      my={4}
      overflow="hidden"
    >
      {title && (
        <Flex
          px={4}
          py={2}
          align="center"
          cursor={isCollapsible ? 'pointer' : 'default'}
          onClick={isCollapsible ? () => setIsOpen(!isOpen) : undefined}
          _hover={isCollapsible ? { bg: `${style.borderColor}` + '20' } : undefined}
        >
          <Text fontSize="sm" mr={2}>{style.icon}</Text>
          <Heading as="h4" size="sm" color={style.titleColor} flex={1}>
            {title}
          </Heading>
          {isCollapsible && (
            <Text fontSize="xs" color="gray.500">
              {isOpen ? '▼' : '▶'}
            </Text>
          )}
        </Flex>
      )}
      {isCollapsible ? (
        <Collapse in={isOpen}>
          <Box px={4} pb={3} pt={title ? 0 : 3}>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box px={4} pb={3} pt={title ? 0 : 3}>
          {children}
        </Box>
      )}
    </Box>
  );
}
