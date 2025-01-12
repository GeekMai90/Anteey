import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import veauryVite from 'veaury/vite/index.js'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// 修改共享的 alias 配置，使其与 tsconfig.json 保持一致
const sharedAliases = {
  '@shared': path.resolve(__dirname, 'src/shared'),
  '@': path.resolve(__dirname, 'src'),
  '@renderer': path.resolve(__dirname, 'src/renderer/src'),
  '@resources': path.resolve(__dirname, 'resources'),
  '@services': path.resolve(__dirname, 'src/services')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAliases
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAliases
    }
  },
  renderer: {
    resolve: {
      alias: sharedAliases
    },
    plugins: [
      veauryVite({
        type: 'vue'
      }),
      visualizer({
        filename: './stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })
    ],
    define: {
      'process.env.IS_PREACT': JSON.stringify('true')
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
