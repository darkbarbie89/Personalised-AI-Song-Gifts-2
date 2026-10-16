/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds must not overwrite the running preview's webpack modules.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;