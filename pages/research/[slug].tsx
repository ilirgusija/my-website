import { GetStaticProps, GetStaticPaths } from "next";
import { Box, Heading, Container, VStack, HStack, Text, Badge, Link, Button, Icon, Alert, AlertIcon } from "@chakra-ui/react";
import { getResearch, getAllResearchSlugs, Research } from "../../lib/research";
import Layout from "../../components/Layout";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "../_app";
import { FiExternalLink, FiFileText, FiClock } from "react-icons/fi";

interface ResearchPageProps {
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

const ResearchPage: NextPageWithLayout<ResearchPageProps> = ({ research }) => {
  const isInProgress = research.status === "in-progress";

  return (
    <>
      <NextSeo
        title={research.title}
        description={research.abstract}
      />
      <Container maxW="900px" px={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={6} py={8}>
          {isInProgress && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              This is ongoing research work. Results and conclusions may change as the work progresses.
            </Alert>
          )}

          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" align="flex-start" flexWrap="wrap">
              <Heading size="xl" flex={1}>
                {research.title}
              </Heading>
              <Badge colorScheme={getStatusColor(research.status)} fontSize="md" px={3} py={1}>
                {getStatusLabel(research.status)}
              </Badge>
            </HStack>

            <Text fontSize="lg" color="gray.600" fontStyle="italic">
              {research.authors.join(", ")}
            </Text>

            {research.lastUpdated && (
              <HStack spacing={2} fontSize="sm" color="gray.500">
                <Icon as={FiClock} boxSize={4} />
                <Text>Last updated: {formatDate(research.lastUpdated)}</Text>
              </HStack>
            )}
          </VStack>

          <Box>
            <Heading size="md" mb={3}>
              Abstract
            </Heading>
            <Text fontSize="md" color="gray.700" lineHeight="tall">
              {research.abstract}
            </Text>
          </Box>

          <HStack spacing={4} pt={4}>
            {research.pdfUrl && (
              <Button
                as={Link}
                href={`/api/research/pdf-proxy?url=${encodeURIComponent(research.pdfUrl)}`}
                isExternal
                colorScheme="blue"
                leftIcon={<Icon as={FiFileText} />}
                size="lg"
              >
                View Full PDF
              </Button>
            )}
            {research.arxivId && (
              <Button
                as={Link}
                href={`https://arxiv.org/abs/${research.arxivId}`}
                isExternal
                variant="outline"
                leftIcon={<Icon as={FiExternalLink} />}
                size="lg"
              >
                View on arXiv
              </Button>
            )}
          </HStack>
        </VStack>
      </Container>
    </>
  );
};

ResearchPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ResearchPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllResearchSlugs();
  const paths = slugs.map((slug) => ({
    params: { slug },
  }));

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const research = await getResearch(slug);

  if (!research) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      research,
    },
    revalidate: 3600,
  };
};
