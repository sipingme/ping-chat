import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(rootDir, 'electron/main/index.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(rootDir, 'electron/preload/index.ts')
      }
    }
  },
  renderer: {
    root: resolve(rootDir, 'src/renderer'),
    plugins: [react()]
  }
})
