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

      <div class="block-button-section">
        <Button :block="true">块级按钮</Button>
        <Button type="primary" :block="true">主要块级按钮</Button>
      </div>
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
import { Plus, Delete, Edit, Search } from '@icon-park/vue-next'

const selectedValue = ref('1')
const loading = ref(false)
const searchValue = ref('')

const options = [
  { value: '1', label: '选项一' },
  { value: '2', label: '选项二' },
  { value: '3', label: '选项三' }
]

const handleClick = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 2000)
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
</style>
