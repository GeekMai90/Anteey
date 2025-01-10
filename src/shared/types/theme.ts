export interface GradientPreset {
  id: number
  startColor: string
  endColor: string
  angle: number
  noiseAmount: number
  type: 'universal' | 'light' | 'dark'
}

export interface GradientSettings {
  startColor: string
  endColor: string
  angle: number
  noiseAmount: number
}

export type ThemeMode = 'system' | 'light' | 'dark'

export interface ThemeSettings {
  id: string
  universalGradient?: GradientSettings
  lightGradient?: GradientSettings
  darkGradient?: GradientSettings
  gradientMode: 'universal' | 'specific'
  themeMode: ThemeMode
  enableGradient: boolean
  createdAt: Date
  updatedAt: Date
  styleMode: 'modern' | 'classic'
}

export interface FavoriteGradients {
  id: string
  universalGradients: GradientPreset[]
  lightGradients: GradientPreset[]
  darkGradients: GradientPreset[]
  createdAt: Date
  updatedAt: Date
}
