<template>
  <div class="sidebar-letters">
    <!-- 顶部切换区域 -->
    <div class="filter-area">
      <SegmentedButton
        v-model="currentType"
        :options="typeOptions"
        width="200px"
        height="32px"
        :iconSize="14"
      />
    </div>

    <!-- 信件列表区域 -->
    <div class="letters-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="letters.length === 0" class="empty-state">
        <div class="empty-icon">
          <MailPackage
            theme="outline"
            size="32"
            fill="var(--color-text-secondary)"
            :strokeWidth="2"
          />
        </div>
        <span>还没有收到信件</span>
      </div>

      <!-- 信件列表 -->
      <div v-else class="letters-list">
        <div
          v-for="letter in letters"
          :key="letter.id"
          class="letter-card"
          :class="{ unread: !letter.readStatus }"
          @dblclick="openLetter(letter)"
        >
          <div class="letter-content">
            <div class="letter-header">
              <span class="letter-type">{{
                letter.type === 'daily' ? '💌 每日来信' : '💌 每周回顾'
              }}</span>
              <span class="letter-date">{{ formatDate(letter.createTime) }}</span>
            </div>
            <div class="letter-preview">{{ getPreview(letter.content) }}</div>
          </div>
          <div v-if="!letter.readStatus" class="letter-status">
            <div class="unread-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 信件内容弹窗 -->
    <DailyLetterContent v-model="isLetterModalOpen" @after-show="handleLetterShown" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { MailPackage } from '@icon-park/vue-next'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import DailyLetterContent from '@renderer/components/dailyLetter/DailyLetterContent.vue'
import type { Letter, LetterType } from '@shared/types'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'

const letterStore = useDailyLetterStore()
const letters = ref<Letter[]>([])
const isLoading = ref(false)
const currentType = ref<LetterType>('daily')
const isLetterModalOpen = ref(false)

// 类型切换选项
const typeOptions = [
  {
    value: 'daily',
    label: '每日来信'
  },
  {
    value: 'weekly',
    label: '每周回顾'
  }
]

// 监听类型切换
watch(currentType, () => {
  fetchLetters()
})

// 获取信件列表
async function fetchLetters() {
  isLoading.value = true
  try {
    const result = await letterStore.fetchLetters(1, 20)
    letters.value = result.letters.filter((letter: Letter) => letter.type === currentType.value)
  } catch (error) {
    console.error('获取信件列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric'
  })
}

// 获取预览内容
function getPreview(content: string): string {
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

// 打开信件
const openLetter = async (letter: Letter) => {
  await letterStore.getLetterById(letter.id)
  letterStore.openLetterModal()
  isLetterModalOpen.value = true
}

// 信件显示后的回调
const handleLetterShown = () => {
  if (letterStore.currentLetter) {
    // 只更新当前信件的状态
    const index = letters.value.findIndex((l) => l.id === letterStore.currentLetter!.id)
    if (index !== -1) {
      letters.value[index] = {
        ...letters.value[index],
        readStatus: true
      }
    }
  }
}

onMounted(() => {
  fetchLetters()
})
</script>

<style lang="scss" scoped>
.sidebar-letters {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);

  .filter-area {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: center;
  }

  .letters-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .letters-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .letter-card {
      background-color: var(--color-bg-secondary);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 12px;

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.unread {
        background-color: var(--color-bg-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .letter-content {
        flex: 1;
        min-width: 0;

        .letter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .letter-type {
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-primary);
          }

          .letter-date {
            font-size: 12px;
            color: var(--color-text-secondary);
          }
        }

        .letter-preview {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-box-orient: vertical;
        }
      }

      .letter-status {
        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--color-primary);
        }
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--color-text-secondary);
      font-size: 13px;
      gap: 12px;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      .empty-icon {
        opacity: 0.5;
      }
    }
  }
}
</style>
