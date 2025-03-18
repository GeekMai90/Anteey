<template>
  <div class="three-sync-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">三方同步</div>
    </div>
    <div class="flashcard-settings-divider"></div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div v-else class="three-sync-content">
      <!-- 收件箱功能开关 -->
      <div class="settings-item">
        <div class="title">收件箱功能</div>
        <div class="description">
          开启后可以通过 Dinox 同步笔记到收件箱中进行处理。关闭后侧边栏将不再显示收件箱功能。
        </div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">启用状态</div>
            <div class="value">
              <div class="auto-sync-setting">
                <Switch
                  :model-value="dinoxStore.isInboxEnabled"
                  @update:model-value="dinoxStore.isInboxEnabled = $event"
                />
                <div class="switch-description">
                  {{ dinoxStore.isInboxEnabled ? '收件箱功能已启用' : '收件箱功能已禁用' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="dinoxStore.isInboxEnabled">
        <!-- Dinox 服务配置 -->
        <div class="settings-item">
          <div class="title">Dinox 服务</div>
          <div class="description">配置 Dinox API Token，用于同步 Dinox 的笔记到收件箱。</div>
          <div class="settings-form">
            <div class="form-item">
              <div class="label">API Token</div>
              <div class="value">
                <input
                  v-model="token"
                  type="password"
                  placeholder="请输入 Dinox API Token"
                  autocomplete="off"
                />
              </div>
            </div>
            <div class="three-sync-actions">
              <div
                class="three-sync-item-button test"
                :class="{ 'is-loading': isConnecting }"
                @click="handleTestConnection"
              >
                {{ isConnecting ? '测试中...' : '测试连接' }}
              </div>
              <div
                class="three-sync-item-button"
                :class="{ 'is-loading': isSaving }"
                @click="handleSaveConfig"
              >
                {{ isSaving ? '保存中...' : '保存配置' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 同步设置 -->
        <div class="settings-item">
          <div class="title">同步设置</div>
          <div class="description">配置自动同步和同步方式，确保数据的安全性和一致性。</div>
          <div class="settings-form">
            <div class="form-item">
              <div class="label">自动同步</div>
              <div class="value">
                <div class="auto-sync-setting">
                  <Switch
                    :model-value="Boolean(autoSync)"
                    @update:model-value="autoSync = $event"
                  />
                  <div class="switch-description">
                    {{ autoSync ? '定时自动同步' : '仅支持手动同步' }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="autoSync" class="form-item">
              <div class="label">同步间隔</div>
              <div class="value">
                <div class="select-wrapper sync-interval-select">
                  <div class="select-trigger" @click="showIntervalSelect = !showIntervalSelect">
                    <span class="selected-text">{{ getSyncIntervalText(syncInterval) }}</span>
                    <div class="select-arrow">
                      <Down v-if="!showIntervalSelect" theme="outline" size="14" :strokeWidth="3" />
                      <Up v-else theme="outline" size="14" :strokeWidth="3" />
                    </div>
                  </div>
                  <div v-show="showIntervalSelect" class="select-options">
                    <div
                      v-for="interval in syncIntervals"
                      :key="interval.value"
                      class="select-option"
                      :class="{ 'is-active': syncInterval === interval.value }"
                      @click="selectInterval(interval.value)"
                    >
                      {{ interval.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="three-sync-actions">
              <div
                class="three-sync-item-button"
                :class="{ 'is-loading': isSyncing && syncType === 'incremental' }"
                @click="handleIncrementalSync"
              >
                {{ isSyncing && syncType === 'incremental' ? '同步中...' : '增量同步' }}
              </div>
              <div
                class="three-sync-item-button full"
                :class="{ 'is-loading': isSyncing && syncType === 'full' }"
                @click="handleFullSync"
              >
                {{ isSyncing && syncType === 'full' ? '同步中...' : '全量同步' }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Down, Up, CloudStorage } from '@icon-park/vue-next'
import { useDinoxStore } from '@renderer/stores/dinoxStore'
import { message } from '@renderer/utils/message'
import Switch from '@renderer/components/ui/Switch.vue'

const dinoxStore = useDinoxStore()
const isConnecting = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)
const syncType = ref<'incremental' | 'full'>('incremental')
const showIntervalSelect = ref(false)
const isLoading = ref(true)

// 表单数据
const token = ref('')
const autoSync = ref(false)
const syncInterval = ref(15)

// 同步间隔选项
const syncIntervals = [
  { value: 0.5, label: '30秒' },
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' }
]

// 获取同步间隔文本
const getSyncIntervalText = (interval: number) => {
  return syncIntervals.find((i) => i.value === interval)?.label || '未知'
}

// 选择同步间隔
const selectInterval = async (value: number) => {
  syncInterval.value = value
  showIntervalSelect.value = false
}

// 测试连接
const handleTestConnection = async () => {
  if (!token.value) {
    message.error('请输入 API Token')
    return
  }

  isConnecting.value = true
  try {
    // 直接使用 token 测试连接
    await dinoxStore.updateSyncConfig({
      token: token.value,
      autoSync: autoSync.value,
      autoSyncInterval: syncInterval.value
    })
    message.success('连接成功')
  } catch (error) {
    console.error('连接测试失败:', error)
    message.error('连接失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isConnecting.value = false
  }
}

// 保存配置
const handleSaveConfig = async () => {
  if (!token.value) {
    message.error('请输入 API Token')
    return
  }

  isSaving.value = true
  try {
    await dinoxStore.updateSyncConfig({
      token: token.value,
      autoSync: autoSync.value,
      autoSyncInterval: syncInterval.value
    })
    message.success('配置已保存')
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error('保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isSaving.value = false
  }
}

// 执行增量同步
const handleIncrementalSync = async () => {
  if (isSyncing.value) return

  syncType.value = 'incremental'
  isSyncing.value = true
  try {
    const { message: syncMessage } = await dinoxStore.syncNotes()
    message.success(syncMessage || '增量同步完成')
  } catch (error) {
    console.error('增量同步失败:', error)
    message.error('增量同步失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isSyncing.value = false
  }
}

// 执行全量同步
const handleFullSync = async () => {
  if (isSyncing.value) return

  syncType.value = 'full'
  isSyncing.value = true
  try {
    const { message: syncMessage } = await dinoxStore.fullSyncNotes()
    message.success(syncMessage || '全量同步完成')
  } catch (error) {
    console.error('全量同步失败:', error)
    message.error('全量同步失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isSyncing.value = false
  }
}

// 组件挂载时初始化数据
onMounted(async () => {
  try {
    isLoading.value = true
    // 先获取配置
    const config = await dinoxStore.fetchSyncConfig()
    if (config) {
      token.value = config.token || ''
      autoSync.value = config.autoSync || false
      syncInterval.value = config.autoSyncInterval || 15
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    message.error('加载配置失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isLoading.value = false
  }

  // 添加点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.select-wrapper')) {
      showIntervalSelect.value = false
    }
  })
})
</script>

<style scoped lang="scss">
.three-sync-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

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

    svg {
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

.flashcard-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.three-sync-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 58px;
  overflow-y: auto;

  .settings-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 24px;

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 10px;
    }

    .description {
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }

    .settings-form {
      width: 100%;
      margin-top: 15px;

      .form-item {
        display: flex;
        align-items: center;
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          width: 80px;
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .value {
          flex: 1;
          display: flex;
          align-items: center;
          max-width: 300px;

          input {
            width: 100%;
            height: 35px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            padding: 0 12px;
            font-size: 14px;
            color: var(--color-text-primary);
            outline: none;
            transition: all 0.2s ease;

            &:focus {
              border-color: var(--color-primary);
            }

            &::placeholder {
              color: var(--color-text-placeholder);
            }
          }

          .switch-description {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-left: 12px;
          }
        }
      }
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.three-sync-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;

  .three-sync-item-button {
    min-width: 80px;
    height: 32px;
    padding: 0 16px;
    background-color: var(--color-primary);
    color: var(--color-text-white);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.9;
    }

    &.test {
      background-color: var(--color-primary);
    }

    &.full {
      background-color: var(--color-warning);
    }

    &.is-loading {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}

.auto-sync-setting {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-wrapper {
  position: relative;
  width: 100%;

  &.sync-interval-select {
    max-width: 120px;

    .select-options {
      min-width: 120px;
    }
  }

  .select-trigger {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
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

    .selected-text {
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

  .select-options {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: var(--color-bg-primary);
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

      &.is-active {
        color: var(--color-primary);
        background: var(--color-primary-bg);

        &:hover {
          background: var(--color-hover-bg);
        }
      }
    }
  }
}
</style>
