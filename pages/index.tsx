import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Container,
  Divider,
  Link,
  Button,
  Icon,
} from "@chakra-ui/react";
import Image from "next/image";
import { GetStaticProps } from "next";
import { getAllNewsItems, NewsItem } from "../lib/news";
import { NewsTimeline } from "../components/NewsTimeline";
import { ResearchInterests } from "../components/ResearchInterests";
import Layout from "../components/Layout";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "./_app";
import { FiMail, FiGithub, FiLinkedin, FiFileText } from "react-icons/fi";

interface HomePageProps {
  newsItems: NewsItem[];
}

const HomePage: NextPageWithLayout<HomePageProps> = ({ newsItems }) => {
  // Research interests - can be moved to a config file later
  const researchInterests = [
    "Stochastic Control",
    "SLAM and State Estimation",
    "Belief Space Planning",
    "Safe Learning and Controls",
  ];

  // About me content - can be moved to a config file or CMS later
  const aboutMe = {
    name: "Ilir Gusija",
    title: "Applied Mathematics · Control · Robotics",
    affiliation: "Queen's University",
    bio: [
      "I'm a master's student in applied mathematics at Queen's University working with Prof. Serdar Yüksel and Prof. Fady Alajaji on problems at the intersection of stochastic control theory and mobile robotics.",
      "My current research focuses on active SLAM where I formulate simultaneous localization and mapping as a stochastic optimal control problem with rigorous convergence guarantees for finite approximation schemes. More broadly, I'm interested in learning, control, and planning under uncertainty, where measure-theoretic and information-theoretic tools provide tractable approaches to decision-making in complex state spaces.",
      "Prior to grad school I worked in software development and completed undergraduate degrees in mathematics and computer engineering. Currently applying to PhD programs in robotics and related fields, looking to continue work with applications to autonomous systems.",
    ],
    email: "ilir.gusija@queensu.ca",
    github: "ilirgusija",
    linkedin: "ilir-gusija",
  };

  return (
    <>
      <NextSeo
        title="Ilir Gusija"
        description="Applied Mathematics · Control · Robotics | Master's Student at Queen's University"
      />
      <Container maxW="1000px" px={{ base: 4, md: 6 }}>
        {/* Hero Section */}
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "center", md: "flex-start" }}
          gap={8}
          py={12}
        >
          <Box flexShrink={0} position="relative">
            <Box
              borderRadius="full"
              borderWidth="3px"
              borderColor="blue.200"
              overflow="hidden"
              width={{ base: "150px", md: "200px" }}
              height={{ base: "150px", md: "200px" }}
              position="relative"
            >
              <Image
                src="/ilir3.jpg"
                alt="Ilir Gusija"
                fill
                priority
                sizes="(max-width: 768px) 150px, 200px"
                style={{
                  objectFit: "cover",
                }}
              />
            </Box>
          </Box>
          <VStack align={{ base: "center", md: "flex-start" }} spacing={4} flex={1}>
            <VStack align={{ base: "center", md: "flex-start" }} spacing={2}>
              <Heading size="2xl" textAlign={{ base: "center", md: "left" }}>
                {aboutMe.name}
              </Heading>
              <Text fontSize="xl" color="gray.600" textAlign={{ base: "center", md: "left" }}>
                {aboutMe.title}
              </Text>
              <Text fontSize="md" color="gray.500" textAlign={{ base: "center", md: "left" }}>
                {aboutMe.affiliation}
              </Text>
            </VStack>

            <HStack spacing={4} flexWrap="wrap" justify={{ base: "center", md: "flex-start" }}>
              <Button
                as={Link}
                href={`mailto:${aboutMe.email}`}
                leftIcon={<Icon as={FiMail} />}
                size="sm"
                variant="outline"
              >
                Email
              </Button>
              <Button
                as={Link}
                href={`https://github.com/${aboutMe.github}`}
                isExternal
                leftIcon={<Icon as={FiGithub} />}
                size="sm"
                variant="outline"
              >
                GitHub
              </Button>
              <Button
                as={Link}
                href={`https://linkedin.com/in/${aboutMe.linkedin}`}
                isExternal
                leftIcon={<Icon as={FiLinkedin} />}
                size="sm"
                variant="outline"
              >
                LinkedIn
              </Button>
              <Button
                as={Link}
                href="/cv"
                leftIcon={<Icon as={FiFileText} />}
                size="sm"
                variant="outline"
              >
                CV
              </Button>
            </HStack>
          </VStack>
        </Flex>

        <Divider my={8} />

        {/* About Me Section */}
        <Box mb={12}>
          <Heading size="lg" mb={6}>
            About Me
          </Heading>
          <VStack align="stretch" spacing={4}>
            {aboutMe.bio.map((paragraph, index) => (
              <Text key={index} fontSize="md" color="gray.700" lineHeight="tall">
                {paragraph}
              </Text>
            ))}
          </VStack>
        </Box>

        <Divider my={8} />

        {/* Research Interests */}
        <Box mb={12}>
          <ResearchInterests interests={researchInterests} />
        </Box>

        <Divider my={8} />

        {/* News Section */}
        <Box mb={12}>
          <Heading size="lg" mb={6}>
            News
          </Heading>
          <NewsTimeline items={newsItems} />
        </Box>

        <Divider my={8} />

        {/* Quick Links */}
        <Box mb={12}>
          <Heading size="lg" mb={6}>
            Quick Links
          </Heading>
          <HStack spacing={4} flexWrap="wrap">
            <Button as={Link} href="/research" colorScheme="blue" variant="outline">
              Research
            </Button>
            <Button as={Link} href="/books" colorScheme="blue" variant="outline">
              Bookshelf
            </Button>
            {/* <Button as={Link} href="/writing" colorScheme="blue" variant="outline">
              Writing
            </Button> */}
          </HStack>
        </Box>
      </Container>
    </>
  );
};

HomePage.getLayout = (page) => (
  <Layout>
    <Box>{page}</Box>
  </Layout>
);

export default HomePage;

export const getStaticProps: GetStaticProps = async () => {
  const newsItems = await getAllNewsItems();

  return {
    props: {
      newsItems,
    },
    revalidate: 3600, // Revalidate every hour
  };
};
