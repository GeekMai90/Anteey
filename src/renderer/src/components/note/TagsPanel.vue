<template>
  <div class="tags-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <Motion
          as="div"
          class="icon"
          :initial="{ rotate: 0 }"
          :animate="{ rotate: isCollapsed ? 0 : -45 }"
          :transition="{ duration: 0.3, ease: 'easeInOut' }"
        >
          <TagOne
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
            :stroke-width="3"
          />
        </Motion>
        <div class="name">标签 ({{ tags?.length || 0 }})</div>
      </div>
    </div>

    <Motion
      v-show="!isCollapsed"
      as="div"
      class="tags-container"
      :initial="{ height: 0, opacity: 0, scale: 0.98 }"
      :animate="{
        height: isCollapsed ? 0 : contentHeight,
        opacity: isCollapsed ? 0 : 1,
        scale: isCollapsed ? 0.98 : 1
      }"
      :transition="{
        duration: 0.3,
        ease: 'easeInOut'
      }"
    >
      <div ref="tagsListRef" class="tags-list">
        <div v-for="tag in tags" :key="tag.id" class="tag-pill">
          <span class="tag-symbol">#</span>
          <span class="tag-name">{{ tag.name }}</span>
          <div class="remove-tag">
            <div class="icon">
              <Close theme="outline" size="12" @click.stop="removeTag(tag.id)" />
            </div>
          </div>
        </div>

        <div v-if="!isAdding" class="add-button" @click="startAdding">
          <div class="icon">
            <Plus theme="outline" size="16" :stroke-width="3" />
          </div>
        </div>

        <div v-else class="tag-input-container">
          <span class="tag-symbol">#</span>
          <input
            ref="tagInput"
            v-model="newTagInput"
            type="text"
            placeholder="输入标签..."
            @input="handleTagInput"
            @keydown="handleKeydown"
            @blur="handleBlur"
          />

          <div v-if="showSuggestions" class="tag-suggestions">
            <div
              v-if="!existingTag && newTagInput.trim()"
              class="suggestion-item new-tag"
              :class="{ 'is-selected': selectedIndex === 0 }"
              @mousedown.prevent="addTag"
              @mouseover="selectedIndex = 0"
            >
              <div class="icon">
                <Plus theme="outline" size="14" :stroke-width="3" />
              </div>
              <div class="name">
                新建标签 "<span class="tag-value">{{ newTagInput }}</span
                >"
              </div>
            </div>
            <!-- 分隔线 -->
            <div
              v-if="!existingTag && newTagInput.trim() && filteredSuggestions.length > 0"
              class="divider"
            ></div>
            <div
              v-for="(tag, index) in filteredSuggestions"
              :key="tag.id"
              class="suggestion-item"
              :class="{
                'is-selected':
                  selectedIndex === (!existingTag && newTagInput.trim() ? index + 1 : index)
              }"
              @mousedown.prevent="selectSuggestion(tag)"
              @mouseover="selectedIndex = !existingTag && newTagInput.trim() ? index + 1 : index"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>
      </div>
    </Motion>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { TagOne, Close, Plus } from '@icon-park/vue-next'
import { Motion } from 'motion-v'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useEventBus } from '@vueuse/core'

const props = defineProps<{
  noteId: string
  tags?: { id: string; name: string }[] // 改为接收标签对象数组
}>()

const noteStore = useNoteStore()
const tagStore = useTagStore()
const isCollapsed = ref(true) // 添加折叠状态
const isAdding = ref(false)
const newTagInput = ref('')
const showSuggestions = ref(false)
const suggestions = ref<any[]>([])
const tagInput = ref<HTMLInputElement | null>(null)
const tagsListRef = ref<HTMLElement | null>(null)
const contentHeight = ref(0)

const emit = defineEmits(['refresh'])

const tagChangeEventBus = useEventBus('tagChange')

// 添加切换面板的方法
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

const existingTag = computed(() => {
  return suggestions.value.some((tag) => tag.name.toLowerCase() === newTagInput.value.toLowerCase())
})

