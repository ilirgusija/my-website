import {
    Flex,
    Heading,
    Image,
    Stack,
    VStack,
    Text,
    Divider,
    Link,
} from "@chakra-ui/react";
import { GetStaticPropsContext } from "next";
import Layout from "../../components/Layout";
import { Prose } from "@nikolovlazar/chakra-ui-prose";
import { Book, getAllBooks, getAllSlugs, getBook, Content } from "../../lib/books";
import { Bookshelf } from "../../components/Bookshelf";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "../_app";

interface BooksProps {
    books: Book[];
    book?: Content<Book>;
}

const Books: NextPageWithLayout<BooksProps> = ({ books, book }: BooksProps) => {
    if (book) {
        return (
            <>
                <NextSeo
                    title={book.metadata.title}
                    description={`By: ${book.metadata.author} - Read: ${book.metadata.date} - Rating: ${book.metadata.rating}/10`}
                    openGraph={{
                        title: book.metadata.title,
                        description: `By: ${book.metadata.author} - Read: ${book.metadata.date} - Rating: ${book.metadata.rating}/10`,
                    }}
                />
                <Stack spacing={3}>
                    <Flex direction="row" align="flex-start" gap={200}>
                        <VStack align="flex-start" flexGrow={1}>
                            <Heading size="xl">{book.metadata.title}</Heading>
                            <Text color="gray.400" fontSize="xl">
                                By: {book.metadata.author} - Read: {book.metadata.date} -
                                Rating: {book.metadata.rating}/10
                            </Text>
                        </VStack>
                    </Flex>
                    <Prose sx={{ whiteSpace: 'pre-wrap' }}>
                        {book.source}
                    </Prose>
                </Stack>
            </>
        );
    }
    return (
        <>
            <NextSeo title="Books" />
            <Stack spacing={5}>
                {books
                    .slice()
                    .sort((a, b) => b.rating - a.rating)
                    .map((book, index) => (
                        <Stack key={book.title} scrollMarginTop={20}>
                            <Stack>
                                {index > 0 && <Divider mb={3} width="100%" />}
                                <Flex direction="row" align="flex-start" gap={6}>
                                    <Image
                                        border="1px solid"
                                        borderColor="gray.200"
                                        src={book.coverImage}
                                        alt={book.title}
                                        height={{ base: "100px", sm: "140px", md: "160px" }}
                                    />

                                    <VStack align="flex-start" flexGrow={1}>
                                        <Link href={book.slug}>
                                            <Heading size="md">{book.title}</Heading>
                                        </Link>
                                        <Text color="#999" size="md">
                                            {book.author}
                                        </Text>
                                        <Text color="#666">
                                            Read: {book.date} • Rating: {book.rating}/10
                                        </Text>
                                        <Prose sx={{ whiteSpace: 'pre-wrap' }}>
                                            {book.summary}
                                        </Prose>
                                    </VStack>
                                </Flex>
                            </Stack>
                        </Stack>
                    ))}
            </Stack>
        </>
    );
};

export default Books;

Books.getLayout = (page: JSX.Element) => (
    <Layout>
        <Flex direction="column" gap={8}>
            <Bookshelf books={page.props.books} />
            <Divider />
            {page}
        </Flex>
    </Layout>
);

export async function getStaticPaths() {
    const paths = getAllSlugs();
    return {
        paths: [{ params: { slug: undefined } }, ...await paths],
        fallback: false,
    };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
    if (params && params.slug && params.slug.length > 1) {
        return {
            redirect: {
                destination: "/books",
            },
        };
    }
    const books = await getAllBooks();
    if (!params || !params.slug || params.slug.length === 0) {
        return {
            props: {
                books,
            },
            revalidate: 60
        };
    }
    const book = await getBook(params.slug[0] as string, books);
    if (!book) {
        return {
            redirect: {
                destination: "/books",
            },
        };
    }
    return {
        props: { books, book },
        revalidate: 60
    };
}
