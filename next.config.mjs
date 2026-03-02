/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds (for production you should fix the errors)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds (for production you should fix the errors)
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3'
    });
    return config;
  },
};

export default nextConfig;
