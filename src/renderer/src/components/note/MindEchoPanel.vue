<template>
  <div class="mind-echo-panel">
    <!-- 固定区域：面板头部 -->
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <Motion
          as="div"
          class="icon"
          :initial="{ rotate: 0 }"
          :animate="{ rotate: isCollapsed ? 0 : -45 }"
          :transition="{ duration: 0.3, ease: 'easeInOut' }"
        >
          <Brain
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
            :stroke-width="3"
          />
        </Motion>
        <div class="name">思维共鸣 ({{ mindEchoes.length }})</div>
      </div>
    </div>

    <!-- 可展开的内容区域 -->
    <transition name="expand" @enter="enter" @after-enter="afterEnter" @leave="leave">
      <div v-show="!isCollapsed" class="echoes-container">
        <div v-if="mindEchoes.length === 0" class="empty-state">
          <div class="empty-icon">
            <Brain theme="outline" size="32" :stroke-width="3" />
          </div>
          <div class="empty-text">暂无思维共鸣</div>
          <div class="empty-desc">与AI对话时，可以将有价值的内容添加到思维共鸣</div>
        </div>
        <div v-else class="echoes-list">
          <MindEchoCard
            v-for="echo in mindEchoes"
            :key="echo.id"
            :echo="echo"
            @delete="handleEchoDelete"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Brain } from '@icon-park/vue-next'
import { Motion } from 'motion-v'
import { useMindEchoStore } from '@renderer/stores/mindEchoStore'
import type { MindEcho } from '@shared/types/mind-echo'
import MindEchoCard from './MindEchoCard.vue'
import { message } from '@renderer/utils/message'

const props = defineProps<{
  noteId: string
}>()

// 状态
const isCollapsed = ref(true)
const mindEchoStore = useMindEchoStore()
const mindEchoes = ref<MindEcho[]>([])

// 切换面板展开/折叠
const togglePanel = async () => {
  isCollapsed.value = !isCollapsed.value
  if (!isCollapsed.value) {
    await refreshEchoes()
  }
}

// 刷新数据
const refreshEchoes = async () => {
  try {
    const echoes = await mindEchoStore.fetchNoteMindEchoes(props.noteId)
    mindEchoes.value = echoes
  } catch (error) {
    console.error('获取思维共鸣失败:', error)
    message.error('获取思维共鸣失败')
  }
}

// 初始化加载数据
onMounted(async () => {
  await refreshEchoes()
})

// 监听笔记ID变化
watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      await refreshEchoes()
    }
  }
)

// 处理思维共鸣删除
const handleEchoDelete = async (id: string) => {
  try {
    await mindEchoStore.deleteMindEcho(id)
    await refreshEchoes()
  } catch (error) {
    console.error('删除思维共鸣失败:', error)
    message.error('删除思维共鸣失败')
  }
}

// 展开/折叠动画
const enter = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = 'auto'
  const height = el.scrollHeight
  el.style.height = '0px'
  el.offsetHeight // 触发重绘
  el.style.height = `${height}px`
}

const afterEnter = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = 'auto'
}

const leave = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = `${el.scrollHeight}px`
  el.offsetHeight // 触发重绘
  el.style.height = '0px'
}
</script>

<style scoped lang="scss">
.mind-echo-panel {
  padding: 0 20px 10px;
  border-radius: 0 0 8px 8px;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;

      .icon {
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transform-origin: center;
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

      .name {
        font-size: 14px;
        line-height: 1;
        color: var(--color-text-secondary);
        user-select: none;
      }
    }
  }

  .echoes-container {
    overflow: hidden;
  }

  .echoes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 0;
    color: var(--color-text-tertiary);

    .empty-icon {
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .empty-desc {
      font-size: 13px;
      color: var(--color-text-quaternary);
    }
  }
}

// 添加过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
}
</style>
