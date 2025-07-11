<template>
  <div class="mcp-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Api theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">MCP 服务</div>
    </div>
    <div class="settings-content-divider"></div>

    <!-- 使用 Description 组件 -->
    <Description
      :text="[
        'MCP（Multimodal Context Preservation）服务允许外部AI助手（如Raycast、Cursor等）通过API访问Anteey的笔记内容作为上下文。'
      ]"
    />

    <div class="mcp-settings-content">
      <!-- MCP服务状态 -->
      <div class="settings-item">
        <div class="title">MCP 服务状态</div>
        <div class="description">查看当前 MCP 服务的运行状态和相关信息。</div>
        <div class="service-status">
          <div class="status-item">
            <div class="label">服务状态</div>
            <div class="value">
              <span
                :class="{
                  'status-active': mcpStore.serviceStatus?.isRunning,
                  'status-inactive': !mcpStore.serviceStatus?.isRunning
                }"
              >
                {{ mcpStore.serviceStatus?.isRunning ? '运行中' : '未运行' }}
              </span>
            </div>
          </div>
          <div class="status-item">
            <div class="label">服务端口</div>
            <div class="value">{{ mcpStore.serviceStatus?.port || '未知' }}</div>
          </div>
        </div>
      </div>

      <!-- API密钥管理 -->
      <div class="settings-item">
        <div class="title">API 密钥管理</div>
        <div class="description">
          创建和管理用于访问MCP服务的API密钥。每个密钥可以用于不同的应用或服务。
        </div>

        <!-- 创建新密钥 -->
        <div class="create-key">
          <Input v-model="newKeyName" placeholder="输入API密钥名称" style="flex: 1" />
          <Button type="primary" :loading="mcpStore.isCreating" @click="handleCreateKey">
            创建密钥
          </Button>
        </div>

        <!-- API密钥列表 -->
        <div class="api-keys-list">
          <div v-if="mcpStore.isLoading" class="loading-state">
            <LoadingCircle size="small" />
            <span>加载中...</span>
          </div>
          <div v-else-if="mcpStore.apiKeys.length === 0" class="empty-state">
            暂无API密钥，请创建新密钥
          </div>
          <div v-else>
            <div v-for="key in mcpStore.apiKeys" :key="key.id" class="key-item">
              <div class="key-info">
                <div class="key-name">
                  <span v-if="editingKeyId !== key.id">{{ key.name }}</span>
                  <Input
                    v-else
                    ref="editNameInput"
                    v-model="editingKeyName"
                    size="small"
                    @keyup.enter="handleSaveKeyName(key.id)"
                    @blur="handleSaveKeyName(key.id)"
                  />
                </div>
                <div class="key-value">
                  <span>{{ key.key }}</span>
                </div>
                <div class="key-meta">
                  <span>创建于: {{ new Date(key.createdAt).toLocaleString('zh-CN') }}</span>
                  <span v-if="key.lastUsedAt">
                    最后使用: {{ new Date(key.lastUsedAt).toLocaleString('zh-CN') }}
                  </span>
                </div>
              </div>
              <div class="key-actions">
                <Switch
                  :model-value="Boolean(key.isActive)"
                  @update:model-value="(val) => handleToggleKeyStatus(key.id, val)"
                />
                <Button type="text" size="small" @click="startEditKeyName(key)"> 重命名 </Button>
                <Button type="text" size="small" @click="copyToClipboard(key.key)"> 复制 </Button>
                <Button type="text" size="small" danger @click="handleDeleteKey(key.id)">
                  删除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Api } from '@icon-park/vue-next'
import { useMcpStore } from '@renderer/stores/mcpStore'
import Input from '@renderer/components/ui/Input.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import LoadingCircle from '@renderer/components/ui/loaders/LoadingCircle.vue'
import Description from '@renderer/components/ui/Description.vue'
import { message } from '@renderer/utils/message'

