<!-- src/components/StarredNotes.vue -->
<template>
  <div class="starred-notes">
    <div class="starred-header" @click="toggleStarredNotes">
      <span>星标</span>
      <div class="toggle-icon">
        <div class="icon">
          <Down v-if="isExpanded" theme="outline" size="18" fill="var(--color-icon-default)" />
          <Right v-else theme="outline" size="18" fill="var(--color-icon-default)" />
        </div>
      </div>
    </div>
    <draggable
      v-model="localStarredNotes"
      class="starred-notes-container"
      item-key="id"
      :animation="200"
      ghost-class="ghost-class"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div class="starred-note-card">
          <div class="starred-note-content">
            <StarredNotesCard :note="element" @click.stop="openNote(element)" />
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Right, Down } from '@icon-park/vue-next'
import { useNoteStore } from '../stores/noteStores'
import { Note } from '@renderer/types/Note'
import { useRouter } from 'vue-router'
import StarredNotesCard from './StarredNotesCard.vue'
// import { VueDraggableNext } from 'vue-draggable-next'
import draggable from 'vuedraggable'

const noteStore = useNoteStore()
const router = useRouter()
const isExpanded = ref(true)

const starredNotes = computed(() => noteStore.starredNotes)

const localStarredNotes = ref<Note[]>([])

// 监听 starredNotes 的变化，更新本地列表
watch(
  starredNotes,
  (newStarredNotes) => {
    localStarredNotes.value = [...newStarredNotes].sort(
      (a, b) => (a.starredOrder ?? 0) - (b.starredOrder ?? 0)
    )
  },
  { immediate: true, deep: true }
)

const toggleStarredNotes = () => {
  isExpanded.value = !isExpanded.value
}

// const onDragEnd = () => {
//   console.log('Drag ended, updating order')
//   const orders = localStarredNotes.value.map((note, index) => ({
//     id: note.id,
//     starredOrder: localStarredNotes.value.length - index
//   }))
//   noteStore.updateStarredNotesOrder(orders)
// }
const onDragEnd = () => {
  console.log('Drag ended, updating order')
  const newOrders = localStarredNotes.value.map((note, index) => ({
    id: note.id,
    starredOrder: index + 1
  }))
  console.log('newOrders', newOrders)

  // 获取原始顺序
  const originalOrders = starredNotes.value.map((note) => ({
    id: note.id,
    starredOrder: note.starredOrder
  }))

  // 检查顺序是否真的改变了
  const orderChanged = newOrders.some((newOrder) => {
    const originalOrder = originalOrders.find((o) => o.id === newOrder.id)
    return newOrder.starredOrder !== originalOrder?.starredOrder
  })

  console.log('orderChanged', orderChanged)
  if (orderChanged) {
    noteStore.updateStarredNotesOrder(newOrders)
  }
}

const openNote = (note: Note) => {
  console.log('Clicked note:', note)
  router.push({ name: 'NoteExpandEditor', params: { id: note.id.toString() } })
}
</script>

<style scoped lang="scss">
.starred-notes {
  margin-top: 10px;
  padding: 0 10px;

  .starred-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 8px;
    margin-bottom: 5px;

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
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        padding: 0;

        // &:hover:not(:disabled) {
        //   background-color: rgba(0, 0, 0, 0.05);
        // }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 14px;
          height: 14px;
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
  .starred-note-content {
    cursor: move;
    &:hover {
      background-color: var(--color-hover-sidebar);
    }
  }
}
.ghost-class {
  opacity: 0.5;
  background: #c8ebfb;
}

.starred-notes-container {
  .starred-note-card {
    transition: all 0.3s;
  }
}
</style>
