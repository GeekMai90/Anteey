<template>
  <div class="image-bed-settings">
    <div class="settings-content-header">
      <div class="icon">
        <PictureOne theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">图床设置</div>
    </div>
    <div class="image-bed-settings-divider"></div>

    <div class="image-bed-settings-content">
      <!-- 全局设置区域 -->
      <div class="global-settings">
        <div class="section-title">全局设置</div>
        <div class="global-settings-list">
          <div class="setting-item">
            <div class="setting-label">启用图床</div>
            <Switch
              :model-value="Boolean(imageBedStore.settings?.enabled ?? false)"
              @update:model-value="handleToggleEnabled"
            />
          </div>
          <div v-if="imageBedStore.settings?.enabled" class="setting-item">
            <div class="setting-label">显示模式</div>
            <Dropdown
              size="medium"
              :show-arrow="true"
              width="150px"
              :items="displayModeItems"
              :show-selected="true"
              :placeholder="getDisplayModeLabel(imageBedStore.settings?.displayMode || 'auto')"
              @select="handleDisplayModeSelect"
            >
            </Dropdown>
          </div>
          <div v-if="imageBedStore.settings?.enabled" class="setting-item">
            <div class="setting-label">自动上传</div>
            <Switch
              :model-value="Boolean(imageBedStore.settings?.autoUpload ?? false)"
              @update:model-value="handleToggleAutoUpload"
            />
          </div>
        </div>
      </div>

      <!-- 配置管理区域 -->
      <div v-if="imageBedStore.settings?.enabled" class="config-management">
        <div class="section-title">配置管理</div>
        <div class="config-layout">
          <!-- 左侧：配置列表 -->
          <div class="config-list">
            <div class="config-list-header">
              <span>图床配置</span>
              <!-- 使用Dropdown组件添加配置 -->
              <Dropdown
                type="primary"
                size="small"
                :icon="Plus"
                :show-arrow="true"
                width="200px"
                :items="providerDropdownItems"
                @select="handleProviderSelect"
              >
                添加配置
              </Dropdown>
            </div>

            <!-- 配置列表 -->
            <div class="config-items">
              <div
                v-for="config in imageBedStore.configs"
                :key="config.id"
                class="config-item"
                :class="{
                  active: selectedConfigId === config.id,
                  default: config.isDefault
                }"
                @click="selectConfig(config.id)"
              >
                <div class="config-info">
                  <div class="config-name">
                    {{ config.name }}
                    <Star v-if="config.isDefault" theme="filled" size="12" fill="#ffa940" />
                  </div>
                  <div class="config-meta">
                    <span class="config-type">{{ getProviderName(config.type) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="imageBedStore.configs.length === 0" class="empty-configs">
                <div class="empty-icon">📝</div>
                <div class="empty-text">暂无配置</div>
                <div class="empty-desc">点击上方"添加配置"创建第一个图床配置</div>
              </div>
            </div>
          </div>

          <!-- 右侧：配置详情 -->
          <div class="config-detail">
            <div v-if="selectedConfig" class="config-form">
              <div class="form-header">
                <div class="config-title">
                  <div class="title-info">
                    <h3>{{ selectedConfig.name }}</h3>
                    <div class="provider-label">{{ getProviderName(selectedConfig.type) }}</div>
                  </div>
                  <div class="config-controls">
                    <div class="control-item">
                      <span class="control-label">默认配置</span>
                      <Switch
                        :model-value="Boolean(selectedConfig!.isDefault)"
                        @update:model-value="handleToggleDefault"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 配置表单 - 单列布局 -->
              <div class="form-content">
                <div class="form-section">
                  <div class="form-item">
                    <label>配置名称</label>
                    <input
                      v-model="selectedConfig!.name"
                      type="text"
                      class="form-input"
                      placeholder="为此配置起个名字"
                    />
                  </div>

                  <!-- 阿里云OSS字段 -->
                  <template v-if="selectedConfig.type === 'aliyun-oss'">
                    <div class="form-item">
                      <label>Access Key ID</label>
                      <input
                        v-model="selectedConfig!.accessKeyId"
                        type="text"
                        class="form-input"
                        placeholder="请输入Access Key ID"
                      />
                    </div>

                    <div class="form-item">
                      <label>Access Key Secret</label>
                      <input
                        v-model="selectedConfig!.accessKeySecret"
                        type="password"
                        class="form-input"
                        placeholder="请输入Access Key Secret"
                      />
                    </div>
                  </template>

                  <!-- 腾讯云COS字段 -->
                  <template v-if="selectedConfig.type === 'tencent-cos'">
                    <div class="form-item">
                      <label>Secret ID</label>
                      <input
                        v-model="selectedConfig!.secretId"
                        type="text"
                        class="form-input"
                        placeholder="请输入Secret ID"
                      />
                    </div>

                    <div class="form-item">
                      <label>Secret Key</label>
                      <input
                        v-model="selectedConfig!.secretKey"
                        type="password"
                        class="form-input"
                        placeholder="请输入Secret Key"
                      />
                    </div>
                  </template>

                  <div class="form-item">
                    <label>存储桶名称</label>
                    <input
                      v-model="selectedConfig!.bucket"
                      type="text"
                      class="form-input"
                      placeholder="请输入存储桶名称"
                    />
                  </div>

                  <div class="form-item">
                    <label>地域</label>
                    <select v-model="selectedConfig!.region" class="form-select">
                      <option value="">请选择地域</option>
                      <!-- 阿里云OSS地域 -->
                      <template v-if="selectedConfig.type === 'aliyun-oss'">
                        <option value="oss-cn-hangzhou">华东 1（杭州）</option>
                        <option value="oss-cn-shanghai">华东 2（上海）</option>
                        <option value="oss-cn-beijing">华北 2（北京）</option>
                        <option value="oss-cn-shenzhen">华南 1（深圳）</option>
                        <option value="oss-cn-guangzhou">华南 2（广州）</option>
                        <option value="oss-cn-chengdu">西南 1（成都）</option>
                      </template>
                      <!-- 腾讯云COS地域 -->
                      <template v-if="selectedConfig.type === 'tencent-cos'">
                        <option value="ap-beijing">北京</option>
                        <option value="ap-nanjing">南京</option>
                        <option value="ap-shanghai">上海</option>
                        <option value="ap-guangzhou">广州</option>
                        <option value="ap-chengdu">成都</option>
                        <option value="ap-chongqing">重庆</option>
                        <option value="ap-shenzhen-fsi">深圳金融</option>
                        <option value="ap-shanghai-fsi">上海金融</option>
                        <option value="ap-beijing-fsi">北京金融</option>
                      </template>
                    </select>
                  </div>

                  <div class="form-item">
                    <label>路径前缀（可选）</label>
                    <input
                      v-model="selectedConfig!.pathPrefix"
                      type="text"
                      class="form-input"
                      placeholder="images/"
                    />
                    <div class="field-desc">文件上传到存储桶中的路径前缀，例如：images/</div>
                  </div>

                  <div class="form-item">
                    <label>自定义端点（可选）</label>
                    <input
                      v-model="selectedConfig!.endpoint"
                      type="text"
                      class="form-input"
                      :placeholder="getEndpointPlaceholder(selectedConfig.type)"
                    />
                    <div class="field-desc">{{ getEndpointDescription(selectedConfig.type) }}</div>
                  </div>

                  <div class="form-item">
                    <label>自定义域名（可选）</label>
                    <input
                      v-model="selectedConfig!.customDomain"
                      type="text"
                      class="form-input"
                      placeholder="https://your-domain.com"
                    />
                    <div class="field-desc">绑定的自定义域名，用于生成图片访问链接</div>
                  </div>

                  <!-- 操作按钮区域 -->
                  <div class="form-actions">
                    <Button
                      size="small"
                      :disabled="!isSelectedConfigValid"
                      :class="{ 'is-loading': isTesting }"
                      @click="handleTestConnection"
                    >
                      {{ isTesting ? '测试中...' : '测试连接' }}
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      :disabled="!isSelectedConfigValid"
                      :class="{ 'is-loading': isSaving }"
                      @click="handleUpdateConfig"
                    >
                      {{ isSaving ? '保存中...' : '保存配置' }}
                    </Button>
                    <Button type="delete" size="small" @click="handleDeleteConfig"> 删除 </Button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="config-empty">
              <div class="empty-content">
                <div class="empty-icon">⚙️</div>
                <div class="empty-title">请选择一个配置</div>
                <div class="empty-description">
                  在左侧选择一个配置来查看和编辑详情，或点击"添加配置"创建新的图床配置。
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
import { ref, computed, onMounted } from 'vue'
import { PictureOne, Plus, Star } from '@icon-park/vue-next'
import { useImageBedStore } from '@renderer/stores/imageBedStore'
import { message } from '@renderer/utils/message'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'

const imageBedStore = useImageBedStore()

// 表单状态
const isTesting = ref(false)
const isSaving = ref(false)

// 配置管理相关
const selectedConfigId = ref('')
const selectedConfig = computed(() => {
  return imageBedStore.configs.find((c) => c.id === selectedConfigId.value)
})

const isSelectedConfigValid = computed(() => {
  if (!selectedConfig.value) return false

  const config = selectedConfig.value
  const hasBasicFields = !!(config.name && config.bucket && config.region)

  if (config.type === 'aliyun-oss') {
    return hasBasicFields && !!(config.accessKeyId && config.accessKeySecret)
  } else if (config.type === 'tencent-cos') {
    return hasBasicFields && !!(config.secretId && config.secretKey)
  }

  return false
})

// 下拉菜单选项
const providerDropdownItems = [
  {
    key: 'aliyun-oss',
    label: '阿里云 OSS'
  },
  {
    key: 'qiniu',
    label: '七牛云',
    disabled: true
  },
  {
    key: 'tencent-cos',
    label: '腾讯云 COS'
  }
]

const displayModeItems = [
  {
    key: 'local-only',
    label: '仅本地显示'
  },
  {
    key: 'remote-first',
    label: '优先远程显示'
  },
  {
    key: 'auto',
    label: '智能显示'
  }
]

// 初始化
onMounted(async () => {
  await imageBedStore.getAllConfigs()
  await imageBedStore.getSettings()
})

// 全局设置事件处理函数
const handleToggleEnabled = async (enabled: boolean) => {
  await imageBedStore.updateSettings({ enabled })
}

const handleDisplayModeSelect = async (key: string) => {
  await imageBedStore.updateSettings({
    displayMode: key as 'local-only' | 'remote-first' | 'auto'
  })
}

const handleToggleAutoUpload = async (autoUpload: boolean) => {
  await imageBedStore.updateSettings({ autoUpload })
}

// 配置操作函数
const selectConfig = (id: string) => {
  selectedConfigId.value = id
}

const getProviderName = (type: string) => {
  switch (type) {
    case 'aliyun-oss':
      return '阿里云OSS'
    case 'qiniu':
      return '七牛云'
    case 'tencent-cos':
      return '腾讯云COS'
    default:
      return '未知'
  }
}

const getDisplayModeLabel = (displayMode: string) => {
  switch (displayMode) {
    case 'local-only':
      return '仅本地显示'
    case 'remote-first':
      return '优先远程显示'
    case 'auto':
      return '智能显示'
    default:
      return '未知'
  }
}

const handleTestConnection = async () => {
  if (!selectedConfig.value) return

  isTesting.value = true
  try {
    const result = await imageBedStore.testConnection(selectedConfig.value)
    if (result.success) {
      message.success('连接测试成功')
    } else {
      message.error(`连接测试失败: ${result.message || '请检查配置信息'}`)
    }
  } catch (error: any) {
    message.error(`连接测试失败: ${error.message || '网络错误，请重试'}`)
  } finally {
    isTesting.value = false
  }
}

const handleUpdateConfig = async () => {
  if (!selectedConfig.value) return

  isSaving.value = true
  try {
    await imageBedStore.updateConfig(selectedConfig.value.id, {
      ...selectedConfig.value
    })
    message.success('配置保存成功')
  } catch (error: any) {
    message.error(`更新配置失败: ${error.message || '更新配置时出错'}`)
  } finally {
    isSaving.value = false
  }
}

const handleDeleteConfig = async () => {
  if (!selectedConfig.value) return

  try {
    await imageBedStore.deleteConfig(selectedConfig.value.id)
    selectedConfigId.value = '' // 清空选择
    message.success('配置删除成功')
  } catch (error: any) {
    message.error(`删除配置失败: ${error.message || '删除配置时出错'}`)
  }
}

const handleToggleDefault = async (isDefault: boolean) => {
  if (!selectedConfig.value) return

  try {
    await imageBedStore.updateConfig(selectedConfig.value.id, {
      ...selectedConfig.value,
      isDefault
    })

    if (isDefault) {
      message.success('已设为默认配置（其他配置的默认状态已自动取消）')
    } else {
      message.success('已取消默认配置')
    }
  } catch (error: any) {
    message.error(`设置默认配置失败: ${error.message || '操作失败'}`)
  }
}

// 下拉菜单操作函数
const handleProviderSelect = async (key: string) => {
  try {
    const configName = `${getProviderName(key)} 配置 ${imageBedStore.configs.length + 1}`
    const isFirstConfig = imageBedStore.configs.length === 0

    const baseConfig = {
      type: key as 'aliyun-oss' | 'tencent-cos',
      name: configName,
      isDefault: isFirstConfig, // 第一个配置自动设为默认
      bucket: '',
      region: '',
      endpoint: '',
      customDomain: '',
      pathPrefix: 'images/'
    }

    const newConfig = {
      ...baseConfig,
      // 根据类型添加特定字段
      ...(key === 'aliyun-oss' && {
        accessKeyId: '',
        accessKeySecret: ''
      }),
      ...(key === 'tencent-cos' && {
        secretId: '',
        secretKey: ''
      })
    }

    const createdConfig = await imageBedStore.createConfig(newConfig)
    message.success('新配置创建成功')

    // 自动选择新创建的配置
    if (createdConfig && typeof createdConfig === 'object' && 'id' in createdConfig) {
      selectedConfigId.value = (createdConfig as any).id
    }
  } catch (error: any) {
    message.error(`创建配置失败: ${error.message || '创建配置时出错'}`)
  }
}

const getEndpointPlaceholder = (type: string) => {
  switch (type) {
    case 'aliyun-oss':
      return 'https://oss-cn-hangzhou.aliyuncs.com'
    case 'tencent-cos':
      return 'https://cos.ap-beijing.myqcloud.com'
    default:
      return ''
  }
}

const getEndpointDescription = (type: string) => {
  switch (type) {
    case 'aliyun-oss':
      return '留空使用默认端点'
    case 'tencent-cos':
      return '留空使用默认端点'
    default:
      return '留空使用默认端点'
  }
}
</script>

<style scoped lang="scss">
.image-bed-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

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

.image-bed-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 0;
  width: 100%;
  margin-bottom: 10px;
}

.image-bed-settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}

