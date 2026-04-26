/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/serial',
        destination: '/serial/index.html'
      },
      {
        source: '/serial/:path((?!assets|images|api|llms.txt|\\.well-known).*)',
        destination: '/serial/index.html'
      }
    ]
  }
}

export default nextConfig
