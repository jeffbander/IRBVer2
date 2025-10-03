/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/IRB2/**', '**/node_modules/**', '**/.next/**']
    }
    return config
  },
  // Exclude IRB2 folder from compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => `page.${ext}`).concat(['tsx', 'ts', 'jsx', 'js'])
}

module.exports = nextConfig