/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/commercials", destination: "/ads", permanent: true }];
  },
  async rewrites() {
    // The public URL is /ads, but the route folder is app/commercials so no
    // build chunk path contains "/ads/" (ad blockers block those subresources).
    return { beforeFiles: [{ source: "/ads", destination: "/commercials" }] };
  },
};

export default nextConfig;
