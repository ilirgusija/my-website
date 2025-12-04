# My Website

A personal website built with [Next.js](https://nextjs.org/), featuring a bookshelf, blog, and more.

## Quick Start

For detailed setup instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).

### Using Vercel CLI (Recommended)

```bash
# Link your project (first time only)
vercel link

# Pull environment variables
vercel env pull .env.development.local

# Start development server
vercel dev
```

### Using npm

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.development.local.example)
cp .env.development.local.example .env.development.local
# Edit .env.development.local with your values

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Features

- 📚 **Bookshelf**: Display and browse your reading list
- ✍️ **Blog**: MDX-powered blog posts
- 🎨 **Modern UI**: Built with Chakra UI and Tailwind CSS
- 📱 **Responsive**: Works on all devices
- ⚡ **Fast**: Optimized with Next.js static generation

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Chakra UI, Tailwind CSS
- **Content**: MDX
- **Storage**: Vercel Blob
- **Deployment**: Vercel

## Project Structure

```
├── components/     # React components
├── content/        # Blog posts (MDX)
├── lib/            # Utilities and data fetching
├── pages/          # Next.js pages and API routes
├── public/         # Static assets
└── scripts/        # Build-time scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run generate` - Generate content from data sources
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)

## Deploy

This project is deployed on [Vercel](https://vercel.com). Push to your main branch to trigger automatic deployments.
