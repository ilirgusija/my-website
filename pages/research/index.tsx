import { GetStaticProps } from "next";
import { Box, Heading, Container, Text } from "@chakra-ui/react";
import { getAllResearch, Research } from "../../lib/research";
import { ResearchList } from "../../components/ResearchList";
import Layout from "../../components/Layout";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "../_app";

interface ResearchPageProps {
  research: Research[];
}

const ResearchPage: NextPageWithLayout<ResearchPageProps> = ({ research }) => {
  return (
    <>
      <NextSeo
        title="Research"
        description="Research projects and publications"
      />
      <Container maxW="900px" px={{ base: 4, md: 6 }}>
        <Box mb={8}>
          <Heading size="xl" mb={2}>
            Research
          </Heading>
          <Text color="gray.600" mb={6}>
            Ongoing research projects and publications. Work marked as "in progress" is actively being developed and may change.
          </Text>
          <ResearchList research={research} />
        </Box>
      </Container>
    </>
  );
};

ResearchPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ResearchPage;

export const getStaticProps: GetStaticProps = async () => {
  const research = await getAllResearch();

  return {
    props: {
      research,
    },
    revalidate: 3600, // Revalidate every hour
  };
};
