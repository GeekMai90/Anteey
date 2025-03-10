<template>
  <Teleport to="body">
    <Transition name="fade-zoom" @after-enter="handleAfterEnter">
      <div
        v-if="isOpen"
        ref="floating"
        class="batch-change-tag-list"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`
        }"
      >
        <div class="header">
          <div class="title">选择标签</div>
          <div class="search-box">
            <div class="search-icon">
              <Search theme="outline" size="14" />
            </div>
            <input
              ref="searchInput"
              v-model="searchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索标签..."
              @click.stop
            />
          </div>
        </div>
        <div class="tag-list">
          <template v-if="filteredTags.length > 0">
            <DropdownListItem v-for="tag in filteredTags" :key="tag.id" @click="handleSelect(tag)">
              <template #icon>
                <component
                  :is="getIconComponent(tag.icon)"
                  theme="outline"
                  size="16"
                  :fill="tag.color || 'var(--color-text-secondary)'"
                  :stroke-width="3"
                />
              </template>
              {{ tag.name }}
            </DropdownListItem>
          </template>
          <div v-else-if="searchKeyword" class="empty-state">未找到匹配的标签</div>
          <div v-else class="empty-state">暂无标签，请先创建</div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 确认对话框 -->
  <ConfirmDialog
    v-model:visible="showConfirm"
    title="批量设置标签确认"
    :message="confirmMessage"
    confirm-text="确认"
    cancel-text="取消"
    @confirm="confirmAdd"
    @cancel="cancelAdd"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Search } from '@icon-park/vue-next'
import * as Icons from '@icon-park/vue-next'
import type { Tag as TagType } from '@shared/types'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import DropdownListItem from '@renderer/components/ui/DropdownListItem.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  isOpen: boolean
  selectedCount: number
  buttonRef: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', tagId: string): void
}>()

const tagStore = useTagStore()
const { tags } = storeToRefs(tagStore)

// 搜索关键词
const searchKeyword = ref('')

// 过滤后的标签列表
const filteredTags = computed(() => {
  if (!searchKeyword.value) return tags.value
  const keyword = searchKeyword.value.toLowerCase()
  return tags.value.filter((tag) => tag.name.toLowerCase().includes(keyword))
})

// floating-ui 相关
const floating = ref<HTMLElement | null>(null)
const { x, y, strategy, update } = useFloating(
  computed(() => props.buttonRef),
  floating,
  {
    placement: 'top-start',
    middleware: [offset(4), flip(), shift()]
  }
)

// 搜索框引用
const searchInput = ref<HTMLInputElement | null>(null)

// 添加聚焦方法
const focusSearchInput = () => {
  if (searchInput.value) {
    searchInput.value.focus()
  }
}

// 监听 isOpen 变化
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        update()
        searchKeyword.value = ''
        focusSearchInput()
      })
    }
  }
)

// 确认相关状态
const showConfirm = ref(false)
const selectedTag = ref<TagType | null>(null)

// 确认消息
const confirmMessage = computed(() => {
  if (!selectedTag.value) return ''
  return `确定要为选中的 ${props.selectedCount} 张卡片添加标签「${selectedTag.value.name}」吗？`
})

// 获取图标组件
const getIconComponent = (iconName: string | undefined) => {
  if (!iconName) return Icons.Pound
  return (Icons as any)[iconName] || Icons.Pound
}

// 选择标签
const handleSelect = (tag: TagType) => {
  selectedTag.value = tag
  showConfirm.value = true
}

// 确认添加
const confirmAdd = () => {
  if (selectedTag.value) {
    emit('add', selectedTag.value.id)
  }
  closeDialog()
}

// 取消添加
const cancelAdd = () => {
  closeDialog()
}

// 关闭对话框
const closeDialog = () => {
  showConfirm.value = false
  selectedTag.value = null
  emit('close')
}

// 过渡动画完成后的处理
const handleAfterEnter = () => {
  // 动画完成后聚焦
  searchInput.value?.focus()
}

// 在组件挂载时自动聚焦
onMounted(() => {
  if (props.isOpen) {
    nextTick(() => {
      focusSearchInput()
    })
  }
})
</script>

<style lang="scss" scoped>
.batch-change-tag-list {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  min-width: 200px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  z-index: 1000;

  .header {
    padding: 12px;
    border-bottom: 1px solid var(--color-border);

    .title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 8px;
        color: var(--color-text-secondary);
      }

      .search-input {
        width: 100%;
        height: 28px;
        padding: 0 8px 0 28px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        font-size: 13px;
        color: var(--color-text-primary);
        background: var(--color-bg-secondary);
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          background: var(--color-bg-primary);
        }

        &::placeholder {
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  .tag-list {
    padding: 4px;
    overflow-y: auto;
    max-height: calc(320px - 90px);
  }

  .empty-state {
    padding: 16px;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 13px;
  }
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition: all 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
