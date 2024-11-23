import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, 'src/renderer/src'),
        '@resources': path.resolve(__dirname, 'resources')
      }
    },
    plugins: [vue(), react()],
    optimizeDeps: {
      include: ['@tldraw/tldraw']
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html')
        }
      },
      assetsInlineLimit: 0
    },
    server: {
      fs: {
        strict: false
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy':
          "default-src * 'unsafe-inline' 'unsafe-eval'; font-src 'self' data: https://cdn.tldraw.com"
      }
    }
  }
})
