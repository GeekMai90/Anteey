<template>
  <div class="share-settings">
    <div class="share-settings-wrapper">
      <div class="settings-content-header">
        <div class="icon">
          <Share theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">分享设置</div>
      </div>
      <div class="shortcuts-settings-divider"></div>
      <div class="share-settings-content">
        <div class="share-section">
          <div class="section-title">作者信息</div>
          <div class="form-group">
            <label>作者名称</label>
            <input v-model="shareSettings.authorName" type="text" placeholder="请输入作者名称" />
          </div>
          <div class="form-group">
            <label>个性签名</label>
            <input v-model="shareSettings.authorMotto" type="text" placeholder="请输入个性签名" />
          </div>
          <div class="form-group">
            <label>二维码链接</label>
            <input v-model="shareSettings.qrcodeUrl" type="text" placeholder="请输入二维码链接" />
            <div class="form-help">该链接将生成二维码显示在分享卡片底部</div>
          </div>
        </div>

        <div class="share-section">
          <div class="section-title">预览</div>
          <div class="preview-card">
            <ShareNoteCard
              :note="previewNote"
              :background="'linear-gradient(135deg, #7ec2ff 0%, #73e7d1 100%)'"
            />
          </div>
        </div>

        <div class="action-buttons">
          <button class="save-btn" @click="handleSaveSettings">保存设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Share } from '@icon-park/vue-next'
import { useUserSettingsStore } from '@renderer/stores/useUserSettings'
import ShareNoteCard from '@renderer/components/share/ShareNotedCard.vue'
import { UpdateUserSettings } from '@shared/types'
import { message } from '@renderer/utils/message'

const userSettingsStore = useUserSettingsStore()
const shareSettings = ref<UpdateUserSettings>({
  authorName: '',
  authorMotto: '',
  qrcodeUrl: ''
})

// 用于预览的示例笔记
const previewNote = ref<any>({
  id: 'preview',
  content: '<p>这是一条示例笔记，用于预览分享效果。</p>',
  type: 'note',
  address: '',
  cardType: 'note',
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  linkedTo: [],
  linkedFrom: []
})

onMounted(async () => {
  try {
    await userSettingsStore.fetchSettings()
    const currentSettings = userSettingsStore.settings

    if (currentSettings) {
      shareSettings.value = {
        authorName: currentSettings.authorName,
        authorMotto: currentSettings.authorMotto,
        qrcodeUrl: currentSettings.qrcodeUrl
      }
    }
  } catch (error) {
    message.error('获取设置失败')
  }
})

const handleSaveSettings = async () => {
  try {
    await userSettingsStore.updateSettings(shareSettings.value)
    message.success('设置已保存')
  } catch (error) {
    message.error('保存失败')
  }
}
</script>

<style scoped lang="scss">
.share-settings {
  width: 100%;
  height: 100%;

  .share-settings-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
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

  .shortcuts-settings-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 4px 0;
    width: 100%;
    margin-bottom: 10px;
  }

  .share-settings-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 10px;
  }

  .share-section {
    margin-bottom: 24px;

    .section-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--color-text-primary);
    }
  }

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      font-size: 14px;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 14px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }
    }

    .form-help {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }
  }

  .preview-card {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px;
    background: var(--color-background-secondary);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .action-buttons {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;

    .save-btn {
      padding: 8px 24px;
      background-color: var(--color-primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
