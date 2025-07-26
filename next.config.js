import createMDX from '@next/mdx'
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
}
 
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-math', { throwOnError: true }]],
    rehypePlugins: [['rehype-katex', { strict: true, throwOnError: true }]],
  },
})
 
export default withMDX(nextConfig)