const filteredSuggestions = computed(() => {
  return suggestions.value.filter((tag) =>
    tag.name.toLowerCase().includes(newTagInput.value.toLowerCase())
  )
})

const startAdding = async () => {
  isAdding.value = true
  await nextTick()
  tagInput.value?.focus()
}

const cancelAdding = () => {
  isAdding.value = false
  newTagInput.value = ''
  showSuggestions.value = false
}

const handleBlur = () => {
  // 使用 setTimeout 允许点击建议项
  setTimeout(() => {
    cancelAdding()
  }, 200)
}

const handleTagInput = async () => {
  if (newTagInput.value.trim()) {
    suggestions.value = await tagStore.searchTags(newTagInput.value)
    showSuggestions.value = true
  } else {
    showSuggestions.value = false
  }
}

const selectSuggestion = async (tag: { id: string; name: string }) => {
  await noteStore.addTagToNote(props.noteId, tag.id) // 使用 tagId
  emit('refresh')
  tagChangeEventBus.emit()
  cancelAdding()
}

const addTag = async () => {
  if (!newTagInput.value.trim()) return

  try {
    // 检查是否已存在该标签
    const existingTag = suggestions.value.find(
      (tag) => tag.name.toLowerCase() === newTagInput.value.toLowerCase()
    )

    if (existingTag) {
      // 如果标签已存在，直接使用
      await noteStore.addTagToNote(props.noteId, existingTag.id)
      tagChangeEventBus.emit()
    } else {
      // 如果标签不存在，先创建新标签
      const newTag = await tagStore.createTag({ name: newTagInput.value })
      // 然后添加到笔记
      await noteStore.addTagToNote(props.noteId, newTag.id)
      tagChangeEventBus.emit()
    }
    emit('refresh')

    cancelAdding()
  } catch (error) {
    console.error('添加标签失败:', error)
    // 这里可以添加一些错误提示
  }
}

// 更新移除标签的方法
const removeTag = async (tagId: string) => {
  try {
    await noteStore.removeTagFromNote(props.noteId, tagId) // 使用 tagId
    emit('refresh')
    tagChangeEventBus.emit()
  } catch (error) {
    console.error('移除标签失败:', error)
  }
}

const selectedIndex = ref(-1) // 跟踪当前选中的建议项索引

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (!showSuggestions.value) return

  const suggestions = filteredSuggestions.value
  const totalItems = (newTagInput.value.trim() && !existingTag.value ? 1 : 0) + suggestions.length

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % totalItems
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = selectedIndex.value <= 0 ? totalItems - 1 : selectedIndex.value - 1
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex.value === -1) {
        addTag()
      } else if (selectedIndex.value === 0 && !existingTag.value && newTagInput.value.trim()) {
        addTag()
      } else {
        const actualIndex =
          !existingTag.value && newTagInput.value.trim()
            ? selectedIndex.value - 1
            : selectedIndex.value
        selectSuggestion(filteredSuggestions.value[actualIndex])
      }
      break
    case 'Escape':
      cancelAdding()
      break
  }
}

// 更新内容高度
const updateContentHeight = () => {
  if (tagsListRef.value) {
    contentHeight.value = tagsListRef.value.scrollHeight
  }
}

// 监听标签数量变化
watch(
  () => props.tags?.length,
  () => {
    nextTick(updateContentHeight)
  }
)

// 监听折叠状态变化
watch(isCollapsed, (newVal) => {
  if (!newVal) {
    nextTick(updateContentHeight)
  }
})

// 组件挂载后初始化高度
onMounted(() => {
  updateContentHeight()
})
</script>

