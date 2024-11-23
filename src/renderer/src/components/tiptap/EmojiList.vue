<template>
  <div class="dropdown-menu">
    <button
      v-for="(item, index) in items"
      :key="index"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
    >
      <img :src="item.src" :alt="item.shortName" class="emoji-image" />
      <span>:{{ item.shortName }}:</span>
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
    props.command({
      name: item.shortName,
      src: item.src,
      shortcodes: [item.shortName]
    })
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
.dropdown-menu {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 0.7rem;
  box-shadow: var(--shadow-primary);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: auto;
  padding: 0.4rem;
  position: relative;
  max-height: 300px;

  button {
    align-items: center;
    background-color: transparent;
    display: flex;
    gap: 0.5rem;
    text-align: left;
    width: 100%;
    border: none;
    border-radius: 0.25rem;
    padding: 0.4rem 0.6rem;
    color: var(--color-text-primary);
    cursor: pointer;

    &:hover,
    &:hover.is-selected {
      background-color: var(--color-hover-bg);
    }

    &.is-selected {
      background-color: var(--color-hover-bg);
    }

    .emoji-image {
      width: 1.2em;
      height: 1.2em;
      vertical-align: -0.1em;
    }

    span {
      font-size: 0.9em;
    }
  }
}
</style>
