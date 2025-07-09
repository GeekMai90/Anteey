<template>
  <div class="mcp-settings">
    <div class="mcp-content">
      <!-- MCP服务状态 -->
      <div class="mcp-item">
        <div class="title">MCP 服务状态</div>
        <div class="description">
          MCP（Multimodal Context
          Preservation）服务允许外部AI助手（如Raycast、Cursor等）通过API访问Anteey的笔记内容作为上下文。
        </div>
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
          <div class="status-item">
            <div class="label">活跃API密钥</div>
            <div class="value">{{ mcpStore.serviceStatus?.activeKeys || 0 }}</div>
          </div>
          <div class="status-item">
            <div class="label">总请求次数</div>
            <div class="value">{{ mcpStore.serviceStatus?.totalRequests || 0 }}</div>
          </div>
          <div class="status-item">
            <div class="label">最近请求时间</div>
            <div class="value">
              {{
                mcpStore.serviceStatus?.lastRequestAt
                  ? new Date(mcpStore.serviceStatus.lastRequestAt).toLocaleString('zh-CN')
                  : '无'
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- API密钥管理 -->
      <div class="mcp-item">
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
                  <Button type="text" size="small" @click="copyToClipboard(key.key)"> 复制 </Button>
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
                  :model-value="key.isActive"
                  @update:model-value="(val) => handleToggleKeyStatus(key.id, val)"
                />
                <Button type="text" size="small" @click="startEditKeyName(key)"> 重命名 </Button>
                <Button type="text" size="small" danger @click="handleDeleteKey(key.id)">
                  删除
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API使用说明 -->
      <div class="mcp-item">
        <div class="title">API 使用说明</div>
        <div class="description">如何在外部应用中使用MCP API访问Anteey的笔记内容。</div>
        <div class="api-docs">
          <div class="api-endpoint">
            <div class="endpoint-title">验证API密钥</div>
            <div class="endpoint-url">
              POST http://localhost:{{ mcpStore.serviceStatus?.port || '3690' }}/api/mcp/auth/verify
            </div>
            <div class="endpoint-desc">
              在请求头中添加 <code>X-API-KEY</code> 字段，值为您的API密钥。
            </div>
          </div>
          <div class="api-endpoint">
            <div class="endpoint-title">搜索笔记</div>
            <div class="endpoint-url">
              GET http://localhost:{{
                mcpStore.serviceStatus?.port || '3690'
              }}/api/mcp/notes/search?query=关键词
            </div>
            <div class="endpoint-desc">搜索笔记内容，返回匹配的笔记列表。</div>
          </div>
          <div class="api-endpoint">
            <div class="endpoint-title">获取单个笔记</div>
            <div class="endpoint-url">
              GET http://localhost:{{ mcpStore.serviceStatus?.port || '3690' }}/api/mcp/notes/:id
            </div>
            <div class="endpoint-desc">获取指定ID的笔记详细内容。</div>
          </div>
          <div class="api-endpoint">
            <div class="endpoint-title">获取最近笔记</div>
            <div class="endpoint-url">
              GET http://localhost:{{ mcpStore.serviceStatus?.port || '3690' }}/api/mcp/notes/recent
            </div>
            <div class="endpoint-desc">获取最近编辑的笔记列表。</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useMcpStore } from '@renderer/stores/mcpStore'
import Input from '@renderer/components/ui/Input.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import LoadingCircle from '@renderer/components/ui/loaders/LoadingCircle.vue'
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
}

.mcp-content {
  width: 100%;
  padding: 0 10px;

  .mcp-item {
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

.service-status {
  background-color: var(--color-fill-secondary);
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;

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
}

.api-keys-list {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;

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
      gap: 10px;
    }
  }
}

.api-docs {
  background-color: var(--color-fill-secondary);
  border-radius: 6px;
  padding: 15px;

  .api-endpoint {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .endpoint-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 5px;
    }

    .endpoint-url {
      font-family: monospace;
      background-color: var(--color-fill-tertiary);
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 5px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .endpoint-desc {
      font-size: 13px;
      color: var(--color-text-secondary);

      code {
        background-color: var(--color-fill-tertiary);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
      }
    }
  }
}
</style>
