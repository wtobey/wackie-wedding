import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/wedding_v1/:path*', destination: '/:path*', permanent: true }];
  },
  images: {
    remotePatterns: [
      new URL("https://dawnranch.com/wp-content/uploads/**"),
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/**`)] : []),
    ],
  },
  // Sharp's dynamically loaded Linux libraries are required by the upload route.
  outputFileTracingIncludes: {
    '/api/wedding/admin/photos': ['./node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
  },
};

export default nextConfig;
