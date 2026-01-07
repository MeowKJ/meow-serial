<script setup>
import { computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useThemeStore } from '../stores/theme'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const themeStore = useThemeStore()

// 获取当前通道
const channel = computed(() => {
  return store.channels[props.widget.channel] || store.channels[0]
})

// 当前值
const currentValue = computed(() => {
  return channel.value?.value || 0
})

// 计算百分比
const percentage = computed(() => {
  const min = props.widget.min || 0
  const max = props.widget.max || 100
  const value = Math.min(Math.max(currentValue.value, min), max)
  return ((value - min) / (max - min)) * 100
})

// 计算圆弧路径
const arcPath = computed(() => {
  const percent = percentage.value / 100
  const angle = percent * 180
  const rad = (angle - 90) * Math.PI / 180
  const r = 45
  const x = 60 + r * Math.cos(rad)
  const y = 65 + r * Math.sin(rad)
  const largeArc = angle > 90 ? 1 : 0
  return `M 15 65 A 45 45 0 ${largeArc} 1 ${x} ${y}`
})

// 颜色渐变 - 使用主题颜色
const gaugeColor = computed(() => {
  const p = percentage.value
  const colors = themeStore.colors
  if (p < 30) return colors.success  // 成功色
  if (p < 70) return colors.warning  // 警告色
  return colors.error  // 错误色
})

// 获取主题颜色
const surfaceColor = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--cat-surface').trim() || '#3A3A3C'
})

const borderColor = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--cat-border').trim() || '#48484A'
})
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center">
    <!-- SVG 仪表盘 -->
    <svg viewBox="0 0 120 80" class="w-full max-w-[160px]">
      <!-- 背景弧 -->
      <path 
        d="M 15 65 A 45 45 0 0 1 105 65" 
        fill="none" 
        :stroke="surfaceColor" 
        stroke-width="10" 
        stroke-linecap="round"
      />
      
      <!-- 进度弧 -->
      <path 
        :d="arcPath" 
        fill="none" 
        :stroke="channel?.color || gaugeColor" 
        stroke-width="10" 
        stroke-linecap="round"
        class="transition-all duration-200"
      />
      
      <!-- 刻度 -->
      <g v-for="i in 11" :key="i">
        <line
          :x1="15 + (90 / 10) * (i - 1)"
          y1="70"
          :x2="15 + (90 / 10) * (i - 1)"
          y2="73"
          :stroke="borderColor"
          stroke-width="1"
        />
      </g>
    </svg>
    
    <!-- 数值显示 -->
    <div class="text-center -mt-2">
      <div class="text-xl font-bold" :style="{ color: channel?.color }">
        {{ currentValue.toFixed(1) }}
        <span class="text-sm opacity-60">{{ widget.unit || '' }}</span>
      </div>
      <div class="text-xs text-cat-muted">{{ channel?.name || '通道' }}</div>
    </div>
    
    <!-- 范围标签 -->
    <div class="flex justify-between w-full px-2 text-[10px] text-cat-muted mt-1">
      <span>{{ widget.min || 0 }}</span>
      <span>{{ widget.max || 100 }}</span>
    </div>
  </div>
</template>
