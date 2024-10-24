<template>
  <div class="share-card">
    <div class="share-content">
      <div class="note-header">
        <!-- <div>Debug - Card Type: {{ note.cardType }}</div> -->
        <div class="note-indicator" :class="cardTypeClass"></div>
        <h3 class="note-title">{{ note.address }}</h3>
      </div>
      <div class="note-content">
        <TipTapRender :content="note.content" :editable="false" />
      </div>
      <div class="content-spacer"></div>
      <div class="note-date">{{ currentDate }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import TipTapRender from './TipTapRender.vue'
import { Note } from '@renderer/types/Note'
import { computed } from 'vue'

const props = defineProps<{
  note: Note
}>()

// const formatDate = (date: Date) => {
//   return format(date, 'yyyy年MM月dd日')
// }
// 获取当前日期
const currentDate = format(new Date(), 'yyyy年MM月dd日')

const cardTypeClass = computed(() => {
  switch (props.note.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.share-card {
  width: 375px;
  padding: 16px;
  background: linear-gradient(135deg, #7ec2ff 0%, #73e7d1 100%);
  border-radius: 16px;
}

.share-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-height: 200px;
  display: flex;
  flex-direction: column; // 使用弹性布局
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.note-indicator {
  width: 4px;
  height: 14px;
  border-radius: 2px;
  margin-right: 10px;

  &.maincard {
    background-color: var(--color-primary);
  }
  &.bibcard {
    background-color: var(--color-yellow);
  }
  &.indexcard {
    background-color: var(--color-blue);
  }
  &.hoplinkcard {
    background-color: var(--color-pink);
  }
}

.note-content {
  flex: 1; // 让内容区域占据剩余空间
  :deep(.tiptap) {
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.4;
    h1 {
      font-size: 14px;
    }
    p {
      font-size: 10px;
      line-height: 1.4;
    }
  }
}

// 添加一个间隔
.content-spacer {
  height: 16px; // 调整这个值来改变内容和日期之间的间距
}

.note-date {
  font-size: 14px;
  color: var(--color-text-secondary);
  align-self: flex-end; // 将日期靠右对齐
}

.note-title {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
}
</style>
