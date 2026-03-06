/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Images: use remotePatterns (domains is deprecated in Next.js 14)
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "jarvisapp.cloud" },
      { protocol: "https", hostname: "www.jarvisapp.cloud" },
    ],
  },

  // API rewrites: proxy /api/* to FastAPI backend
  // Note: In production, Nginx handles this routing — rewrites are only active in dev.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://backend:8000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
