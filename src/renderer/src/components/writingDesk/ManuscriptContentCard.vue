<template>
  <div class="manuscript-content-card-wrapper">
    <!-- 顶部添加按钮 -->
    <div
      class="add-card-button top"
      :class="{ show: isHovered }"
      @click.stop="$emit('add', 'before')"
    >
      <AddFour theme="outline" size="16" :strokeWidth="3" />
    </div>

    <div
      class="manuscript-content-card"
      :class="{
        'is-reference': isReferenceCard,
        'is-editing': editorRef?.isEditing,
        'is-collapsed': isCollapsed
      }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- 卡片头部 - 整个头部作为拖动区域 -->
      <div class="card-header drag-handle">
        <div class="card-type">
          <div class="type-indicator"></div>
          <span v-if="isReferenceCard" class="note-address" :title="noteAddress">{{
            noteAddress
          }}</span>
          <span v-else class="type-text">上下文卡片</span>
        </div>
        <div class="card-actions">
          <!-- 折叠/展开按钮 -->
          <IconButton
            :icon="isCollapsed ? ExpandDownOne : FoldUpOne"
            :tooltip="isCollapsed ? '展开卡片' : '折叠卡片'"
            size="medium"
            @click="toggleCollapse"
          />

          <!-- 查看原文按钮 -->
          <IconButton v-if="isReferenceCard" size="medium" :icon="Link" @click="viewSourceNote" />

          <!-- 更多操作按钮 -->
          <IconButton
            ref="moreBtnRef"
            size="medium"
            :icon="More"
            tooltip="更多操作"
            @click="handleMoreClick"
          />
        </div>
      </div>

      <!-- 卡片内容 -->
      <div class="card-content">
        <TipTapEditor
          ref="editorRef"
          :content="localContent"
          :noteId="card.noteId || ''"
          :editable="true"
          :enable-drag-handle="false"
          :enable-add-paragraph-area="false"
          :show-character-count="false"
          @update:content="handleContentUpdate"
        />
      </div>

      <!-- 更多操作菜单 -->
      <PopupMenu
        :show="showMoreMenu"
        :button-ref="moreBtnRef?.el || null"
        :menuItems="menuItems"
        @close="closeMoreMenu"
        @itemClick="handleMenuItemClick"
      />
    </div>

    <!-- 底部添加按钮 -->
    <div
      class="add-card-button bottom"
      :class="{ show: isHovered }"
      @click.stop="$emit('add', 'after')"
    >
      <AddFour theme="outline" size="16" :strokeWidth="3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, onMounted, onBeforeUnmount } from 'vue'
import { More, Delete, Link, AddFour, FoldUpOne, ExpandDownOne } from '@icon-park/vue-next'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import type { ManuscriptCard } from '@shared/types'
import { debounce } from 'lodash-es'
import { message } from '@renderer/utils/message'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '../../stores/UIStore'
import IconButton from '@renderer/components/ui/IconButton.vue'

const props = defineProps<{
  card: ManuscriptCard
}>()

const emit = defineEmits<{
  'update:content': [content: any]
  delete: []
  add: [position: 'before' | 'after']
}>()

const editorRef = ref<any>(null)
const moreBtnRef = ref<{ el: HTMLElement | null } | null>(null)
const showMoreMenu = ref(false)
const isHovered = ref(false)
// 添加折叠状态
const isCollapsed = ref(false)

const noteStore = useNoteStore()

// 本地内容状态管理
const localContent = ref<any>(props.card.content)

// 是否为引用卡片
const isReferenceCard = computed(() => Boolean(props.card.noteId))

// 添加切换折叠状态的方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 使用防抖保存内容
const saveContent = debounce(async (content: any) => {
  try {
    console.log('ManuscriptContentCard - 保存内容:', {
      cardId: props.card.id,
      contentLength: JSON.stringify(content).length
    })
    emit('update:content', content)
  } catch (error) {
    console.error('ManuscriptContentCard - 保存内容失败:', error)
  }
}, 1000)

// 获取引用笔记的内容
const fetchReferenceNoteContent = async () => {
  if (!props.card.noteId) return

  try {
    const note = await noteStore.fetchNote(props.card.noteId)
    if (note) {
      // 更新本地内容
      localContent.value = note.content
    } else {
      message.error('未找到引用的笔记')
    }
  } catch (error) {
    console.error('获取引用笔记内容失败:', error)
    message.error('获取引用笔记内容失败')
  }
}

