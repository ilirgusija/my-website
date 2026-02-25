import {
  Box,
  Heading,
  Flex,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Text,
  HStack,
  Badge,
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

interface GardenNoteProps {
  note: GardenNoteData | null;
  backlinks: { slug: string; title: string }[];
  isFolder: boolean;
  folderNotes?: { slug: string; title: string; noteType: string }[];
  breadcrumbs: { label: string; href: string }[];
}

const GardenNote: NextPageWithLayout<GardenNoteProps> = ({
  note,
  backlinks,
  isFolder,
  folderNotes,
  breadcrumbs,
}) => {
  // Folder index page
  if (isFolder && folderNotes) {
    const folderName = breadcrumbs[breadcrumbs.length - 1]?.label || 'Garden';
    return (
      <>
        <NextSeo title={`${folderName} — Garden`} />
        <Box maxW="800px" px={{ base: 4, md: 6 }}>
          <GardenBreadcrumbs breadcrumbs={breadcrumbs} />
          <Heading size="lg" mb={6}>
            {folderName}
          </Heading>
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
          <GardenBreadcrumbs breadcrumbs={breadcrumbs} />
          <Heading size="lg" mb={4}>
            {note.title}
          </Heading>
          <GardenNoteRenderer html={note.html} />
          <BacklinksSection backlinks={backlinks} />
        </Box>
      </LinkPreviewProvider>
    </>
  );
};

function GardenBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: { label: string; href: string }[];
}) {
  return (
    <Breadcrumb mb={4} fontSize="sm" color="gray.500" separator="/">
      <BreadcrumbItem>
        <BreadcrumbLink as={Link} href="/garden">
          Garden
        </BreadcrumbLink>
      </BreadcrumbItem>
      {breadcrumbs.map((crumb, i) => (
        <BreadcrumbItem
          key={crumb.href}
          isCurrentPage={i === breadcrumbs.length - 1}
        >
          {i === breadcrumbs.length - 1 ? (
            <BreadcrumbLink as="span">{crumb.label}</BreadcrumbLink>
          ) : (
            <BreadcrumbLink as={Link} href={crumb.href}>
              {crumb.label}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

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

  // Try to load as a note first
  const note = await getGardenNote(slug);
  if (note) {
    const backlinks = await getBacklinksForNote(slug);
    return {
      props: {
        note,
        backlinks,
        isFolder: false,
        breadcrumbs,
      },
      revalidate: 3600,
    };
  }

  // Try to load as a folder index
  const manifest = await getGardenManifest();
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
        },
        revalidate: 3600,
      };
    }
  }

  return { notFound: true };
}
