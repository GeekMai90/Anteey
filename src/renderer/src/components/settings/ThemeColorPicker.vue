<template>
  <div class="theme-color-picker">
    <!-- 关闭按钮 -->
    <!-- <button class="close-btn" @click="$emit('close')">
      <Close theme="outline" size="16" :strokeWidth="3" />
    </button> -->

    <div class="picker-arrow"></div>

    <!-- 添加模式切换按钮组 -->
    <div class="mode-switcher">
      <button
        class="mode-btn"
        :class="{ active: currentMode === 'universal' }"
        @click="switchMode('universal')"
      >
        通用
      </button>
      <button
        class="mode-btn"
        :class="{ active: currentMode === 'light' }"
        @click="switchMode('light')"
      >
        亮色
      </button>
      <button
        class="mode-btn"
        :class="{ active: currentMode === 'dark' }"
        @click="switchMode('dark')"
      >
        暗色
      </button>
    </div>

    <!-- 渐变预览区域 -->
    <div class="gradient-preview" :style="gradientStyle">
      <div v-if="noiseAmount > 0" class="noise-overlay" :style="noiseStyle"></div>
      <button class="favorite-btn" :class="{ active: isFavorite }" @click="toggleFavorite">
        <Like
          theme="outline"
          size="20"
          :fill="isFavorite ? 'var(--color-danger)' : 'white'"
          :strokeWidth="3"
        />
      </button>
      <div class="gradient-controls">
        <!-- 起始颜色选择 -->
        <div class="color-stop">
          <input v-model="startColor" type="color" @input="updateGradient" />
        </div>
        <!-- 角度控制 -->
        <div class="angle-control" @mousedown="startAngleDrag">
          <div class="angle-indicator" :style="{ transform: `rotate(${angle}deg)` }">
            <div class="angle-handle"></div>
          </div>
          <span class="angle-value">{{ angle }}°</span>
        </div>
        <!-- 结束颜色选择 -->
        <div class="color-stop">
          <input v-model="endColor" type="color" @input="updateGradient" />
        </div>
      </div>
    </div>

    <!-- 添加噪点控制 -->
    <div class="noise-control">
      <label class="noise-label">
        <span>噪点</span>
        <input v-model="noiseAmount" type="range" min="0" max="100" @input="updateGradient" />
        <span class="noise-value">{{ noiseAmount }}%</span>
      </label>
    </div>

    <!-- 颜色风格选择 -->
    <div class="style-selector">
      <button
        v-for="style in colorStyles"
        :key="style.id"
        class="style-btn"
        :class="{ active: currentStyle === style.id }"
        @click="selectStyle(style.id)"
      >
        {{ style.name }}
      </button>
      <button
        class="style-btn"
        :class="{ active: currentStyle === 'favorites' }"
        @click="selectStyle('favorites')"
      >
        收藏
      </button>
    </div>

    <!-- 预设渐变方案 -->
    <div class="gradient-presets">
      <div
        v-for="preset in currentPresets"
        :key="preset.id"
        class="preset-item"
        :style="getPresetStyle(preset)"
        @click="applyPreset(preset)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Like } from '@icon-park/vue-next'
import { useThemeStore } from '@renderer/stores/themeStore'
import type { GradientPreset, ThemeSettings } from '@shared/types'

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'update',
    gradient: { startColor: string; endColor: string; angle: number; noiseAmount: number }
  ): void
}>()

const themeStore = useThemeStore()

// 使用当前主题的渐变作为初始值
const startColor = ref(themeStore.currentGradient?.startColor || '#A8ECFF')
const endColor = ref(themeStore.currentGradient?.endColor || '#A8FFCF')
const angle = ref(themeStore.currentGradient?.angle || 45)
const noiseAmount = ref(themeStore.currentGradient?.noiseAmount || 15)