.image-bed-content {
  max-width: 600px;
}

.image-bed-item {
  margin-bottom: 32px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  .description {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin-bottom: 16px;
  }
}

.image-bed-form {
  .form-item {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    .label {
      width: 140px;
      font-size: 14px;
      color: var(--color-text-primary);
      flex-shrink: 0;
    }

    .value {
      flex: 1;
    }
  }
}

.config-input,
.config-select,
.display-mode-select {
  width: 100%;
  height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
}

.auto-upload-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .auto-upload-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.default-config-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .default-config-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.config-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.is-loading {
  pointer-events: none;
  opacity: 0.7;
}

.global-settings {
  margin-bottom: 24px;
  flex-shrink: 0;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 16px;
  }

  .global-settings-list {
    display: flex;
    flex-direction: column;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    min-height: 48px;
  }

  .setting-label {
    font-size: 14px;
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.config-management {
  flex-shrink: 0;
  margin-bottom: 24px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 16px;
  }

  .config-layout {
    display: flex;
    gap: 24px;
    height: 420px;
    max-height: calc(100vh - 300px);
    min-height: 420px;
  }

  .config-list {
    width: 300px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .config-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    flex-shrink: 0;
  }

  .config-items {
    flex: 1;
    overflow-y: auto;
    min-height: 0;

    .config-item {
      position: relative;
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border: none;
      background: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 6px;
      margin: 2px 4px;
      min-height: 40px;
      box-sizing: border-box;

      &:hover {
        background-color: var(--color-hover-button);
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.1);
      }

      &.active {
        background-color: var(--color-primary-light);
        color: var(--color-primary);

        .config-info {
          .config-name {
            color: var(--color-primary);
          }

          .config-meta {
            .config-type {
              color: var(--color-primary);
            }
          }
        }

        &:hover {
          background-color: var(--color-primary-light);
        }
      }

      &.default {
        background-color: color-mix(in srgb, var(--color-warning) 8%, transparent);

        &:hover {
          background-color: color-mix(in srgb, var(--color-warning) 12%, transparent);
        }

        &.active {
          background-color: var(--color-primary-light);

          &:hover {
            background-color: var(--color-primary-light);
          }
        }
      }

      .config-info {
        flex: 1;
        min-width: 0;

        .config-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-primary);
          margin-bottom: 4px;
          line-height: 20px;
          user-select: none;

          // 处理文本溢出
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .config-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          line-height: 16px;

          .config-type {
            color: var(--color-text-secondary);
            font-weight: 400;
          }
        }
      }
    }

    .empty-configs {
      padding: 40px 16px;
      text-align: center;
      color: var(--color-text-secondary);

      .empty-icon {
        font-size: 32px;
        margin-bottom: 12px;
        opacity: 0.6;
      }

      .empty-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }

      .empty-desc {
        font-size: 12px;
        color: var(--color-text-tertiary);
        line-height: 1.4;
      }
    }
  }
}