<style scoped lang="scss">
.tags-panel {
  padding: 0 20px 10px 20px;
  position: relative; // 添加相对定位
  z-index: 10; // 确保标签面板在其他内容之上

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      position: relative;

      .icon {
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transform-origin: center;
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
        font-size: 14px;
        line-height: 1;
        user-select: none;
      }
    }
  }

  .tags-container {
    position: relative;
    transform-origin: top;
    will-change: transform, height, opacity;
    // overflow: hidden; // 移除这个限制

    .tags-list {
      padding: 12px 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      .tag-pill {
        position: relative; // 为绝对定位的删除按钮提供参考点
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        // background: var(--color-bg-secondary);
        border-radius: 16px;
        border: 1px solid var(--color-border);
        transition: all 0.2s ease;
        height: 28px;
        user-select: none;

        &:hover {
          background: var(--color-hover-bg);
          border-color: var(--color-primary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          transform: translateY(-1px);
          cursor: pointer;

          .remove-tag {
            opacity: 0.6;
            visibility: visible;
          }
        }

        .tag-symbol {
          color: var(--color-text-tertiary);
          font-size: 13px;
          margin-right: 1px;
        }

        .tag-name {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1;
          font-weight: 400;
          user-select: none;
          padding-right: 4px; // 为 hover 时的删除按钮预留一点空间
        }

        .remove-tag {
          position: absolute; // 绝对定位
          right: 8px; // 距离右边界的距离
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          width: 14px;
          height: 14px;
          border-radius: 7px;

          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 12px;
            height: 12px;
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

          &:hover {
            opacity: 1;
            background: var(--color-hover-bg);
          }
        }
      }
    }

    .add-button {
      width: 28px;
      height: 28px;
      border-radius: 14px;
      // background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-tertiary);

      &:hover {
        background: var(--color-hover-bg);
        border-color: var(--color-primary);
        color: var(--color-text-secondary);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        transform: translateY(-1px);
        .icon {
          :deep(.i-icon) {
            color: var(--color-primary);
          }
        }
      }
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

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--color-icon-secondary);
        }

        :deep(svg) {
          width: 16px;
          height: 16px;
        }
      }
    }

    .tag-input-container {
      position: relative;
      height: 28px;
      display: inline-flex;
      align-items: center;
      // background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 14px;
      padding: 0 12px;
      gap: 4px;
      min-width: 120px;
      max-width: 300px; // 添加最大宽度限制
      width: fit-content; // 根据内容自适应宽度
      transition: all 0.2s ease;

      &:focus-within {
        background: var(--color-bg-primary);
        border-color: var(--color-primary);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }

      .tag-symbol {
        color: var(--color-text-tertiary);
        font-size: 13px;
        line-height: 1;
      }

      input {
        height: 26px;
        border: none;
        outline: none;
        background: none;
        font-size: 13px;
        color: var(--color-text-primary);
        width: 100%;
        padding: 0;
        margin: 0;
        line-height: 1;
        text-overflow: ellipsis; // 文字过长时显示省略号
        white-space: nowrap; // 防止文字换行

        &::placeholder {
          color: var(--color-text-tertiary);
        }
      }

      .tag-suggestions {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 1000; // 确保建议列表在最上层
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        max-height: 200px;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 8px;
        min-width: 100%; // 至少与输入框一样宽
        width: max-content; // 根据内容自动调整宽度
        max-width: 300px; // 最大宽度限制

        .divider {
          height: 1px;
          background-color: var(--color-border);
          margin: 4px 0;
        }

        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          color: var(--color-text-primary);
          transition: all 0.2s ease;
          border-radius: 8px;
          white-space: nowrap; // 防止文字换行
          overflow: hidden;
          text-overflow: ellipsis; // 文字过长时显示省略号

          &.is-selected {
            background: var(--color-hover-bg);
          }

          &.new-tag {
            display: flex;
            align-items: center;
            color: var(--color-primary);
            padding-left: 4px;

            .icon {
              background: none;
              border: none;
              cursor: pointer;
              width: 16px;
              height: 16px;
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

            .name {
              flex-grow: 0;
              text-align: left;
              color: var(--default-text-color);
              font-size: 13px;
              font-weight: 400;
              white-space: nowrap;
              writing-mode: horizontal-tb;
              line-height: 1;
              margin-left: 4px;
              .tag-value {
                color: var(--color-text-primary); // 标签名称使用主题色
              }
            }
          }

          &:hover {
            background: var(--color-hover-bg);
          }
        }
      }
    }
  }
}
</style>
