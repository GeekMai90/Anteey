<template>
  <div class="dropdown-menu">
    <button
      v-for="(item, index) in items"
      :key="index"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
    >
      <img v-if="item.fallbackImage" :src="item.fallbackImage" align="absmiddle" />
      <template v-else>
        {{ item.emoji }}
      </template>
      :{{ item.name }}:
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  command: {
    type: Function,
    required: true
  },
  editor: {
    type: Object,
    required: true
  }
})

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  }
)

const upHandler = () => {
  selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

const downHandler = () => {
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex.value)
}

const selectItem = (index) => {
  const item = props.items[index]
  if (item) {
    props.command({ name: item.name })
  }
}

const onKeyDown = ({ event }) => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'Enter') {
    enterHandler()
    return true
  }

  return false
}

defineExpose({
  onKeyDown
})
</script>

<style lang="scss">
/* Dropdown menu 样式保持不变 */
.dropdown-menu {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 0.7rem;
  box-shadow: var(--color-shadow);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: auto;
  padding: 0.4rem;
  position: relative;

  button {
    align-items: center;
    background-color: transparent;
    display: flex;
    gap: 0.25rem;
    text-align: left;
    width: 100%;
    border: none;
    border-radius: 0.25rem;

    &:hover,
    &:hover.is-selected {
      background-color: #f0f0f0;
    }

    &.is-selected {
      background-color: #f0f0f0;
    }

    img {
      height: 1em;
      width: 1em;
    }
  }
}
</style>
