import { defineConfig } from 'vite'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // CodeMirror core packages (state + view)
          if (id.includes('@codemirror/state') || id.includes('@codemirror/view')) {
            return 'codemirror-core'
          }
          // CodeMirror language packages
          if (id.includes('@codemirror/lang-markdown') || id.includes('@codemirror/language')) {
            return 'codemirror-lang'
          }
          // CodeMirror commands
          if (id.includes('@codemirror/commands')) {
            return 'codemirror-commands'
          }
          // Markdown-it
          if (id.includes('markdown-it')) {
            return 'markdown-vendor'
          }
          // Tauri API
          if (id.includes('@tauri-apps')) {
            return 'tauri-vendor'
          }
        },
      },
    },
  },
})
