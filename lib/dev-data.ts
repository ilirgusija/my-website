import { Book } from './books';

// Sample development data for local testing
export const devBooks: Book[] = [
    {
        ISBN: "9780156030304",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        date: "2023-12-01",
        rating: 9,
        coverImage: "https://books.google.com/books/content?id=test1&printsec=frontcover&img=1&zoom=1&source=gbs_api",
        spineColor: "#2C5530",
        textColor: "#FFFFFF",
        slug: "/books/9780156030304",
        summary: `# The Great Gatsby

## Plot Summary
A classic American novel that explores the **American Dream** and the *decadence* of the Jazz Age.

## Key Themes
- Wealth and materialism
- Love and obsession  
- The American Dream
- Social class

## Notable Quotes
> "So we beat on, boats against the current, borne back ceaselessly into the past."

## My Thoughts
This book really resonated with me because of its exploration of:

1. **The pursuit of wealth** - How it can corrupt and destroy
2. **Unrequited love** - The tragedy of Gatsby's obsession
3. **Social commentary** - The emptiness of the upper class

### Rating: 9/10
A masterpiece of American literature that remains relevant today.

---

*Read in 2023 - Highly recommend for anyone interested in classic literature.*`
    },
    {
        ISBN: "9780743273565",
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        date: "2023-11-15",
        rating: 8,
        coverImage: "https://books.google.com/books/content?id=test2&printsec=frontcover&img=1&zoom=1&source=gbs_api",
        spineColor: "#8B4513",
        textColor: "#FFFFFF",
        slug: "/books/9780743273565",
        summary: `# To Kill a Mockingbird

## Overview
A powerful story about racial injustice and growing up in the American South.

## Key Points
- **Coming of age** story through Scout's eyes
- **Racial injustice** and the legal system
- **Moral courage** and standing up for what's right

## Impact
This book taught me about empathy and justice in a way that few others have.

*Rating: 8/10*`
    }
];
