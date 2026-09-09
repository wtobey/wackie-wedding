import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/**`)]
      : [],
  },
  // Sharp's dynamically loaded Linux libraries are required by the upload route.
  outputFileTracingIncludes: {
    '/api/wedding/admin/photos': ['./node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
  },
};

export default nextConfig;
