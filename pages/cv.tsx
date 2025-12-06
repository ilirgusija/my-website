import { GetServerSideProps } from "next";
import { getCVUrl } from "../lib/cv";
import { Box, Container, Heading, Text, Button, Link, Icon, VStack, Flex } from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";
import Layout from "../components/Layout";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "./_app";
import { useState } from "react";

interface CVPageProps {
    cvUrl: string | null;
}

const CVPage: NextPageWithLayout<CVPageProps> = ({ cvUrl }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    if (!cvUrl) {
        return (
            <>
                <NextSeo title="CV" description="Curriculum Vitae" />
                <Container maxW="900px" px={{ base: 4, md: 6 }}>
                    <Box mb={8} textAlign="center">
                        <Heading size="xl" mb={4}>
                            CV
                        </Heading>
                        <Text color="gray.600">
                            CV is not available at the moment. Please check back later.
                        </Text>
                    </Box>
                </Container>
            </>
        );
    }

    const proxyUrl = `/api/research/pdf-proxy?url=${encodeURIComponent(cvUrl)}`;

    return (
        <>
            <NextSeo
                title="CV"
                description="Curriculum Vitae - Ilir Gusija"
            />
            <Container maxW="1200px" px={{ base: 4, md: 6 }}>
                <Box mb={8}>
                    <VStack spacing={4} align="stretch">
                        <Heading size="xl" mb={2}>
                            Curriculum Vitae
                        </Heading>
                        <Text color="gray.600" mb={4}>
                            View my CV below or download it.
                        </Text>
                        <Box>
                            <Button
                                as={Link}
                                href={cvUrl}
                                isExternal
                                leftIcon={<Icon as={FiDownload} />}
                                colorScheme="blue"
                                size="lg"
                                mb={4}
                            >
                                Download CV (PDF)
                            </Button>
                        </Box>
                        <Box
                            borderWidth="1px"
                            borderColor="gray.200"
                            borderRadius="md"
                            overflow="hidden"
                            height="800px"
                            bg="gray.50"
                            position="relative"
                        >
                            {isLoading && (
                                <Flex
                                    position="absolute"
                                    inset={0}
                                    align="center"
                                    justify="center"
                                    bg="gray.50"
                                    zIndex={1}
                                >
                                    <Text color="gray.500">Loading CV...</Text>
                                </Flex>
                            )}
                            {hasError && (
                                <Flex
                                    position="absolute"
                                    inset={0}
                                    align="center"
                                    justify="center"
                                    bg="gray.50"
                                    zIndex={1}
                                    direction="column"
                                    gap={4}
                                >
                                    <Text color="gray.600">Failed to load CV preview</Text>
                                    <Button
                                        as={Link}
                                        href={cvUrl}
                                        isExternal
                                        leftIcon={<Icon as={FiDownload} />}
                                        colorScheme="blue"
                                    >
                                        Download CV instead
                                    </Button>
                                </Flex>
                            )}
                            <iframe
                                src={`${proxyUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                                width="100%"
                                height="100%"
                                style={{ border: "none", display: hasError ? "none" : "block" }}
                                title="CV Preview"
                                onLoad={() => setIsLoading(false)}
                                onError={() => {
                                    setIsLoading(false);
                                    setHasError(true);
                                }}
                            />
                        </Box>
                    </VStack>
                </Box>
            </Container>
        </>
    );
};

CVPage.getLayout = (page) => <Layout>{page}</Layout>;

export default CVPage;

export const getServerSideProps: GetServerSideProps = async () => {
    const cvUrl = await getCVUrl();

    return {
        props: {
            cvUrl,
        },
    };
};

