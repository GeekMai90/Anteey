import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

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
    plugins: [
      vue(),
      visualizer({
        filename: './stats.html', // 分析图生成的文件名
        open: true, // 自动打开分析图
        gzipSize: true, // 显示 gzip 后的大小
        brotliSize: true, // 显示 brotli 压缩后的大小
        template: 'treemap' // 使用树形图模板
      })
    ],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
