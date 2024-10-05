<template>
  <div class="daily-card-pick">
    <h3>今日卡片</h3>
    <div v-if="!selectedCard" class="cards-container">
      <div v-for="(card, index) in dailyCards" :key="index" class="card" @click="selectCard(card)">
        <div class="card-back"></div>
      </div>
    </div>
    <div v-else class="selected-card-message">今日卡片已选择</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const dailyCards = ref([])
const selectedCard = ref(null)

// 模拟从所有笔记中随机抽取3张卡片
const fetchDailyCards = async () => {
  // 这里应该是从您的数据源获取卡片的逻辑
  // 暂时用模拟数据代替
  dailyCards.value = [
    { id: 1, title: '卡片1' },
    { id: 2, title: '卡片2' },
    { id: 3, title: '卡片3' }
  ]
}

const selectCard = (card) => {
  selectedCard.value = card
  // 这里应该调用打开卡片编辑弹窗的函数
  openCardEditModal(card)
}

const openCardEditModal = (card) => {
  // 这里应该是打开卡片编辑弹窗的逻辑
  console.log('打开卡片编辑弹窗', card)
  // 模拟弹窗关闭后的操作
  setTimeout(() => {
    dailyCards.value = []
    selectedCard.value = null
  }, 2000)
}

onMounted(() => {
  fetchDailyCards()
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
}
.cards-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

.card {
  width: 160px; /* 固定宽度 */
  aspect-ratio: 1 / 1.78; /* 设置宽高比 */
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  position: relative; /* 添加相对定位 */
  border-radius: 15px; /* 移动到卡片容器 */
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
  background-image: url('@resources/card-bg.png');
  background-size: cover;
  background-position: center;
  border: 4px solid #7899e0; /* 更新边框颜色 */
  box-sizing: border-box; /* 确保边框不会增加卡片尺寸 */
}

.selected-card-message {
  margin-top: 20px;
  font-style: italic;
  color: #7899e0; /* 可以考虑更新这个颜色以保持一致性 */
}
</style>
