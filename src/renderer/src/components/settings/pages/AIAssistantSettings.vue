<template>
  <div class="ai-assistant-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Robot theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">AI 助手设置</div>
    </div>
    <div class="settings-content-divider"></div>

    <div class="ai-settings-content">
      <!-- 添加动画设置区域 -->
      <div class="ai-section">
        <div class="section-header">
          <div class="section-title">加载动画设置</div>
        </div>
        <div class="section-desc">选择 AI 助手初始界面显示的加载动画。</div>
        <div class="setting-item">
          <Dropdown
            :items="animationOptions"
            :showSelected="true"
            :showArrow="true"
            width="240"
            @select="handleAnimationSelect"
          >
            选择加载动画
          </Dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Robot } from '@icon-park/vue-next'
import { useAIChatStore } from '@renderer/stores/aiChatStore'
import { message } from '@renderer/utils/message'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import { onMounted } from 'vue'

const aiChatStore = useAIChatStore()

// 修改动画选项的定义
const animationOptions = [
  { label: '蜡烛动画', key: 'candle', active: aiChatStore.loadingAnimation.type === 'candle' },
  { label: '铅笔动画', key: 'pencil', active: aiChatStore.loadingAnimation.type === 'pencil' },
  { label: '仓鼠动画', key: 'mouse', active: aiChatStore.loadingAnimation.type === 'mouse' },
  {
    label: '红色幽灵动画',
    key: 'pacman',
    active: aiChatStore.loadingAnimation.type === 'pacman'
  },
  { label: '太极动画', key: 'taichi', active: aiChatStore.loadingAnimation.type === 'taichi' },
  {
    label: '风车动画',
    key: 'windmill',
    active: aiChatStore.loadingAnimation.type === 'windmill'
  },
  {
    label: '洗衣机动画',
    key: 'washing',
    active: aiChatStore.loadingAnimation.type === 'washing'
  },
  {
    label: '打字动画',
    key: 'typewriter',
    active: aiChatStore.loadingAnimation.type === 'typewriter'
  },
  {
    label: '狐狸动画',
    key: 'loadingFox',
    active: aiChatStore.loadingAnimation.type === 'loadingFox'
  }
]

// 添加组件挂载时的初始化
onMounted(async () => {
  await aiChatStore.initLoadingAnimation()
})

// 修改处理动画选择的方法
const handleAnimationSelect = async (key: string) => {
  try {
    await aiChatStore.setLoadingAnimation(
      key as
        | 'candle'
        | 'pencil'
        | 'mouse'
        | 'pacman'
        | 'taichi'
        | 'windmill'
        | 'washing'
        | 'typewriter'
        | 'loadingFox'
    )
    message.success('加载动画已更新')
  } catch (error) {
    message.error('更新加载动画失败')
  }
}
</script>

<style scoped lang="scss">
.ai-assistant-settings {
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

.ai-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;
  padding: 0 20px;

  .ai-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 30px;
    padding: 0 10px;
    .section-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      .section-title {
        font-size: 18px;
        line-height: 1;
        color: var(--color-text-primary);
        font-weight: 500;
        user-select: none;
      }
    }

    .section-desc {
      font-size: 14px;
      line-height: 1;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }

    .setting-item {
      width: 100%;
      margin-top: 8px;
    }
  }
}

// 模态框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: var(--color-bg-primary);
  border-radius: 8px;
  width: 580px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
      background: var(--color-background-secondary);
    }
  }
}

.modal-body {
  padding: 20px;

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      font-size: 14px;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--color-primary);
      }

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-left {
    display: flex;
    gap: 12px;
  }

  .footer-right {
    display: flex;
    gap: 12px;
  }
}

.form-help {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}
</style>
