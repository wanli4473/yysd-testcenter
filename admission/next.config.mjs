/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/admission",
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
