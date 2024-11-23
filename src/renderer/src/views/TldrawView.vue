<template>
  <div class="tldraw-view">
    <AppToolbar class="tldraw-toolbar" />
    <div class="tldraw-container">
      <TldrawBoard v-if="boardId" :boardId="boardId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTldrawStore } from '../stores/tldrawStore'
import TldrawBoard from '../components/tldraw/TldrawBoard.vue'
import AppToolbar from '../components/layout/AppToolbar.vue'

const route = useRoute()
const router = useRouter()
const tldrawStore = useTldrawStore()
const boardId = ref<string>('')

onMounted(async () => {
  const id = route.params.id as string

  if (id) {
    // 加载现有白板
    boardId.value = id
    await tldrawStore.fetchBoards({})
    const board = tldrawStore.getBoard(id)
    if (!board) {
      console.error('白板不存在')
      router.push('/tldraw')
    }
  } else {
    // 创建新白板
    try {
      const newBoard = await tldrawStore.createBoard({
        name: '新白板',
        description: '',
        isFolder: false,
        sortOrder: 0
      })
      boardId.value = newBoard.id
      router.replace(`/tldraw/${newBoard.id}`)
    } catch (error) {
      console.error('创建白板失败:', error)
    }
  }
})
</script>

<style scoped>
.tldraw-view {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.tldraw-toolbar {
  flex: none;
  z-index: 100;
}

.tldraw-container {
  position: relative;
  flex: 1;
  overflow: hidden;
}

:global(#app) {
  height: 100vh;
  overflow: hidden;
}

:global(body),
:global(html) {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>
