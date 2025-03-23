<template>
  <AppToolbar />
  <div class="container">
    <h2>搜索框测试</h2>
    <div class="demo-section">
      <div class="search-row">
        <SearchInput v-model="searchValue" :height="36" placeholder="请输入搜索内容" />
      </div>
      <div class="search-row">
        <SearchInput v-model="searchValue" :width="300" :height="36" placeholder="自定义宽度" />
      </div>
      <p class="mt-4">当前搜索值：{{ searchValue }}</p>
    </div>

    <h2>分段按钮测试</h2>
    <div class="demo-section">
      <SegmentedButton v-model="selectedValue" :options="options" />
      <p class="mt-4">当前选中值：{{ selectedValue }}</p>
    </div>

    <h2>扩散按钮测试</h2>
    <div class="demo-section">
      <div class="button-row">
        <SpreadButton>默认扩散按钮</SpreadButton>
        <SpreadButton type="primary">主要扩散按钮</SpreadButton>
        <SpreadButton disabled>禁用扩散按钮</SpreadButton>
      </div>

      <div class="button-row">
        <SpreadButton :icon="Plus">带图标的扩散按钮</SpreadButton>
        <SpreadButton type="primary" :icon="Search">搜索</SpreadButton>
      </div>

      <div class="button-row">
        <SpreadButton :height="24">小高度</SpreadButton>
        <SpreadButton :height="32">默认高度</SpreadButton>
        <SpreadButton :height="40">大高度</SpreadButton>
      </div>
    </div>

    <h2>按钮测试</h2>
    <div class="demo-section">
      <div class="button-row">
        <Button>默认按钮</Button>
        <Button type="primary">主要按钮</Button>
        <Button type="text">文本按钮</Button>
        <Button type="link">链接按钮</Button>
        <Button type="delete">删除按钮</Button>
      </div>

      <div class="button-row">
        <Button :loading="loading" @click="handleClick">点击加载</Button>
        <Button type="primary" :loading="loading" @click="handleClick">点击加载</Button>
      </div>

      <div class="button-row">
        <Button :icon="Plus">添加</Button>
        <Button type="primary" :icon="Plus">添加</Button>
        <Button :icon="Edit">编辑</Button>
        <Button type="primary" :icon="Delete" disabled>删除</Button>
      </div>

      <div class="button-row">
        <Button size="small">小按钮</Button>
        <Button>默认按钮</Button>
        <Button size="large">大按钮</Button>
      </div>

      <div class="button-row">
        <Button type="primary" size="small">小按钮</Button>
        <Button type="primary">默认按钮</Button>
        <Button type="primary" size="large">大按钮</Button>
      </div>

      <div class="button-row">
        <Button disabled>禁用按钮</Button>
        <Button type="primary" disabled>禁用主要按钮</Button>
        <Button type="text" disabled>禁用文本按钮</Button>
        <Button type="link" disabled>禁用链接按钮</Button>
      </div>

      <div class="button-row">
        <Button :icon="Search" shape="circle" />
        <Button :icon="Search" shape="square" />
        <Button type="primary" :icon="Search" shape="circle" />
        <Button type="primary" :icon="Search" shape="square" />
      </div>

      <div class="button-row">
        <Button :icon="Search" shape="circle" size="small" />
        <Button :icon="Search" shape="circle" />
        <Button :icon="Search" shape="circle" size="large" />
      </div>

      <div class="button-row">
        <Button :icon="Search" iconOnly>搜索</Button>
        <Button type="primary" :icon="Search" iconOnly>搜索</Button>
        <Button :icon="Search" :height="36">自定义高度</Button>
      </div>

      <div class="button-row">
        <Button
          :icon="Edit"
          plain
          iconOnly
          :tooltip="{
            content: '编辑',
            delay: { show: 1000 }
          }"
        />
        <Button
          :icon="Delete"
          plain
          iconOnly
          type="primary"
          :tooltip="{
            content: '删除',
            delay: { show: 1000 }
          }"
        />
        <Button
          :icon="Plus"
          plain
          iconOnly
          size="small"
          :tooltip="{
            content: '添加',
            delay: { show: 1000 }
          }"
        />
        <Button
          :icon="Plus"
          plain
          iconOnly
          size="large"
          :tooltip="{
            content: '添加',
            delay: { show: 1000 }
          }"
        />
      </div>

      <div class="button-row">
        <Button :icon="Search" :height="36">自定义高度</Button>
      </div>

      <!-- 添加下拉按钮测试 -->
      <h3>下拉按钮</h3>
      <div class="button-row">
        <Button :dropdown="true"> 选择选项 </Button>
        <Button type="primary" :dropdown="true"> 下拉菜单 </Button>
        <Button :icon="FileSearch" :dropdown="true"> 高级搜索 </Button>
        <Button type="primary" :icon="Filter" :dropdown="true"> 筛选 </Button>
      </div>

      <div class="button-row">
        <Button
          :icon="FileSearch"
          :dropdown="true"
          :tooltip="{
            content: '点击展开高级搜索',
            delay: { show: 1000 }
          }"
        >
          高级搜索
        </Button>
        <Button type="primary" :dropdown="true" size="small"> 小型下拉 </Button>
        <Button type="primary" :dropdown="true" size="large"> 大型下拉 </Button>
      </div>

      <div class="block-button-section">
        <Button :block="true">块级按钮</Button>
        <Button type="primary" :block="true">主要块级按钮</Button>
      </div>
    </div>

    <h2>日历按钮测试</h2>
    <div class="demo-section">
      <div class="button-row">
        <CalendarButton
          :selectedDate="selectedDate"
          :tooltip="{
            content: '选择日期',
            delay: { show: 1000 }
          }"
          @click="toggleDateFilter"
        />
        <CalendarButton
          :selectedDate="'2024-03-14'"
          :width="150"
          :tooltip="{
            content: '自定义宽度',
            delay: { show: 1000 }
          }"
        />
      </div>
    </div>

    <h2>下拉菜单测试</h2>
    <div class="demo-section">
      <div class="button-row">
        <!-- 基础用法 -->
        <Dropdown align="start" :items="dropdownItems" @select="handleDropdownSelect">
          选择选项
        </Dropdown>

        <!-- 不同类型 -->
        <Dropdown align="end" :items="dropdownItems" type="primary" @select="handleDropdownSelect">
          下拉菜单
        </Dropdown>

        <Dropdown :items="dropdownItems" type="text" @select="handleDropdownSelect">
          文本下拉
        </Dropdown>
      </div>

      <!-- 带图标 -->
      <div class="button-row">
        <Dropdown :items="dropdownItemsWithIcons" :icon="FileSearch" @select="handleDropdownSelect">
          高级搜索
        </Dropdown>

        <Dropdown
          :items="dropdownItemsWithIcons"
          type="primary"
          :icon="Filter"
          @select="handleDropdownSelect"
        >
          筛选
        </Dropdown>
      </div>

      <!-- 不同尺寸 -->
      <div class="button-row">
        <Dropdown :items="dropdownItems" size="small" @select="handleDropdownSelect">
          小型下拉
        </Dropdown>

        <Dropdown :items="dropdownItems" size="large" @select="handleDropdownSelect">
          大型下拉
        </Dropdown>
      </div>

      <!-- 不同位置 -->
      <div class="button-row">
        <Dropdown
          :items="dropdownItems"
          placement="bottom"
          type="primary"
          @select="handleDropdownSelect"
        >
          向下弹出
        </Dropdown>

        <Dropdown
          :items="dropdownItems"
          placement="top"
          type="primary"
          @select="handleDropdownSelect"
        >
          向上弹出
        </Dropdown>
      </div>

      <!-- 不同对齐方式 -->
      <div class="button-row">
        <Dropdown
          :items="dropdownItems"
          align="start"
          type="primary"
          @select="handleDropdownSelect"
        >
          左对齐
        </Dropdown>

        <Dropdown
          :items="dropdownItems"
          align="center"
          type="primary"
          @select="handleDropdownSelect"
        >
          居中对齐
        </Dropdown>

        <Dropdown :items="dropdownItems" align="end" type="primary" @select="handleDropdownSelect">
          右对齐
        </Dropdown>
      </div>

      <!-- 带提示 -->
      <div class="button-row">
        <Dropdown
          :items="dropdownItems"
          :icon="FileSearch"
          :tooltip="{
            content: '点击展开高级搜索',
            delay: { show: 1000 }
          }"
          @select="handleDropdownSelect"
        >
          高级搜索
        </Dropdown>
      </div>

      <!-- 带分割线的菜单 -->
      <div class="button-row">
        <Dropdown
          :items="dropdownItemsWithDivider"
          type="primary"
          :icon="MenuFoldOne"
          @select="handleDropdownSelect"
        >
          带分割线
        </Dropdown>
      </div>

      <!-- 悬停触发 -->
      <div class="button-row">
        <Dropdown
          :items="dropdownItems"
          trigger="hover"
          type="primary"
          @select="handleDropdownSelect"
        >
          悬停触发
        </Dropdown>
      </div>

      <!-- 禁用状态 -->
      <div class="button-row">
        <Dropdown :items="dropdownItems" disabled @select="handleDropdownSelect">
          禁用状态
        </Dropdown>
      </div>

      <!-- 选中反馈 -->
      <p v-if="lastSelectedDropdownItem" class="mt-4">
        最后选择的项目: {{ lastSelectedDropdownItem.label }} ({{ lastSelectedDropdownItem.key }})
      </p>

      <!-- 自定义高度的下拉菜单 -->
      <div class="button-row">
        <Dropdown :items="dropdownItems" :height="36" @select="handleDropdownSelect">
          自定义高度
        </Dropdown>

        <Dropdown :items="dropdownItems" type="primary" :height="40" @select="handleDropdownSelect">
          更高的下拉菜单
        </Dropdown>

        <Dropdown
          :items="dropdownItems"
          :height="32"
          :icon="FileSearch"
          @select="handleDropdownSelect"
        >
          带图标的自定义高度
        </Dropdown>
      </div>

      <!-- 只显示图标的下拉菜单 -->
      <div class="button-row">
        <Dropdown
          align="start"
          :items="dropdownItems"
          :icon="Filter"
          iconOnly
          @select="handleDropdownSelect"
        />

        <Dropdown
          :items="dropdownItems"
          :icon="FileSearch"
          align="end"
          type="primary"
          iconOnly
          @select="handleDropdownSelect"
        />

        <Dropdown
          :items="dropdownItems"
          :icon="Plus"
          iconOnly
          :tooltip="{
            content: '添加选项',
            delay: { show: 1000 }
          }"
          @select="handleDropdownSelect"
        />

        <!-- 不同尺寸 -->
        <Dropdown
          :items="dropdownItems"
          :icon="Filter"
          size="small"
          iconOnly
          @select="handleDropdownSelect"
        />

        <Dropdown
          :items="dropdownItems"
          :icon="Filter"
          size="large"
          iconOnly
          @select="handleDropdownSelect"
        />

        <!-- 自定义高度 -->
        <Dropdown
          :items="dropdownItems"
          :icon="Filter"
          :height="36"
          iconOnly
          @select="handleDropdownSelect"
        />
      </div>
    </div>

    <h2>LoadingCandle 测试</h2>
    <div class="demo-section">
      <LoadingCandle />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SegmentedButton from './SegmentedButton.vue'
