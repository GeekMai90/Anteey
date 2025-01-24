<!-- StarredNotes.vue - 星标笔记组件 -->
<!-- 用于显示和管理用户收藏的笔记列表，支持展开/折叠、拖拽排序和右键菜单操作 -->
<template>
  <div class="starred-notes">
    <!-- 可拖拽的笔记列表容器 -->
    <draggable
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
            <StarredNotesCard
              :key="`${element.id}-${element.updatedAt}`"
              :note="element"
              @click="openNote(element)"
            />
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { markRaw, onMounted, ref, watch } from 'vue'
import { Star } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStore'
import type { Note } from '@shared/types'
import { useRouter } from 'vue-router'
import StarredNotesCard from './StarredNotesCard.vue'
import draggable from 'vuedraggable'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { storeToRefs } from 'pinia'

// 初始化必要的 store 和路由
const noteStore = useNoteStore()
const router = useRouter()

const localStarredNotes = ref<Note[]>([])

const fetchStarredNotes = async () => {
  await noteStore.fetchStarredNotes()
}
// 组件挂载时获取星标笔记列表
onMounted(async () => {
  await fetchStarredNotes()
})

// 计算属性：获取 store 中的星标笔记，并保持响应式
const { starredNotes } = storeToRefs(noteStore)

// 监听星标笔记变化，更新本地列表并按顺序排序

watch(
  starredNotes,
  (newStarredNotes) => {
    // console.log('StarredNotes.vue→ 监听星标笔记变化', newStarredNotes)
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
      icon: markRaw(Star)
    }
  ]

  contextMenuStore.showMenuAtPosition(event.clientX, event.clientY, menuItems)
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

// 添加 props 定义
const props = defineProps<{
  active: boolean
}>()

// 监听 active 变化
watch(
  () => props.active,
  async (newActive) => {
    if (newActive) {
      // 当组件被激活时，刷新数据
      await fetchStarredNotes()
    }
  }
)
</script>

<style scoped lang="scss">
.starred-notes {
  border-radius: 8px;
}

.starred-notes-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
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
      background: rgba(var(--color-sidebar-icon-bg), 0.04);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
  }
}
/* 拖拽时的占位样式 */
.ghost-class {
  opacity: 0.5;
  background: rgba(var(--color-primary-rgb), 0.1);
}
</style>
