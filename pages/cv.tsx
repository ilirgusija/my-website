import { GetServerSideProps } from "next";
import { getCVUrl } from "../lib/cv";
import { Box, Container, Heading, Text, Button, Link, Icon, Spinner, VStack } from "@chakra-ui/react";
import { FiFileText, FiDownload } from "react-icons/fi";
import Layout from "../components/Layout";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "./_app";

interface CVPageProps {
    cvUrl: string | null;
}

const CVPage: NextPageWithLayout<CVPageProps> = ({ cvUrl }) => {
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
                            Download or view my CV below.
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
                        >
                            <iframe
                                src={`${cvUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                width="100%"
                                height="100%"
                                style={{ border: "none" }}
                                title="CV Preview"
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

