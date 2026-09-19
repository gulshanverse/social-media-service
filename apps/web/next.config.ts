import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  transpilePackages: ['@ggv/ui', '@ggv/themes', '@ggv/types', '@ggv/config'],
};
export default nextConfig;
