<!-- StarredNotes.vue - 星标笔记组件 -->
<!-- 用于显示和管理用户收藏的笔记列表，支持展开/折叠、拖拽排序和右键菜单操作 -->
<template>
  <div class="starred-notes">
    <!-- 星标区域头部，点击可展开/折叠列表 -->
    <div class="starred-header" @click="toggleStarredNotes">
      <span>星标</span>
      <div class="toggle-icon">
        <div class="icon">
          <Down
            v-if="isExpanded"
            theme="outline"
            size="18"
            fill="var(--color-icon-default)"
            :stroke-width="4"
          />
          <Right
            v-else
            theme="outline"
            size="18"
            fill="var(--color-icon-default)"
            :stroke-width="4"
          />
        </div>
      </div>
    </div>
    <!-- 可拖拽的笔记列表容器 -->
    <draggable
      v-if="isExpanded"
      v-model="localStarredNotes"
      class="starred-notes-container"
      item-key="id"
      :animation="200"
      ghost-class="ghost-class"
      @end="onDragEnd"
    >
      <!-- 单个笔记卡片，支持右键菜单 -->
      <template #item="{ element }">
        <div class="starred-note-card" @contextmenu.prevent="openContextMenu($event, element)">
          <div class="starred-note-content">
            <StarredNotesCard :note="element" @dblclick="openNote(element)" />
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, ref, shallowRef, watch } from 'vue'
import { Right, Down, Star } from '@icon-park/vue-next'
import { useNoteStore } from '../stores/noteStores'
import { Note } from '@renderer/types/Note'
import { useRouter } from 'vue-router'
import StarredNotesCard from './StarredNotesCard.vue'
import draggable from 'vuedraggable'
import { useContextMenuStore } from '../stores/contextMenuStore'

// 初始化必要的 store 和路由
const noteStore = useNoteStore()
const router = useRouter()
// 控制列表展开/折叠状态
const isExpanded = ref(true)
// 使用 shallowRef 优化性能，因为不需要深层响应性
const localStarredNotes = shallowRef<Note[]>([])

// 组件挂载时获取星标笔记列表
onMounted(async () => {
  await noteStore.fetchStarredNotes()
})

// 计算属性：获取 store 中的星标笔记
const starredNotes = computed(() => noteStore.starredNotes)

// 监听星标笔记变化，更新本地列表并按顺序排序
watch(
  starredNotes,
  (newStarredNotes) => {
    localStarredNotes.value = [...newStarredNotes].sort(
      (a, b) => (a.starredOrder ?? 0) - (b.starredOrder ?? 0)
    )
  },
  { immediate: true, deep: true }
)

// 右键菜单相关
const contextMenuStore = useContextMenuStore()
const openContextMenu = (event: MouseEvent, note: Note) => {
  const menuItems = [
    {
      label: '取消收藏',
      action: async () => {
        await noteStore.removeStarFromNote(note.id)
        contextMenuStore.closeMenu()
      },
      icon: markRaw(Star) // 使用 markRaw 包装图标组件
    }
  ]

  contextMenuStore.showMenu(event.clientX, event.clientY, menuItems)
}

// 切换列表展开/折叠状态
const toggleStarredNotes = () => {
  isExpanded.value = !isExpanded.value
}

// 拖拽结束后更新笔记顺序
const onDragEnd = () => {
  // 生成新的顺序数据
  const newOrders = localStarredNotes.value.map((note, index) => ({
    id: note.id,
    starredOrder: index + 1
  }))

  // 获取原始顺序用于比较
  const originalOrders = starredNotes.value.map((note) => ({
    id: note.id,
    starredOrder: note.starredOrder
  }))

  // 检查顺序是否真的改变了
  const orderChanged = newOrders.some((newOrder) => {
    const originalOrder = originalOrders.find((o) => o.id === newOrder.id)
    return newOrder.starredOrder !== originalOrder?.starredOrder
  })
  // 如果顺序改变，更新到数据库
  if (orderChanged) {
    noteStore.updateStarredNotesOrder(newOrders)
  }
}
// 打开笔记详情
const openNote = (note: Note) => {
  router.push({ name: 'NoteExpandEditor', params: { id: note.id.toString() } })
}
</script>

<style scoped lang="scss">
.starred-notes {
  padding: 0 10px;
  border-radius: 8px;

  .starred-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 8px 6px 10px;
    border-radius: 8px;
    margin-bottom: 5px;
    user-select: none;
    color: var(--color-text-secondary);
    &:hover {
      background-color: var(--color-hover-sidebar);
    }

    span {
      flex-grow: 1;
      font-size: 12px;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
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
          width: 16px;
          height: 16px;
        }
      }
    }
  }
}

.starred-notes-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 10px;
  border-radius: 8px;

  .starred-note-card {
    transition: all 0.3s ease;

    &.v-enter-from,
    &.v-leave-to {
      opacity: 0;
      transform: translateX(-30px);
    }

    &.v-enter-active,
    &.v-leave-active {
      transition: all 0.3s ease;
    }
  }

  .starred-note-content {
    cursor: move;
    border-radius: 8px;
    &:hover {
      background-color: var(--color-hover-sidebar);
    }
  }
}
/* 拖拽时的占位样式 */
.ghost-class {
  opacity: 0.5;
  background: rgba(var(--color-primary-rgb), 0.1);
}
</style>