// 使用MCP Store
const mcpStore = useMcpStore()

// 本地状态
const newKeyName = ref('')
const editingKeyId = ref<string | null>(null)
const editingKeyName = ref('')
const editNameInput = ref<HTMLInputElement | null>(null)

// 初始化数据
onMounted(async () => {
  try {
    await mcpStore.fetchServiceStatus()
    await mcpStore.fetchApiKeys()
  } catch (error) {
    console.error('初始化MCP设置失败:', error)
    message.error('加载MCP设置失败')
  }
})

// 创建新密钥
const handleCreateKey = async () => {
  if (!newKeyName.value.trim()) {
    message.warning('请输入密钥名称')
    return
  }

  try {
    await mcpStore.createApiKey(newKeyName.value.trim())
    message.success('密钥创建成功')
    newKeyName.value = '' // 清空输入框
  } catch (error) {
    console.error('创建密钥失败:', error)
    message.error('创建密钥失败')
  }
}

// 删除密钥
const handleDeleteKey = async (id: string) => {
  try {
    await mcpStore.deleteApiKey(id)
    message.success('密钥删除成功')
  } catch (error) {
    console.error('删除密钥失败:', error)
    message.error('删除密钥失败')
  }
}

// 切换密钥状态
const handleToggleKeyStatus = async (id: string, isActive: boolean) => {
  try {
    await mcpStore.updateApiKeyStatus(id, isActive)
    message.success(isActive ? '密钥已启用' : '密钥已禁用')
  } catch (error) {
    console.error('更新密钥状态失败:', error)
    message.error('更新密钥状态失败')
  }
}

// 开始编辑密钥名称
const startEditKeyName = (key: any) => {
  editingKeyId.value = key.id
  editingKeyName.value = key.name

  // 等待DOM更新后聚焦输入框
  nextTick(() => {
    if (editNameInput.value) {
      editNameInput.value.focus()
    }
  })
}

// 保存密钥名称
const handleSaveKeyName = async (id: string) => {
  if (!editingKeyName.value.trim()) {
    message.warning('密钥名称不能为空')
    return
  }

  try {
    await mcpStore.renameApiKey(id, editingKeyName.value.trim())
    message.success('密钥重命名成功')
    editingKeyId.value = null
  } catch (error) {
    console.error('重命名密钥失败:', error)
    message.error('重命名密钥失败')
  }
}

// 复制到剪贴板
const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => message.success('已复制到剪贴板'))
    .catch(() => message.error('复制失败'))
}
</script>

<style scoped lang="scss">
.mcp-settings {
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
  padding: 0 20px;

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

.settings-content-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.mcp-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0 20px;
  overflow-y: auto;
  padding-bottom: 58px;
}

.settings-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 4px;
  margin-bottom: 24px;
  padding: 0 10px;

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
}

.service-status {
  background-color: var(--color-fill-secondary);
  border-radius: 6px;
  padding: 15px;
  width: 100%;

  .status-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      color: var(--color-text-secondary);
      font-size: 14px;
    }

    .value {
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 500;

      .status-active {
        color: var(--color-success);
      }

      .status-inactive {
        color: var(--color-error);
      }
    }
  }
}

.create-key {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  width: 100%;
  align-items: center;
}

.api-keys-list {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  width: 100%;

  .loading-state,
  .empty-state {
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .loading-state {
    gap: 10px;
  }

  .key-item {
    padding: 15px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:last-child {
      border-bottom: none;
    }

    .key-info {
      flex: 1;

      .key-name {
        font-size: 15px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 5px;
      }

      .key-value {
        font-family: monospace;
        background-color: var(--color-fill-tertiary);
        padding: 5px 8px;
        border-radius: 4px;
        font-size: 13px;
        margin-bottom: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .key-meta {
        font-size: 12px;
        color: var(--color-text-secondary);
        display: flex;
        gap: 15px;
      }
    }

    .key-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
  }
}
</style>
