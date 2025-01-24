import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import polyfillNode from 'rollup-plugin-polyfill-node';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills({
    // Whether to polyfill `node:` protocol imports.
    protocolImports: true,
  })],
  build: {
    outDir: 'dist',
    rollupOptions: {
      plugins: [polyfillNode()],
    },
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
      os: 'os-browserify/browser',
      fs: 'memfs',
      buffer: 'buffer',
      util: 'util',
      http: 'http-browserify'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'util']
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    process: {
      env: {},
      browser: true,
      version: '',
      versions: {}
    },
    Buffer: ['buffer', 'Buffer']
  }
})
