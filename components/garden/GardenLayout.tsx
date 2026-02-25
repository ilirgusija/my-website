import {
    Box,
    Flex,
    VStack,
    HStack,
    Text,
    Menu,
    MenuButton,
    IconButton,
    MenuList,
    MenuGroup,
    Icon,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PropsWithChildren } from 'react';
import { FiMenu } from 'react-icons/fi';

function NavLink({
    link,
    children,
    isExternal,
}: {
    link: string;
    children: string;
    isExternal?: boolean;
}) {
    const router = useRouter();
    const pathname = router.asPath.split('?')[0];
    const isActive =
        link === '/' ? pathname === '/' : pathname === link || pathname.startsWith(link + '/');

    return (
        <Link href={link} target={isExternal ? '_blank' : '_self'}>
            <Text
                fontSize="lg"
                color={isActive ? 'black' : 'gray.500'}
                _hover={{ color: 'black' }}
            >
                {children}
            </Text>
        </Link>
    );
}

/**
 * Garden-specific layout for stacked notes.
 * Same nav as Layout but uses full viewport width for the stacking area.
 */
export function GardenLayout({ children }: PropsWithChildren) {
    return (
        <Box position="relative" minH="100vh">
            {/* Desktop sidebar nav */}
            <Flex
                position="fixed"
                left={6}
                top={6}
                display={{ base: 'none', lg: 'flex' }}
                zIndex={50}
            >
                <VStack align="flex-start" spacing={10}>
                    <VStack align="flex-start">
                        <Text fontWeight="bold" fontSize="smaller">
                            NAVIGATION
                        </Text>
                        <NavLink link="/">Home</NavLink>
                        <NavLink link="/research">Research</NavLink>
                        <NavLink link="/books">Bookshelf</NavLink>
                        <NavLink link="/garden">Garden</NavLink>
                    </VStack>
                    <VStack align="flex-start">
                        <Text fontWeight="bold" fontSize="smaller">
                            FIND ME ON
                        </Text>
                        <NavLink link="https://github.com/ilirgusija" isExternal>
                            GitHub
                        </NavLink>
                        <NavLink link="https://linkedin.com/in/ilir-gusija" isExternal>
                            LinkedIn
                        </NavLink>
                    </VStack>
                </VStack>
            </Flex>

            {/* Mobile hamburger */}
            <Flex
                justify="space-between"
                position="fixed"
                top={0}
                display={{ base: 'flex', md: 'none' }}
                height={12}
                zIndex={50}
                left={0}
                width="100%"
                align="center"
                borderBottom="1px solid"
                borderBottomColor="gray.200"
                bg="white"
                px={4}
            >
                <Menu>
                    <MenuButton
                        as={IconButton}
                        aria-label="Options"
                        icon={<Icon as={FiMenu} boxSize={4} />}
                        variant="outline"
                        size="sm"
                    />
                    <MenuList>
                        <MenuGroup title="NAVIGATION">
                            <VStack align="flex-start" px={4} spacing={3} mb={4}>
                                <NavLink link="/">Home</NavLink>
                                <NavLink link="/research">Research</NavLink>
                                <NavLink link="/books">Bookshelf</NavLink>
                                <NavLink link="/garden">Garden</NavLink>
                            </VStack>
                        </MenuGroup>
                        <MenuGroup title="FIND ME ON">
                            <VStack align="flex-start" px={4} spacing={3} mb={2}>
                                <NavLink link="https://github.com/ilirgusija" isExternal>
                                    GitHub
                                </NavLink>
                                <NavLink link="https://linkedin.com/in/ilir-gusija" isExternal>
                                    LinkedIn
                                </NavLink>
                            </VStack>
                        </MenuGroup>
                    </MenuList>
                </Menu>
            </Flex>

            {/* Tablet nav bar */}
            <Flex
                justify="center"
                position="fixed"
                top={0}
                display={{ base: 'none', md: 'flex', lg: 'none' }}
                height={12}
                zIndex={50}
                left={0}
                width="100%"
                align="center"
                borderBottom="1px solid"
                borderBottomColor="gray.200"
                bg="white"
                px={4}
            >
                <HStack spacing={8}>
                    <NavLink link="/">Home</NavLink>
                    <NavLink link="/research">Research</NavLink>
                    <NavLink link="/books">Bookshelf</NavLink>
                    <NavLink link="/garden">Garden</NavLink>
                </HStack>
            </Flex>

            {/* Content area — constrained width for readability */}
            <Box
                pt={{ base: 14, md: 16, lg: 6 }}
                pl={{ base: 0, lg: '180px' }}
                minH="100vh"
                maxW={{ lg: '1000px' }}
            >
                {children}
            </Box>
        </Box>
    );
}
