import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Collapse,
} from '@chakra-ui/react';
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { NextSeo } from 'next-seo';
import type { NextPageWithLayout } from '../_app';
import { getGardenManifest, getGardenGraph, GardenManifest } from '../../lib/garden/index';
import type { Graph } from '../../lib/garden/build-graph';
import { ManifestEntry } from '../../lib/garden/slugify';
import { GardenIcon } from '../../components/garden/GardenIcon';

interface GardenIndexProps {
  manifest: GardenManifest | null;
  totalLinks: number;
}

interface TreeNode {
  name: string;
  path: string;
  icon?: string;
  iconSvg?: string;
  iconEmoji?: string;
  children: Map<string, TreeNode>;
  notes: ManifestEntry[];
}

function buildTree(entries: ManifestEntry[]): TreeNode {
  const root: TreeNode = { name: 'Garden', path: '', children: new Map(), notes: [] };

  for (const entry of entries) {
    const parts = entry.folder.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        const childPath = parts.slice(0, i + 1).join('/');
        current.children.set(part, {
          name: part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          path: childPath,
          children: new Map(),
          notes: [],
        });
      }
      current = current.children.get(part)!;
    }

    current.notes.push(entry);
  }

  return root;
}

function TreeView({
  node,
  depth = 0,
  filter,
  expandedPaths,
  togglePath,
}: {
  node: TreeNode;
  depth?: number;
  filter: string;
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
}) {
  const filteredNotes = filter
    ? node.notes.filter(n => n.originalTitle.toLowerCase().includes(filter.toLowerCase()))
    : node.notes;

  const hasFilteredContent = filteredNotes.length > 0 ||
    [...node.children.values()].some(child => hasContent(child, filter));

  if (filter && !hasFilteredContent) return null;

  const isExpanded = filter !== '' || expandedPaths.has(node.path);

  return (
    <Box ml={depth > 0 ? 4 : 0}>
      {depth > 0 && (
        <HStack
          spacing={2}
          mt={depth === 1 ? 4 : 2}
          mb={1}
          cursor="pointer"
          onClick={() => togglePath(node.path)}
          _hover={{}}
          role="button"
        >
          <Text fontSize="xs" color="text.muted" w="12px" textAlign="center">
            {isExpanded ? '▾' : '▸'}
          </Text>
          <GardenIcon svg={node.iconSvg} emoji={node.iconEmoji} name={node.icon} size={14} />
          <Text
            fontWeight="600"
            fontSize="sm"
            color="text.muted"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {node.name}
          </Text>
          <Text fontSize="xs" color="text.muted">
            {countNotes(node)}
          </Text>
        </HStack>
      )}
      <Collapse in={depth === 0 || isExpanded} animateOpacity>
        {[...node.children.values()].map(child => (
          <TreeView
            key={child.path}
            node={child}
            depth={depth + 1}
            filter={filter}
            expandedPaths={expandedPaths}
            togglePath={togglePath}
          />
        ))}
        {filteredNotes.map(entry => (
          <Link key={entry.slug} href={`/garden/${entry.slug}`}>
            <HStack spacing={2} py={0.5} pl={depth > 0 ? 5 : 1}>
              <GardenIcon svg={entry.iconSvg} emoji={entry.iconEmoji} name={entry.icon} size={12} />
              <Text
                fontSize="sm"
                color="accent.link"
                _hover={{ textDecoration: 'underline', color: 'accent.linkHover' }}
                cursor="pointer"
              >
                {entry.originalTitle}
              </Text>
            </HStack>
          </Link>
        ))}
      </Collapse>
    </Box>
  );
}

function hasContent(node: TreeNode, filter: string): boolean {
  if (node.notes.some(n => n.originalTitle.toLowerCase().includes(filter.toLowerCase()))) return true;
  return [...node.children.values()].some(child => hasContent(child, filter));
}

function countNotes(node: TreeNode): number {
  let count = node.notes.length;
  for (const child of node.children.values()) {
    count += countNotes(child);
  }
  return count;
}

const GardenIndex: NextPageWithLayout<GardenIndexProps> = ({ manifest, totalLinks }) => {
  const [filter, setFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const togglePath = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const tree = useMemo(
    () => {
      if (!manifest) return null;
      const tree = buildTree(manifest.entries);
      const folderIcons = manifest.folderIcons || {};

      const applyFolderIcons = (node: TreeNode) => {
        if (node.path && folderIcons[node.path]) {
          const folderIcon = folderIcons[node.path];
          node.icon = folderIcon.icon;
          node.iconSvg = folderIcon.iconSvg;
          node.iconEmoji = folderIcon.iconEmoji;
        }
        for (const child of node.children.values()) {
          applyFolderIcons(child);
        }
      };

      applyFolderIcons(tree);
      return tree;
    },
    [manifest]
  );

  if (!manifest || !tree) {
    return (
      <Box>
        <Heading>Garden</Heading>
        <Text color="text.muted" mt={4}>
          No notes synced yet. Run the sync script to populate the garden.
        </Text>
      </Box>
    );
  }

  return (
    <>
      <NextSeo title="Garden" description="A digital garden of interconnected notes" />
      <Box maxW="800px">
        <VStack align="flex-start" spacing={2} mb={6}>
          <Heading size="lg">Garden</Heading>
          <Text color="text.muted" fontSize="sm" lineHeight={1.6} maxW="600px">
            A collection of interconnected notes that grow and evolve over time.
            Unlike a blog, these notes are continuously refined rather than published as finished pieces.
            Click any link to explore, and hover to preview.
          </Text>
          <Text color="text.muted" fontSize="xs">
            {manifest.totalNotes} notes &middot; {totalLinks} links
          </Text>
        </VStack>

        <InputGroup mb={6} maxW="400px">
          <InputLeftElement pointerEvents="none" color="text.muted">
            &#x1F50D;
          </InputLeftElement>
          <Input
            placeholder="Filter notes..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            size="md"
            variant="outline"
          />
        </InputGroup>

        <TreeView
          node={tree}
          filter={filter}
          expandedPaths={expandedPaths}
          togglePath={togglePath}
        />
      </Box>
    </>
  );
};

export default GardenIndex;

GardenIndex.getLayout = (page: JSX.Element) => (
  <Layout>{page}</Layout>
);

export async function getStaticProps() {
  const [manifest, graph] = await Promise.all([
    getGardenManifest(),
    getGardenGraph(),
  ]);

  return {
    props: {
      manifest,
      totalLinks: graph?.totalLinks || 0,
    },
    revalidate: 3600,
  };
}
