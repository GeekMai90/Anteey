<template>
  <div class="graph-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <Motion
          as="div"
          class="icon"
          :initial="{ rotate: 0 }"
          :animate="{ rotate: isCollapsed ? 0 : -90 }"
          :transition="{ duration: 0.3, ease: 'easeInOut' }"
        >
          <GraphicStitchingThree
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
            :stroke-width="3"
          />
        </Motion>
        <div class="name">图谱</div>
      </div>
      <!-- 切换按钮 -->
      <div v-show="!isCollapsed" class="view-toggle">
        <button
          class="toggle-btn"
          :class="{ active: currentView === 'local' }"
          @click="switchView('local')"
        >
          局部图谱
        </button>
        <button
          class="toggle-btn"
          :class="{ active: currentView === 'hierarchy' }"
          @click="switchView('hierarchy')"
        >
          局部知识树
        </button>
      </div>
    </div>

    <Motion
      as="div"
      class="panel-content"
      :initial="{ height: 0, opacity: 0, scale: 0.98 }"
      :animate="{
        height: isCollapsed ? 0 : 600,
        opacity: isCollapsed ? 0 : 1,
        scale: isCollapsed ? 0.98 : 1
      }"
      :transition="{
        duration: 0.3,
        ease: 'easeInOut'
      }"
      @animationComplete="onAnimationComplete"
    >
      <!-- 使用 v-show 来切换显示不同的视图 -->
      <div v-show="currentView === 'local'" class="view-container">
        <LocalMapPanel v-if="noteId" :note-id="noteId" :hide-header="true" :is-collapsed="false" />
      </div>
      <div v-show="currentView === 'hierarchy'" class="view-container">
        <HierarchyTreePanel
          v-if="noteId"
          :note-id="noteId"
          :hide-header="true"
          :is-collapsed="false"
        />
      </div>
    </Motion>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GraphicStitchingThree } from '@icon-park/vue-next'
import { Motion } from 'motion-v'
import LocalMapPanel from './LocalMapPanel.vue'
import HierarchyTreePanel from './HierarchyTreePanel.vue'

defineProps<{
  noteId: string
}>()

const currentView = ref<'local' | 'hierarchy'>('local')
const isCollapsed = ref(true)

// 切换视图
const switchView = (view: 'local' | 'hierarchy') => {
  currentView.value = view
}

// 切换面板展开/折叠
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

// 动画完成回调
const onAnimationComplete = () => {
  // 如果需要在动画完成后执行一些操作
}
</script>

<style lang="scss" scoped>
.graph-panel {
  padding: 0 20px 10px 20px;
  user-select: none;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      position: relative;

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
          width: 18px;
          height: 18px;
        }
      }

      .name {
        font-size: 14px;
        line-height: 24px;
        user-select: none;
      }
    }

    .view-toggle {
      display: flex;
      gap: 8px;

      .toggle-btn {
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--color-hover-bg);
        }

        &.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
      }
    }
  }

  .panel-content {
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    transform-origin: top;
    will-change: transform, height, opacity;

    .view-container {
      width: 100%;
      height: 100%;

      :deep(.local-tree-panel),
      :deep(.hierarchy-tree-panel) {
        margin-top: 0;
        padding: 0;
        height: 100%;

        // 移除子组件的背景和圆角,因为已经由父容器提供
        .tree-container {
          background: transparent;
          border-radius: 0;
          margin-bottom: 0;
          height: 100%;
          min-height: unset;
          overflow-x: auto;
          overflow-y: hidden;
        }

        // 让 SVG 图表填充整个容器
        .tree-graph {
          width: 100%;
          height: 100% !important;
          min-width: min-content;
        }

        // 隐藏子组件的标题
        .panel-header {
          display: none;
        }
      }
    }
  }
}
</style>
