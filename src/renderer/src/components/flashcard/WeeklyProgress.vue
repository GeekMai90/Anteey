<template>
  <div class="weekly-progress">
    <!-- 学习进度卡片 -->
    <div class="progress-card">
      <h3 class="title">学习进度</h3>
      <div class="subtitle">{{ remainingMessage }}</div>

      <!-- 图表区域 -->
      <div class="chart-container">
        <div ref="chartRef" class="chart"></div>
      </div>

      <!-- 目标信息 -->
      <div class="goal-info">
        <div class="goal-item">
          <span class="icon">🎯</span>
          <div class="content">
            <div class="label">每日目标</div>
            <div class="value">
              <strong>{{ dailyGoal }}</strong> 张
            </div>
          </div>
        </div>
        <div class="goal-item">
          <span class="icon">🔥</span>
          <div class="content">
            <div class="label">连续打卡</div>
            <div class="value">
              <strong>{{ currentStreak }}</strong> 天
            </div>
          </div>
        </div>
        <div class="goal-item">
          <span class="icon">📊</span>
          <div class="content">
            <div class="label">平均学习</div>
            <div class="value">
              <strong>{{ averagePerDay }}</strong> 张/天
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 本周统计卡片 -->
    <div class="stats-card">
      <h3 class="title">本周统计</h3>

      <!-- 统计信息行 -->
      <div class="stats-row">
        <!-- 学习时间统计 -->
        <div class="stats-item">
          <div class="label">学习时长</div>
          <div class="value">
            <strong>{{ studyTime.studyHours }}</strong> 小时
            <strong>{{ studyTime.studyMinutes }}</strong> 分钟
          </div>
        </div>

        <!-- 卡片数量统计 -->
        <div class="stats-item">
          <div class="label">已学习卡片</div>
          <div class="value">
            <strong>{{ totalCards }}</strong> 张
          </div>
        </div>
      </div>

      <!-- 学习表现统计 -->
      <div class="performance">
        <div class="label">
          记忆表现
          <span
            v-tooltip.top="{
              content: '过去一周中按下每个答案按钮的频率',
              html: true,
              delay: { show: 300, hide: 100 }
            }"
            class="info-icon"
          >
            <Info theme="outline" size="14" :strokeWidth="3" />
          </span>
        </div>
        <div class="stats-list">
          <div class="stat-item">
            <span class="icon">⏭️</span>
            <div class="stat-content">
              <div class="stat-header">
                <span class="name">跳过</span>
                <span class="value">{{ stats.skipRate || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-value skip"
                  :style="{ width: `${stats.skipRate || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="stat-item">
            <span class="icon">❌</span>
            <div class="stat-content">
              <div class="stat-header">
                <span class="name">忘记</span>
                <span class="value">{{ stats.forgotRate || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-value forgot"
                  :style="{ width: `${stats.forgotRate || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="stat-item">
            <span class="icon">😅</span>
            <div class="stat-content">
              <div class="stat-header">
                <span class="name">部分记住</span>
                <span class="value">{{ stats.partiallyRate || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-value partially"
                  :style="{ width: `${stats.partiallyRate || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="stat-item">
            <span class="icon">😊</span>
            <div class="stat-content">
              <div class="stat-header">
                <span class="name">记住但费力</span>
                <span class="value">{{ stats.effortRate || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-value effort"
                  :style="{ width: `${stats.effortRate || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="stat-item">
            <span class="icon">🎉</span>
            <div class="stat-content">
              <div class="stat-header">
                <span class="name">轻松记住</span>
                <span class="value">{{ stats.easyRate || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-value easy"
                  :style="{ width: `${stats.easyRate || 0}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import type { DailyStats } from '@shared/types'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Info } from '@icon-park/vue-next'

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  CanvasRenderer
])

interface DayData {
  date: string
  totalReviews: number
  uniqueCards: number
  totalTime: number
  feedbackStats: {
    skip: number
    forgot: number
    partially_recalled: number
    recalled_effort: number
    easily_recalled: number
  }
}

const props = defineProps<{
  weeklyStats: DailyStats[]
  dailyGoal: number
  currentStreak: number
  stats: {
    skipRate: number
    forgotRate: number
    partiallyRate: number
    effortRate: number
    easyRate: number
  }
}>()

// 监听 stats 变化
watch(
  () => props.stats,
  (newStats) => {
    console.log('记忆表现数据:', {
      skipRate: newStats.skipRate,
      forgotRate: newStats.forgotRate,
      partiallyRate: newStats.partiallyRate,
      effortRate: newStats.effortRate,
      easyRate: newStats.easyRate
    })
  },
  { immediate: true }
)

// 查看原始的每日反馈数据
watch(
  () => props.weeklyStats,
  (stats) => {
    console.log(
      '每日反馈原始数据:',
      stats.map((day) => ({
        date: day.date,
        feedbackStats: day.feedbackStats
      }))
    )
  },
  { immediate: true }
)

// 获取最近7天的数据
const weeklyData = computed<DayData[]>(() => {
  const today = new Date()
  const result: DayData[] = []

  // 生成最近7天的日期
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // 格式化日期为 YYYY-MM-DD，并处理时区问题
    const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0]

    // 调试日期匹配
    console.log('Looking for date:', dateStr)
    console.log(
      'Available dates:',
      props.weeklyStats.map((s) => s.date)
    )

    // 查找这一天的数据
    const dayData = props.weeklyStats.find((stat) => {
      // 确保比较的是相同格式的日期字符串
      const statDate = new Date(stat.date)
      const statDateStr = new Date(statDate.getTime() - statDate.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0]
      return statDateStr === dateStr
    })

    // 如果没有数据，使用默认值
    result.push({
      date: dateStr,
      totalReviews: dayData?.totalReviews || 0,
      uniqueCards: dayData?.uniqueCards || 0,
      totalTime: dayData?.totalTime || 0,
      feedbackStats: dayData?.feedbackStats || {
        skip: 0,
        forgot: 0,
        partially_recalled: 0,
        recalled_effort: 0,
        easily_recalled: 0
      }
    })
  }

  return result
})

// 修改其他计算属性使用 weeklyData
const totalCards = computed(() => {
  return weeklyData.value.reduce((sum, day: DayData) => {
    // 确保 feedbackStats 是对象而不是字符串
    const feedbackStats =
      typeof day.feedbackStats === 'string' ? JSON.parse(day.feedbackStats) : day.feedbackStats

    // 计算当天所有反馈的总和作为学习的卡片数
    const dayTotal = Object.values(feedbackStats as Record<string, number>).reduce(
      (a: number, b: number) => a + b,
      0
    )
    return sum + dayTotal
  }, 0)
})

const averagePerDay = computed(() => {
  return Math.round(totalCards.value / 7) // 始终除以7天
})

// 图表相关
const chartRef = ref<HTMLElement>()
let chart: echarts.EChartsType | null = null

const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart) return

  // 获取当前主题的颜色
  const primaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary')
    .trim()
  const primaryRgb = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary-rgb')
    .trim()
  const borderColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-border')
    .trim()

  // 获取最大值
  const maxValue = Math.max(...weeklyData.value.map((stat) => stat.totalReviews))

  // 计算合适的分割数量（比如只显示4-5条虚线）
  const splitNumber = Math.min(4, maxValue)
  const interval = Math.ceil(maxValue / splitNumber)

  const option = {
    grid: {
      top: '20px',
      left: '0',
      right: '0',
      bottom: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: weekDays.value,
      axisLine: {
        show: true,
        lineStyle: {
          color: borderColor,
          width: 1
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: 'rgba(125, 125, 125, 0.85)',
        fontSize: 13,
        margin: 12
      }
    },
    yAxis: {
      type: 'value',
      max: maxValue || 4,
      interval: interval, // 使用计算出的间隔
      splitNumber: splitNumber, // 使用计算出的分割数
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: borderColor,
          width: 1,
          dashOffset: 2
        }
      },
      axisLabel: {
        show: false
      }
    },
    series: [
      {
        data: weeklyData.value.map((stat) => ({
          value: stat.totalReviews,
          label: {
            show: stat.totalReviews > 0, // 显示所有非零值
            position: 'top',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            formatter: '{c}',
            offset: [0, 4],
            fontWeight: 500
          }
        })),
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 1, color: primaryColor },
              { offset: 0, color: `rgba(${primaryRgb}, 0.7)` }
            ]
          } as echarts.LinearGradientObject,
          borderRadius: [4, 4, 0, 0]
        }
      }
    ],
    animation: true
  }

  chart.setOption(option)
}

