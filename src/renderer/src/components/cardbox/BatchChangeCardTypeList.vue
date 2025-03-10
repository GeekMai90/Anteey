<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div
        v-if="isOpen"
        ref="floating"
        class="batch-change-type-list"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`
        }"
      >
        <div class="header">
          <div class="title">选择卡片类型</div>
        </div>
        <div class="type-list">
          <DropdownListItem
            v-for="type in cardTypes"
            :key="type.value"
            @click="handleSelect(type.value)"
          >
            <template #icon>
              <component :is="type.icon" theme="outline" size="16" />
            </template>
            {{ type.label }}
          </DropdownListItem>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Notes, Bookshelf, ListAlphabet } from '@icon-park/vue-next'
import type { CardType } from '@shared/types'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import DropdownListItem from '@renderer/components/ui/DropdownListItem.vue'

const props = defineProps<{
  isOpen: boolean
  selectedCount: number
  buttonRef: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'change', type: CardType): void
}>()

// floating-ui 相关
const floating = ref<HTMLElement | null>(null)
const { x, y, strategy, update } = useFloating(
  computed(() => props.buttonRef),
  floating,
  {
    placement: 'top-start',
    middleware: [offset(4), flip(), shift()]
  }
)

// 监听 isOpen 变化，更新位置
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        update()
      })
    }
  }
)

// 卡片类型选项
const cardTypes = [
  { value: 'Maincard' as CardType, label: '主要卡片', icon: Notes },
  { value: 'Bibcard' as CardType, label: '参考卡片', icon: Bookshelf },
  { value: 'Indexcard' as CardType, label: '索引卡片', icon: ListAlphabet }
]

// 选择卡片类型
const handleSelect = (type: CardType) => {
  emit('change', type)
  emit('close')
}

// 生命周期钩子
onMounted(() => {
  nextTick(() => {
    update()
  })
})
</script>

<style lang="scss" scoped>
.batch-change-type-list {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  min-width: 150px;
  z-index: 1000;
  padding: 8px 0;

  .header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border);

    .title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }

  .type-list {
    padding: 4px;
  }
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition: all 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
