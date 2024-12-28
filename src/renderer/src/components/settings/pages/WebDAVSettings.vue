<template>
  <div class="webdav-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage
          theme="outline"
          size="20"
          fill="var(--color-icon-menu-default)"
          :strokeWidth="3"
        />
      </div>
      <div class="name">同步</div>
    </div>
    <div class="webdav-settings-divider"></div>
    <div class="webdav-settings-content">
      <!-- WebDAV 服务配置 -->
      <div class="webdav-item">
        <div class="title">WebDAV 服务</div>
        <div class="description">配置 WebDAV 服务器信息，支持坚果云、阿里云盘等 WebDAV 服务。</div>
        <div class="webdav-settings-form">
          <div class="form-item">
            <div class="label">服务类型</div>
            <div class="value">
              <select v-model="serverType">
                <option value="jianguoyun">坚果云</option>
                <option value="aliyundrive">阿里云盘</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>
          <div class="form-item">
            <div class="label">服务地址</div>
            <div class="value">
              <input type="text" v-model="url" placeholder="请输入 WebDAV 服务器地址" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">用户名</div>
            <div class="value">
              <input type="text" v-model="username" placeholder="请输入用户名" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">密码</div>
            <div class="value">
              <input type="password" v-model="password" placeholder="请输入密码" />
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
                <div
                  class="switch"
                  :class="{ 'is-active': autoSync }"
                  @click="autoSync = !autoSync"
                >
                  <div class="switch-handle"></div>
                </div>
                <div class="auto-sync-description">
                  {{ autoSync ? '定时自动同步' : '仅支持手动同步' }}
                </div>
              </div>
            </div>
          </div>
          <div class="form-item" v-if="autoSync">
            <div class="label">同步间隔</div>
            <div class="value">
              <select v-model="syncInterval">
                <option :value="5">5分钟</option>
                <option :value="15">15分钟</option>
                <option :value="30">30分钟</option>
                <option :value="60">1小时</option>
              </select>
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
                    new Date(item.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
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
import type { WebDAVServerType } from '../../../types/WebDAV'
import { message } from '../../../utils/message'

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
const syncInterval = ref(15)

onMounted(async () => {
  await webdavStore.loadConfig()
  if (webdavStore.config) {
    serverType.value = webdavStore.config.serverType
    url.value = webdavStore.config.url
    username.value = webdavStore.config.username
    password.value = webdavStore.config.password
    syncInterval.value = webdavStore.config.syncInterval
  }
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
    message.success('同步完成')
  } finally {
    isSyncing.value = false
  }
}
</script>

<style scoped lang="scss">
.webdav-settings {
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

.webdav-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 0;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.webdav-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;

  .webdav-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-bottom: 12px;

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin: 15px 0;
      user-select: none;
    }

    .description {
      font-size: 14px;
      line-height: 1;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 15px;
      user-select: none;
    }

    .webdav-item-button {
      width: 80px;
      height: 35px;
      background-color: var(--color-primary);
      color: var(--color-text-inversion);
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;

      &:hover {
        opacity: 0.9;
      }

      &.test {
        background-color: var(--color-success);
      }

      &.is-loading {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }
  }
}

.webdav-settings-form {
  width: 100%;
  margin-top: 15px;

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

      input,
      select {
        width: 100%;
        max-width: 300px;
        height: 35px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 0 12px;
        font-size: 14px;
        color: var(--color-text-primary);
        background-color: var(--color-bg-secondary);
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
}

.auto-sync-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .switch {
    position: relative;
    width: 36px;
    height: 20px;
    background-color: var(--color-slider-track);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.is-active {
      background-color: var(--color-primary);

      .switch-handle {
        transform: translateX(16px);
      }
    }

    .switch-handle {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background-color: #fff;
      border-radius: 50%;
      transition: all 0.2s ease;
    }
  }

  .auto-sync-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.sync-history {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;

  .history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--color-bg-secondary);
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
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-fill-secondary);
    }

    .history-item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-item-name {
      font-size: 14px;
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
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
  }
}
</style>
