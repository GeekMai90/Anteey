<template>
  <div class="block-viewer">
    <!-- 日期标题 -->
    <div class="block-viewer-header">
      <h3>
        <span class="date">{{ formatDate(date) }}</span>
      </h3>
    </div>

    <!-- 时间块列表 -->
    <div class="time-blocks">
      <div class="time-blocks-wrapper">
        <div v-for="block in timeBlocks" :key="block.hour" class="time-block">
          <div class="time-label">{{ formatHour(block.hour) }}</div>
          <div class="time-content" :class="{ editing: editingHour === block.hour }">
            <div class="time-block-content">
              <BulletEditor
                :content="getBlockContent(block.hour)"
                :hour="block.hour"
                :editable="editingHour === block.hour"
                @update:content="(content) => handleContentUpdate(block.hour, content)"
                @finish="handleFinishEdit"
                @cancel="handleCancelEdit"
                @click="startEdit(block.hour)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import BulletEditor from './BulletEditor.vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import type { TimeBlock as TimeBlockData } from '@shared/types'

// 添加时间块小时接口
interface TimeBlockHour {
  hour: number
  label: string
}

const props = withDefaults(
  defineProps<{
    date: string
    blocks: Record<string, TimeBlockData>
    compareMode: boolean
  }>(),
  {
    blocks: () => ({})
  }
)

const timeBlockStore = useTimeBlockStore()
const editingHour = ref<number | null>(null)

// 生成时间块列表，添加类型注解
const timeBlocks = computed<TimeBlockHour[]>(() => {
  const { startTime, endTime } = timeBlockStore.settings
  const blocks: TimeBlockHour[] = []

  for (let i = startTime; i <= endTime; i++) {
    blocks.push({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`
    })
  }

  return blocks
})

// 格式化日期
const formatDate = (date: string) => {
  return format(new Date(date), 'M月d日 EEEE', { locale: zhCN })
}

// 格式化小时
const formatHour = (hour: number) => {
  return `${String(hour).padStart(2, '0')}:00`
}

// 获取时间块内容
const getBlockContent = (hour: number) => {
  const content = props.blocks[hour]?.content ?? ''
  // console.log(`BlockViewer: Getting content for hour ${hour} on date ${props.date}:`, content)
  return content
}

// 开始编辑
const startEdit = (hour: number) => {
  if (editingHour.value !== null && editingHour.value !== hour) {
    handleFinishEdit()
  }
  editingHour.value = hour
}

// 处理内容更新
const handleContentUpdate = async (hour: number, content: string) => {
  try {
    console.log('Updating content for date:', props.date, 'hour:', hour)
    await timeBlockStore.updateTimeBlock(props.date, hour, content)
  } catch (error) {
    console.error('更新内容失败:', error)
  }
}

// 处理完成编辑
const handleFinishEdit = () => {
  editingHour.value = null
}

// 处理取消编辑
const handleCancelEdit = () => {
  editingHour.value = null
}
</script>

<style lang="scss" scoped>
.block-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);

  .block-viewer-header {
    padding: 10px 16px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: var(--color-bg-note-card);
    text-align: center;

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;

      .date {
        font-size: 1rem;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
    }
  }

  .time-blocks {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px 8px 0;

    .time-blocks-wrapper {
      position: relative;
      padding-top: 16px;
      padding-bottom: 16px;

      &::before {
        content: '';
        position: absolute;
        left: 52px;
        top: 0;
        bottom: 0;
        width: 1px;
        border-left: 1.5px dashed var(--color-border);
      }
    }

    .time-block {
      position: relative;
      margin-bottom: 8px;
      transform: translateZ(0);
      will-change: transform;
      padding-left: 64px;

      &::before {
        content: '';
        position: absolute;
        left: 48.5px;
        top: 16px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-bg-primary);
        border: 1.5px solid var(--color-primary);
        z-index: 1;
        transition: all 0.2s ease;
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
      }

      &:hover {
        &::before {
          transform: scale(1.2);
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
        }

        .time-content {
          transform: translateY(-2px);
          border-color: var(--color-primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
      }

      .time-label {
        position: absolute;
        left: 0;
        color: var(--color-text-secondary);
        font-weight: 500;
        font-size: 12px;
        padding-top: 12px;
        width: 44px;
        text-align: right;
      }

      .time-content {
        flex: 1;
        background: var(--color-bg-note-card);
        border: 1px solid var(--color-border-light);
        border-radius: 6px;
        padding: 8px 10px;
        transition: all 0.2s;
        min-height: 40px;

        &.editing {
          border-color: var(--color-primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
      }

      .time-block-content {
        position: relative;
        min-height: 24px;
        border-radius: 6px;
        background: var(--color-bg-note-card);
        transition: all 0.2s;
      }
    }
  }
}
</style>