// 收藏相关逻辑
const isFavorite = computed(() => {
  if (!themeStore.favoriteGradients) return false

  const currentGradient = {
    startColor: startColor.value,
    endColor: endColor.value,
    angle: angle.value,
    noiseAmount: noiseAmount.value
  }

  // 检查是否在任意类型的收藏中
  return (
    themeStore.favoriteGradients.universalGradients.some(matchGradient) ||
    themeStore.favoriteGradients.lightGradients.some(matchGradient) ||
    themeStore.favoriteGradients.darkGradients.some(matchGradient)
  )

  function matchGradient(g: GradientPreset) {
    return (
      g.startColor === currentGradient.startColor &&
      g.endColor === currentGradient.endColor &&
      g.angle === currentGradient.angle &&
      g.noiseAmount === currentGradient.noiseAmount
    )
  }
})

// 添加类型定义
interface ColorStyle {
  id: string
  name: string
  presets: GradientPreset[]
}

// 修改 colorStyles 的定义
const colorStyles: ColorStyle[] = [
  {
    id: 'pastel',
    name: '粉彩',
    presets: [
      {
        id: 1,
        startColor: '#fad0c4',
        endColor: '#ffd1ff',
        angle: 45,
        noiseAmount: 15,
        type: 'universal' as const
      },
      {
        id: 2,
        startColor: '#a8edea',
        endColor: '#fed6e3',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 3,
        startColor: '#d4fc79',
        endColor: '#96e6a1',
        angle: 45,
        noiseAmount: 12,
        type: 'universal'
      },
      {
        id: 4,
        startColor: '#fbc2eb',
        endColor: '#a6c1ee',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 5,
        startColor: '#ffecd2',
        endColor: '#fcb69f',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      },
      {
        id: 6,
        startColor: '#a1c4fd',
        endColor: '#c2e9fb',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 7,
        startColor: '#e9defa',
        endColor: '#fbfcdb',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      },
      {
        id: 8,
        startColor: '#c1dfc4',
        endColor: '#deecdd',
        angle: 45,
        noiseAmount: 12,
        type: 'universal'
      },
      {
        id: 9,
        startColor: '#fbdae9',
        endColor: '#fff1eb',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      }
    ]
  },
  {
    id: 'vibrant',
    name: '炫酷',
    presets: [
      {
        id: 1,
        startColor: '#FA8BFF',
        endColor: '#2BD2FF',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 2,
        startColor: '#FF3CAC',
        endColor: '#784BA0',
        angle: 45,
        noiseAmount: 25,
        type: 'universal'
      },
      {
        id: 3,
        startColor: '#08AEEA',
        endColor: '#2AF598',
        angle: 45,
        noiseAmount: 22,
        type: 'universal'
      },
      {
        id: 4,
        startColor: '#FEE140',
        endColor: '#FA709A',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 5,
        startColor: '#3B41C5',
        endColor: '#A981BB',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 6,
        startColor: '#00dbde',
        endColor: '#fc00ff',
        angle: 45,
        noiseAmount: 25,
        type: 'universal'
      },
      {
        id: 7,
        startColor: '#f83600',
        endColor: '#f9d423',
        angle: 45,
        noiseAmount: 22,
        type: 'universal'
      },
      {
        id: 8,
        startColor: '#4facfe',
        endColor: '#00f2fe',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 9,
        startColor: '#6713d2',
        endColor: '#cc208e',
        angle: 45,
        noiseAmount: 25,
        type: 'universal'
      }
    ]
  },
  {
    id: 'bright',
    name: '鲜亮',
    presets: [
      {
        id: 1,
        startColor: '#89f7fe',
        endColor: '#66a6ff',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      },
      {
        id: 2,
        startColor: '#f6d365',
        endColor: '#fda085',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 3,
        startColor: '#81fbb8',
        endColor: '#28c76f',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 4,
        startColor: '#4facfe',
        endColor: '#00f2fe',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      },
      {
        id: 5,
        startColor: '#43e97b',
        endColor: '#38f9d7',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 6,
        startColor: '#fa709a',
        endColor: '#fee140',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      },
      {
        id: 7,
        startColor: '#0ba360',
        endColor: '#3cba92',
        angle: 45,
        noiseAmount: 18,
        type: 'universal'
      },
      {
        id: 8,
        startColor: '#00c6fb',
        endColor: '#005bea',
        angle: 45,
        noiseAmount: 15,
        type: 'universal'
      },
      {
        id: 9,
        startColor: '#f77062',
        endColor: '#fe5196',
        angle: 45,
        noiseAmount: 20,
        type: 'universal'
      }
    ]
  }
]

