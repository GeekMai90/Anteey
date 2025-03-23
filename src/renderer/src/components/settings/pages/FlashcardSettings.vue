<template>
  <div class="flashcard-settings">
    <div class="settings-content-header">
      <div class="icon">
        <StorageCardOne
          theme="outline"
          size="20"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
      <div class="name">记忆卡</div>
    </div>
    <div class="flashcard-settings-divider"></div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div v-else class="flashcard-settings-content">
      <!-- 学习计划 -->
      <div class="settings-item">
        <div class="title">学习计划</div>
        <div class="description">设置每日学习的新卡片数量和复习上限。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">每日学习目标</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="dailyGoal = handleNumberChange(-1, 0, 200, dailyGoal)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="dailyGoal"
                  type="number"
                  min="0"
                  max="200"
                  @change="dailyGoal = handleInputChange(0, 200, dailyGoal)"
                />
                <button
                  class="number-button increase"
                  @click="dailyGoal = handleNumberChange(1, 0, 200, dailyGoal)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">张卡片</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">每日最大新卡数量</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="newCardsPerDay = handleNumberChange(-1, 0, 100, newCardsPerDay)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="newCardsPerDay"
                  type="number"
                  min="0"
                  max="100"
                  @change="newCardsPerDay = handleInputChange(0, 100, newCardsPerDay)"
                />
                <button
                  class="number-button increase"
                  @click="newCardsPerDay = handleNumberChange(1, 0, 100, newCardsPerDay)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">张卡片</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">每日复习上限</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="reviewsPerDay = handleNumberChange(-1, 0, 200, reviewsPerDay)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="reviewsPerDay"
                  type="number"
                  min="0"
                  max="200"
                  @change="reviewsPerDay = handleInputChange(0, 200, reviewsPerDay)"
                />
                <button
                  class="number-button increase"
                  @click="reviewsPerDay = handleNumberChange(1, 0, 200, reviewsPerDay)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">张卡片</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              次日开始时间
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />

                <div class="help-tooltip">
                  设置每天新卡片加入在您的队列中的时间。例如设置为4点，则每天凌晨4点开始新的学习。
                </div>
              </div>
            </div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="dayStartsAt = handleNumberChange(-1, 0, 23, dayStartsAt)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="dayStartsAt"
                  type="number"
                  min="0"
                  max="23"
                  @change="dayStartsAt = handleInputChange(0, 23, dayStartsAt)"
                />
                <button
                  class="number-button increase"
                  @click="dayStartsAt = handleNumberChange(1, 0, 23, dayStartsAt)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">点</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 学习顺序 -->
      <div class="settings-item">
        <div class="title">学习顺序</div>
        <div class="description">设置新卡片和复习卡片的出现顺序。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">新卡片顺序</div>
            <div class="value">
              <div class="select-wrapper">
                <div
                  class="select-trigger"
                  @click="showNewCardPositionOptions = !showNewCardPositionOptions"
                >
                  <span class="selected-text">
                    {{ getNewCardPositionText(newCardPosition) }}
                  </span>
                  <div class="select-arrow">
                    <Down
                      v-if="!showNewCardPositionOptions"
                      theme="outline"
                      size="14"
                      :strokeWidth="3"
                    />
                    <Up v-else theme="outline" size="14" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showNewCardPositionOptions" class="select-options">
                  <div
                    v-for="option in newCardPositionOptions"
                    :key="option.value"
                    class="select-option"
                    :class="{ 'is-active': newCardPosition === option.value }"
                    @click="handleSelectNewCardPosition(option.value as NewCardPosition)"
                  >
                    {{ option.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 算法参数 -->
      <div class="settings-item">
        <div class="title">算法参数</div>
        <div class="description">调整 FSRS 算法的关键参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">目标记忆率</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="requestRetention = handleNumberChange(-0.01, 0.8, 0.95, requestRetention)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="requestRetention"
                  type="number"
                  min="0.8"
                  max="0.95"
                  step="0.01"
                  @change="requestRetention = handleInputChange(0.8, 0.95, requestRetention)"
                />
                <button
                  class="number-button increase"
                  @click="requestRetention = handleNumberChange(0.01, 0.8, 0.95, requestRetention)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">最大间隔</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="maximumInterval = handleNumberChange(-1, 30, 365, maximumInterval)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="maximumInterval"
                  type="number"
                  min="30"
                  max="365"
                  @change="maximumInterval = handleInputChange(30, 365, maximumInterval)"
                />
                <button
                  class="number-button increase"
                  @click="maximumInterval = handleNumberChange(1, 30, 365, maximumInterval)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">天</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 界面设置 -->
      <div class="settings-item">
        <div class="title">界面设置</div>
        <div class="description">自定义复习界面的显示方式。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">简化按钮</div>
            <div class="value">
              <Switch
                :model-value="Boolean(simplifyButtons)"
                @update:model-value="simplifyButtons = $event"
              />
              <div class="switch-description">
                {{ simplifyButtons ? '使用简化按钮' : '使用完整按钮' }}
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">显示下次复习时间</div>
            <div class="value">
              <Switch
                :model-value="Boolean(showNextReview)"
                @update:model-value="showNextReview = $event"
              />
              <div class="switch-description">
                {{ showNextReview ? '显示复习时间' : '隐藏复习时间' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计设置 -->
      <div class="settings-item">
        <div class="title">统计设置</div>
        <div class="description">设置复习统计的相关参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">最大答题时间</div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="maxAnswerTime = handleNumberChange(-1, 10, 300, maxAnswerTime)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="maxAnswerTime"
                  type="number"
                  min="10"
                  max="300"
                  @change="maxAnswerTime = handleInputChange(10, 300, maxAnswerTime)"
                />
                <button
                  class="number-button increase"
                  @click="maxAnswerTime = handleNumberChange(1, 10, 300, maxAnswerTime)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">秒</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              超前学习时间
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />

                <div class="help-tooltip">
                  在您完成所有到期卡片的练习后,我们可以提前多久调出尚未到期的卡片进行练习？这有助于避免您过早地再次复习同一内容。
                </div>
              </div>
            </div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="reviewAgainAfter = handleNumberChange(-1, 5, 60, reviewAgainAfter)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="reviewAgainAfter"
                  type="number"
                  min="5"
                  max="60"
                  @change="reviewAgainAfter = handleInputChange(5, 60, reviewAgainAfter)"
                />
                <button
                  class="number-button increase"
                  @click="reviewAgainAfter = handleNumberChange(1, 5, 60, reviewAgainAfter)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">分钟</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { StorageCardOne, Down, Up, Plus, Minus, Help } from '@icon-park/vue-next'
import { useFlashcardStore } from '@renderer/stores/flashcardStore'
import type { FlashcardSettings } from '@shared/types'
import { debounce } from 'lodash-es'
import Switch from '@renderer/components/ui/Switch.vue'

const flashcardStore = useFlashcardStore()

// 加载状态
const isLoading = ref(true)

// 定义新卡片位置的类型
type NewCardPosition = 'mix' | 'front' | 'end'

// 学习计划
const newCardsPerDay = ref(20)
const reviewsPerDay = ref(100)
const dayStartsAt = ref(4)
const dailyGoal = ref(30)

// 学习顺序 - 添加类型注解
const newCardPosition = ref<NewCardPosition>('mix')

// 算法参数
const requestRetention = ref(0.9)
const maximumInterval = ref(180)

// 界面设置
const simplifyButtons = ref(false)
const showNextReview = ref(true)

// 统计设置
const maxAnswerTime = ref(20)
const reviewAgainAfter = ref(15)

// 新增状态控制下拉框显示
const showNewCardPositionOptions = ref(false)

// 新增选项数据
const newCardPositionOptions = [
  { value: 'mix', label: '与复习卡片混合' },
  { value: 'front', label: '优先学习' },
  { value: 'end', label: '最后学习' }
]

// 获取显示文本
const getNewCardPositionText = (value: NewCardPosition) => {
  return newCardPositionOptions.find((option) => option.value === value)?.label
}

// 处理选择
const handleSelectNewCardPosition = (value: NewCardPosition) => {
  newCardPosition.value = value
  showNewCardPositionOptions.value = false
}

// 初始化设置
onMounted(async () => {
  try {
    isLoading.value = true
    const settings = await flashcardStore.fetchSettings()
    console.log('组件获取到的设置:', settings)
    if (settings) {
      dailyGoal.value = settings.dailyGoal
      newCardsPerDay.value = settings.newCardsPerDay
      reviewsPerDay.value = settings.reviewsPerDay
      dayStartsAt.value = settings.dayStartsAt
      newCardPosition.value = settings.newCardPosition
      requestRetention.value = settings.requestRetention
      maximumInterval.value = settings.maximumInterval
      console.log('设置前:', simplifyButtons.value, showNextReview.value)
      simplifyButtons.value = settings.simplifyButtons
      showNextReview.value = settings.showNextReview
      console.log('设置后:', simplifyButtons.value, showNextReview.value)
      maxAnswerTime.value = settings.maxAnswerTime
      reviewAgainAfter.value = settings.reviewAgainAfter
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 使用防抖包装更新设置的函数
const debouncedUpdateSettings = debounce(async (settings: Partial<FlashcardSettings>) => {
  try {
    await flashcardStore.updateSettings(settings)
  } catch (error) {
    console.error('更新设置失败:', error)
  }
}, 500)

// 监听设置变化并保存
watch(
  [
    dailyGoal,
    newCardsPerDay,
    reviewsPerDay,
    dayStartsAt,
    newCardPosition,
    requestRetention,
    maximumInterval,
    simplifyButtons,
    showNextReview,
    maxAnswerTime,
    reviewAgainAfter
  ],
  async ([
    goal,
    newCards,
    reviews,
    startTime,
    position,
    retention,
    maxInterval,
    simplify,
    showNext,
    maxTime,
    againAfter
  ]) => {
    console.log('监听到设置变化:', { simplify, showNext })
    const settings: Partial<FlashcardSettings> = {
      dailyGoal: goal,
      newCardsPerDay: newCards,
      reviewsPerDay: reviews,
      dayStartsAt: startTime,
      newCardPosition: position,
      requestRetention: retention,
      maximumInterval: maxInterval,
      simplifyButtons: simplify,
      showNextReview: showNext,
      maxAnswerTime: maxTime,
      reviewAgainAfter: againAfter
    }
    debouncedUpdateSettings(settings)
  },
  { deep: true }
)

// 组件卸载时取消未执行的防抖函数
onUnmounted(() => {
  debouncedUpdateSettings.cancel()
})

// 点击外部关闭下拉框
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.select-wrapper')) {
      showNewCardPositionOptions.value = false
    }
  })
})

// 处理数字变化
const handleNumberChange = (delta: number, min: number, max: number, value: number) => {
  const newValue = value + delta
  if (newValue >= min && newValue <= max) {
    return newValue
  }
  return value
}

// 处理输入变化
const handleInputChange = (min: number, max: number, value: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}
</script>

<style scoped lang="scss">
.flashcard-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.settings-content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-left: 20px;

  .icon {
    background: none;
    border: 1px solid var(--color-border);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 4px;
    border-radius: 6px;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .name {
    font-size: 20px;
    line-height: 1;
    font-weight: 500;
    user-select: none;
  }
}

.flashcard-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.flashcard-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 58px;
  overflow-y: auto;
  padding: 0 20px;

  .settings-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 24px;
    padding: 0 10px;

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 10px;
    }

    .description {
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }

    .settings-form {
      width: 100%;
      margin-top: 15px;

      .form-item {
        display: flex;
        align-items: center;
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          width: 160px;
          font-size: 14px;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;

          .help-icon-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            margin-left: 2px;
            justify-content: center;

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

            .help-icon {
              cursor: help;
              color: var(--color-text-secondary);
              opacity: 0.6;
              transition: opacity 0.2s ease;

              &:hover {
                opacity: 1;
                & + .help-tooltip {
                  opacity: 1;
                  visibility: visible;
                  transform: translateY(0);
                }
              }
            }

            .help-tooltip {
              position: absolute;
              left: 24px;
              top: -8px;
              width: 280px;
              padding: 12px 16px;
              background: var(--color-bg-primary);
              border: 1px solid var(--color-border);
              border-radius: 6px;
              font-size: 13px;
              color: var(--color-text-secondary);
              line-height: 1.6;
              opacity: 0;
              visibility: hidden;
              transform: translateY(-4px);
              transition: all 0.2s ease;
              z-index: 100;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              pointer-events: none;
              white-space: normal;
            }
          }
        }

        .value {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;

          .number-input-wrapper {
            display: flex;
            align-items: center;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            background: var(--color-bg-secondary);
            transition: all 0.2s ease;

            &:hover {
              border-color: var(--color-primary);
            }

            &:focus-within {
              border-color: var(--color-primary);
            }

            input[type='number'] {
              width: 60px;
              height: 32px;
              border: none;
              text-align: center;
              padding: 0;
              color: var(--color-text-primary);
              font-size: 14px;
              background: transparent;
              outline: none;

              &::-webkit-inner-spin-button,
              &::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
            }

            .number-button {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              cursor: pointer;
              color: var(--color-text-secondary);
              transition: all 0.2s ease;

              &:hover {
                color: var(--color-primary);
                background: var(--color-fill-secondary);
              }

              &.decrease {
                border-right: 1px solid var(--color-border);
              }

              &.increase {
                border-left: 1px solid var(--color-border);
              }
            }
          }

          .input-suffix {
            font-size: 14px;
            color: var(--color-text-secondary);
          }

          .select-wrapper {
            position: relative;
            width: 200px;

            .select-trigger {
              width: 100%;
              padding: 8px 12px;
              border-radius: 8px;
              border: 1px solid var(--color-border);
              color: var(--color-text-primary);
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: space-between;
              height: 36px;

              &:hover {
                border-color: var(--color-primary);
                background: var(--color-hover-bg);
              }

              .selected-text {
                font-weight: 400;
              }

              .select-arrow {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 100%;

                :deep(.i-icon) {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }

                :deep(svg) {
                  width: 16px;
                  height: 16px;
                }
              }
            }

            .select-options {
              position: absolute;
              top: calc(100% + 4px);
              left: 0;
              width: 100%;
              background: var(--color-bg-primary);
              border: 1px solid var(--color-border);
              border-radius: 8px;
              padding: 4px;
              overflow-y: auto;
              z-index: 1000;
              box-shadow: var(--shadow-card);

              .select-option {
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
                font-size: 14px;
                color: var(--color-text-primary);

                &:hover {
                  background: var(--color-hover-bg);
                }

                &.is-active {
                  color: var(--color-primary);
                  background: var(--color-primary-bg);

                  &:hover {
                    background: var(--color-hover-bg);
                  }
                }
              }

              &::-webkit-scrollbar {
                width: 8px;
              }

              &::-webkit-scrollbar-track {
                background: transparent;
              }

              &::-webkit-scrollbar-thumb {
                background: var(--color-scrollbar);
                border-radius: 4px;
              }
            }
          }

          select {
            display: none;
          }

          .switch-description {
            font-size: 12px;
            color: var(--color-text-secondary);
          }
        }
      }
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.select-wrapper {
  position: relative;
  width: 200px;

  .select-trigger {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-hover-bg);
    }

    .selected-text {
      font-weight: 500;
    }

    .select-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 100%;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }
  }

  .select-options {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: var(--shadow-card);

    .select-option {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 14px;
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-hover-bg);
      }

      &.is-active {
        color: var(--color-primary);
        background: var(--color-primary-bg);

        &:hover {
          background: var(--color-hover-bg);
        }
      }
    }

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-scrollbar);
      border-radius: 4px;
    }
  }
}

.form-item {
  .label {
    width: 160px;
    font-size: 14px;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;

    .help-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      margin-left: 2px;

      .help-icon {
        cursor: help;
        color: var(--color-text-secondary);
        opacity: 0.6;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 1;
          & + .help-tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
        }
      }

      .help-tooltip {
        position: absolute;
        left: 24px;
        top: -8px;
        width: 280px;
        padding: 12px 16px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.6;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-4px);
        transition: all 0.2s ease;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        pointer-events: none;
        white-space: normal;
      }
    }
  }
}
</style>
