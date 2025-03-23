<template>
  <div class="timeblock-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Time theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
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
          <div class="time-range-row">
            <div class="time-item">
              <div class="time-label">开始时间</div>
              <Dropdown
                :items="timeOptions"
                trigger="click"
                width="120px"
                @select="selectStartTime"
              >
                {{ startTime }}:00
              </Dropdown>
            </div>

            <div class="time-item">
              <div class="time-label">结束时间</div>
              <Dropdown :items="timeOptions" trigger="click" width="120px" @select="selectEndTime">
                {{ endTime }}:00
              </Dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Time } from '@icon-park/vue-next'
import Switch from '@renderer/components/ui/Switch.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'

const timeBlockStore = useTimeBlockStore()

const enableTimeBlock = ref(true)
const startTime = ref(5) // 默认从早上5点开始
const endTime = ref(23) // 默认到晚上23点结束

// 生成时间选项
const timeOptions = computed(() =>
  Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`,
    key: i.toString()
  }))
)

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

const selectStartTime = async (key: string) => {
  startTime.value = parseInt(key)
  await handleTimeRangeChange()
}

const selectEndTime = async (key: string) => {
  endTime.value = parseInt(key)
  await handleTimeRangeChange()
}

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
    padding-left: 20px;
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

  .timeblock-content {
    padding: 0 20px;
  }

  .settings-section {
    margin-bottom: 32px;
    padding: 0 10px;

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
    .time-range-row {
      display: flex;
      align-items: center;
      gap: 32px;

      .time-item {
        display: flex;
        align-items: center;
        gap: 12px;

        .time-label {
          font-size: 14px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
