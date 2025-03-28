<template>
  <Transition name="fade">
    <div v-if="dailyLetterStore.isAnimating" class="daily-letter-animation">
      <!-- 自行车/交通工具 -->
      <div v-if="showBicycle" class="bicycle" :style="bicycleStyle">
        <component
          :is="currentVehicleIcon"
          theme="outline"
          size="36"
          fill="var(--color-text-primary)"
          :strokeWidth="3"
        />
      </div>
      <!-- 邮箱图标 -->
      <div class="mailbox" :style="mailboxStyle">
        <img src="@renderer/assets/images/邮箱图标.svg" alt="mailbox" class="mailbox-icon" />
      </div>
    </div>
  </Transition>

  <!-- 修改后的信件内容模态窗 -->
  <DailyLetterContent
    :modelValue="showLetterContent"
    @update:modelValue="showLetterContent = $event"
    @after-show="handleLetterAfterShow"
  />
</template>

<script setup lang="ts">
import { Riding, Sport, Truck } from '@icon-park/vue-next'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'
import { onUnmounted, ref, computed, onMounted } from 'vue'
import DailyLetterContent from './DailyLetterContent.vue'

const dailyLetterStore = useDailyLetterStore()
let bicycleTimer: NodeJS.Timeout | null = null
let endTimer: NodeJS.Timeout | null = null
let iconChangeInterval: NodeJS.Timeout | null = null

// 图标集合 - 行人、自行车、汽车
const vehicleIcons = [Sport, Riding, Truck]
// 当前图标索引
const currentIconIndex = ref(0)
// 当前图标组件
const currentVehicleIcon = computed(() => vehicleIcons[currentIconIndex.value])

// 自行车显示状态
const showBicycle = ref(false)
// 自行车位置
const bicyclePosition = ref(0)
// 自行车透明度
const bicycleOpacity = ref(0)
// 邮箱显示状态
const showMailbox = ref(false)
// 邮箱透明度
const mailboxOpacity = ref(0)
// 邮箱抖动角度
const mailboxRotation = ref(0)
// 邮箱抖动方向
const mailboxShakeDirection = ref(1)
// 邮箱抖动间隔ID
let mailboxShakeInterval: NodeJS.Timeout | null = null

// 确保 ref 的类型声明
const showLetterContent = ref<boolean>(false)

// 创建音频实例
const mailboxSound = new Audio(
  new URL('@renderer/assets/sounds/mailbox-shake.mp3', import.meta.url).href
)
mailboxSound.volume = 0.3 // 设置音量为30%

// 创建信件打开音效实例
const letterOpenSound = new Audio(
  new URL('@renderer/assets/sounds/letter-open.mp3', import.meta.url).href
)
letterOpenSound.volume = 0.3 // 设置音量为30%

// 自行车样式
const bicycleStyle = computed(() => {
  return {
    transform: `translateX(${bicyclePosition.value}px)`,
    opacity: bicycleOpacity.value,
    transition: 'transform 4s ease-in-out, opacity 0.3s ease-in-out'
  }
})

// 邮箱样式
const mailboxStyle = computed(() => {
  return {
    opacity: mailboxOpacity.value,
    transform: `rotate(${mailboxRotation.value}deg)`,
    transition: 'opacity 0.5s ease'
  }
})

// 清理定时器
onUnmounted(() => {
  // console.log('组件卸载，清理所有定时器和音频资源')
  if (bicycleTimer) {
    clearTimeout(bicycleTimer)
    bicycleTimer = null
  }
  if (endTimer) {
    clearTimeout(endTimer)
    endTimer = null
  }
  if (mailboxShakeInterval) {
    clearInterval(mailboxShakeInterval)
    mailboxShakeInterval = null
  }
  if (iconChangeInterval) {
    clearInterval(iconChangeInterval)
    iconChangeInterval = null
  }

  // 清理所有音频资源
  mailboxSound.pause()
  mailboxSound.src = ''
  letterOpenSound.pause()
  letterOpenSound.src = ''
})

// 监听动画状态和信件状态
onMounted(() => {
  // 监听动画开始
  const startWatcher = dailyLetterStore.$subscribe((_mutation, state) => {
    if (state.isAnimating && state.isBicycleAnimating) {
      // console.log('开始整体动画流程')
      startAnimationSequence()
    }
  })

  // 监听信件状态
  const letterWatcher = dailyLetterStore.$subscribe((_mutation, state) => {
    // 当有当前信件时，说明服务端已返回内容
    if (state.currentLetter && state.isMailboxShaking) {
      // console.log('信件内容已返回，停止抖动')
      stopMailboxShake()
      showLetterContent.value = true
    }
  })

  // 组件卸载时停止监听
  onUnmounted(() => {
    startWatcher()
    letterWatcher()
  })
})

