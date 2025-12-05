import {
  Box,
  Flex,
  Heading,
  Text,
  Image,
  VStack,
  HStack,
  Container,
  Divider,
  Link,
  Button,
  Icon,
} from "@chakra-ui/react";
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
    "Control Theory",
    "Applied Mathematics",
  ];

  // About me content - can be moved to a config file or CMS later
  const aboutMe = {
    name: "Ilir Gusija",
    title: "Mathematics & Engineering Student",
    affiliation: "Queen's University",
    bio: [
      "I'm a 4th-year student at Queen's University, currently interning at Huawei Technologies. I'm passionate about Applied Mathematics and Computer Engineering, with a focus on topics like Control Theory, Distribution Theory, Probability, and Complex Analysis.",
      "My professional journey began at Citi as a Full Stack Developer, where I honed my skills in Angular, Java Springboot, and MongoDB. Now, I work in a research-driven environment at Huawei, where I've developed expertise in CI/CD technologies, LLVM, Clang, and AST analysis.",
      "I'm a lifelong learner, always eager to expand my knowledge in computing and beyond. I've created this website to showcase my work and serve as a platform for my research and projects.",
    ],
    email: "ilir.gusija@queensu.ca",
    github: "ilirgusija",
    linkedin: "ilir-gusija",
  };

    return (
    <>
      <NextSeo
        title="Ilir Gusija"
        description="Mathematics & Engineering Student | Research Portfolio"
      />
      <Container maxW="1000px" px={{ base: 4, md: 6 }}>
        {/* Hero Section */}
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "center", md: "flex-start" }}
          gap={8}
          py={12}
        >
          <Box flexShrink={0}>
            <Image
              src="/ilir.jpg"
              alt="Ilir Gusija"
              boxSize={{ base: "150px", md: "200px" }}
              objectFit="cover"
              borderRadius="full"
              borderWidth="3px"
              borderColor="blue.200"
            />
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
                href="/cv.pdf"
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
              Books
            </Button>
            <Button as={Link} href="/writing" colorScheme="blue" variant="outline">
              Writing
            </Button>
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
  const newsItems = getAllNewsItems();

  return {
    props: {
      newsItems,
    },
    revalidate: 3600, // Revalidate every hour
  };
};
