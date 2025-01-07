<template>
  <div class="drafts-view">
    <!-- 顶部固定区域 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>

      <!-- 头部内容区域 -->
      <div class="header-content">
        <div class="drafts-header">
          <!-- 左侧标题 -->
          <div class="drafts-header-left">
            <div class="icon">
              <Pencil theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">草稿纸</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div class="drafts-container">
      <DraftsEditor
        v-if="draftsStore.currentDraft"
        ref="editorRef"
        :content="draftsStore.currentDraft.content"
        class="drafts-editor"
        @update:content="handleContentUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { Pencil } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import DraftsEditor from '@renderer/components/drafts/DraftsEditor.vue'
import { useDraftsStore } from '@renderer/stores/draftsStore'
import { debounce } from 'lodash-es'
import { message } from '@renderer/utils/message'

const draftsStore = useDraftsStore()
const editorRef = ref<InstanceType<typeof DraftsEditor> | null>(null)

// 使用防抖处理内容保存
const saveContent = debounce(
  async (content: any) => {
    try {
      await draftsStore.updateDraft(content)
    } catch (error) {
      console.error('保存草稿纸失败:', error)
      message.error('保存失败')
    }
  },
  2000,
  { trailing: true }
)

// 处理编辑器内容更新
const handleContentUpdate = async (newContent: any) => {
  if (!draftsStore.currentDraft) return

  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))
    // 触发防抖保存
    saveContent(safeContent)
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// 确保内容末尾有空白段落并聚焦
const ensureEmptyParagraphAndFocus = () => {
  if (!draftsStore.currentDraft?.content) return

  try {
    // 创建内容的深拷贝
    const content = JSON.parse(JSON.stringify(draftsStore.currentDraft.content))
    const paragraphs = content.content || []

    // 检查最后一个段落是否为空
    const lastParagraph = paragraphs[paragraphs.length - 1]
    const isEmpty =
      !lastParagraph ||
      (lastParagraph.type === 'paragraph' &&
        (!lastParagraph.content || lastParagraph.content.length === 0))

    if (!isEmpty) {
      // 添加空白段落
      content.content = [
        ...paragraphs,
        {
          type: 'paragraph'
        }
      ]
      // 更新内容
      saveContent(content)
    }

    // 聚焦到编辑器末尾
    nextTick(() => {
      editorRef.value?.focus('end')
    })
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

onMounted(async () => {
  await draftsStore.fetchDraft()
  if (!draftsStore.currentDraft) {
    await draftsStore.createDraft()
  }
  ensureEmptyParagraphAndFocus()
})

// 在组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(() => {
  saveContent.flush()
})
</script>

<style lang="scss" scoped>
.drafts-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 顶部固定区域样式
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 500;
  background-color: var(--color-bg-primary);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .header-content {
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;

    .drafts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);

      // 左侧标题区域
      .drafts-header-left {
        position: relative;
        display: flex;
        align-items: center;
        border: none;
        background: none;
        border-radius: 6px;
        padding: 4px 0px;
        margin: 2px;

        .icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
          border-radius: 8px;
          background-color: var(--color-menu-bg);
          border: 1px solid var(--color-primary);

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
          flex-grow: 0;
          text-align: left;
          color: var(--default-text-color);
          font-size: 20px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
          user-select: none;
          line-height: 1;
        }
      }
    }
  }
}

// 编辑器容器样式
.drafts-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin: 30px auto;

  .drafts-editor {
    flex-grow: 1;
    margin-top: 16px;
  }
}
</style>
