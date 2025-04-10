<template>
  <div class="mindboard-card-list">
    <!-- 卡片列表 -->
    <div v-if="nodes.length > 0" class="nodes-list">
      <!-- 笔记卡片 -->
      <template v-for="node in nodes" :key="node.id">
        <!-- 笔记卡片 -->
        <RightSidebarCardboxCard
          v-if="node.type === 'card' && node.data.noteId && noteMap[node.data.noteId]"
          :note="noteMap[node.data.noteId]"
          :highlighted-note-id="null"
          class="card-item"
        />

        <!-- 笔记加载中或未找到 -->
        <div
          v-else-if="node.type === 'card' && node.data.noteId && !noteMap[node.data.noteId]"
          class="card-item loading-card"
        >
          <div class="card-content">
            <div class="content-preview">加载中...</div>
          </div>
        </div>

        <!-- 文本卡片 -->
        <div
          v-else-if="node.type === 'text'"
          class="text-card card-item"
          draggable="true"
          @dragstart="handleDragStart($event, node)"
        >
          <div class="card-content">
            <div v-if="typeof node.data.content === 'string'" class="content-preview">
              {{ node.data.content }}
            </div>
            <JsonContentRenderer
              v-else-if="typeof node.data.content === 'object'"
              :content="node.data.content"
              :editable="false"
              :enable-drag-handle="false"
              class="tiptap-content"
            />
          </div>
        </div>

        <!-- 便签卡片 -->
        <div
          v-else-if="node.type === 'memo'"
          class="memo-card card-item"
          :style="{ backgroundColor: node.data.backgroundColor || '#FEF3A4' }"
          draggable="true"
          @dragstart="handleDragStart($event, node)"
        >
          <div class="card-content">
            <div v-if="typeof node.data.content === 'string'" class="content-preview">
              {{ node.data.content }}
            </div>
            <JsonContentRenderer
              v-else-if="typeof node.data.content === 'object'"
              :content="node.data.content"
              :editable="false"
              :enable-drag-handle="false"
              class="tiptap-content"
            />
          </div>
        </div>

        <!-- 图片卡片 -->
        <div
          v-else-if="node.type === 'image'"
          class="image-card card-item"
          draggable="true"
          @dragstart="handleDragStart($event, node)"
        >
          <div class="card-content">
            <img :src="node.data.imageUrl" alt="图片" />
          </div>
        </div>
      </template>
    </div>

    <!-- 空状态 -->
    <EmptyState v-else alt="暂无卡片" text="该思维板中没有卡片" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import RightSidebarCardboxCard from './RightSidebarCardboxCard.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'
import type { GraphNode } from '@vue-flow/core'
import type { Note } from '@shared/types'

const props = defineProps<{
  mindboardId: string
}>()

const mindboardStore = useMindboardStore()
const noteStore = useNoteStore()
const nodes = ref<GraphNode[]>([])
const noteMap = ref<Record<string, Note>>({})

// 获取思维板中的节点
const fetchMindboardNodes = async () => {
  if (!props.mindboardId) return

  try {
    await mindboardStore.loadMindboardData(props.mindboardId)
    if (mindboardStore.currentMindboard?.flow_data) {
      nodes.value = mindboardStore.currentMindboard.flow_data.nodes || []

      // 获取所有笔记卡片的笔记数据
      const noteIds = nodes.value
        .filter((node) => node.type === 'card' && node.data.noteId)
        .map((node) => node.data.noteId)

      // 批量获取笔记数据
      const notes = await Promise.all(
        noteIds.map(async (noteId) => {
          try {
            const note = await noteStore.fetchNote(noteId)
            return note ? [noteId, note] : null
          } catch (error) {
            console.error('获取笔记失败:', error)
            return null
          }
        })
      )

      // 更新笔记映射
      noteMap.value = Object.fromEntries(notes.filter(Boolean) as [string, Note][])
    }
  } catch (error) {
    console.error('加载思维板数据失败:', error)
    nodes.value = []
    noteMap.value = {}
  }
}

