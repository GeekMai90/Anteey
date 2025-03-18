<template>
  <div class="webdav-settings">
    <div class="webdav-content">
      <!-- WebDAV 服务配置 -->
      <div class="webdav-item">
        <div class="title">WebDAV 服务</div>
        <div class="description">配置 WebDAV 服务器信息，目前支持坚果云 WebDAV 服务。</div>
        <div class="webdav-settings-form">
          <div class="form-item">
            <div class="label">服务类型</div>
            <div class="value">
              <div class="select-wrapper">
                <div class="select" @click="showServerTypeSelect = !showServerTypeSelect">
                  <span class="selected-value">{{ getServerTypeName(serverType) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showServerTypeSelect" class="select-dropdown">
                  <div
                    v-for="type in serverTypes"
                    :key="type.value"
                    class="select-option"
                    :class="{ active: serverType === type.value }"
                    @click="selectServerType(type.value)"
                  >
                    {{ type.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">服务地址</div>
            <div class="value">
              <input v-model="url" type="text" placeholder="请输入 WebDAV 服务器地址" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">用户名</div>
            <div class="value">
              <input v-model="username" type="text" placeholder="请输入用户名" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">应用密码</div>
            <div class="value">
              <input v-model="password" type="password" placeholder="请输入应用密码" />
            </div>
          </div>
          <div class="webdav-actions">
            <div
              class="webdav-item-button test"
              :class="{ 'is-loading': isTesting }"
              @click="handleTestConnection"
            >
              {{ isTesting ? '测试中...' : '测试连接' }}
            </div>
            <div
              class="webdav-item-button"
              :class="{ 'is-loading': isSaving }"
              @click="handleSaveConfig"
            >
              {{ isSaving ? '保存中...' : '保存配置' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 同步设置 -->
      <div class="webdav-item">
        <div class="title">同步设置</div>
        <div class="description">配置自动同步和同步方式，确保数据的安全性和一致性。</div>
        <div class="webdav-settings-form">
          <div class="form-item">
            <div class="label">自动同步</div>
            <div class="value">
              <div class="auto-sync-setting">
                <Switch :model-value="Boolean(autoSync)" @update:model-value="autoSync = $event" />
                <div class="auto-sync-description">
                  {{ autoSync ? '定时自动同步' : '仅支持手动同步' }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="autoSync" class="form-item">
            <div class="label">同步间隔</div>
            <div class="value">
              <div class="select-wrapper sync-interval-select">
                <div class="select" @click="showIntervalSelect = !showIntervalSelect">
                  <span class="selected-value">{{ getSyncIntervalText(syncInterval) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showIntervalSelect" class="select-dropdown">
                  <div
                    v-for="interval in syncIntervals"
                    :key="interval.value"
                    class="select-option"
                    :class="{ active: syncInterval === interval.value }"
                    @click="selectInterval(interval.value)"
                  >
                    {{ interval.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="webdav-actions">
            <div
              class="webdav-item-button"
              :class="{ 'is-loading': isSyncing }"
              @click="handleSync"
            >
              {{ isSyncing ? '同步中...' : '立即同步' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 同步历史 -->
      <div class="webdav-item">
        <div class="title">同步历史</div>
        <div class="sync-history">
          <div v-if="webdavStore.syncHistory.length === 0" class="history-empty">
            <div class="empty-text">暂无同步历史</div>
          </div>
          <div v-for="item in webdavStore.syncHistory" :key="item.id" class="history-item">
            <div class="history-item-left">
              <div class="history-item-icon">
                <CloudStorage
                  theme="outline"
                  size="16"
                  :strokeWidth="3"
                  fill="var(--color-text-secondary)"
                />
              </div>
              <div class="history-item-info">
                <div class="history-item-name">
                  {{ item.type === 'auto' ? '自动同步' : '手动同步' }}
                </div>
                <div class="history-item-meta">
                  <span class="time">{{
                    new Date(item.timestamp).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai'
                    })
                  }}</span>
                  <span class="dot">·</span>
                  <span class="status" :class="item.status">
                    {{ item.status === 'success' ? '成功' : '失败' }}
                  </span>
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
import { CloudStorage, Down } from '@icon-park/vue-next'
import { useWebDAVStore } from '@renderer/stores/webdavStore'
import { ref, onMounted, computed, watch } from 'vue'
import type { WebDAVServerType } from '@shared/types'
import { message } from '../../../utils/message'
import Switch from '@renderer/components/ui/Switch.vue'

const webdavStore = useWebDAVStore()
const isTesting = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)

// 表单数据
const serverType = ref<WebDAVServerType>('jianguoyun')
const url = ref('')
const username = ref('')
const password = ref('')
const autoSync = computed({
  get: () => webdavStore.config?.autoSync ?? false,
  set: async (value) => {
    await webdavStore.updateConfig({ autoSync: value })
  }
})
const syncInterval = computed({
  get: () => webdavStore.config?.syncInterval ?? 15,
  set: async (value) => {
    await webdavStore.updateConfig({ syncInterval: value })
  }
})

// 添加状态
const showServerTypeSelect = ref(false)
const showIntervalSelect = ref(false)

// 添加类型定义
interface ServerTypeOption {
  value: WebDAVServerType
  label: string
}

// 修改选项数据的定义
const serverTypes: ServerTypeOption[] = [
  { value: 'jianguoyun' as const, label: '坚果云' }
  // { value: 'aliyundrive' as const, label: '阿里云盘' },
  // { value: 'custom' as const, label: '自定义' }
]

// 添加同步间隔选项的类型
interface SyncIntervalOption {
  value: number
  label: string
}

// 修改同步间隔选项的定义
const syncIntervals: SyncIntervalOption[] = [
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' }
]

// 添加方法
const getServerTypeName = (type: WebDAVServerType): string => {
  return serverTypes.find((t) => t.value === type)?.label || '未知'
}

const getSyncIntervalText = (interval: number) => {
  return syncIntervals.find((i) => i.value === interval)?.label || '未知'
}

const selectServerType = (type: WebDAVServerType): void => {
  serverType.value = type
  showServerTypeSelect.value = false
}

const selectInterval = async (value: number) => {
  syncInterval.value = value
  showIntervalSelect.value = false
}

onMounted(async () => {
  await webdavStore.loadConfig()
  await webdavStore.loadSyncHistory()
  if (webdavStore.config) {
    serverType.value = webdavStore.config.serverType
    url.value = webdavStore.config.url
    username.value = webdavStore.config.username
    password.value = webdavStore.config.password
  }

  // 添加点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.select-wrapper')) {
      showServerTypeSelect.value = false
      showIntervalSelect.value = false
    }
  })
})

async function handleTestConnection() {
  isTesting.value = true
  try {
    if (!url.value || !username.value || !password.value) {
      message.error('请填写完整的配置信息')
      return
    }

    const success = await webdavStore.testConnection({
      serverType: serverType.value,
      url: url.value,
      username: username.value,
      password: password.value
    })

    if (success) {
      message.success('连接成功')
    }
  } finally {
    isTesting.value = false
  }
}

async function handleSaveConfig() {
  isSaving.value = true
  try {
    await webdavStore.updateConfig({
      serverType: serverType.value,
      url: url.value,
      username: username.value,
      password: password.value,
      syncInterval: syncInterval.value
    })
    message.success('配置已保存')
  } finally {
    isSaving.value = false
  }
}

async function handleSync() {
  isSyncing.value = true
  try {
    await webdavStore.sync()
    message.success('同步完成，正在刷新...')
    // 同步完成后重新加载历史记录
    await webdavStore.loadSyncHistory()
    // 延迟一秒刷新页面，让用户看到成功提示
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } finally {
    isSyncing.value = false
  }
}

// 添加调试代码
watch(
  () => webdavStore.syncHistory,
  (history) => {
    console.log('同步历史更新:', history)
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
.webdav-settings {
  width: 100%;
  height: 100%;
}

.webdav-content {
  width: 100%;
  padding-right: 10px;

  .webdav-item {
    width: 100%;
    margin-bottom: 30px;

    &:last-child {
      margin-bottom: 0;
    }

    .title {
      font-size: 16px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      margin-bottom: 12px;
      user-select: none;
    }

    .description {
      font-size: 13px;
      line-height: 1.4;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }
  }
}

.webdav-settings-form {
  width: 100%;

  .form-item {
    display: flex;
    align-items: center;
    margin-bottom: 15px;

    .label {
      width: 80px;
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .value {
      flex: 1;
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
    }
  }
}

.webdav-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;

  .webdav-item-button {
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

  .auto-sync-description {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.sync-history {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;

  .history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    .history-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .history-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--color-fill-secondary);
    }

    .history-item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-item-name {
      font-size: 13px;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .history-item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-secondary);

      .dot {
        color: var(--color-text-placeholder);
      }

      .status {
        &.success {
          color: var(--color-success);
        }
        &.failed {
          color: var(--color-error);
        }
      }
    }
  }

  .history-empty {
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 13px;
    }
  }
}

.select-wrapper {
  position: relative;
  width: 100%;

  &.sync-interval-select {
    max-width: 120px;

    .select-dropdown {
      min-width: 120px;
    }
  }

  .select {
    width: 100%;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 35px;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-hover-bg);
    }

    .select-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 100%;
    }
  }

  .select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
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
      font-size: 13px;
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-hover-bg);
      }

      &.active {
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }
    }
  }
}
</style>
