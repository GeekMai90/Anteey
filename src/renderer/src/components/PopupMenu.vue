<template>
  <Teleport to="body">
    <div v-if="show" :style="menuStyle" class="popup-menu" @click.stop>
      <div
        v-for="item in menuItems"
        :key="item.name"
        class="popup-menu-item"
        :class="{ 'popup-menu-item-danger': item.isDangerous }"
        @click="handleItemClick(item)"
      >
        <div v-if="item.icon" class="icon">
          <component
            :is="item.icon"
            theme="outline"
            size="18"
            :fill="item.isDangerous ? '#ff4d4f' : item.fill || 'var(--color-icon-default)'"
          />
        </div>
        <div class="name" :class="{ 'popup-menu-item-danger': item.isDangerous }">
          {{ item.label }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  name: string
  label: string
  icon?: any
  action: () => void
  fill?: string
  isDangerous?: boolean
}

defineProps<{
  menuItems: MenuItem[]
}>()

const show = ref(false)
const menuStyle = ref({})

const handleItemClick = (item: MenuItem) => {
  item.action()
  closeMenu()
}

const closeMenu = () => {
  show.value = false
}

const openMenu = (x: number, y: number) => {
  menuStyle.value = {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`
  }
  show.value = true
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

defineExpose({ openMenu, closeMenu })
</script>

<style scoped lang="scss">
.popup-menu {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 200px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}

.popup-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.popup-menu-item-danger {
    color: #ff4d4f;
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.delete {
    color: #ff4d4f;
  }
}
</style>
