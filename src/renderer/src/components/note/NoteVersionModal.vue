<template>
  <Modal v-model="isOpen" @outside-click="handleClose">
    <div class="version-modal">
      <!-- 标题栏 -->
      <div class="modal-header">
        <h2>版本历史</h2>
        <div class="close-btn" @click="handleClose">×</div>
      </div>

      <!-- 版本列表和预览区域 -->
      <div class="modal-content">
        <!-- 左侧版本列表 -->
        <div class="version-list">
          <div
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :class="{ active: currentVersion?.id === version.id }"
            @click="selectVersion(version)"
          >
            <div class="version-info">
              <span class="version-number">v{{ version.versionNumber }}</span>
              <span class="version-time">{{ formatDate(version.versionCreatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧预览区域 -->
        <div class="version-preview" v-if="currentVersion">
          <!-- 地址和创建时间 -->
          <div class="preview-header">
            <div class="address">{{ currentVersion.address }}</div>
            <div class="created-time">创建于 {{ formatDate(currentVersion.createdAt) }}</div>
          </div>

          <!-- 笔记内容 -->
          <div class="preview-content">
            <TipTapEditor
              :content="currentVersion.content"
              :editable="false"
              :enableDragHandle="false"
              :noteId="props.noteId"
            />
          </div>

          <!-- 恢复按钮 -->
          <div class="preview-actions">
            <button class="restore-btn" @click="handleRestore">恢复到此版本</button>
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
  background: var(--color-bg-primary);
  border-radius: 12px;
  width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    font-size: 18px;
    color: var(--color-text-primary);
  }

  .close-btn {
    cursor: pointer;
    font-size: 24px;
    color: var(--color-text-secondary);
    &:hover {
      color: var(--color-text-primary);
    }
  }
}

.modal-content {
  display: flex;
  height: calc(80vh - 60px);
  overflow: hidden;
}

.version-list {
  width: 250px;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 12px;
}

.version-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    background: var(--color-menu-active-bg);
  }

  .version-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .version-number {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .version-time {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.version-preview {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  .preview-header {
    margin-bottom: 20px;

    .address {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .created-time {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
  }

  .preview-actions {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0;
    border-top: 1px solid var(--color-border);

    .restore-btn {
      padding: 8px 16px;
      border-radius: 6px;
      background: var(--color-primary);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background: var(--color-primary-dark);
      }
    }
  }
}
</style>
