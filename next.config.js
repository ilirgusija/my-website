import createMDX from '@next/mdx'
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
    ],
  },
}
 
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-math', { throwOnError: true }]],
    rehypePlugins: [['rehype-katex', { strict: true, throwOnError: true }]],
  },
})
 
export default withMDX(nextConfig)