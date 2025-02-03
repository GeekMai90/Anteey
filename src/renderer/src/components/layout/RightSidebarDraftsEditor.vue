<template>
  <div class="drafts-editor-panel">
    <div class="drafts-editor-container">
      <div class="editor-content">
        <div class="editor-header">
          <!-- 标题区域 -->
          <div class="title-area">
            <div class="icon">
              <Notepad theme="outline" size="18" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <span class="title">草稿纸</span>
          </div>
          <!-- 右侧工具栏 -->
          <div class="toolbar-right">
            <div
              ref="openInMainRef"
              v-tooltip.top="{ content: '在主面板打开', delay: { show: 1000 } }"
              class="tool-btn"
              @click="openInMainPanel"
            >
              <div class="icon">
                <Afferent
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-default)"
                  :strokeWidth="3"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 编辑器内容 -->
        <div class="content-container">
          <DraftsEditor
            v-if="draftsStore.currentDraft"
            ref="editorRef"
            :content="draftsStore.currentDraft.content"
            class="drafts-editor"
            @update:content="handleContentUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Notepad, Afferent } from '@icon-park/vue-next'
import { useDraftsStore } from '@renderer/stores/draftsStore'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import { debounce } from 'lodash-es'
import { message } from '@renderer/utils/message'
import DraftsEditor from '@renderer/components/drafts/DraftsEditor.vue'

const draftsStore = useDraftsStore()
const router = useRouter()
const uiStore = useUIStore()
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

// 在主面板中打开
const openInMainPanel = () => {
  saveContent.flush()
  router.push('/drafts')
  uiStore.toggleRightSidebar()
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
    editorRef.value?.focus('end')
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
.drafts-editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  // background-color: var(--color-bg-secondary);
  background-color: var(--color-bg-primary);
  .drafts-editor-container {
    height: 100%;
    margin: 10px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border-card);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .editor-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--color-border);
      height: 48px;

      .title-area {
        display: flex;
        align-items: center;
        gap: 8px;

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
            width: 18px;
            height: 18px;
          }
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text);
        }
      }

      .toolbar-right {
        display: flex;
        gap: 4px;

        .tool-btn {
          display: flex;
          align-items: center;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 6px;
          padding: 4px;

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
              width: 18px;
              height: 18px;
            }
          }

          &:hover {
            background-color: var(--color-hover-button);
          }
        }
      }
    }

    .content-container {
      flex: 1;
      overflow: hidden;
      padding: 0 0 20px 0;

      .drafts-editor {
        height: 100%;
      }
    }
    :deep(.tiptap-container) {
      padding-left: 0px;
      padding-right: 0px;
    }
  }
}
</style>
