<template>
  <div class="daily-card-pick">
    <h3>今日卡片</h3>
    <div v-if="!todayCardSelected" class="cards-container">
      <div v-for="(card, index) in dailyCards" :key="index" class="card" @click="selectCard(card)">
        <div class="card-back" :style="{ backgroundImage: `url(${card.background})` }"></div>
      </div>
    </div>
    <div v-else class="selected-card-message">
      <div class="selected-card-container">
        <NoteCard v-if="selectedCardNote" :note="selectedCardNote" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '@renderer/stores/noteStores'
import { ref, onMounted, computed } from 'vue'
import NoteCard from './NoteCard.vue'
import { Note } from '@renderer/types/Note'
import confetti from 'canvas-confetti'

interface Card {
  id: string
  address: string
  background: string
}

const noteStore = useNoteStore()
const dailyCards = ref<Card[]>([])
const selectedCard = ref<Card | null>(null)
const selectedCardNote = ref<Note | null>(null)

// 导入所有卡片背景图片
const cardBackgrounds = import.meta.glob('../assets/cardbgs/*.{jpg,jpeg,png,gif}', {
  eager: true,
  as: 'url'
})

// 获取卡片背景图片数组
const cardBackgroundArray = Object.values(cardBackgrounds)

// 获取今天的种子
const getTodaySeed = () => {
  const today = new Date()
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
}

// 根据日期选择背景
const getDailyBackground = () => {
  const seed = getTodaySeed()
  const index = seed % cardBackgroundArray.length
  return cardBackgroundArray[index]
}

// // 从所有笔记中随机抽取3张卡片
// const fetchDailyCards = async () => {
//   const dailyBackground = getDailyBackground()
//   const allNotes = await noteStore.fetchAllNotes()

//   // 随机选择3条笔记
//   const selectedNotes = allNotes
//     .sort(() => 0.5 - Math.random())
//     .slice(0, 3)
//     .map((note) => ({
//       id: note.id,
//       address: note.address,
//       background: dailyBackground
//     }))

//   dailyCards.value = selectedNotes
// }

// const selectCard = (card: Card) => {
//   selectedCard.value = card
//   noteStore.openNoteEditor(card.id)
// }

// onMounted(() => {
//   fetchDailyCards()
// })
// 获取今天的日期字符串
const getTodayString = () => {
  const today = new Date()
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
}

// 检查今天是否已经选择了卡片
const checkTodaySelection = () => {
  const todayString = getTodayString()
  const savedSelection = localStorage.getItem('dailyCardSelection')
  if (savedSelection) {
    const { date, card } = JSON.parse(savedSelection)
    if (date === todayString) {
      selectedCard.value = card
      return true
    }
  }
  return false
}

// 保存今天的选择
const saveTodaySelection = (card: Card) => {
  const todayString = getTodayString()
  localStorage.setItem(
    'dailyCardSelection',
    JSON.stringify({
      date: todayString,
      card: card
    })
  )
}

// 从所有笔记中随机抽取3张卡片
const fetchDailyCards = async () => {
  if (checkTodaySelection()) {
    return
  }

  const dailyBackground = getDailyBackground()
  const allNotes = await noteStore.fetchAllNotes()

  const selectedNotes = allNotes
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map((note) => ({
      id: note.id,
      address: note.address,
      background: dailyBackground
    }))

  dailyCards.value = selectedNotes
}

const triggerConfetti = () => {
  const myCanvas = document.createElement('canvas')
  myCanvas.style.position = 'fixed'
  myCanvas.style.inset = '0'
  myCanvas.style.width = '100%'
  myCanvas.style.height = '100%'
  myCanvas.style.zIndex = '9999' // 设置一个很高的 z-index
  myCanvas.style.pointerEvents = 'none' // 允许点击穿透
  document.body.appendChild(myCanvas)

  const myConfetti = confetti.create(myCanvas, {
    resize: true,
    useWorker: true
  })

  myConfetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.3 }
  })

  // 动画结束后移除 canvas
  setTimeout(() => {
    document.body.removeChild(myCanvas)
  }, 4000) // 根据动画持续时间调整
}

const selectCard = (card: Card) => {
  selectedCard.value = card
  saveTodaySelection(card)
  noteStore.openNoteEditor(card.id)
  fetchNote(card.id)
  // 触发礼花效果
  // 延迟触发礼花效果
  setTimeout(triggerConfetti, 100)
}

const fetchNote = async (id: string) => {
  const note = await noteStore.fetchNoteById(id)
  if (note) {
    selectedCardNote.value = note
  }
}

// const viewSelectedCard = () => {
//   if (selectedCard.value) {
//     noteStore.openNoteEditor(selectedCard.value.id)
//   }
// }

const todayCardSelected = computed(() => selectedCard.value !== null)

onMounted(() => {
  if (!checkTodaySelection()) {
    fetchDailyCards()
  }
  if (selectedCard.value) {
    fetchNote(selectedCard.value.id)
  }
})
</script>

<style scoped>
.daily-card-pick {
  margin-top: 20px;
  text-align: center;
}
h3 {
  color: #fff;
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 30px;
  user-select: none;
}
.cards-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

.card {
  width: 170px; /* 固定宽度 */
  /* height: 287px; 固定高度 */
  aspect-ratio: 1 / 1.68;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  position: relative; /* 添加相对定位 */
  border-radius: 8px; /* 移动到卡片容器 */
  overflow: hidden; /* 确保内容不会溢出圆角 */
  background-color: #7899e0;
  box-shadow: 0 4px 15px rgba(120, 153, 224, 0.3); /* 更新阴影颜色 */
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 8px 25px rgba(120, 153, 224, 0.5); /* 更新悬停时的阴影颜色 */
}

.card-back {
  position: absolute; /* 绝对定位 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  border: 4px solid #7899e0; /* 更新边框颜色 */
  box-sizing: border-box; /* 确保边框不会增加卡片尺寸 */
}

.selected-card-message {
  margin-top: 20px;
  /* font-style: italic;
  color: #7899e0; 可以考虑更新这个颜色以保持一致性 */
}
.view-card-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #7899e0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.view-card-btn:hover {
  background-color: #6384c6;
}
.selected-card-container {
  width: 500px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(120, 153, 224, 0.3);
  /* padding: 20px; */
  margin-top: 20px;
  user-select: none;
}
</style>
