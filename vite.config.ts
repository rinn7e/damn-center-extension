import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isContent = process.env.BUILD_TARGET === 'content'
  const target = process.env.TARGET || 'chrome'
  const outDir = resolve(process.cwd(), `dist/${target}`)

  const copyManifestPlugin = () => ({
    name: 'copy-manifest-plugin',
    closeBundle() {
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }

      // Copy the target-specific manifest
      copyFileSync(
        resolve(process.cwd(), `manifests/manifest.${target}.json`),
        resolve(outDir, 'manifest.json'),
      )

      // Swap development icons if building in development mode
      const sizes = [16, 32, 48, 128]
      const isDev = mode === 'development'

      sizes.forEach((size) => {
        const destIconPath = resolve(outDir, `icon${size}.png`)
        const devIconSource = resolve(
          process.cwd(),
          `public/icon${size}-dev.png`,
        )

        if (isDev && existsSync(devIconSource)) {
          copyFileSync(devIconSource, destIconPath)
        }

        // Clean up the temporary -dev icon from the destination folder
        const destDevIcon = resolve(outDir, `icon${size}-dev.png`)
        if (existsSync(destDevIcon)) {
          try {
            unlinkSync(destDevIcon)
          } catch (e) {
            // Ignore if already unlinked
          }
        }
      })
    },
  })

  if (isContent) {
    return {
      plugins: [copyManifestPlugin()],
      define: {
        'import.meta.env.VITE_BUILD_DATE': JSON.stringify(
          new Date().toISOString(),
        ),
      },
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
        rolldownOptions: {
          output: {
            minify: {
              compress: {
                treeshake: {
                  // Drops console methods if their return value isn't used
                  manualPureFunctions:
                    env.VITE_DISABLE_LOG === 'true'
                      ? [
                          'console.log',
                          'console.warn',
                          'console.error',
                          'console.info',
                          'console.debug',
                        ]
                      : [],
                },
              },
            },
          },
        },
      },
    }
  }

  // Popup build configuration
  return {
    plugins: [react(), tailwindcss(), copyManifestPlugin()],
    define: {
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(
        new Date().toISOString(),
      ),
    },
    build: {
      outDir,
      emptyOutDir: true, // Clean dist before building popup
      minify: true,
      rolldownOptions: {
        input: {
          popup: resolve(process.cwd(), 'index.html'),
        },
        output: {
          minify: {
            compress: {
              treeshake: {
                // Drops console methods if their return value isn't used
                manualPureFunctions:
                  env.VITE_DISABLE_LOG === 'true'
                    ? [
                        'console.log',
                        'console.warn',
                        'console.error',
                        'console.info',
                        'console.debug',
                      ]
                    : [],
              },
            },
          },
        },
      },
    },
  }
})
