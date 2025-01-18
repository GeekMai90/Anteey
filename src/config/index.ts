interface Config {
  apiBaseURL: string
}

// 开发环境配置
const devConfig: Config = {
  // apiBaseURL: 'http://localhost:3000'
  apiBaseURL: 'https://api.anteey.com'
}

// 生产环境配置
const prodConfig: Config = {
  apiBaseURL: 'https://api.anteey.com' // 生产环境的 API 地址
}

// 根据 Electron 的环境变量选择配置
export const config = process.env.NODE_ENV === 'development' ? devConfig : prodConfig
