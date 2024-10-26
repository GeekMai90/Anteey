<template>
  <ul class="suggestions">
    <li
      v-for="(item, index) in props.items"
      :key="index"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
    >
      {{ item.title }}
    </li>
  </ul>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: Array,
  command: Function,
  editor: Object,
  range: Object
})

const selectedIndex = ref(0)

const selectItem = (index) => {
  const item = props.items[index]
  if (item) {
    props.command(item)
  }
}

const upHandler = () => {
  selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

const downHandler = () => {
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex.value)
}

defineExpose({
  onKeyDown: ({ event }) => {
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
})
</script>

<style scoped>
.suggestions {
  padding: 0.2rem;
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0;
  max-height: 15rem;
  overflow: auto;
  z-index: 10;
}

.suggestions li {
  padding: 0.2rem 0.5rem;
  margin: 0;
  cursor: pointer;
}

.suggestions li.is-selected {
  background-color: #5c6ac4;
  color: white;
}
</style>
