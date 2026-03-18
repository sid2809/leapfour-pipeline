/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'jsonwebtoken', 'pg', '@prisma/adapter-pg'],
  },
};

export default nextConfig;
