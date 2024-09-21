<template>
  <div class="cardbox-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="filter-bar">
          <!-- 收件箱 -->
          <div class="inbox-button" :class="{ active: isInboxSelected }" @click="toggleInbox">
            <div class="icon">
              <InboxIn theme="outline" size="18" fill="var(--color-text-primary)" />
            </div>
            <div class="name">收件箱</div>
          </div>
          <!-- 卡片柜 -->
          <div class="cardbox-dropdown" @click.stop="toggleCardBoxMenu">
            <div class="icon">
              <FileCabinet theme="outline" size="18" fill="var(--color-text-primary)" />
            </div>
            <div class="name">{{ selectedCardBoxName }}</div>
            <!-- 卡片柜下拉菜单 -->
            <div v-if="showCardBoxMenu" class="dropdown-menu" :class="{ show: showCardBoxMenu }">
              <div
                v-for="box in cardBoxes"
                :key="box.id"
                class="dropdown-item"
                :class="{ active: selectedCardBox && selectedCardBox.id === box.id }"
                @click.stop="selectCardBox(box)"
              >
                <div class="dropdown-item-content">
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
                <div v-if="box.id !== '0000'" class="dropdown-item-actions">
                  <button class="more-actions-btn" @click.stop="toggleMoreActions(box.id, $event)">
                    <div class="icon">
                      <More theme="outline" size="18" fill="#333" />
                    </div>
                  </button>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item add-cardbox" @click.stop="openCardBoxModal">
                <div class="dropdown-item-content">
                  <div class="icon">
                    <Plus theme="outline" size="18" fill="#b6b6b6" />
                  </div>
                  <div class="name">新增卡片盒</div>
                </div>
              </div>
            </div>
          </div>
          <!-- 菜单项的编辑菜单 -->
          <div
            v-if="showMoreActions"
            class="more-actions-menu"
            :class="{ show: showMoreActions }"
            :style="moreActionsMenuStyle"
          >
            <div
              class="more-action-item"
              @click.stop="editCardBox(getCardBoxById(showMoreActions))"
            >
              <div class="icon">
                <EditTwo theme="outline" size="16" fill="#b6b6b6" />
              </div>
              <div class="name">编辑</div>
            </div>
            <div class="more-action-item delete" @click.stop="deleteCardBox(showMoreActions)">
              <div class="icon">
                <Delete
                  theme="outline"
                  size="16"
                  :fill="isConfirmingDelete ? '#ff4d4f' : '#b6b6b6'"
                />
              </div>
              <div class="name delete">
                {{ isConfirmingDelete ? '确认删除' : '删除' }}
              </div>
            </div>
          </div>

          <!-- 卡片类型 -->
          <div class="cardtype-dropdown" @click.stop="toggleCardTypeMenu">
            <div class="icon">
              <BankCardTwo theme="outline" size="18" fill="#333" />
            </div>
            <div class="name">卡片类型</div>
            <div v-if="showCardTypeMenu" class="cadrtype-dropdown-menu" @click.stop>
              <div v-for="type in cardTypes" :key="type.value" class="cadrtype-dropdown-item">
                <div class="cadrtype-dropdown-item-content">
                  <div class="icon">
                    <component :is="type.icon" theme="outline" size="18" fill="#b6b6b6" />
                  </div>
                  <div class="name">
                    {{ type.label }}
                  </div>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="selectedCardTypes.includes(type.value)"
                    @change="toggleCardType(type.value)"
                  />

                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="right-actions">
          <div class="sort-button-container" @click.stop="toggleSortMenu">
            <div class="icon">
              <SortTwo theme="outline" size="18" fill="var(--color-text-primary)" />
            </div>
            <div v-if="showSortMenu" class="sort-dropdown-menu">
              <div
                v-for="option in sortOptions"
                :key="option.value"
                class="sort-dropdown-item"
                @click="selectSortOption(option)"
              >
                <div class="dropdown-item-content">
                  {{ option.label }}
                </div>
                <div v-if="currentSort === option.value" class="sort-direction">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </div>
              </div>
            </div>
          </div>
          <button class="add-note-button" @click="noteStore.createAndOpenNewNote">
            <Plus theme="outline" size="20" fill="#fff" />
            <!-- <span class="plus-icon">+</span> -->
          </button>
        </div>
      </div>
    </div>
    <div class="cardbox-view-container">
      <div class="card-grid-container">
        <div class="card-grid">
          <CardBoxNoteCard v-for="note in filteredNotes" :key="note.id" :note="note" />
        </div>
      </div>
      <!-- 创建/编辑卡片盒的模态框 -->
      <div v-if="showCardBoxModal" class="modal-overlay" @click="closeCardBoxModal">
        <div class="modal-content" @click.stop>
          <h2>{{ isEditing ? '编辑卡片盒' : '创建卡片盒' }}</h2>
          <input
            v-model="editingCardBox.name"
            :placeholder="isEditing ? '' : '输入卡片盒名称'"
            @keyup.enter="saveCardBox"
          />
          <div class="modal-actions">
            <button
              :disabled="!editingCardBox.name || editingCardBox.name.trim().length === 0"
              @click="saveCardBox"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import AppToolbar from '../components/AppToolbar.vue'
