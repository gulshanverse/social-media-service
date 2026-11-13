import { defineConfig } from 'vitest/config';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@ggv/config': path.join(workspaceRoot, 'packages/config/src/index.ts'),
      '@ggv/themes': path.join(workspaceRoot, 'packages/themes/src/index.ts'),
      '@ggv/types': path.join(workspaceRoot, 'packages/types/src/index.ts'),
      '@ggv/ui': path.join(workspaceRoot, 'packages/ui/src/index.tsx'),
    },
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['app/**/*.test.tsx'],
  },
});
