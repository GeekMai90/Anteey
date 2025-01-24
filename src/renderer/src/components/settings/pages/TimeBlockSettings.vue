<template>
  <div class="timeblock-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Time theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
      </div>
      <div class="name">时光记</div>
    </div>
    <div class="shortcuts-settings-divider"></div>

    <div class="timeblock-content">
      <div class="settings-section">
        <div class="section-title">基础设置</div>
        <div class="setting-item">
          <div class="setting-switch">
            <div class="switch-label">启用时光记页面</div>
            <Switch :model-value="Boolean(enableTimeBlock)" @change="handleEnableChange" />
          </div>
          <div class="setting-desc">关闭后,侧边栏将不会显示时光记入口</div>
        </div>
      </div>

      <div v-if="enableTimeBlock" class="settings-section">
        <div class="section-title">时间范围</div>
        <div class="time-range-settings">
          <div class="setting-item">
            <div class="setting-label">开始时间</div>
            <div class="time-select-wrapper">
              <div class="time-select" @click="showStartTimeSelect = !showStartTimeSelect">
                <span class="selected-time">{{ startTime }}:00</span>
                <div class="select-arrow">
                  <Down theme="outline" size="16" :strokeWidth="3" />
                </div>
              </div>
              <div v-show="showStartTimeSelect" class="select-dropdown">
                <div
                  v-for="hour in 24"
                  :key="`start-${hour - 1}`"
                  class="select-option"
                  :class="{ active: startTime === hour - 1 }"
                  @click="selectStartTime(hour - 1)"
                >
                  {{ hour - 1 }}:00
                </div>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-label">结束时间</div>
            <div class="time-select-wrapper">
              <div class="time-select" @click="showEndTimeSelect = !showEndTimeSelect">
                <span class="selected-time">{{ endTime }}:00</span>
                <div class="select-arrow">
                  <Down theme="outline" size="16" :strokeWidth="3" />
                </div>
              </div>
              <div v-show="showEndTimeSelect" class="select-dropdown">
                <div
                  v-for="hour in 24"
                  :key="`end-${hour - 1}`"
                  class="select-option"
                  :class="{ active: endTime === hour - 1 }"
                  @click="selectEndTime(hour - 1)"
                >
                  {{ hour - 1 }}:00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Time, Down } from '@icon-park/vue-next'
import Switch from '@renderer/components/ui/Switch.vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'

const timeBlockStore = useTimeBlockStore()

const enableTimeBlock = ref(true)
const startTime = ref(5) // 默认从早上5点开始
const endTime = ref(23) // 默认到晚上23点结束

const showStartTimeSelect = ref(false)
const showEndTimeSelect = ref(false)

const handleEnableChange = async (value: boolean) => {
  enableTimeBlock.value = value
  await timeBlockStore.updateSettings({
    enabled: value
  })
}

const handleTimeRangeChange = async () => {
  await timeBlockStore.updateSettings({
    startTime: startTime.value,
    endTime: endTime.value
  })
}

const selectStartTime = async (hour: number) => {
  startTime.value = hour
  showStartTimeSelect.value = false
  await handleTimeRangeChange()
}

const selectEndTime = async (hour: number) => {
  endTime.value = hour
  showEndTimeSelect.value = false
  await handleTimeRangeChange()
}

// 添加点击外部关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.time-select-wrapper')) {
      showStartTimeSelect.value = false
      showEndTimeSelect.value = false
    }
  })
})

onMounted(async () => {
  const settings = await timeBlockStore.fetchSettings()
  if (settings) {
    enableTimeBlock.value = Boolean(settings.enabled)
    startTime.value = settings.startTime
    endTime.value = settings.endTime
  }
})
</script>

<style scoped lang="scss">
.timeblock-settings {
  width: 100%;
  height: 100%;

  .settings-content-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;

    .icon {
      background: none;
      border: 1px solid var(--color-border);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 4px;
      border-radius: 6px;

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

    .name {
      font-size: 20px;
      line-height: 1;
      font-weight: 500;
      user-select: none;
    }
  }

  .shortcuts-settings-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 4px 0;
    width: 100%;
    margin-bottom: 10px;
  }

  .settings-section {
    margin-bottom: 32px;

    .section-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--color-text-primary);
    }
  }

  .setting-item {
    margin-bottom: 16px;

    .setting-switch {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .switch-label {
        font-size: 14px;
        color: var(--color-text-primary);
      }
    }

    .setting-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .setting-label {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }
  }

  .time-range-settings {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .time-select-wrapper {
    position: relative;
    width: 100%;

    .time-select {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      // background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 36px;

      &:hover {
        border-color: var(--color-primary);
        background: var(--color-hover-bg);
      }

      .selected-time {
        font-weight: 400;
      }

      .select-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 100%;

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :deep(svg) {
          width: 16px;
          height: 16px;
        }
      }
    }

    .select-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 100%;
      background: var(--color-dropdown-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: var(--shadow-card);

      .select-option {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        font-size: 14px;
        color: var(--color-text-primary);

        &:hover {
          background: var(--color-hover-bg);
        }

        &.active {
          color: var(--color-primary);
          background: var(--color-primary-bg);
        }
      }

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--color-scrollbar);
        border-radius: 4px;
      }
    }
  }
}
</style>
