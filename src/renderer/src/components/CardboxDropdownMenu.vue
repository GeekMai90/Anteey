<!-- src/components/CardboxDropdownMenu.vue -->
<template>
  <div v-if="isOpen" class="dropdown-menu">
    <!-- <div v-for="box in cardBoxes" :key="box.id" class="dropdown-item" :class="{ active: isBoxSelected(box) }">
      <div class="dropdown-item-content" @click.stop="selectCardBox(box)">
        <component :is="box.id === '0000' ? FileCabinet : Box" theme="outline" size="18" fill="#333" />
        {{ box.name }}
      </div>
    </div> -->
    <div
      v-for="box in cardBoxes"
      :key="box.id"
      class="dropdown-item"
      :class="{ active: isBoxSelected(box) }"
    >
      <div class="dropdown-item-content" @click.stop="selectCardBox(box)">
        <div class="icon">
          <component
            :is="box.id === '0000' ? FileCabinet : Box"
            theme="outline"
            size="18"
            fill="#b6b6b6"
          />
        </div>
        <div class="name">
          {{ box.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileCabinet, Box } from '@icon-park/vue-next'
import { CardBox } from '@renderer/types/Note'

const props = defineProps<{
  isOpen: boolean
  cardBoxes: CardBox[]
  selectedCardBox: CardBox | null
}>()

const emit = defineEmits(['update:selectedCardBox', 'toggleMoreActions', 'close'])

const selectCardBox = (box: CardBox) => {
  emit('update:selectedCardBox', box)
  emit('close')
}

// const toggleMoreActions = (id: string, event: MouseEvent) => {
//   emit('toggleMoreActions', id, event);
// };

const isBoxSelected = (box: CardBox) => {
  return props.selectedCardBox && props.selectedCardBox.id === box.id
}
</script>

<style scoped lang="scss">
.dropdown-menu {
  position: absolute;
  top: 100%; // 将菜单定位在按钮下方
  right: 0; // 将菜单右对齐
  left: auto; // 取消左对齐
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  width: max-content; // 使用 max-content 确保菜单宽度适应内容
  max-width: 300px; // 设置最大宽度，避免过宽
  overflow-y: auto;
  padding: 6px 0;
  white-space: nowrap;
  margin-top: 8px; // 给按钮和菜单之间留一些间隔
}

// .dropdown-item {
//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   padding: 8px 16px;
//   cursor: pointer;
//   transition: background-color 0.2s;
//   font-size: 14px;
//   color: var(--default-text-color);
//   white-space: nowrap;
//   border-radius: 8px;
//   margin: 2px 8px 2px 8px;

//   .i-icon {
//     width: 16px;
//     height: 16px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//   }

//   &.active {
//     background-color: var(--menu-active-bg);
//     border: 1px solid var(--primary-color);
//   }

//   &:hover {
//     background-color: var(--sidebar-hover-bg);

//   }

//   .dropdown-menu::-webkit-scrollbar {
//     width: 6px;
//   }

//   .dropdown-menu::-webkit-scrollbar-thumb {
//     background-color: #d0d0d0;
//     border-radius: 3px;
//   }

//   .dropdown-menu::-webkit-scrollbar-track {
//     background-color: #f0f0f0;
//   }

//   .dropdown-item-content {
//     display: flex;
//     align-items: center;
//     gap: 10px;
//     flex-grow: 1;
//   }

//   .dropdown-item-actions {
//     position: relative;
//   }
// }
.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: var(--color-text-primary);
  white-space: nowrap;
  border-radius: 8px;
  margin: 2px 8px;

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-menu-active-bg);
  }

  .dropdown-item-content {
    position: relative;
    display: flex;
    align-items: center;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s;
      padding: 0;

      // 新增以下样式来处理 i-icon 类
      .i-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      svg {
        width: 18px; // 或者您想要的大小
        height: 18px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 15px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
    }
  }
}
</style>