import {
  SortTwo,
  InboxIn,
  Box,
  BankCardTwo,
  More,
  EditTwo,
  Delete,
  Notes,
  Table,
  TransactionOrder,
  Deeplink,
  FileCabinet,
  Plus
} from '@icon-park/vue-next'
import { CardBox } from '../types/Note'
import CardBoxNoteCard from '../components/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'

const noteStore = useNoteStore()
const { notes, selectedCardTypes } = storeToRefs(noteStore)

const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)
const showCardBoxModal = ref(false)
const isEditing = ref(false)
const editingCardBox = ref<Partial<CardBox>>({ name: '' })
const moreActionsMenuStyle = ref({})
const isConfirmingDelete = ref(false)
const showSortMenu = ref(false)
const currentSort = ref('name')
const sortDirection = ref('asc')

// 排序选项功能
const sortOptions = [
  { value: 'name', label: '按名称排序' },
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
]

const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
}

const selectSortOption = (option: { value: string; label: string }) => {
  if (currentSort.value === option.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = option.value
    sortDirection.value = 'asc'
  }
  showSortMenu.value = false
}

let deleteTimeout: ReturnType<typeof setTimeout> | null = null

// 收件箱功能
// 筛选出所有没有加入卡片盒的笔记
const isInboxSelected = ref(false)

const toggleInbox = () => {
  isInboxSelected.value = !isInboxSelected.value
  // 如果切换收件箱的状态，将卡片盒的状态设置为卡片柜，即显示全部卡片
  if (isInboxSelected.value) {
    selectedCardBox.value = cardBoxes.value[0]
  }
}

// 卡片柜
const cardBoxes = computed(() => {
  const allCardsOption: CardBox = {
    id: '0000',
    name: '卡片柜',
    type: 'cardbox',
    description: '卡片柜',
    createdAt: new Date('2023-01-15T09:00:00Z'),
    updatedAt: new Date('2023-06-20T14:30:00Z'),
    noteIds: [],
    parentId: ''
  }

  // 确保 noteStore.cardBoxes 是一个数组，并且每个元素都有 name 属性
  const validCardBoxes = (noteStore.cardBoxes || []).filter(
    (box) => box && typeof box.name === 'string'
  )
  // 对 noteStore.cardBoxes 进行排序
  const sortedCardBoxes = [...validCardBoxes].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  // 将 "全部卡片" 选项放在最前面，然后是排序后的其他卡片盒
  return [allCardsOption, ...sortedCardBoxes]
})

const selectedCardBoxName = computed(() => {
  return selectedCardBox.value ? selectedCardBox.value.name : '卡片柜'
})

