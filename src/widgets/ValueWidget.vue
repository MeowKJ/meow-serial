<script setup>
import { computed, toRef } from 'vue'
import { useBaseWidget } from './base'

const props = defineProps({
  widget: Object
})

// 使用基础控件功能
const widgetRef = toRef(props, 'widget')
const {
  getDataSourceData,
  getHistoryData,
  dataSource
} = useBaseWidget(widgetRef)

// 获取当前通道数据（使用基础控件的数据源）
const channel = computed(() => {
  return getDataSourceData() || null
})

// 格式化数值
const formattedValue = computed(() => {
  const precision = props.widget.precision || 2
  const value = channel.value?.value || 0
  return value.toFixed(precision)
})

// 趋势数据 (最近50个点)
const trendData = computed(() => {
  const data = getHistoryData(50)
  if (data.length < 2) return ''

  const chId = dataSource.value?.channelId || 0
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const min = Math.min(...data.map(p => p.values[chId]))
    const max = Math.max(...data.map(p => p.values[chId]))
    const range = max - min || 1
    const y = 100 - ((d.values[chId] - min) / range) * 80 - 10
    return `${x},${y}`
  })

  return points.join(' ')
})
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center p-2">
    <!-- 通道名称 -->
    <div class="text-xs text-cat-muted mb-1">{{ channel?.name || '通道' }}</div>

    <!-- 数值显示 -->
    <div class="text-3xl font-bold" :style="{ color: channel?.color }">
      {{ formattedValue }}
      <span class="text-lg opacity-60">{{ widget.unit || '' }}</span>
    </div>

    <!-- 迷你趋势图 -->
    <div class="w-full h-8 mt-2">
      <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline v-if="trendData" :points="trendData" fill="none" :stroke="channel?.color || 'var(--cat-primary)'"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    </div>
  </div>
</template>
