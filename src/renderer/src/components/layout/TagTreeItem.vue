<template>
  <div class="tag-tree-item" :style="{ paddingLeft: `${level * 16}px` }">
    <div class="tag-content" @click="handleClick" @contextmenu.stop="showContextMenu">
      <!-- 占位空间，保持对齐 -->
      <div class="expand-icon-wrapper">
        <div v-if="tag.children?.length" class="expand-icon" @click.stop="toggleExpand">
          <div class="icon">
            <Down
              v-if="isExpanded"
              theme="outline"
              size="16"
              fill="var(--color-sidebar-text)"
              :stroke-width="2"
            />
            <Right
              v-else
              theme="outline"
              size="16"
              fill="var(--color-sidebar-text)"
              :stroke-width="2"
            />
          </div>
        </div>
      </div>
      <!-- 标签图标 -->
      <div class="tag-icon">
        <div class="icon">
          <component
            :is="getIconComponent(tag.icon)"
            v-if="tag.icon"
            theme="outline"
            size="16"
            :fill="tag.color || 'var(--color-sidebar-text)'"
          />
          <Pound
            v-else
            theme="outline"
            size="16"
            :fill="tag.color || 'var(--color-sidebar-text)'"
          />
        </div>
      </div>
      <!-- 标签名称和数量 -->
      <span class="tag-name">{{ displayName }}</span>
      <div class="tag-indicators">
        <!-- 添加置顶图标 -->
        <div v-if="tag.pinned" class="pin-indicator">
          <Pushpin theme="outline" size="12" fill="var(--color-sidebar-text)" :stroke-width="2" />
        </div>
        <span class="tag-count">{{ tag.noteCount }}</span>
      </div>
    </div>

    <!-- 递归渲染子标签 -->
    <div v-if="isExpanded && tag.children?.length" class="children">
      <TagTreeItem
        v-for="child in tag.children"
        :key="child.id"
        :tag="child"
        :level="level + 1"
        @select="$emit('select', $event)"
      />
    </div>
    <!-- 右键菜单 -->
    <div v-if="showMenu" class="context-menu" :style="menuPosition">
      <!-- 修改右键菜单项 -->
      <div class="menu-item" @click="handlePin">
        <div class="icon">
          <Pushpin
            theme="outline"
            :fill="tag.pinned ? 'var(--color-primary)' : 'var(--color-icon-menu-default)'"
          />
        </div>
        <div class="name">{{ tag.pinned ? '取消置顶' : '标签置顶' }}</div>
      </div>

      <div class="menu-item" @click="handleEdit">
        <div class="icon">
          <Edit
            theme="outline"
            :fill="'var(--color-icon-menu-default)'"
            size="16"
            :stroke-width="3"
          />
        </div>
        <div class="name">编辑标签</div>
      </div>

      <div class="menu-divider"></div>

      <div class="menu-item delete" @click="handleDelete">
        <div class="icon">
          <Delete
            theme="outline"
            :fill="'var(--color-icon-menu-default)'"
            size="16"
            :stroke-width="3"
          />
        </div>
        <div class="name">删除标签</div>
      </div>
    </div>
    <!-- 确认删除对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除标签"
      message="确定要删除此标签吗？所有子标签将被删除，此操作无法撤销。"
      type="danger"
      cancel-text="取消"
      confirm-text="删除"
      @confirm="confirmDelete"
    />
  </div>
  <!-- 编辑标签对话框 -->
  <InputDialog
    v-model:visible="showEditDialog"
    title="编辑标签"
    :initial-value="editingTagName"
    :initial-icon="props.tag.icon"
    :show-icon-picker="true"
    placeholder="请输入新的标签名"
    cancel-text="取消"
    confirm-text="确定"
    @confirm="handleEditConfirm"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Down, Right, Pound, Edit, Delete, Pushpin } from '@icon-park/vue-next'
import { TagTreeNode } from '@shared/types'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import InputDialog from '@renderer/components/common/InputDialog.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import { message } from '@renderer/utils/message'
import { useEventBus } from '@vueuse/core'
import * as IconPark from '@icon-park/vue-next'

const tagStore = useTagStore()
const tagChangeEventBus = useEventBus('tagChange')

const props = defineProps<{
  tag: TagTreeNode
  level: number
}>()

const emit = defineEmits<{
  (e: 'select', tag: TagTreeNode): void
}>()

const isExpanded = ref(true)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleClick = () => {
  emit('select', props.tag)
}