const currentStyle = ref('pastel')
const currentPresets = computed(() => {
  if (currentStyle.value === 'favorites') {
    return themeStore.favoriteGradients?.universalGradients || []
  }
  const style = colorStyles.find((s) => s.id === currentStyle.value)
  return style ? style.presets : []
})

const selectStyle = (styleId: string) => {
  currentStyle.value = styleId
}

// 生成噪点背景的 SVG
const generateNoiseSVG = () => {
  const baseFrequency = 0.65
  return `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E
    %3Cdefs%3E
      %3Cfilter id='noise' x='0%' y='0%' width='100%' height='100%'%3E
        %3CfeTurbulence 
          type='turbulence' 
          baseFrequency='${baseFrequency}' 
          numOctaves='2' 
          seed='4' 
          stitchTiles='stitch'
        /%3E
        %3CfeColorMatrix 
          type='matrix' 
          values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 1 0'
        /%3E
        %3CfeComponentTransfer%3E
          %3CfeFuncR type='discrete' tableValues='0 1'/%3E
          %3CfeFuncG type='discrete' tableValues='0 1'/%3E
          %3CfeFuncB type='discrete' tableValues='0 1'/%3E
        %3C/feComponentTransfer%3E
      %3C/filter%3E
    %3C/defs%3E
    %3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E
  %3C/svg%3E")`
}

const gradientStyle = computed(() => ({
  background: `linear-gradient(${angle.value}deg, ${startColor.value}, ${endColor.value})`
}))

const noiseStyle = computed(() => {
  if (noiseAmount.value <= 0) return {}
  return {
    backgroundImage: generateNoiseSVG(),
    opacity: noiseAmount.value / 200,
    mixBlendMode: 'multiply' as const
  }
})

const getPresetStyle = (preset: GradientPreset) => ({
  background: `linear-gradient(${preset.angle}deg, ${preset.startColor}, ${preset.endColor})`
})

const applyPreset = (preset: GradientPreset) => {
  startColor.value = preset.startColor
  endColor.value = preset.endColor
  angle.value = preset.angle
  noiseAmount.value = preset.noiseAmount
  updateGradient()
}

// 角度控制相关
let isDragging = false
const startAngleDrag = () => {
  isDragging = true
  document.addEventListener('mousemove', handleAngleDrag)
  document.addEventListener('mouseup', stopAngleDrag)
}

const handleAngleDrag = (e: MouseEvent) => {
  if (!isDragging) return

  const control = document.querySelector('.angle-control')
  if (!control) return

  const rect = control.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // 计算鼠标相对于中心点的位置
  const dx = e.clientX - centerX
  const dy = e.clientY - centerY

  // 计算角度（弧度）并转换为度数
  let newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90

  // 确保角度在 0-360 范围内
  if (newAngle < 0) newAngle += 360
  if (newAngle >= 360) newAngle -= 360

  angle.value = Math.round(newAngle)
  updateGradient()
}

const stopAngleDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', handleAngleDrag)
  document.removeEventListener('mouseup', stopAngleDrag)
}

// 添加当前模式状态
const currentMode = ref<'universal' | 'light' | 'dark'>('universal')

// 初始化时根据当前主题设置加载对应的渐变
onMounted(async () => {
  if (!themeStore.themeSettings) {
    await themeStore.initializeTheme()
  }

  // 根据当前渐变模式初始化颜色
  if (themeStore.themeSettings) {
    const settings = themeStore.themeSettings
    if (settings.gradientMode === 'universal') {
      loadGradient(settings.universalGradient)
    } else {
      // 根据当前系统主题加载对应渐变
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      loadGradient(isDark ? settings.darkGradient : settings.lightGradient)
    }
  }

  updateGradient()
})

// 切换模式
const switchMode = (mode: 'universal' | 'light' | 'dark') => {
  currentMode.value = mode

  // 切换模式时加载对应的渐变设置
  if (themeStore.themeSettings) {
    const settings = themeStore.themeSettings
    switch (mode) {
      case 'universal':
        loadGradient(settings.universalGradient)
        break
      case 'light':
        loadGradient(settings.lightGradient)
        break
      case 'dark':
        loadGradient(settings.darkGradient)
        break
    }
  }
}

