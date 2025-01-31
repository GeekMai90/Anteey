<template>
  <div class="mindboard-card" @dblclick="openMindboard(mindboard.id)">
    <div class="mindboard-card-header">
      <!-- 更多功能菜单按钮 -->
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
        <!-- 更多功能菜单 -->
        <PopupMenu
          ref="moreMenuRef"
          :show="moreMenuState.isOpen"
          :button-ref="moreBtnRef"
          :menuItems="menuItems"
          @close="closeMoreMenu"
          @itemClick="handleMenuItemClick"
        />
      </div>
    </div>
    <div class="mindboard-card-content" @click="openMindboard(mindboard.id)">
      <div class="mindboard-name">
        <div class="icon">
          <Workbench
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div v-if="!isEditing" class="name" @dblclick.stop="startEditing" @click.stop>
          {{ mindboard.name }}
        </div>
        <input
          v-else
          ref="nameInput"
          v-model="editingName"
          class="name-input"
          @blur="finishEditing"
          @keyup.enter="finishEditing"
          @click.stop
        />
      </div>
    </div>
    <div class="mindboard-card-footer">
      <div class="update-time">{{ formatTime }}</div>
    </div>
    <ConfirmModal
      :show="showConfirmModal"
      title="删除思维板"
      message="确定要删除这个思维板吗？此操作不可撤销。"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { Mindboard } from '@shared/types'
import { Workbench, More, Edit, DeleteOne } from '@icon-park/vue-next'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmModal from '@renderer/components/common/ConfirmModal.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const props = defineProps<{
  mindboard: Mindboard
}>()

const router = useRouter()
const mindboardStore = useMindboardStore()

// 格式化更新时间
const formatTime = computed(() => {
  return formatDistanceToNow(new Date(props.mindboard.updated_at), {
    addSuffix: true,
    locale: zhCN
  })
})

// 打开思维板
const openMindboard = (id: string, event?: Event) => {
  if (event) {
    event.stopPropagation()
  }
  if (isEditing.value) {
    return
  }
  router.push(`/mindboard/${id}`)
}

// 更多菜单相关
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const showConfirmModal = ref(false)

const menuItems = ref<MenuItem[]>([
  {
    name: 'rename',
    icon: Edit,
    label: '重命名',
    action: () => {
      startEditing()
    }
  },
  {
    name: 'delete',
    icon: DeleteOne,
    label: '删除',
    action: () => {
      showConfirmModal.value = true
    },
    isDangerous: true
  }
])

const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef
})

// 处理菜单项点击
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

// 删除确认
const confirmDelete = async () => {
  try {
    await mindboardStore.deleteMindboard(props.mindboard.id)
    showConfirmModal.value = false
    closeMoreMenu()
  } catch (error) {
    console.error('删除思维板失败:', error)
  }
}

const cancelDelete = () => {
  showConfirmModal.value = false
}

// 重命名功能相关
const isEditing = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const startEditing = (event?: Event) => {
  if (event) {
    event.stopPropagation()
  }
  isEditing.value = true
  editingName.value = props.mindboard.name
  nextTick(() => {
    nameInput.value?.focus()
  })
}

const finishEditing = async (event?: Event) => {
  if (event) {
    event.stopPropagation()
  }
  isEditing.value = false
  if (editingName.value.trim() === '') {
    editingName.value = props.mindboard.name
    return
  }
  if (editingName.value !== props.mindboard.name) {
    try {
      await mindboardStore.updateMindboard(props.mindboard.id, {
        name: editingName.value.trim()
      })
    } catch (error) {
      console.error('重命名思维板失败:', error)
    }
  }
}
</script>

<style lang="scss" scoped>
// 复用 WhiteboardCard 的样式,只需要修改类名
.mindboard-card {
  // ... 复用 .whiteboard-card 的样式
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
  border: 1px solid var(--color-border);

  &:hover {
    box-shadow:
      0 10px 15px rgba(0, 0, 0, 0.1),
      0 4px 6px rgba(0, 0, 0, 0.05);
    .mindboard-card-header {
      opacity: 1;
    }
  }
}

// ... 其他样式保持不变,只需要修改对应的类名
.mindboard-card-header {
  // ... 复用 .whiteboard-card-header 的样式
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

.mindboard-card-content {
  // ... 复用 .whiteboard-card-content 的样式
  flex-grow: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.mindboard-name {
  // ... 复用 .whiteboard-name 的样式
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
    color: var(--color-text-primary);
    font-size: 18px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name-input {
    flex-grow: 1;
    font-size: 18px;
    color: var(--color-text-primary);
    background: transparent;
    outline: none;
    border: none;
    padding: 2px 4px;
    margin-left: 6px;
    width: 100%;
    box-sizing: border-box;
  }
}

.mindboard-card-footer {
  // ... 复用 .whiteboard-card-footer 的样式
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  user-select: none;

  .update-time {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}
</style>
