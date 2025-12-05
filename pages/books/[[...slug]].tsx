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
import { Book, getAllBooks, getBookSlugsOnly, getBook, Content } from "../../lib/books";
import { Bookshelf } from "../../components/Bookshelf";
import { NextSeo } from "next-seo";
import type { NextPageWithLayout } from "../_app";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import { PaginatedBooksList } from "../../components/PaginatedBooksList";

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
                    <Prose>
                        <MarkdownRenderer>{book.source}</MarkdownRenderer>
                    </Prose>
                </Stack>
            </>
        );
    }
    return (
        <>
            <NextSeo title="Books" />
            <PaginatedBooksList
                books={books.slice().sort((a, b) => b.rating - a.rating)}
                booksPerPage={5}
            />
        </>
    );
};

export default Books;

Books.getLayout = (page: JSX.Element) => (
    <Layout>
        <Flex direction="column" gap={12}>
            <Bookshelf books={page.props.books} />
            <Divider />
            {page}
        </Flex>
    </Layout>
);

export async function getStaticPaths() {
    const paths = await getBookSlugsOnly();
    return {
        paths: [
            { params: { slug: undefined } },
            ...paths.map((slug: string) => ({
                params: { slug: [slug.replace('/books/', '')] }
            }))
        ],
        fallback: false, // Pre-render all pages at build time for better performance
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
        revalidate: 3600 // Revalidate every hour instead of every minute
    };
    }

    const slug = params.slug[0] as string;
    const book = await getBook(slug, books);

    if (!book) {
        return {
            notFound: true,
        };
    }

    return {
        props: { books, book },
        revalidate: 3600 // Revalidate every hour instead of every minute
    };
}