import Button from './Button.vue'
import SpreadButton from './SpreadButton.vue'
import SearchInput from './SearchInput.vue'
import AppToolbar from '../layout/AppToolbar.vue'
import Dropdown from './Dropdown.vue'
import {
  Plus,
  Delete,
  Edit,
  Search,
  FileSearch,
  Filter,
  Copy,
  Share,
  Download,
  Link,
  MenuFoldOne
} from '@icon-park/vue-next'
import CalendarButton from './CalendarButton.vue'
import LoadingCandle from './LoadingCandle.vue'

const selectedValue = ref('1')
const loading = ref(false)
const searchValue = ref('')
const selectedDate = ref<string | null>(null)

const options = [
  { value: '1', label: '选项一' },
  { value: '2', label: '选项二' },
  { value: '3', label: '选项三' }
]

// 下拉菜单项
const dropdownItems = [
  {
    label: '编辑',
    key: 'edit'
  },
  {
    label: '分享',
    key: 'share'
  },
  {
    label: '复制链接',
    key: 'copy'
  },
  {
    label: '下载',
    key: 'download'
  },
  {
    label: '删除',
    key: 'delete',
    danger: true
  }
]

// 带图标的下拉菜单项
const dropdownItemsWithIcons = [
  {
    label: '编辑',
    key: 'edit',
    icon: Edit
  },
  {
    label: '分享',
    key: 'share',
    icon: Share
  },
  {
    label: '复制链接',
    key: 'copy',
    icon: Copy
  },
  {
    label: '下载',
    key: 'download',
    icon: Download
  },
  {
    label: '删除',
    key: 'delete',
    icon: Delete,
    danger: true
  }
]