// 选择卡片盒进行筛选
const selectCardBox = (box: CardBox | null) => {
  console.log('选择卡片盒:', box?.name)
  selectedCardBox.value = box
  showCardBoxMenu.value = false
  // 如果选择了卡片盒，取消收件箱的选择状态
  if (box !== null) {
    isInboxSelected.value = false
  }
}
const filteredNotes = computed(() => {
  console.log('重新计算 filteredNotes')
  console.log('原始笔记数量:', notes.value.length)
  console.log('当前选中的卡片盒:', selectedCardBox.value?.name)
  console.log('是否选中收件箱:', isInboxSelected.value)

  return notes.value
    .filter((note) => {
      if (isInboxSelected.value) {
        return !note.cardBoxId
      } else if (selectedCardBox.value && selectedCardBox.value.id !== '0000') {
        return note.cardBoxId === selectedCardBox.value.id
      }
      return true
    })
    .filter((note) => {
      return selectedCardTypes.value.length === 0 || selectedCardTypes.value.includes(note.cardType)
    })
    .sort((a, b) => {
      let comparison = 0
      switch (currentSort.value) {
        case 'name':
          comparison = a.address.localeCompare(b.address, 'zh-CN')
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})

// 监听可能影响过滤结果的变量
watch(
  [isInboxSelected, selectedCardBox, selectedCardTypes, currentSort, sortDirection],
  () => {
    console.log('筛选条件发生变化')
    console.log('选中的卡片盒:', selectedCardBox.value?.name)
    console.log('是否选中收件箱:', isInboxSelected.value)
    console.log('选中的卡片类型:', selectedCardTypes.value)
    console.log('当前排序:', currentSort.value)
    console.log('排序方向:', sortDirection.value)
  },
  { deep: true }
)

// const filteredNotes = computed(() => {
//   console.log('原始笔记数量:', notes.value.length)

//   return notes.value
//     .filter((note) => {
//       // 根据选中的卡片盒进行筛选
//       if (isInboxSelected.value) {
//         return !note.cardBoxId
//       } else if (selectedCardBox.value && selectedCardBox.value.id !== '0000') {
//         return note.cardBoxId === selectedCardBox.value.id
//       }
//       return true
//     })
//     .filter((note) => {
//       // 根据选中的卡片类型进行筛选
//       return selectedCardTypes.value.length === 0 || selectedCardTypes.value.includes(note.cardType)
//     })
//     .sort((a, b) => {
//       let comparison = 0
//       switch (currentSort.value) {
//         case 'name':
//           comparison = a.address.localeCompare(b.address, 'zh-CN')
//           break
//         case 'createdAt':
//           comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
//           break
//         case 'updatedAt':
//           comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
//           break
//       }
//       return sortDirection.value === 'asc' ? comparison : -comparison
//     })
// })

// // 监听可能影响过滤结果的变量
// watch(
//   [isInboxSelected, selectedCardBox, selectedCardTypes, currentSort, sortDirection],
//   () => {
//     // 触发 filteredNotes 的重新计算
//     filteredNotes.value
//   },
//   { deep: true }
// )

// 卡片盒下拉项中的更多操作
const toggleMoreActions = (id: string, event: MouseEvent) => {
  event.stopPropagation()
  if (showMoreActions.value === id) {
    showMoreActions.value = null
  } else {
    showMoreActions.value = id
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    moreActionsMenuStyle.value = {
      top: `${rect.bottom + scrollTop}px`,
      left: `${rect.left + scrollLeft}px`
    }
  }
}

// 获取卡片盒
const getCardBoxById = (id: string | null) => {
  if (id === null) return null
  return cardBoxes.value.find((box) => box.id === id)
}

// 编辑卡片盒
const editCardBox = (box: CardBox | null | undefined) => {
  if (box) {
    openCardBoxModal(box)
    // 关闭编辑菜单
    showMoreActions.value = null
  }
}

// 删除卡片盒
const deleteCardBox = async (id: string | null) => {
  if (id === null) return

  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    deleteTimeout = setTimeout(() => {
      isConfirmingDelete.value = false
      showMoreActions.value = null
    }, 3000)
  } else {
    try {
      await noteStore.deleteCardBox(id)

      // 重新获取卡片盒数据
      // await noteStore.fetchCardBoxes()

      // 重新获取笔记数据
      await noteStore.fetchAllNotes()

      // 如果删除的是当前选中的卡片盒，重置选择
      if (selectedCardBox.value?.id === id) {
        selectCardBox(cardBoxes.value[0])
      }

      console.log('删除卡片盒成功:', id)

      showMoreActions.value = null
    } catch (error) {
      console.error('删除卡片盒失败:', error)
    } finally {
      isConfirmingDelete.value = false
      if (deleteTimeout) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }
    }
  }
}

// 打开卡片盒下拉菜单
const toggleCardBoxMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showCardBoxMenu.value = !showCardBoxMenu.value
  showCardTypeMenu.value = false // 关闭另一个菜单
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  const cardTypeDropdown = document.querySelector('.cardtype-dropdown')
  const cardBoxDropdown = document.querySelector('.cardbox-dropdown')
  const sortDropdown = document.querySelector('.sort-button-container')

  if (
    showCardTypeMenu.value &&
    cardTypeDropdown &&
    !cardTypeDropdown.contains(event.target as Node)
  ) {
    showCardTypeMenu.value = false
  }

  if (showCardBoxMenu.value && cardBoxDropdown && !cardBoxDropdown.contains(event.target as Node)) {
    showCardBoxMenu.value = false
  }
  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }

  showMoreActions.value = null
}

