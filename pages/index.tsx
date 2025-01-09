import { Box, Flex, Heading, Text, Image } from "@chakra-ui/react";

export default function Home() {
    return (
        <Flex direction="column" align="center"  h="100vh" w="full" py="2">
            <Box as="header">
                <Heading as="h1" size="4xl" fontWeight="bold" color="gray.800" textAlign="center">
                    Hi, I'm Ilir
                </Heading>
            </Box>
            <Image src="/ilir.jpg" alt="Ilir" boxSize="192px" objectFit="contain" borderRadius="full" mt="8" />
            <Text fontSize="2xl"  mt="8">
                Welcome to my personal portfolio website. I'm a mathematics & engineering student, proud Gunner, and aspiring tinkerer. Please take a look around my website!
            </Text>
        </Flex>
    );
}
