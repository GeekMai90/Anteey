<template>
  <node-view-wrapper
    data-type="image-wrapper"
    class="tiptap-image-wrapper"
    :class="{ 'is-selected': props.selected }"
    :style="wrapperStyle"
  >
    <div class="image-container" :style="containerStyle">
      <img :src="props.node.attrs.src" :alt="props.node.attrs.alt" :style="imageStyle" />
      <div
        ref="moreButton"
        v-click-outside="hideMenu"
        class="image-more-button"
        @click.stop="toggleMenu"
      >
        <div class="icon">
          <More theme="outline" size="18" fill="white" />
        </div>
      </div>
    </div>
    <div v-if="showMenu" class="popup-menu" :style="menuStyle" @click.stop>
      <div class="popup-menu-item" @click="downloadImage">
        <div class="icon">
          <Download theme="outline" size="18" fill="var(--color-icon-default)" />
        </div>
        <div class="name">下载</div>
      </div>
      <div class="popup-menu-item" @click="copyImage">
        <div class="icon">
          <Copy theme="outline" size="18" fill="var(--color-icon-default)" />
        </div>
        <div class="name">复制</div>
      </div>
      <div class="popup-menu-item popup-menu-item-danger" @click="deleteImage">
        <div class="icon">
          <Delete theme="outline" size="18" fill="#ff4d4f" />
        </div>
        <div class="name">删除</div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Download, Copy, Delete, More } from '@icon-park/vue-next'

const props = defineProps(nodeViewProps)

const containerStyle = computed(() => ({
  width: props.node.attrs.width || '100%',
  textAlign: props.node.attrs.align || 'center'
}))

const imageStyle = computed(() => ({
  maxWidth: '100%',
  height: 'auto'
}))

const showMenu = ref(false)
const moreButton = ref(null)

const menuStyle = computed(() => {
  if (!moreButton.value) return {}
  const rect = moreButton.value.getBoundingClientRect()
  return {
    position: 'fixed',
    top: `${rect.bottom}px`,
    left: `${rect.right - 10}px`, // 调整这里，使菜单右对齐
    transform: 'translateX(-100%)'
  }
})
// 添加这个 watch 函数
watch(
  () => props.node.attrs.width,
  () => {
    if (showMenu.value) {
      nextTick(() => {
        updateMenuPosition()
      })
    }
  }
)
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    nextTick(() => {
      updateMenuPosition()
    })
  }
}
// 新增这个函数
const updateMenuPosition = () => {
  const menu = document.querySelector('.popup-menu')
  if (menu && moreButton.value) {
    const rect = moreButton.value.getBoundingClientRect()
    menu.style.top = `${rect.bottom}px`
    menu.style.left = `${rect.right}px`
    menu.style.transform = 'translateX(-100%)'

    // 确保菜单在视口内
    const menuRect = menu.getBoundingClientRect()
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 5}px`
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${rect.top - menuRect.height - moreButton.value.offsetHeight - 10}px`
    }
  }
}

// const imageStyle = computed(() => {
//   const { width, align } = props.node.attrs
//   return {
//     width: width || '100%',
//     display: 'block',
//     margin: align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : '0 auto'
//   }
// })

const wrapperStyle = computed(() => ({
  textAlign: props.node.attrs.align
}))

// const toggleMenu = () => {
//   showMenu.value = !showMenu.value
// }

const hideMenu = () => {
  showMenu.value = false
}

const downloadImage = () => {
  // 实现下载图片的逻辑
  showMenu.value = false
}

const copyImage = () => {
  // 实现复制图片的逻辑
  showMenu.value = false
}

const deleteImage = () => {
  props.deleteNode()
  showMenu.value = false
}
</script>

<style lang="scss" scoped>
.tiptap-image-wrapper {
  position: relative;
  display: inline-block;

  &:hover .image-more-button {
    display: flex;
  }
  .image-container {
    position: relative;
    display: inline-block;
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .image-more-button {
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 4px 4px;
    margin: 2px;

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
  }
}

.popup-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 120px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 8px;
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
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
    margin-top: 0px;
  }
}
</style>
