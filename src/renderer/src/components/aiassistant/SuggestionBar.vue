<template>
  <div class="suggestion-bar">
    <button class="action-btn" @click="$emit('new-chat')">
      <div class="icon">
        <Plus theme="outline" size="14" :stroke-width="3" />
      </div>
      <span class="text">新会话</span>
    </button>

    <button class="action-btn" @click="$emit('toggle-history')">
      <div class="icon">
        <History theme="outline" size="14" :stroke-width="3" />
      </div>
      <span class="text">历史会话</span>
    </button>

    <!-- <div class="divider"></div> -->

    <button
      v-for="suggestion in suggestions"
      :key="suggestion.id"
      class="action-btn"
      :class="{
        active: currentMode?.id === suggestion.id || (!currentMode && suggestion.id === 'ask')
      }"
      @click="selectMode(suggestion as Suggestion)"
    >
      <div class="icon">
        <component :is="suggestion.icon" theme="outline" size="14" :stroke-width="3" />
      </div>
      <span class="text">{{ suggestion.text }}</span>
    </button>

    <!-- 添加模型切换按钮 -->
    <div class="model-switcher">
      <button ref="modelBtnRef" class="model-switch-btn" @click="toggleModelMenu">
        <Receiver theme="outline" size="14" :stroke-width="3" />
      </button>

      <!-- 使用 Teleport 将菜单传送到 body -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showModelMenu" class="model-menu-container" :style="menuPosition">
            <div class="model-menu">
              <div
                v-for="config in llmConfigStore.configs"
                :key="config.id"
                class="model-option"
                :class="{ active: config.isDefault }"
                @click="handleModelSwitch(config.id)"
              >
                <span class="model-name">{{ LLM_MODELS[config.model].name }}</span>
                <Check v-if="config.isDefault" theme="outline" size="14" :stroke-width="3" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Suggestion } from '@shared/types'
import { ThinkingProblem, MessageEmoji, Plus, History, Receiver, Check } from '@icon-park/vue-next'
import { markRaw, ref, onMounted, onUnmounted, computed } from 'vue'
import { useLLMConfigStore } from '@renderer/stores/llmConfigStore'
import { LLM_MODELS } from '@services/rag/llm.config'
import type { CSSProperties } from 'vue'
import { message } from '@renderer/utils/message'

defineProps<{
  currentMode: Suggestion | null
}>()

const emit = defineEmits<{
  (e: 'select', suggestion: Suggestion): void
  (e: 'new-chat'): void
  (e: 'toggle-history'): void
}>()

const suggestions = [
  {
    id: 'ask',
    text: '问一问',
    icon: markRaw(ThinkingProblem),
    mode: 'ask',
    prompt: '',
    description: '从你的笔记中搜索相关内容'
  },
  {
    id: 'chat',
    text: '聊一聊',
    icon: markRaw(MessageEmoji),
    mode: 'chat',
    prompt: '',
    description: '与AI助手进行轻松的对话'
  }
]

const selectMode = (suggestion: Suggestion) => {
  emit('select', suggestion)
}

// 添加模型切换相关
const modelBtnRef = ref<HTMLButtonElement | null>(null)
const showModelMenu = ref(false)
const llmConfigStore = useLLMConfigStore()

const handleModelSwitch = async (configId: string) => {
  try {
    await llmConfigStore.setDefaultConfig(configId)
    showModelMenu.value = false
    message.success('已切换模型')
  } catch (error) {
    message.error('切换模型失败')
  }
}

// 修改菜单位置计算
const menuPosition = computed((): CSSProperties => {
  if (!modelBtnRef.value) return {}
  const rect = modelBtnRef.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    top: `${rect.top - 150}px`, // 向上偏移
    left: `${rect.left - 160}px` // 向左偏移以对齐右侧
  }
})

// 切换菜单显示状态
const toggleModelMenu = () => {
  showModelMenu.value = !showModelMenu.value
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (
    showModelMenu.value &&
    modelBtnRef.value &&
    !modelBtnRef.value.contains(event.target as Node)
  ) {
    const menu = document.querySelector('.model-menu')
    if (menu && !menu.contains(event.target as Node)) {
      showModelMenu.value = false
    }
  }
}

// 初始化加载配置
onMounted(() => {
  // 添加点击外部关闭菜单的事件监听
  document.addEventListener('click', handleClickOutside)
  // 加载模型配置
  llmConfigStore.loadConfigs()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.suggestion-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.divider {
  width: 1px;
  height: 16px;
  background-color: var(--color-border);
  margin: 0 4px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 32px;

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  .text {
    line-height: 1;
  }

  &:hover {
    background: var(--color-hover-bg);
    border-color: var(--color-border-light);
    color: var(--color-primary);
  }

  &.active {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
    color: var(--color-primary);

    .icon {
      color: var(--color-primary);
    }
  }
}

.model-switcher {
  position: relative;
  margin-left: auto; // 将模型切换按钮推到最右侧
}

.model-switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-hover-bg);
    border-color: var(--color-border-light);
    color: var(--color-primary);
  }
}

.model-menu-container {
  position: fixed;
  z-index: 9999;
}

.model-menu {
  width: 200px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  overflow: hidden;
}

// 添加过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);
  font-size: 13px;
  white-space: nowrap;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
  }

  .model-name {
    margin-right: 8px;
  }
}
</style>
