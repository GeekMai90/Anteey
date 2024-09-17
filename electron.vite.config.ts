import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
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
        '@renderer': resolve('src/renderer/src'),
        // '@renderer': path.resolve(__dirname, './src/renderer'),
        // '@renderer': resolve('src/renderer'),
        '@resources': path.resolve(__dirname, 'resources')
      }
    },
    plugins: [vue()]
  }
})
