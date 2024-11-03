<template>
  <div class="canvas-card" @click="openCanvas">
    <div class="canvas-card-header">
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
        <PopupMenu
          ref="moreMenuRef"
          :show="moreMenuState.isOpen"
          :position="moreMenuState.position"
          :menuItems="canvasMenuItems"
          @close="closeMoreMenu"
          @itemClick="handleMenuItemClick"
        />
      </div>
    </div>
    <div class="canvas-card-content" @dblclick.stop="openCanvas()">
      <div class="canvas-name">
        <div class="icon">
          <Platte
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">
          {{ canvas.name }}
        </div>
      </div>
    </div>
    <div class="canvas-card-footer">
      <div class="assetCount">{{ assetCount }}</div>
      <div class="assetCountText">个元素</div>
    </div>
    <ConfirmModal
      :show="showConfirmModal"
      title="删除画布"
      message="确定要删除这个画布吗？此操作不可撤销。"
      @confirm="confirmDeleteCanvas"
      @cancel="cancelDeleteCanvas"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref } from 'vue'
import type { Canvas } from '@renderer/types/Note'
import { Platte, More } from '@icon-park/vue-next'
import { useCanvasStore } from '@renderer/stores/canvasStore'
import router from '@renderer/router'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmModal from '@renderer/components/ConfirmModal.vue'
import { useMenu } from '@renderer/composables/useMenu'

const props = defineProps<{
  canvas: Canvas
}>()

const canvasStore = useCanvasStore()

// 初始化数据
const assetCount = ref(0)
onMounted(async () => {
  // TODO: 实现获取画布资产数量的方法
  // assetCount.value = await canvasStore.getAssetCount(props.canvas.id)
})

// 打开画布
const openCanvas = async () => {
  try {
    // 先获取最新的画布数据
    await canvasStore.fetchCanvas(props.canvas.id)
    // 然后再跳转
    router.push(`/canvas/${props.canvas.id}`)
  } catch (error) {
    console.error('打开画布失败:', error)
    emit('error', new Error('打开画布失败，请稍后重试'))
  }
}

const emit = defineEmits<{
  (e: 'error', error: Error): void
}>()

// 菜单相关
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef
})

// 菜单项
const canvasMenuItems = [
  {
    name: 'delete',
    label: '删除',
    action: () => {
      showConfirmModal.value = true
    }
  }
]

// 删除相关
const showConfirmModal = ref(false)
const confirmDeleteCanvas = async () => {
  try {
    await canvasStore.deleteCanvas(props.canvas.id)
    showConfirmModal.value = false
    closeMoreMenu()
  } catch (error) {
    console.error('删除画布失败:', error)
  }
}
const cancelDeleteCanvas = () => {
  showConfirmModal.value = false
  closeMoreMenu()
}

const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}
</script>

<style lang="scss" scoped>
.canvas-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-note-card-bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease-in-out;

  &:hover {
    box-shadow:
      0 10px 15px rgba(0, 0, 0, 0.1),
      0 4px 6px rgba(0, 0, 0, 0.05);
    .canvas-card-header {
      opacity: 1;
    }
  }
}

.canvas-card-header {
  display: flex;
  width: 100%;
  height: 24px;
  align-items: center;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  .icon {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background-color: var(--color-hover-button);
    }

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
}

.canvas-card-content {
  flex-grow: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.canvas-name {
  display: flex;
  align-items: center;
  width: 100%;

  .icon {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

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
    flex-grow: 1;
    text-align: left;
    color: var(--default-text-color);
    font-size: 18px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    text-overflow: ellipsis;
    overflow: hidden;
  }
}

.canvas-card-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  user-select: none;

  .assetCount {
    font-size: 14px;
    font-weight: bold;
    margin-right: 4px;
  }

  .assetCountText {
    font-size: 14px;
    color: #666;
  }
}

// 更多按钮相关样式
.more-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--color-hover-button);
    }
  }
}

// 确认对话框相关样式
:deep(.modal-overlay) {
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

:deep(.modal-content) {
  background-color: var(--color-bg-primary);
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