.config-detail {
  flex: 1;
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-primary);
    overflow: hidden;
    height: 100%;

    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      flex-shrink: 0;

      .config-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 24px;

        .title-info {
          h3 {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: 2px;
          }

          .provider-label {
            font-size: 12px;
            color: var(--color-text-tertiary);
          }
        }

        .config-controls {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-label {
          font-size: 13px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
      }
    }

    .form-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;

      .form-section {
        margin-bottom: 24px;

        &:last-child {
          margin-bottom: 0;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid var(--color-border-light);
        }

        .form-item {
          margin-bottom: 16px;

          label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-primary);
            margin-bottom: 6px;
          }

          .form-input,
          .form-select {
            width: 100%;
            height: 36px;
            padding: 8px 12px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            background-color: var(--color-bg-primary);
            color: var(--color-text-primary);
            font-size: 14px;
            transition: border-color 0.2s ease;

            &:focus {
              outline: none;
              border-color: var(--color-primary);
              box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
            }

            &::placeholder {
              color: var(--color-text-tertiary);
            }
          }

          .field-desc {
            font-size: 12px;
            color: var(--color-text-tertiary);
            line-height: 1.4;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .config-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-primary);

    .empty-content {
      text-align: center;
      max-width: 300px;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .empty-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }

      .empty-description {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }
    }
  }
}
</style>
