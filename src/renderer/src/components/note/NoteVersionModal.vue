<template>
  <Modal v-model="isOpen" @outside-click="handleClose">
    <div class="version-modal">
      <div class="modal-content">
        <!-- 左侧预览区域 -->
        <div class="preview-area">
          <div v-if="currentVersion" class="preview-content">
            <div class="preview-header">
              <div class="address">{{ currentVersion.address }}</div>
              <div class="created-time">{{ formatDate(currentVersion.createdAt) }}</div>
            </div>

            <div class="editor-wrapper">
              <TipTapEditor
                :content="currentVersion.content"
                :editable="false"
                :enableDragHandle="false"
                :noteId="props.noteId"
              />
            </div>
          </div>
        </div>

        <!-- 右侧版本历史区域 -->
        <div class="version-history">
          <div class="history-header">
            <h2>历史版本</h2>
            <button class="close-button" @click="handleClose">
              <div class="icon">
                <Close
                  theme="outline"
                  size="16"
                  fill="var(--color-icon-default)"
                  :strokeWidth="3"
                />
              </div>
            </button>
          </div>

          <div class="version-list">
            <div
              v-for="version in versions"
              :key="version.id"
              class="version-item"
              :class="{ active: currentVersion?.id === version.id }"
              @click="selectVersion(version)"
            >
              <div class="version-info">
                <span class="version-title">
                  {{ formatDate(version.versionCreatedAt, 'full') }}
                </span>
              </div>
            </div>
          </div>

          <div class="history-footer">
            <button class="restore-btn" :disabled="!currentVersion" @click="handleRestore">
              恢复到此版本
            </button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import Modal from '../common/Modal.vue'
import TipTapEditor from '../tiptap/TipTapEditor.vue'
import { useNoteVersionStore } from '../../stores/noteVersionStore'
import { formatDate } from '../../utils/noteHelpers'
import { message } from '../../utils/message'
import { Close } from '@icon-park/vue-next'

const props = defineProps<{
  noteId: string
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'version-restored'])

const versionStore = useNoteVersionStore()

// 计算属性
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const versions = computed(() => versionStore.versions)
const currentVersion = computed(() => versionStore.currentVersion)

// 方法
const loadVersions = async () => {
  try {
    await versionStore.fetchNoteVersions(props.noteId)
    // 自动选择第一个版本
    if (versions.value.length > 0) {
      await selectVersion(versions.value[0])
    }
  } catch (error) {
    console.error('加载版本历史失败:', error)
    message.error('加载版本历史失败')
  }
}

const selectVersion = async (version: (typeof versions.value)[0]) => {
  try {
    await versionStore.fetchNoteVersion(props.noteId, version.id)
  } catch (error) {
    console.error('加载版本详情失败:', error)
    message.error('加载版本详情失败')
  }
}

const handleRestore = async () => {
  if (!currentVersion.value) return

  try {
    await versionStore.restoreVersion(props.noteId, currentVersion.value.id)
    message.success('版本恢复成功')
    emit('version-restored')
    handleClose()
  } catch (error) {
    console.error('恢复版本失败:', error)
    message.error('恢复版本失败')
  }
}

const handleClose = () => {
  isOpen.value = false
  versionStore.clearState()
}

// 监听器
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      loadVersions()
    }
  }
)

// 生命周期
onMounted(() => {
  if (props.modelValue) {
    loadVersions()
  }
})
</script>

<style scoped lang="scss">
.version-modal {
  width: 1000px;
  height: 80vh;
  background: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;
}

.modal-content {
  display: flex;
  height: 100%;
}

/* 左侧预览区域 */
.preview-area {
  flex: 1;
  border-right: 1px solid var(--color-border);
  // background: var(--color-bg-secondary);
  display: flex;

  .preview-content {
    flex: 1;
    background: var(--color-bg-primary);
    padding: 0;
    margin: 24px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;

    .preview-header {
      padding: 20px 24px;

      .address {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 4px;
      }

      .created-time {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }

    .editor-wrapper {
      flex: 1;
      overflow-y: auto;
    }
  }
}

/* 右侧版本历史区域 */
.version-history {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.history-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .close-button {
    display: flex;
    align-items: center;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 4px;

    .icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

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

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.version-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    background: var(--color-hover-bg);
  }

  .version-info {
    display: flex;
    flex-direction: column;
  }

  .version-title {
    font-size: 14px;
    color: var(--color-text-primary);
  }
}

.history-footer {
  padding: 16px;
  // border-top: 1px solid var(--color-border);

  .restore-btn {
    width: 100%;
    padding: 8px 0;
    border-radius: 6px;
    background: var(--color-primary);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &:hover {
      opacity: 0.8;
    }

    &:disabled {
      background: var(--color-disabled);
      cursor: not-allowed;
    }
  }
}
</style>
