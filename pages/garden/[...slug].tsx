import {
  Box,
  Heading,
  VStack,
  Text,
  HStack,
} from '@chakra-ui/react';
import { GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { GardenLayout } from '../../components/garden/GardenLayout';
import { NextSeo } from 'next-seo';
import type { NextPageWithLayout } from '../_app';
import { GardenNoteRenderer } from '../../components/garden/GardenNoteRenderer';
import { BacklinksSection } from '../../components/garden/BacklinksSection';
import { LinkPreviewProvider } from '../../components/garden/LinkPreviewProvider';
import {
  getGardenNote,
  getBacklinksForNote,
  getAllGardenSlugs,
  getAllGardenFolders,
  getGardenManifest,
  GardenNoteData,
} from '../../lib/garden/index';
import { GardenIcon } from '../../components/garden/GardenIcon';

interface PageIcon {
  icon?: string;
  iconSvg?: string;
  iconEmoji?: string;
}

function toSerializablePageIcon(icon?: PageIcon | null): PageIcon | null {
  if (!icon) return null;
  const serializable: PageIcon = {};
  if (icon.icon !== undefined) serializable.icon = icon.icon;
  if (icon.iconSvg !== undefined) serializable.iconSvg = icon.iconSvg;
  if (icon.iconEmoji !== undefined) serializable.iconEmoji = icon.iconEmoji;
  return Object.keys(serializable).length > 0 ? serializable : null;
}

interface GardenNoteProps {
  note: GardenNoteData | null;
  backlinks: { slug: string; title: string }[];
  isFolder: boolean;
  folderNotes?: { slug: string; title: string; noteType: string }[];
  breadcrumbs: { label: string; href: string }[];
  pageIcon?: PageIcon | null;
}

const GardenNote: NextPageWithLayout<GardenNoteProps> = ({
  note,
  backlinks,
  isFolder,
  folderNotes,
  breadcrumbs,
  pageIcon,
}) => {
  // Folder index page
  if (isFolder && folderNotes) {
    const folderName = breadcrumbs[breadcrumbs.length - 1]?.label || 'Garden';
    return (
      <>
        <NextSeo title={`${folderName} — Garden`} />
        <Box maxW="800px" px={{ base: 4, md: 6 }}>
          <HStack spacing={3} align="center" mb={6}>
            <GardenIcon
              svg={pageIcon?.iconSvg}
              emoji={pageIcon?.iconEmoji}
              name={pageIcon?.icon}
              size={20}
            />
            <Heading size="lg">{folderName}</Heading>
          </HStack>
          <VStack align="flex-start" spacing={2}>
            {folderNotes.map(({ slug, title }) => (
              <Link key={slug} href={`/garden/${slug}`}>
                <Text
                  color="blue.500"
                  _hover={{ textDecoration: 'underline' }}
                  cursor="pointer"
                >
                  {title}
                </Text>
              </Link>
            ))}
          </VStack>
        </Box>
      </>
    );
  }

  // Note not found
  if (!note) {
    return (
      <Box px={{ base: 4, md: 6 }}>
        <Heading>Note not found</Heading>
      </Box>
    );
  }

  // Single note view with popup previews
  return (
    <>
      <NextSeo
        title={`${note.title} — Garden`}
        description={note.title}
      />
      <LinkPreviewProvider>
        <Box maxW="800px" px={{ base: 4, md: 6 }}>
          <HStack spacing={3} align="center" mb={4}>
            <GardenIcon
              svg={pageIcon?.iconSvg}
              emoji={pageIcon?.iconEmoji}
              name={pageIcon?.icon}
              size={20}
            />
            <Heading size="lg">{note.title}</Heading>
          </HStack>
          <GardenNoteRenderer html={note.html} />
          <BacklinksSection backlinks={backlinks} />
        </Box>
      </LinkPreviewProvider>
    </>
  );
};

export default GardenNote;

GardenNote.getLayout = (page: JSX.Element) => (
  <GardenLayout>{page}</GardenLayout>
);

export async function getStaticPaths() {
  const [slugs, folders] = await Promise.all([
    getAllGardenSlugs(),
    getAllGardenFolders(),
  ]);

  const paths = [
    ...slugs.map((slug) => ({
      params: { slug: slug.split('/') },
    })),
    ...folders.map((folder) => ({
      params: { slug: folder.split('/') },
    })),
  ];

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  const slugParts = params?.slug as string[] | undefined;
  if (!slugParts || slugParts.length === 0) {
    return { notFound: true };
  }

  const slug = slugParts.join('/');

  const breadcrumbs = slugParts.map((part, i) => ({
    label: part
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    href: `/garden/${slugParts.slice(0, i + 1).join('/')}`,
  }));

  const manifest = await getGardenManifest();

  // Try to load as a note first
  const note = await getGardenNote(slug);
  if (note) {
    const backlinks = await getBacklinksForNote(slug);
    const noteIconEntry = manifest?.entries.find((e) => e.slug === slug);
    return {
      props: {
        note,
        backlinks,
        isFolder: false,
        breadcrumbs,
        pageIcon: toSerializablePageIcon(
          noteIconEntry
            ? {
                icon: noteIconEntry.icon,
                iconSvg: noteIconEntry.iconSvg,
                iconEmoji: noteIconEntry.iconEmoji,
              }
            : null
        ),
      },
      revalidate: 3600,
    };
  }

  // Try to load as a folder index
  if (manifest) {
    const folderNotes = manifest.entries
      .filter(
        (e) =>
          e.folder.startsWith(slug) || e.slug.startsWith(slug + '/')
      )
      .map((e) => ({
        slug: e.slug,
        title: e.originalTitle,
        noteType: e.noteType,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (folderNotes.length > 0) {
      return {
        props: {
          note: null,
          backlinks: [],
          isFolder: true,
          folderNotes,
          breadcrumbs,
          pageIcon: toSerializablePageIcon(manifest.folderIcons?.[slug] || null),
        },
        revalidate: 3600,
      };
    }
  }

  return { notFound: true };
}
