<template>
  <Teleport to="body">
    <div v-if="show" class="card-type-menu" :style="menuStyle" @click.stop>
      <div
        v-for="type in cardTypes"
        :key="type"
        :class="{ active: modelValue === type }"
        class="card-type-item"
        @click="selectCardType(type)"
      >
        <div class="icon">
          <component
            :is="getIcon(type)"
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">{{ getTypeLabel(type) }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Notes, BookOpen, ViewList, Link } from '@icon-park/vue-next'
import type { CardType } from '@shared/types'

const props = defineProps<{
  show: boolean
  modelValue: CardType
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CardType): void
  (e: 'close'): void
}>()

const cardTypes: CardType[] = ['Maincard', 'Bibcard', 'Indexcard', 'Hoplinkcard']

const menuStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${props.position.y}px`,
  left: `${props.position.x}px`,
  zIndex: '1000'
}))

const getIcon = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return Notes
    case 'Bibcard':
      return BookOpen
    case 'Indexcard':
      return ViewList
    case 'Hoplinkcard':
      return Link
  }
}

const getTypeLabel = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return '主要卡'
    case 'Bibcard':
      return '书目卡'
    case 'Indexcard':
      return '索引卡'
    case 'Hoplinkcard':
      return '跳转卡'
  }
}

const selectCardType = (type: CardType) => {
  emit('update:modelValue', type)
  emit('close')
}
</script>

<style lang="scss" scoped>
.card-type-menu {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  padding: 8px 0;
  min-width: 150px;
  .card-type-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
    }

    .icon {
      margin-right: 8px;
    }

    .name {
      font-size: 14px;
      line-height: 1;
    }
  }
}
</style>