const openCardBoxModal = (boxOrEvent?: CardBox | MouseEvent) => {
  if (boxOrEvent && 'id' in boxOrEvent) {
    editingCardBox.value = { ...boxOrEvent, name: boxOrEvent.name || '' }
    isEditing.value = true
  } else {
    editingCardBox.value = { name: '' }
    isEditing.value = false
  }
  showCardBoxModal.value = true
}

const closeCardBoxModal = () => {
  showCardBoxModal.value = false
  editingCardBox.value = { name: '' }
  isEditing.value = false
}

const saveCardBox = async () => {
  if (editingCardBox.value.name && editingCardBox.value.name.trim()) {
    try {
      if (isEditing.value && editingCardBox.value.id) {
        await noteStore.updateCardBox(editingCardBox.value.id, editingCardBox.value.name.trim())
      } else {
        await noteStore.createCardBox(editingCardBox.value.name.trim())
      }
      await noteStore.fetchCardBoxes()
      closeCardBoxModal()
    } catch (error) {
      console.error(isEditing.value ? '更新卡片盒失败:' : '创建卡片盒失败:', error)
      alert(isEditing.value ? '更新卡片盒失败' : '创建卡片盒失败')
    }
  }
}

// 卡片类型下拉菜单

const cardTypes = [
  { value: 'Maincard', label: '主要卡', icon: Notes },
  { value: 'Bibcard', label: '书目卡', icon: Table },
  { value: 'Indexcard', label: '索引卡', icon: TransactionOrder },
  { value: 'Hoplinkcard', label: '跳转卡', icon: Deeplink }
]
const showCardTypeMenu = ref(false)

const toggleCardTypeMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showCardTypeMenu.value = !showCardTypeMenu.value
  showCardBoxMenu.value = false // 关闭另一个菜单
}

const toggleCardType = (type: string) => {
  noteStore.toggleCardType(type)
}