// 修改引用卡片的显示信息
const noteAddress = ref('')

// 获取笔记地址
const fetchNoteAddress = async () => {
  if (!props.card.noteId) return

  try {
    const note = await noteStore.fetchNote(props.card.noteId)
    if (note) {
      noteAddress.value = note.address || '无编码地址'
    }
  } catch (error) {
    console.error('获取笔记地址失败:', error)
  }
}

// 修改内容更新处理
const handleContentUpdate = (newContent: any) => {
  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))

    // 检查内容是否真的改变
    if (JSON.stringify(safeContent) === JSON.stringify(localContent.value)) {
      return
    }

    // 更新本地状态
    localContent.value = safeContent

    // 如果是引用卡片，提示用户
    if (isReferenceCard.value) {
      message.info('修改引用卡片内容不会影响原笔记')
    }

    // 触发防抖保存
    saveContent(safeContent)
  } catch (error) {
    console.error('ManuscriptContentCard - 内容更新失败:', error)
  }
}

// 菜单项
const menuItems = ref<MenuItem[]>([
  {
    name: 'delete',
    icon: markRaw(Delete),
    label: '删除卡片',
    action: () => {
      console.log('ManuscriptContentCard - 触发删除卡片:', props.card.id)
      emit('delete')
    },
    isDangerous: true
  }
])

// 菜单相关方法
const handleMoreClick = (event: MouseEvent) => {
  event.stopPropagation()
  // 如果菜单已经打开,则关闭
  if (showMoreMenu.value) {
    showMoreMenu.value = false
  } else {
    // 否则打开菜单
    showMoreMenu.value = true
  }
}

const closeMoreMenu = () => {
  showMoreMenu.value = false
}

const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  closeMoreMenu()
}

// 查看原文
const viewSourceNote = () => {
  if (!props.card.noteId) return
  // 普通点击: 在右侧边栏打开
  noteStore.openBacklinkPreview(props.card.noteId)
  const uiStore = useUIStore()
  uiStore.openRightSidebarWithTab('backlink')
}

// 在组件挂载时获取数据
onMounted(async () => {
  if (isReferenceCard.value) {
    await Promise.all([fetchReferenceNoteContent(), fetchNoteAddress()])
  }

  // 初始化编辑器
  if (editorRef.value) {
    editorRef.value.focus()
  }
})

onBeforeUnmount(() => {
  // 确保所有待保存的内容都已保存
  saveContent.flush()
})
</script>

<style lang="scss" scoped>
.manuscript-content-card-wrapper {
  position: relative;
  margin: 16px 0;

  .add-card-button {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 36px;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 2;

    &:hover {
      transform: translateX(-50%) scale(1.1);
      opacity: 1;
    }

    &.show {
      opacity: 1;
    }

    &.top {
      top: -18px;
    }

    &.bottom {
      bottom: -18px;
    }

    // 添加图标样式
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 20px;
      height: 20px;
    }
  }

  .manuscript-content-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    margin-bottom: 0;
    transition: all 0.2s ease;
    overflow: hidden;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    // 添加折叠状态样式
    &.is-collapsed {
      .card-content {
        max-height: 140px; // 折叠时的最大高度
        overflow: hidden;
        position: relative;

        // 修改渐变遮罩效果，确保不会溢出卡片边界
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0), var(--color-bg-primary));
          pointer-events: none;
          border-bottom-left-radius: 8px; // 匹配卡片的圆角
          border-bottom-right-radius: 8px; // 匹配卡片的圆角
        }
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      cursor: move;
      user-select: none;

      &:hover {
        background: var(--color-hover-bg);
      }

      .card-type {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        .type-indicator {
          width: 4px;
          height: 16px;
          border-radius: 2px;
          background-color: var(--color-draft);
        }

        .type-text {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .note-address {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .card-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .card-content {
      padding: 16px;
      transition:
        max-height 0.3s ease,
        opacity 0.2s ease;
      overflow: visible;

      :deep(.tiptap) {
        min-height: 100px;
        overflow-y: auto;

        // 折叠状态下编辑器样式调整
        .is-collapsed & {
          min-height: 40px;
        }
      }
    }

    &.is-reference {
      .card-header {
        .type-indicator {
          background-color: var(--color-primary);
        }
      }
    }
  }
}
</style>
