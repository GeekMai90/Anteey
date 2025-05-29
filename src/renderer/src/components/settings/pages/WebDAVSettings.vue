<template>
  <div class="webdav-settings">
    <div class="webdav-content">
      <!-- 同步设置 -->
      <div class="webdav-item">
        <div class="title">同步设置</div>
        <div class="description">配置自动同步和同步方式。</div>
        <div class="webdav-settings-form">
          <div class="form-item">
            <div class="label">自动同步</div>
            <div class="value">
              <Switch :model-value="Boolean(autoSync)" @update:model-value="autoSync = $event" />
            </div>
          </div>
          <div v-if="autoSync" class="form-item">
            <div class="label">同步间隔</div>
            <div class="value">
              <Dropdown
                :items="syncIntervals.map((i) => ({ key: i.value.toString(), label: i.label }))"
                trigger="click"
                width="120px"
                :align="'end'"
                showArrow
                @select="(key) => selectInterval(Number(key))"
              >
                {{ getSyncIntervalText(syncInterval) }}
              </Dropdown>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>仅同步数据库</span>
              <HelpTips
                content="默认将同步数据库和图片文件。开启后只同步数据库文件，不会同步图片文件，可以节省云存储空间和同步时间。"
                placement="right"
                size="small"
              />
            </div>
            <div class="value">
              <Switch
                :model-value="Boolean(isDatabaseOnlySync)"
                @update:model-value="handleDatabaseOnlySyncChange"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>启动/关闭时同步</span>
              <HelpTips
                content="开启后，应用启动和关闭时会自动执行一次同步。关闭此选项后，只有定时自动同步和手动同步会执行。"
                placement="right"
                size="small"
              />
            </div>
            <div class="value">
              <Switch
                :model-value="Boolean(isStartupShutdownSyncEnabled)"
                @update:model-value="handleStartupShutdownSyncChange"
              />
            </div>
          </div>

          <div class="webdav-actions">
            <Button
              type="default"
              :loading="isForceUploading"
              :tooltip="{
                content: '强制上传本地数据到云端',
                delay: { show: 1000 }
              }"
              @click="handleForceUpload"
            >
              {{ isForceUploading ? '上传中...' : '上传到云端' }}
            </Button>
            <Button
              type="default"
              :loading="isForceDownloading"
              :tooltip="{
                content: '强制从云端下载数据覆盖本地',
                delay: { show: 1000 }
              }"
              @click="handleForceDownload"
            >
              {{ isForceDownloading ? '下载中...' : '从云端下载' }}
            </Button>
            <Button
              type="primary"
              :loading="isSyncing"
              :tooltip="{
                content: '立即同步数据',
                delay: { show: 1000 }
              }"
              @click="handleSync"
            >
              {{ isSyncing ? '同步中...' : '立即同步' }}
            </Button>
          </div>
        </div>
      </div>
      <!-- WebDAV 服务配置 -->
      <div class="webdav-item">
        <div class="title">WebDAV 服务</div>
        <div class="description">配置 WebDAV 服务器信息。</div>
        <div class="webdav-settings-form">
          <div class="form-item">
            <div class="label">服务类型</div>
            <div class="value">
              <Dropdown
                :items="serverTypes.map((t) => ({ key: t.value, label: t.label }))"
                trigger="click"
                width="200px"
                :align="'end'"
                showArrow
                @select="selectServerType"
              >
                {{ getServerTypeName(serverType) }}
              </Dropdown>
            </div>
          </div>
          <div class="form-item">
            <div class="label">服务地址</div>
            <div class="value">
              <Input v-model="url" placeholder="请输入 WebDAV 服务器地址" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">用户名</div>
            <div class="value">
              <Input v-model="username" placeholder="请输入用户名" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">应用密码</div>
            <div class="value">
              <Input v-model="password" type="password" placeholder="请输入应用密码" />
            </div>
          </div>
          <div class="webdav-actions">
            <Button
              type="default"
              :loading="isTesting"
              :tooltip="{
                content: '测试 WebDAV 服务连接',
                delay: { show: 1000 }
              }"
              @click="handleTestConnection"
            >
              {{ isTesting ? '测试中...' : '测试连接' }}
            </Button>
            <Button
              type="primary"
              :loading="isSaving"
              :tooltip="{
                content: '保存 WebDAV 服务配置',
                delay: { show: 1000 }
              }"
              @click="handleSaveConfig"
            >
              {{ isSaving ? '保存中...' : '保存配置' }}
            </Button>
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
import { CloudStorage } from '@icon-park/vue-next'
import { useWebDAVStore } from '@renderer/stores/webdavStore'
import { ref, onMounted, computed } from 'vue'
import type { WebDAVServerType, SyncFileType } from '@shared/types'
import { message } from '../../../utils/message'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import Input from '@renderer/components/ui/Input.vue'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import HelpTips from '@renderer/components/ui/HelpTips.vue'

const webdavStore = useWebDAVStore()
const isTesting = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)
const isForceUploading = ref(false)
const isForceDownloading = ref(false)

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

// 是否启用启动/关闭时同步
const isStartupShutdownSyncEnabled = computed({
  get: () => webdavStore.config?.startupShutdownSync ?? true,
  set: async (value: boolean) => {
    try {
      await webdavStore.updateConfig({ startupShutdownSync: value })
    } catch (error) {
      console.error('更新启动/关闭时同步设置失败:', error)
      message.error('更新启动/关闭时同步设置失败')
    }
  }
})

// 是否仅同步数据库
const isDatabaseOnlySync = computed({
  get: () => {
    const types = webdavStore.config?.syncFileTypes || ['all']
    return types.length === 1 && types.includes('database')
  },
  set: async (value: boolean) => {
    try {
      const newSyncFileTypes: SyncFileType[] = value ? ['database'] : ['all']
      await webdavStore.updateConfig({ syncFileTypes: newSyncFileTypes })
    } catch (error) {
      console.error('更新仅同步数据库设置失败:', error)
      message.error('更新仅同步数据库设置失败')
    }
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

const selectServerType = (key: string): void => {
  const type = key as WebDAVServerType
  serverType.value = type
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

async function handleStartupShutdownSyncChange(value: boolean) {
  try {
    await webdavStore.updateConfig({ startupShutdownSync: value })
  } catch (error) {
    console.error('更新启动/关闭时同步设置失败:', error)
    message.error('更新启动/关闭时同步设置失败')
  }
}

async function handleDatabaseOnlySyncChange(value: boolean) {
  try {
    const newSyncFileTypes: SyncFileType[] = value ? ['database'] : ['all']
    await webdavStore.updateConfig({ syncFileTypes: newSyncFileTypes })
  } catch (error) {
    console.error('更新仅同步数据库设置失败:', error)
    message.error('更新仅同步数据库设置失败')
  }
}

async function handleForceUpload() {
  isForceUploading.value = true
  try {
    await webdavStore.forceUpload()
    message.success('强制上传完成')
  } finally {
    isForceUploading.value = false
  }
}

async function handleForceDownload() {
  isForceDownloading.value = true
  try {
    await webdavStore.forceDownload()
    message.success('强制下载完成')
  } finally {
    isForceDownloading.value = false
  }
}
</script>

<style scoped lang="scss">
.webdav-settings {
  width: 100%;
  height: 100%;
}

.webdav-content {
  width: 100%;
  padding: 0 10px;

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
      width: 200px;
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 32px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .value {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
  }
}

.webdav-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
</style>