// 监听思维板ID变化
watch(
  () => props.mindboardId,
  () => {
    fetchMindboardNodes()
  }
)

// 组件挂载时获取数据
onMounted(() => {
  if (props.mindboardId) {
    fetchMindboardNodes()
  }
})

// 添加拖拽处理函数
const handleDragStart = (event: DragEvent, node: GraphNode) => {
  if (!event.dataTransfer) return

  // 获取正确的内容文本用于显示
  let displayText = ''
  if (typeof node.data.content === 'string') {
    displayText = node.data.content
  } else if (typeof node.data.content === 'object') {
    // 如果是 Tiptap 内容，尝试提取第一段文本
    const firstParagraph = node.data.content?.content?.[0]?.content?.[0]?.text
    displayText = firstParagraph || '无内容'
  }

  // 创建一个包含节点数据的对象
  const dragData = {
    id: node.id,
    type: node.type,
    content:
      node.type === 'image'
        ? {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'image',
                    attrs: {
                      src: node.data.imageUrl,
                      alt: '图片',
                      title: null
                    }
                  }
                ]
              }
            ]
          }
        : node.data.content,
    backgroundColor: node.type === 'memo' ? node.data.backgroundColor : undefined,
    imageUrl: node.type === 'image' ? node.data.imageUrl : undefined
  }

  try {
    // 设置拖拽数据
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    event.dataTransfer.effectAllowed = 'copy'

    // 创建拖拽时的视觉效果
    const dragImage = document.createElement('div')
    dragImage.style.cssText = `
      position: absolute;
      width: 200px;
      height: ${node.type === 'image' ? '100px' : '50px'};
      background: ${node.type === 'memo' ? node.data.backgroundColor || '#FEF3A4' : 'var(--color-bg-note-card)'};
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: ${node.type === 'image' ? '0' : '10px'};
      opacity: 0.8;
      pointer-events: none;
      display: flex;
      align-items: center;
      overflow: hidden;
    `

    if (node.type === 'image') {
      const img = document.createElement('img')
      img.src = node.data.imageUrl
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `
      dragImage.appendChild(img)
    } else {
      dragImage.textContent = displayText.substring(0, 50) + (displayText.length > 50 ? '...' : '')
    }

    document.body.appendChild(dragImage)
    // 设置拖拽图像
    event.dataTransfer.setDragImage(dragImage, 100, 25)

    // 拖拽结束后移除临时元素
    setTimeout(() => {
      if (dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage)
      }
    }, 0)
  } catch (error) {
    console.error('设置拖拽数据失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.mindboard-card-list {
  height: 100%;

  .nodes-list {
    display: flex;
    flex-direction: column;
    padding: 16px 0;
    overflow-y: auto;
    gap: 12px;

    .card-item {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--color-bg-primary);
      box-shadow: var(--shadow-card);
      max-height: 300px;
      display: flex;
      flex-direction: column;

      &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
      }

      &.loading-card {
        opacity: 0.6;
        cursor: wait;

        .content-preview {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: var(--color-text-secondary);
        }
      }

      .card-content {
        padding: 12px;
        min-height: 100px;
        overflow-y: auto;
        flex: 1;

        .content-preview {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text);
          white-space: pre-wrap;
          word-break: break-word;
        }

        :deep(.tiptap-content) {
          font-size: 14px;
          line-height: 1.5;

          .tiptap {
            padding: 0;
            min-height: auto;

            p {
              margin: 0;
            }
          }
        }

        img {
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        &::-webkit-scrollbar {
          width: 4px;
        }

        &::-webkit-scrollbar-track {
          background: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background-color: var(--color-scrollbar);
          border-radius: 2px;
        }
      }
    }

    .text-card {
      background: var(--color-bg-primary);
    }

    .memo-card {
      border: none;
    }

    .image-card {
      .card-content {
        padding: 0;
      }
    }
  }
}
</style>
