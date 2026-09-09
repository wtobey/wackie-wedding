import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sharp's dynamically loaded Linux libraries are required by the upload route.
  outputFileTracingIncludes: {
    '/api/wedding/admin/photos': ['./node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
  },
};

export default nextConfig;