// 加载渐变设置
const loadGradient = (gradient: any) => {
  if (!gradient) return
  startColor.value = gradient.startColor
  endColor.value = gradient.endColor
  angle.value = gradient.angle
  noiseAmount.value = gradient.noiseAmount
}

// 修改 updateGradient 方法
const updateGradient = async () => {
  const gradient = {
    startColor: startColor.value,
    endColor: endColor.value,
    angle: angle.value,
    noiseAmount: noiseAmount.value
  }

  emit('update', gradient)

  // 根据当前模式更新对应的设置
  if (themeStore.themeSettings) {
    let settings: Partial<ThemeSettings> = {}

    if (currentMode.value === 'universal') {
      settings = {
        gradientMode: 'universal',
        universalGradient: gradient
      }
    } else {
      settings = {
        gradientMode: 'specific',
        [currentMode.value === 'dark' ? 'darkGradient' : 'lightGradient']: gradient
      }
    }

    await themeStore.updateThemeSettings(settings)
  }
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  const picker = document.querySelector('.theme-color-picker')
  if (picker && !picker.contains(event.target as Node)) {
    emit('close')
  }
}

const toggleFavorite = async () => {
  if (!themeStore.favoriteGradients) return

  const currentGradient: GradientPreset = {
    id: 0, // id 会在服务端生成
    startColor: startColor.value,
    endColor: endColor.value,
    angle: angle.value,
    noiseAmount: noiseAmount.value,
    type: 'universal' as const
  }

  try {
    if (isFavorite.value) {
      await themeStore.removeFavoriteGradient(currentGradient, 'universal')
    } else {
      await themeStore.addFavoriteGradient(currentGradient, 'universal')
    }
  } catch (error) {
    console.error('处理收藏失败:', error)
  }
}

onMounted(async () => {
  // 初始化主题设置和收藏
  if (!themeStore.themeSettings) {
    await themeStore.initializeTheme()
  }
  document.addEventListener('mousedown', handleClickOutside)
  updateGradient()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleAngleDrag)
  document.removeEventListener('mouseup', stopAngleDrag)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.theme-color-picker {
  background: var(--color-note-card-bg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  width: 360px;
  height: 630px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.picker-arrow {
  position: absolute;
  left: -8px;
  top: 20px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid rgba(255, 255, 255, 0.8);
}

.gradient-preview {
  height: 150px;
  border-radius: 12px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;

  .noise-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .favorite-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: transparent;
      transform: scale(1.05);
    }

    &.active {
      background: transparent;

      &:hover {
        transform: scale(0.95);
      }
    }
  }
}

.gradient-controls {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 20px;
}

.color-stop {
  input[type='color'] {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    padding: 0;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: 2px solid white;
      border-radius: 50%;
    }
  }
}

.angle-control {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
  cursor: pointer;

  .angle-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 50%;
    background: transparent;
    transform-origin: bottom center;
    margin-top: -50%;

    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
    }

    .angle-handle {
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: -6px;
      left: -5px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }

  .angle-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    user-select: none;
  }
}

.style-selector {
  margin: 20px 0;
  display: flex;
  gap: 10px;

  .style-btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    &.active {
      background: var(--color-primary);
      color: white;
    }
  }
}

.gradient-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  transition: all 0.3s ease;

  .preset-item {
    height: 70px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

.noise-control {
  margin-top: 20px;
  padding: 15px;
  background: var(--color-bg-secondary);
  border-radius: 12px;

  .noise-label {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--color-text-secondary);
    font-size: 14px;
    user-select: none;

    input[type='range'] {
      flex: 1;
      height: 2px;
      background: var(--color-border);
      border-radius: 2px;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: var(--color-primary);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        border: 2px solid white;
      }

      &:hover::-webkit-slider-thumb {
        transform: scale(1.1);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      &:active::-webkit-slider-thumb {
        transform: scale(0.95);
      }
    }

    .noise-value {
      min-width: 48px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }
}

.mode-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  .mode-btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    &.active {
      background: var(--color-primary);
      color: white;
    }
  }
}
</style>
