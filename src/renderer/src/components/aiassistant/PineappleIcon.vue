<template>
  <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- 苹果主体 -->
    <path
      d="M30 65 
         C30 40, 45 25, 60 25
         C75 25, 90 40, 90 65
         C90 90, 75 105, 60 105
         C45 105, 30 90, 30 65
         Z"
      fill="#FF3B30"
    />

    <!-- 高光 -->
    <circle cx="75" cy="45" r="10" fill="#FF6B6B" />

    <!-- 叶子 -->
    <path
      d="M60 25 
         C60 25, 70 15, 80 20
         C75 25, 65 28, 60 25
         Z"
      fill="#4CD964"
    />

    <!-- 梗 -->
    <path d="M60 25 L65 20" stroke="#8B572A" stroke-width="4" stroke-linecap="round" />

    <!-- 眼睛 -->
    <g class="eyes">
      <!-- 左眼 -->
      <circle cx="45" cy="55" r="8" fill="white" />
      <circle cx="45" cy="55" r="4" fill="black" />

      <!-- 右眼 -->
      <circle cx="75" cy="55" r="8" fill="white" />
      <circle cx="75" cy="55" r="4" fill="black" />
    </g>

    <!-- 嘴巴 -->
    <path
      d="M45 75 
         C50 85, 70 85, 75 75"
      fill="#CC0000"
    />
  </svg>
</template>

<style scoped>
svg {
  filter: drop-shadow(0 0 10px rgba(255, 59, 48, 0.2));
}
</style>
