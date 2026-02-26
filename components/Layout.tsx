import {
  Container,
  VStack,
  Text,
  Flex,
  Box,
  HStack,
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem,
  Icon,
  MenuGroup,
  useColorModeValue,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PropsWithChildren } from "react";
import { FiMenu, FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { ThemeToggleButton } from "./ThemeToggleButton";

function Navigation({
  link,
  children,
  isExternal,
}: {
  link: string;
  children: string;
  isExternal?: boolean;
}) {
  const router = useRouter();
  const pathname = router.asPath.split("?")[0];
  const activeColor = useColorModeValue("text.primary", "text.primary");
  const inactiveColor = useColorModeValue("text.muted", "text.muted");
  const isActive =
    link === "/"
      ? pathname === "/"
      : pathname === link || pathname.startsWith(link + "/");

  return (
    <Link href={link} target={isExternal ? "_blank" : "_self"}>
      <Text
        fontSize="lg"
        color={isActive ? activeColor : inactiveColor}
        _hover={{ color: "text.primary" }}
      >
        {children}
      </Text>
    </Link>
  );
}

function Layout({ children }: PropsWithChildren) {
  return (
    <Container
      position="relative"
      mt={{ base: 16, md: 20 }}
      pb={{ base: 8, md: "10em" }}
      gap={{ md: 10 }}
    >
      <Flex
        position="absolute"
        right="100%"
        mr="160px"
        display={{ base: "none", lg: "flex" }}
      >
        <VStack position="fixed" align="flex-start" spacing={10}>
          <VStack align="flex-start">
            <Text fontWeight="bold" fontSize="smaller">
              NAVIGATION
            </Text>
            <Navigation link="/">Home</Navigation>
            <Navigation link="/research">Research</Navigation>
            <Navigation link="/books">Bookshelf</Navigation>
            <Navigation link="/garden">Garden</Navigation>
          </VStack>
          <VStack align="flex-start">
            <Text fontWeight="bold" fontSize="smaller">
              FIND ME ON
            </Text>
            <Link href="https://github.com/ilirgusija" target="_blank">
              <HStack color="text.muted" _hover={{ color: "text.primary" }}>
                <Icon as={FiGithub} boxSize={4} />
                <Text>GitHub</Text>
              </HStack>
            </Link>
            <Link href="https://linkedin.com/in/ilir-gusija" target="_blank">
              <HStack color="text.muted" _hover={{ color: "text.primary" }}>
                <Icon as={FiLinkedin} boxSize={4} />
                <Text>LinkedIn</Text>
              </HStack>
            </Link>
            <Link href="mailto:ilir.gusija@queensu.ca" target="_blank">
              <HStack color="text.muted" _hover={{ color: "text.primary" }}>
                <Icon as={FiMail} boxSize={4} />
                <Text>Email</Text>
              </HStack>
            </Link>
          </VStack>
          <ThemeToggleButton />
        </VStack>
      </Flex>
      <Container width="100%" maxW="2000px" position="relative" px={{ base: 4, md: 6, lg: 0 }}>
        <Box
          width="100%"
          bg="bg.canvas"
          height={20}
          position="fixed"
          top={0}
          zIndex={100}
          display={{ base: "none", lg: "block" }}
        />
        <Flex
          justify="space-between"
          position="fixed"
          top={0}
          display={{ base: "flex", md: "none" }}
          height={12}
          zIndex={50}
          left={0}
          width="100%"
          align="center"
          borderBottom="1px solid"
          borderBottomColor="border.subtle"
          bg="bg.canvas"
          px={4}
        >
          <HStack spacing={2}>
            <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<Icon as={FiMenu} boxSize={4} />}
              variant="outline"
              size="sm"
              borderColor="border.subtle"
            />
            <MenuList>
              <MenuGroup title="NAVIGATION">
                <VStack align="flex-start" px={4} spacing={3} mb={4}>
                  <Navigation link="/">Home</Navigation>
                  <Navigation link="/research">Research</Navigation>
                  <Navigation link="/books">Bookshelf</Navigation>
                  <Navigation link="/garden">Garden</Navigation>
                </VStack>
              </MenuGroup>
              <MenuGroup title="FIND ME ON">
                <VStack align="flex-start" px={4} spacing={3} mb={2}>
                  <Navigation link="https://github.com/ilirgusija" isExternal>GitHub</Navigation>
                  <Navigation link="https://linkedin.com/in/ilir-gusija" isExternal>LinkedIn</Navigation>
                  <Navigation link="mailto:ilir.gusija@queensu.ca" isExternal>Email</Navigation>
                </VStack>
              </MenuGroup>
            </MenuList>
            </Menu>
            <ThemeToggleButton size="sm" />
          </HStack>
        </Flex>
        <Flex
          justify="center"
          position="fixed"
          top={0}
          display={{ base: "none", md: "flex", lg: "none" }}
          height={12}
          zIndex={50}
          left={0}
          width="100%"
          align="center"
          borderBottom="1px solid"
          borderBottomColor="border.subtle"
          bg="bg.canvas"
          px={4}
        >
          <HStack spacing={8}>
            <Navigation link="/">Home</Navigation>
            <Navigation link="/research">Research</Navigation>
            <Navigation link="/books">Bookshelf</Navigation>
            <Navigation link="/garden">Garden</Navigation>
            <ThemeToggleButton size="sm" />
          </HStack>
        </Flex>
        {children}
      </Container>
    </Container>
  );
}

export default Layout;
