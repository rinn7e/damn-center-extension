import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  const isContent = process.env.BUILD_TARGET === 'content'
  const target = process.env.TARGET || 'chrome'
  const outDir = resolve(process.cwd(), `dist/${target}`)

  const copyManifestPlugin = () => ({
    name: 'copy-manifest-plugin',
    closeBundle() {
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }
      copyFileSync(
        resolve(process.cwd(), `manifests/manifest.${target}.json`),
        resolve(outDir, 'manifest.json'),
      )
    },
  })

  if (isContent) {
    return {
      plugins: [copyManifestPlugin()],
      build: {
        outDir,
        emptyOutDir: false, // Keep the popup files
        minify: true,
        lib: {
          entry: resolve(process.cwd(), 'src/worker/content.ts'),
          name: 'SymmetryPadContent',
          formats: ['iife'],
          fileName: () => 'content.js',
        },
      },
    }
  }

  // Popup build configuration
  return {
    plugins: [react(), tailwindcss(), copyManifestPlugin()],
    build: {
      outDir,
      emptyOutDir: true, // Clean dist before building popup
      minify: true,
      rollupOptions: {
        input: {
          popup: resolve(process.cwd(), 'index.html'),
        },
      },
    },
  }
})
