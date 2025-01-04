import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
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
