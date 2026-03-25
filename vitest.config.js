import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      'openclaw/plugin-sdk/provider-web-search': path.resolve(
        __dirname,
        './src/__mocks__/openclaw/plugin-sdk/provider-web-search.js'
      ),
    },
  },
});