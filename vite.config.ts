import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1:合并动态 chunk,供 scripts/inline-single.mjs 生成可离线分发的单文件版本
export default defineConfig({
  plugins: [react()],
  base: './', // 相对路径:兼容 GitHub Pages 子路径、file:// 与任意静态托管
  build: process.env.SINGLE_FILE
    ? {
        outDir: 'dist-single',
        chunkSizeWarningLimit: 1024,
        rollupOptions: { output: { inlineDynamicImports: true } },
      }
    : {},
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