// 带分割线的下拉菜单项
const dropdownItemsWithDivider = [
  {
    label: '编辑',
    key: 'edit',
    icon: Edit
  },
  {
    label: '分享',
    key: 'share',
    icon: Share
  },
  {
    label: '复制链接',
    key: 'copy',
    icon: Link
  },
  {
    divided: true as const
  },
  {
    label: '删除',
    key: 'delete',
    icon: Delete,
    danger: true
  }
]

// 最后选择的下拉菜单项
const lastSelectedDropdownItem = ref<any>(null)

const handleClick = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 2000)
}

const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
  } else {
    selectedDate.value = '2024-03-14'
  }
}

// 处理下拉菜单选择
const handleDropdownSelect = (key: string, item: any) => {
  console.log('选中菜单项:', key, item)
  lastSelectedDropdownItem.value = item
}
</script>

<style scoped>
.container {
  padding: 20px;
  overflow-y: auto;
}

.demo-section {
  margin-top: 20px;
}

.mt-4 {
  margin-top: 1rem;
}

h2 {
  margin-top: 32px;
  margin-bottom: 16px;
  font-weight: 500;
  font-size: 24px;
}

.button-row {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.block-button-section {
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row {
  margin-bottom: 16px;
  max-width: 400px;
}

/* 自定义触发器样式 */
.custom-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;
}

.custom-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
