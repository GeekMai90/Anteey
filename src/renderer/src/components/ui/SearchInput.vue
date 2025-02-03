<script setup lang="ts">
interface Props {
  placeholder?: string
  modelValue?: string
  width?: number
  height?: number
}

withDefaults(defineProps<Props>(), {
  placeholder: '搜索',
  modelValue: '',
  width: 190,
  height: 40
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div
    class="search-input-group"
    :style="{
      maxWidth: `${width}px`,
      height: `${height}px`
    }"
  >
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <g>
        <path
          d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"
        ></path>
      </g>
    </svg>
    <input
      class="search-input"
      type="search"
      :placeholder="placeholder"
      :value="modelValue"
      :style="{ height: `${height}px` }"
      @input="handleInput"
    />
  </div>
</template>

<style lang="scss" scoped>
.search-input-group {
  display: flex;
  line-height: 28px;
  align-items: center;
  position: relative;
  border-radius: 8px;
  padding: 0;
  box-sizing: border-box;
}

.search-input {
  width: 100%;
  height: 40px;
  line-height: 28px;
  padding: 0 1rem;
  padding-left: 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  outline: none;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: 0.3s ease;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: #9e9ea7;
  font-size: 14px;
  transform: translateY(-1px);
}

.search-input:focus,
.search-input:hover {
  outline: none;
  border-color: rgba(0, 200, 168, 0.4);
  background-color: var(--color-bg-primary);
  box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
}

/* 修改这些规则 */
.search-input-group:focus-within,
.search-input-group:hover {
  border-color: transparent;
  box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
}

.icon {
  position: absolute;
  left: 1rem;
  fill: #9e9ea7;
  width: 1rem;
  height: 1rem;
  z-index: 1;
}
</style>