// 监听数据变化更新图表
watch(() => props.weeklyStats, updateChart, { deep: true })

// 组件挂载时初始化图表
onMounted(() => {
  initChart()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})

// 组件卸载时销毁图表
onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', () => {
    chart?.resize()
  })
})

// 计算学习时间
const studyTime = computed(() => {
  // 将所有天数的学习时间相加（毫秒）
  const totalMs = weeklyData.value.reduce((sum, day) => sum + day.totalTime, 0)
  const totalMinutes = Math.floor(totalMs / (1000 * 60))
  return {
    studyHours: Math.floor(totalMinutes / 60),
    studyMinutes: totalMinutes % 60
  }
})

// 计算周天数标签
const weekDays = computed(() => {
  return weeklyData.value.map((stat) => {
    const date = new Date(stat.date)
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  })
})

// 修改计算属性
const remainingMessage = computed(() => {
  const todayStats = weeklyData.value[weeklyData.value.length - 1]
  const todayReviews = todayStats.totalReviews

  if (todayReviews >= props.dailyGoal) {
    return '🎉 恭喜，你已达成今日目标！'
  } else {
    const remaining = props.dailyGoal - todayReviews
    return `🎯 还差 ${remaining} 张卡片达到今日目标！`
  }
})
</script>

<style lang="scss" scoped>
.weekly-progress {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;

  // 共享的卡片样式
  %card-base {
    background: var(--color-bg-flashcard);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    padding: 24px;

    .title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }
  }

  // 学习进度卡片
  .progress-card {
    @extend %card-base;

    .subtitle {
      font-size: 15px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }

    .chart-container {
      .chart {
        height: 220px;
      }
    }

    .goal-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
      background: var(--color-bg-secondary);
      border-radius: 8px;

      .goal-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .icon {
          font-size: 18px;
        }

        .content {
          flex: 1;
          position: relative;
          height: 42px; // 固定高度，确保对齐

          .label {
            font-size: 13px;
            color: var(--color-text-secondary);
            position: absolute;
            top: 0;
          }

          .value {
            position: absolute;
            bottom: 0;
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--color-text-secondary);
            font-size: 14px;

            strong {
              color: var(--color-text-primary);
              font-weight: 600;
              font-size: 16px;
            }

            .edit-btn {
              padding: 2px 6px;
              background: none;
              border: none;
              cursor: pointer;
              opacity: 0.6;

              &:hover {
                opacity: 1;
              }
            }
          }
        }
      }
    }
  }

  // 本周统计卡片
  .stats-card {
    @extend %card-base;

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;

      .stats-item {
        .label {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-bottom: 4px;
        }

        .value {
          font-size: 15px;
          color: var(--color-text-secondary);

          strong {
            color: var(--color-text-primary);
            font-size: 24px;
            font-weight: 600;
          }
        }
      }
    }

    .performance {
      .label {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 6px;

        .info-icon {
          opacity: 0.6;
          cursor: help;
          transition: opacity 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          width: 16px;
          height: 16px;
          margin-top: 1px;

          :deep(.i-icon) {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          &:hover {
            opacity: 1;
          }
        }
      }

      .stats-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0px 0;

          .icon {
            width: 24px;
            text-align: center;
          }

          .stat-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;

            .stat-header {
              display: flex;
              justify-content: space-between;
              align-items: center;

              .name {
                color: var(--color-text-secondary);
                font-size: 14px;
              }

              .value {
                font-weight: 500;
                color: var(--color-text-primary);
                font-size: 14px;
              }
            }

            .progress-bar {
              height: 6px;
              background: var(--color-bg-tertiary);
              border-radius: 3px;
              overflow: hidden;

              .progress-value {
                height: 100%;
                border-radius: 3px;
                transition: width 0.3s ease;

                &.skip {
                  background: rgba(var(--color-text-secondary-rgb), 0.5);
                }

                &.forgot {
                  background: rgba(var(--color-danger-rgb), 0.5);
                }

                &.partially {
                  background: rgba(var(--color-yellow-rgb), 0.5);
                }

                &.effort {
                  background: rgba(var(--color-blue-rgb), 0.5);
                }

                &.easy {
                  background: rgba(var(--color-primary-rgb), 0.5);
                }
              }
            }
          }
        }
      }
    }
  }
}

// 添加全局样式
:global(.memory-performance-tooltip) {
  p {
    margin: 6px 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-text-inverse);

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      color: var(--color-primary-inverse);
      font-weight: 500;
    }
  }
}
</style>