onMounted(async () => {
  document.addEventListener('click', handleGlobalClick)
  await noteStore.fetchCardBoxes()
  if (cardBoxes.value.length > 0) {
    selectCardBox(cardBoxes.value[0])
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
onUnmounted(() => {
  if (deleteTimeout) {
    clearTimeout(deleteTimeout)
  }
})
</script>

<style lang="scss">
.cardbox-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--color-bg-primary);

    .topToolBar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0 10px 16px;
      background-color: var(--color-bg-primary);

      .filter-bar {
        display: flex;
        gap: 4px;
        align-items: center;

        .inbox-button {
          display: flex;
          align-items: center;
          // width: 100px;
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 8px;
          // margin: 2px 8px;

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
            // margin-right: 3px;

            &:hover:not(:disabled) {
              background-color: var(--color-hover-bg);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

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

          &:hover {
            background-color: var(--color-hover-bg);
          }

          &.active {
            background-color: var(--color-menu-active-bg);
            // border: 1px solid var(--color-primary);
          }
        }

        .cardbox-dropdown {
          position: relative;
          display: flex;
          align-items: center;
          // width: 200px;
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 8px;
          // margin: 2px 8px;

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
            // margin-right: 3px;

            &:hover:not(:disabled) {
              background-color: var(--color-hover-bg);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

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

          &:hover {
            background-color: var(--color-hover-bg);
          }

          &.active {
            background-color: var(--color-menu-active-bg);
            // border: 1px solid var(--color-primary);
          }

          .dropdown-menu {
            position: absolute;
            top: calc(100% + 5px);
            left: 50%;
            transform: translateX(-50%); // 居中对齐
            background-color: var(--color-bg-primary);
            border-radius: 8px;
            z-index: 1000;
            min-width: max-content; // 至少与内容等宽
            max-width: 300px; // 设置最大宽度，避免过宽
            width: auto;
            max-height: 350px; // 设置最大高度，避免过高的菜单
            overflow-y: auto;
            padding: 6px 0;
            white-space: nowrap;
            background-clip: padding-box;
            box-shadow: var(--shadow-primary);
            opacity: 0;
            visibility: hidden;
            transition:
              opacity 0.3s ease,
              visibility 0.3s ease,
              transform 0.3s ease;
            transform: translateY(-10px) translateX(-50%);

            &.show {
              opacity: 1;
              visibility: visible;
              transform: translateY(0) translateX(-50%);
            }

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
                background-color: var(--color-button-active-bg);
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

            .dropdown-divider {
              height: 1px;
              margin: 6px 0;
              background-color: var(--color-border);
            }

            .dropdown-item.add-cardbox {
              position: sticky;
              bottom: 0;
              background-color: var(--color-bg-primary);
              // border-top: 1px solid var(--color-border);
              // margin-top: 6px;
              // padding-top: 8px;

              &:hover {
                background-color: var(--color-hover-bg);
              }

              .dropdown-item-content {
                display: flex;
                align-items: center;
                justify-content: center;
              }
            }
          }

          .dropdown-item-actions {
            position: relative;

            .more-actions-btn {
              background: none;
              border: none;
              cursor: pointer;
              padding: 4px;
              border-radius: 50%;
              transition: background-color 0.2s;
              margin-left: 10px;
            }
          }
        }
      }

      .right-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        padding-right: 16px;

        .sort-button-container {
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

            &:hover:not(:disabled) {
              background-color: var(--color-hover-bg);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

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

          &:hover {
            background-color: var(--color-hover-bg);
          }

          .sort-dropdown-menu {
            position: absolute;
            top: 90%;
            // left: -10px;
            right: 0;
            background-color: var(--color-bg-primary);
            border-radius: 8px;
            box-shadow: var(--shadow-primary);
            z-index: 1000;
            min-width: 200px;
            width: auto;
            overflow-y: auto;
            padding: 6px 0;
            white-space: nowrap;
          }

          .sort-dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
            color: var(--color-text-primary);
            white-space: nowrap;
            border-radius: 8px;
            margin: 2px 8px 2px 8px;
            user-select: none;

            &:hover {
              background-color: var(--color-hover-bg);
            }

            &.active {
              background-color: var(--color-menu-active-bg);
            }
          }
        }

        .add-note-button {
          color: var(--color-text-inversion);
          background-color: var(--color-primary);
          border: none;
          cursor: pointer;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 24px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;

          // 新增以下样式来处理 i-icon 类
          :deep(.i-icon) {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          :deep(svg) {
            width: 20px; // 或者您想要的大小
            height: 20px; // 或者您想要的大小
          }
        }
      }
    }
  }

  .cardbox-view-container {
    // height: 100%;
    // width: 100%;
    // padding: 0px 0px 10px 0px;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px); // 假设顶部工具栏高度为100px，请根据实际情况调整
    overflow: hidden; // 防止整个页面滚动

    .card-grid-container {
      flex: 1;
      // height: 100%;
      overflow-y: auto; // 允许卡片网格容器滚动
      // padding: 0 16px 16px 16px;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 16px;
      padding: 16px 30px;
      align-content: start; // 让内容从顶部开始排列
      justify-content: center; // 水平居中对齐

      // 使用视口单位和 clamp 函数来控制卡片高度
      --card-height: clamp(300px, calc(20vw - 32px), 370px);
      grid-auto-rows: var(--card-height);

      // 计算每行可以容纳的卡片数量
      --cards-per-row: calc((100% - 32px) / (300px + 16px));

      // 设置网格的行数，使用 max 函数确保至少有一行
      // grid-template-rows: repeat(auto-fill, var(--card-height));

      // 设置容器的最小高度，确保即使卡片数量不足也能填满屏幕
      // min-height: calc(100vh - 93px); // 假设顶部工具栏高度为100px，请根据实际情况调整
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;

      .modal-content {
        background-color: var(--color-bg-primary);
        padding: 20px;
        border-radius: 10px;
        width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

        h2 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
          text-align: center;
          color: var(--color-text-primary);
        }

        input {
          width: 100%;
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid var(--color-primary);
          border-radius: 5px;
          font-size: 16px;

          &:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 2px rgba(var(--color-primary), 0.2);
          }
        }

        .modal-actions {
          display: flex;
          justify-content: center;

          button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background-color: var(--color-primary);
            color: var(--color-bg-primary);
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;

            &:hover {
              background-color: var(--color-menu-active-bg);
            }

            &:disabled {
              background-color: #ccc;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
}

.cardtype-dropdown {
  position: relative;
  display: inline-flex;
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px 12px;
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
    // margin-right: 3px;

    &:hover:not(:disabled) {
      background-color: var(--color-hover-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

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

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-menu-active-bg);
    // border: 1px solid var(--color-primary);
  }

  .cadrtype-dropdown-menu {
    position: absolute;
    top: calc(100% + 5px);
    left: 50%;
    transform: translateX(-50%); // 居中对齐
    background-color: var(--color-bg-primary);
    border-radius: 8px;
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 200px;
    width: auto;
    overflow-y: auto;
    padding: 6px 0;
    white-space: nowrap;
    background-clip: padding-box;
    box-shadow: var(--shadow-primary);

    .cadrtype-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
      color: #333;
      white-space: nowrap;
      border-radius: 8px;
      margin: 2px 8px 2px 8px;

      &:hover {
        background-color: #f6f7f9;
      }

      &.active {
        background-color: rgba(0, 200, 168, 0.05);
        border: 1px solid #00c8a8;
        // color: #00C8A8;
      }

      .cadrtype-dropdown-item-content {
        display: flex;
        align-items: center;
        // gap: 10px;
        flex-grow: 1;
        align-items: center;
        // width: 200px;
        // padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        transition: background-color 0.2s;
        border-radius: 8px;
        // margin: 2px 8px;

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
          // margin-right: 3px;

          &:hover:not(:disabled) {
            background-color: var(--color-hover-bg);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

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

        // &:hover {
        //   background-color: var(--color-hover-bg);
        // }

        &.active {
          background-color: var(--color-menu-active-bg);
          // border: 1px solid var(--color-primary);
        }
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 18px;

        input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.4s;
        }

        input:checked + .slider {
          background-color: #00c8a8;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #00c8a8;
        }

        input:checked + .slider:before {
          transform: translateX(10px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      }
    }
  }

  .sort-dropdown-menu {
    position: absolute;
    top: calc(100% + 5px);
    left: 50%;
    transform: translateX(-50%); // 居中对齐
    background-color: var(--color-bg-primary);
    border-radius: 8px;
    z-index: 1000;
    min-width: 200px;
    width: auto;
    overflow-y: auto;
    padding: 6px 0;
    white-space: nowrap;
    background-clip: padding-box;
    box-shadow:
      0 3px 6px -4px rgb(0 0 0 / 12%),
      0 6px 16px 0 rgb(0 0 0 / 8%),
      0 9px 28px 8px rgb(0 0 0 / 5%);
  }

  .sort-dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    border-radius: 8px;
    margin: 2px 8px 2px 8px;

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: rgba(0, 200, 168, 0.05);
      border: 1px solid #00c8a8;
      // color: #00C8A8;
    }
  }
}

.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background-color: #d0d0d0;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background-color: #f0f0f0;
}

//卡片盒的更多操作菜单
.more-actions-menu {
  position: fixed; // 改回 fixed
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1002;
  min-width: max-content;
  width: 140px;
  max-width: 200px;
  padding: 6px;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;

  &.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .more-action-item {
    display: flex;
    align-items: center;
    // width: 200px;
    padding: 4px 16px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    // margin: 2px 8px;

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
      margin-right: 2px;

      &:hover:not(:disabled) {
        background-color: var(--color-hover-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 新增以下样式来处理 i-icon 类
      .i-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        flex-shrink: 0; // 防止图标缩小
      }

      svg {
        width: 16px; // 或者您想要的大小
        height: 16px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 15px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的

      &.delete {
        color: var(--color-text-danger);
      }
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.delete {
      color: var(--color-text-danger);
    }
  }
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}
</style>