// 开始动画序列
function startAnimationSequence() {
  // 重置所有状态
  resetAnimationState()

  // 1. 显示自行车/行人
  showBicycle.value = true
  setTimeout(() => {
    bicycleOpacity.value = 1
  }, 50)

  // 2. 显示邮箱
  showMailbox.value = true
  setTimeout(() => {
    mailboxOpacity.value = 1
  }, 100)

  // 开始图标变换
  startIconChanges()

  // 3. 自行车开始移动
  // console.log('交通工具开始移动')
  setTimeout(() => {
    // 计算要移动的距离(到达屏幕右侧，但留出足够空间不与邮箱重叠)
    const endPosition = window.innerWidth - 200
    bicyclePosition.value = endPosition

    // 4. 自行车到达终点后
    bicycleTimer = setTimeout(() => {
      // console.log('交通工具到达终点')
      // 停止图标变换
      stopIconChanges()
      // 自行车淡出
      bicycleOpacity.value = 0

      // 5. 隐藏自行车
      setTimeout(() => {
        showBicycle.value = false
      }, 300)

      // 6. 邮箱开始抖动
      // console.log('邮箱开始抖动')
      dailyLetterStore.startMailboxShake()
      startMailboxShake()
    }, 4000) // 与自行车移动时间相匹配
  }, 200)
}

// 开始图标变换
function startIconChanges() {
  // 初始图标为行人
  currentIconIndex.value = 0

  // 每1.3秒变换一次图标
  iconChangeInterval = setInterval(() => {
    // 循环切换图标
    currentIconIndex.value = (currentIconIndex.value + 1) % vehicleIcons.length
    // console.log('图标变换为:', currentIconIndex.value)
  }, 1300)
}

// 停止图标变换
function stopIconChanges() {
  if (iconChangeInterval) {
    clearInterval(iconChangeInterval)
    iconChangeInterval = null
  }
}

// 重置动画状态
function resetAnimationState() {
  // 重置自行车
  showBicycle.value = false
  bicyclePosition.value = 0
  bicycleOpacity.value = 0
  currentIconIndex.value = 0

  // 重置邮箱
  showMailbox.value = false
  mailboxOpacity.value = 0
  mailboxRotation.value = 0

  // 清理定时器
  if (bicycleTimer) {
    clearTimeout(bicycleTimer)
    bicycleTimer = null
  }
  if (endTimer) {
    clearTimeout(endTimer)
    endTimer = null
  }
  if (mailboxShakeInterval) {
    clearInterval(mailboxShakeInterval)
    mailboxShakeInterval = null
  }
  if (iconChangeInterval) {
    clearInterval(iconChangeInterval)
    iconChangeInterval = null
  }
}

// 开始邮箱抖动
function startMailboxShake() {
  if (mailboxShakeInterval) {
    clearInterval(mailboxShakeInterval)
  }

  // 播放音效
  try {
    mailboxSound.currentTime = 0 // 重置音频播放位置
    mailboxSound.play()
  } catch (error) {
    console.error('播放音效失败:', error)
  }

  mailboxShakeInterval = setInterval(() => {
    // 在 -8 到 8 度之间交替
    if (mailboxRotation.value >= 8) {
      mailboxShakeDirection.value = -1
    } else if (mailboxRotation.value <= -8) {
      mailboxShakeDirection.value = 1
    }

    mailboxRotation.value += mailboxShakeDirection.value * 2
  }, 100)
}

// 停止邮箱抖动
function stopMailboxShake() {
  if (mailboxShakeInterval) {
    clearInterval(mailboxShakeInterval)
    mailboxShakeInterval = null
  }

  // 停止抖动音效
  try {
    mailboxSound.pause()
    mailboxSound.currentTime = 0
  } catch (error) {
    console.error('停止音效失败:', error)
  }

  // 播放信件打开音效
  try {
    letterOpenSound.currentTime = 0
    letterOpenSound.play()
  } catch (error) {
    console.error('播放信件打开音效失败:', error)
  }

  // 回到原位
  mailboxRotation.value = 0
}

// 处理信件展示完成
const handleLetterAfterShow = () => {
  // 结束整体动画
  dailyLetterStore.endAnimation()
}
</script>

<style lang="scss" scoped>
.daily-letter-animation {
  position: fixed;
  bottom: 30px;
  left: 0;
  right: 0;
  height: 40px;
  pointer-events: none;
  z-index: 99999;
}

.bicycle {
  position: absolute;
  bottom: 8px;
  left: 70px;
  z-index: 99999;
  will-change: transform, opacity;
}

.mailbox {
  position: absolute;
  bottom: 4px;
  right: 40px;
  z-index: 99999;
  will-change: transform, opacity;

  .mailbox-icon {
    width: 64px;
    height: 64px;
  }
}

// 淡入淡出过渡
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