const showMenu = ref(false)
const menuPosition = ref({
  top: '0px',
  left: '0px'
})
// 显示右键菜单
const showContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  showMenu.value = true
  menuPosition.value = {
    top: `${e.clientY}px`,
    left: `${e.clientX}px`
  }

  // 点击其他地方关闭菜单
  const closeMenu = () => {
    showMenu.value = false
    document.removeEventListener('click', closeMenu)
  }
  document.addEventListener('click', closeMenu)
}

// 处理置顶
const handlePin = async () => {
  try {
    await tagStore.toggleTagPin(props.tag.id, !props.tag.pinned)
    showMenu.value = false
    tagChangeEventBus.emit()
    message.success(props.tag.pinned ? '取消置顶成功' : '置顶成功')
  } catch (error) {
    message.error('更新置顶状态失败')
  }
}

// 计算当前层级的显示名称
const displayName = computed(() => {
  const pathParts = props.tag.path
  return pathParts[pathParts.length - 1] // 这个用于显示在树中的名称
})

const showEditDialog = ref(false)
// 处理编辑
const handleEdit = () => {
  // TODO: 实现编辑逻辑
  showMenu.value = false
  showEditDialog.value = true
}

// 添加一个计算属性用于编辑对话框显示的完整路径
const editingTagName = computed(() => {
  return props.tag.path.join('/')
})

// 确认编辑
const handleEditConfirm = async (data: { name: string; icon?: string }) => {
  try {
    await tagStore.updateTag(props.tag.id, {
      name: data.name.trim(), // 直接使用用户输入的值
      icon: data.icon
    })

    showEditDialog.value = false
    tagChangeEventBus.emit()
    message.success('更新标签成功')
  } catch (error) {
    console.error('更新标签失败:', error)
    message.error('更新标签失败')
  }
}

const showDeleteConfirm = ref(false)

// 处理删除
const handleDelete = () => {
  // TODO: 实现删除逻辑
  showMenu.value = false
  showDeleteConfirm.value = true
}

// 确认删除
const confirmDelete = async () => {
  try {
    await tagStore.deleteTag(props.tag.id)
    console.log('删除标签:', props.tag.id)
    tagChangeEventBus.emit()
    message.success('删除标签成功')
  } catch (error) {
    console.error('删除标签失败:', error)
    message.error('删除标签失败')
  }
}
// 添加获取图标组件的函数
const getIconComponent = (iconName: string) => {
  return IconPark[iconName as keyof typeof IconPark]
}
</script>

<style scoped lang="scss">
.tag-tree-item {
  position: relative;
  .tag-content {
    display: flex;
    align-items: center;
    padding: 4px 8px 4px 4px;
    border-radius: 6px;
    cursor: pointer;
    gap: 4px;

    &:hover {
      background: rgba(var(--color-sidebar-icon-bg), 0.04);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    // 添加固定宽度的展开图标包装器
    .expand-icon-wrapper {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      .expand-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
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
          }

          :deep(svg) {
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .tag-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
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
          width: 13px;
          height: 13px;
        }
      }
    }

    .tag-name {
      flex-grow: 1;
      font-size: 13px;
      color: var(--color-text-primary);
      user-select: none;
      line-height: 1;
    }

    .tag-indicators {
      display: flex;
      align-items: center;
      gap: 4px;

      .pin-indicator {
        display: flex;
        align-items: center;
        opacity: 0.8;
        background: none;
        border: none;
        cursor: pointer;
        width: 13px;
        height: 13px;
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
          width: 12px;
          height: 12px;
        }

        // :deep(svg) {
        //   transform: rotate(45deg); // 稍微旋转一下图标让它更像钉子
        // }
      }

      .tag-count {
        font-size: 12px;
        color: var(--color-sidebar-text);
        user-select: none;
        line-height: 1;
      }
    }
  }

  .children {
    margin-top: 2px;
  }

  .context-menu {
    position: fixed;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
    width: fit-content; // 宽度跟随内容
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 6px;
      color: var(--color-text-primary);
      font-size: 13px;
      gap: 4px;
      white-space: nowrap; // 防止文字换行

      .icon {
        display: flex;
        align-items: center;
        color: var(--color-text-secondary);
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
      .name {
        flex-grow: 0;
        text-align: left;
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 400;
        margin-left: 6px;
        white-space: nowrap;
        writing-mode: horizontal-tb;
      }

      &:hover {
        background: var(--color-hover-bg);
      }

      &.delete {
        color: var(--color-danger);

        .icon {
          color: var(--color-danger);
        }
      }
    }

    .menu-divider {
      height: 1px;
      background: var(--color-border);
      margin: 4px 0;
    }
  }
}
</style>
