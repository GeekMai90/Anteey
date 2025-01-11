<template>
  <div class="pomodoro-widget">
    <!-- 左侧翻页时钟 -->
    <div class="clock-section">
      <FlipClock :value="pomodoroStore.formattedTime" />
    </div>

    <!-- 右侧控制区域 -->
    <div class="control-section">
      <div class="info-and-controls">
        <!-- 番茄计数 -->
        <div class="tomato-count">
          <template v-if="pomodoroStore.isInBreak"> 休息时间 </template>
          <template v-else>
            {{ pomodoroStore.isRunning ? '正在吃第' : '今日已吃' }}
            {{ pomodoroStore.isRunning ? pomodoroStore.currentCount : pomodoroStore.todayCount }}
            个番茄
          </template>
        </div>

        <!-- 按钮区域 -->
        <div class="button-section">
          <!-- 未开始状态 -->
          <template v-if="!pomodoroStore.isRunning && !pomodoroStore.isInBreak">
            <div class="button-group">
              <div class="control-btn primary" @click="pomodoroStore.start">
                <div class="icon">
                  <Play theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
              <div class="control-btn" @click="pomodoroStore.startBreak">
                <div class="icon">
                  <Resting theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
              <div class="control-btn" @click="toggleSoundMenu">
                <div class="icon">
                  <Music theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
            </div>
          </template>

          <!-- 运行状态或休息状态 -->
          <template v-else>
            <div class="button-group">
              <div class="control-btn" @click="pomodoroStore.pause">
                <div class="icon">
                  <Pause theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
              <div class="control-btn" @click="pomodoroStore.stop">
                <div class="icon">
                  <Power theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
              <div class="control-btn" @click="toggleSoundMenu">
                <div class="icon">
                  <Music theme="outline" size="20" fill="var(--color-text-secondary)" />
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 音乐选择菜单 -->
      <div v-if="showSoundMenu" ref="soundMenuRef" class="sound-menu">
        <div
          v-for="sound in soundOptions"
          :key="sound.value"
          class="sound-option"
          :class="{ active: pomodoroStore.settings.sound === sound.value }"
          @click="selectSound(sound.value)"
        >
          {{ sound.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Play, Pause, Power, Music, Resting } from '@icon-park/vue-next'
import { usePomodoroStore } from '@renderer/stores/pomodoroStore'
import type { BackgroundSound } from '@shared/types'
import { onClickOutside } from '@vueuse/core'
import FlipClock from './FlipClock.vue'

const pomodoroStore = usePomodoroStore()
const showSoundMenu = ref(false)
const soundMenuRef = ref<HTMLElement | null>(null)

const soundOptions: Array<{ label: string; value: BackgroundSound }> = [
  { label: '海浪', value: 'ocean' },
  { label: '雨声', value: 'rain' },
  { label: '篝火', value: 'fire' },
  { label: '静音', value: 'none' }
] as const

// 音乐菜单控制
const toggleSoundMenu = () => {
  showSoundMenu.value = !showSoundMenu.value
}

// 点击外部关闭音乐菜单
onClickOutside(soundMenuRef, () => {
  showSoundMenu.value = false
})

// 选择背景音乐
const selectSound = (sound: BackgroundSound) => {
  pomodoroStore.updateSettings({ sound })
  showSoundMenu.value = false
}
</script>

<style lang="scss" scoped>
.pomodoro-widget {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.05);
}

.clock-section {
  flex: none;
}

.control-section {
  flex: 1;
  min-width: 160px;
  position: relative;
}

.info-and-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tomato-count {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.button-section {
  position: relative;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 6px;
  width: 100%;
}

.control-btn {
  background: var(--color-bg-float);
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 20px;
      height: 20px;
    }
  }

  &:hover {
    background: var(--color-hover-button);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.sound-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-bg-primary);
  border-radius: 6px;
  padding: 4px;
  box-shadow: var(--shadow-primary);

  z-index: 1000;
  min-width: 120px;

  .sound-option {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
    color: var(--color-text-primary);
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-hover-button);
    }

    &.active {
      color: var(--color-primary);
      background: var(--color-primary-light);
    }
  }
}
</style>
