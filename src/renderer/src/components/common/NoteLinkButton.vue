<template>
  <div class="note-link-wrapper">
    <div
      v-if="hasLinks"
      ref="linkButtonRef"
      class="link-button"
      @click.stop="handleLinkButtonClick"
      @dblclick.stop.prevent
    >
      <LinkThree theme="outline" size="16" :strokeWidth="2" class="link-icon" />
    </div>

    <div
      v-show="showLinkMenu"
      ref="linkMenuRef"
      class="link-menu"
      :style="floatingStyles"
      @wheel.stop="handleMenuScroll"
      @click.stop
      @dblclick.stop.prevent
    >
      <!-- 直接引用 -->
      <div v-if="directLinksData.length > 0" class="link-section">
        <div class="section-title">直接引用 ({{ directLinksData.length }})</div>
        <div class="links-list">
          <div
            v-for="linkedNote in directLinksData"
            :key="linkedNote.id"
            class="link-item"
            @click="(e) => handleLinkItemClick(linkedNote, e)"
          >
            <div class="link-content">
              <div class="note-info">
                <div class="address-line">
                  <div class="note-type" :class="linkedNote.cardType || 'Maincard'"></div>
                  <div class="note-address">{{ linkedNote.address || '无编码地址' }}</div>
                </div>
                <div class="note-title">{{ linkedNote.title || '未命名笔记' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 反向引用 -->
      <div v-if="backlinksData.length > 0" class="link-section">
        <div class="section-title">反向引用 ({{ backlinksData.length }})</div>
        <div class="links-list">
          <div
            v-for="linkedNote in backlinksData"
            :key="linkedNote.id"
            class="link-item"
            @click="(e) => handleLinkItemClick(linkedNote, e)"
          >
            <div class="link-content">
              <div class="note-info">
                <div class="address-line">
                  <div class="note-type" :class="linkedNote.cardType || 'Maincard'"></div>
                  <div class="note-address">{{ linkedNote.address || '无编码地址' }}</div>
                </div>
                <div class="note-title">{{ linkedNote.title || '未命名笔记' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无链接时显示的状态 -->
      <div v-if="!directLinksData.length && !backlinksData.length" class="empty-state">
        暂无相关链接
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import { LinkThree } from '@icon-park/vue-next'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'
import type { Note, References } from '@shared/types'

const props = defineProps<{
  noteId: string
  containerClass?: string // 用于指定滚动容器的类名
}>()

const router = useRouter()
const noteStore = useNoteStore()
const uiStore = useUIStore()

// 基础状态
const showLinkMenu = ref(false)
const linkButtonRef = ref<HTMLElement | null>(null)
const linkMenuRef = ref<HTMLElement | null>(null)
const hasLinks = ref(false)
const directLinksData = ref<Note[]>([])
const backlinksData = ref<Note[]>([])

// floating-ui 配置
const { floatingStyles } = useFloating(linkButtonRef, linkMenuRef, {
  placement: 'top-start',
  middleware: [
    offset(8),
    flip({
      fallbackPlacements: ['bottom-start', 'top-end', 'bottom-end']
    }),
    shift({ padding: 8 })
  ],
  whileElementsMounted: autoUpdate
})

// 获取链接数据
const fetchLinksData = async () => {
  try {
    const currentNote = await noteStore.fetchNote(props.noteId)
    if (currentNote?.references) {
      const refs = currentNote.references as References

      // 获取直接引用
      const directNotes = await Promise.all(
        (refs.outgoing || []).map((link) => noteStore.fetchNote(link.targetNoteId || ''))
      )
      directLinksData.value = directNotes.filter((note): note is Note => note !== null)

      // 获取反向引用
      const backNotes = await Promise.all(
        (refs.incoming || []).map((link) => noteStore.fetchNote(link.sourceNoteId || ''))
      )
      backlinksData.value = backNotes.filter((note): note is Note => note !== null)

      // 更新是否有链接的状态
      hasLinks.value = directLinksData.value.length > 0 || backlinksData.value.length > 0
    }
  } catch (error) {
    console.error('获取链接数据失败:', error)
  }
}

// 滚动控制
const disablePageScroll = () => {
  const container = document.querySelector(`.${props.containerClass || 'cardbox-container'}`)
  if (container) {
    container.classList.add('no-scroll')
  }
}

const enablePageScroll = () => {
  const container = document.querySelector(`.${props.containerClass || 'cardbox-container'}`)
  if (container) {
    container.classList.remove('no-scroll')
  }
}

// 事件处理
const handleLinkButtonClick = async (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  if (!showLinkMenu.value) {
    await fetchLinksData()
    disablePageScroll()
  } else {
    enablePageScroll()
  }
  showLinkMenu.value = !showLinkMenu.value
}

// 添加查看笔记上下文的方法
const viewNoteContext = (noteId: string) => {
  router.push({
    name: 'cardbox',
    query: {
      mode: 'context',
      noteId: noteId
    }
  })
}

const handleLinkItemClick = (note: Note, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  showLinkMenu.value = false
  enablePageScroll()

  // Alt + 点击：在卡片盒中查看上下文
  if (event.altKey) {
    viewNoteContext(note.id)
  }
  // Shift + 点击：在知识树中查看
  else if (event.shiftKey && note.address) {
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: note.address }
    })
  }
  // Command/Ctrl + 点击：展开编辑
  else if (event.metaKey || event.ctrlKey) {
    router.push({
      name: 'NoteExpandEditor',
      params: { id: note.id }
    })
  }
  // 普通点击：打开侧边栏预览
  else {
    noteStore.openBacklinkPreview(note.id)
    uiStore.openRightSidebarWithTab('backlink')
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (
    showLinkMenu.value &&
    linkMenuRef.value &&
    !linkMenuRef.value.contains(e.target as Node) &&
    linkButtonRef.value &&
    !linkButtonRef.value.contains(e.target as Node)
  ) {
    showLinkMenu.value = false
    enablePageScroll()
  }
}

const handleMenuScroll = (event: WheelEvent) => {
  event.stopPropagation()

  const menu = event.currentTarget as HTMLElement
  const scrollTop = menu.scrollTop
  const scrollHeight = menu.scrollHeight
  const clientHeight = menu.clientHeight

  if (
    (scrollTop <= 0 && event.deltaY < 0) ||
    (scrollTop + clientHeight >= scrollHeight && event.deltaY > 0)
  ) {
    event.preventDefault()
  }
}

// 生命周期
onMounted(async () => {
  await fetchLinksData()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  enablePageScroll()
})

// 监听菜单状态
watch(showLinkMenu, (newValue) => {
  if (newValue) {
    disablePageScroll()
  } else {
    enablePageScroll()
  }
})
</script>

<style lang="scss" scoped>
.note-link-wrapper {
  position: relative;
  display: inline-flex;
}

.link-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-tertiary);

  &:hover {
    color: var(--color-primary);
    background-color: var(--color-hover-button);
  }

  .link-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;

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

    &:hover {
      opacity: 1;
    }
  }
}

.link-menu {
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 200px;
  max-width: 280px;
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar);
    border-radius: 4px;
  }

  .link-section {
    & + .link-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--color-border);
    }

    .section-title {
      font-size: 12px;
      color: var(--color-text-tertiary);
      margin-bottom: 6px;
      padding: 0 4px;
    }

    .links-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .link-item {
      padding: 6px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--color-border);

      &:hover {
        background-color: var(--color-hover-button);
      }

      .link-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .note-info {
          min-width: 0;
          width: 100%;

          .address-line {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;

            .note-type {
              width: 3px;
              height: 12px;
              border-radius: 1.5px;
              flex-shrink: 0;

              &.Maincard {
                background: var(--color-primary);
              }
              &.Bibcard {
                background: var(--color-yellow);
              }
              &.Indexcard {
                background: var(--color-blue);
              }
              &.Hoplinkcard {
                background: var(--color-pink);
              }
              &.Draftcard {
                background: var(--color-draft);
              }
            }

            .note-address {
              font-size: 12px;
              color: var(--color-text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          .note-title {
            font-size: 13px;
            color: var(--color-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-left: 11px; // 与装饰条对齐
          }
        }
      }
    }
  }

  .empty-state {
    padding: 12px;
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 13px;
  }
}
</style>
