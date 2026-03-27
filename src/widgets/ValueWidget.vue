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

const currentValue = computed(() => {
  const value = channel.value?.value
  return Number.isFinite(value) ? value : Number.NaN
})

// 格式化数值
const formattedValue = computed(() => {
  const precision = props.widget.precision || 2
  return Number.isFinite(currentValue.value) ? currentValue.value.toFixed(precision) : '--'
})

const recentStats = computed(() => {
  const data = getHistoryData(60)
  const chId = dataSource.value?.channelId || 0
  const values = data
    .map(point => point.values[chId])
    .filter(value => Number.isFinite(value))

  if (values.length === 0) {
    return { min: Number.NaN, max: Number.NaN, delta: 0 }
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    delta: values[values.length - 1] - values[0]
  }
})

const formattedMin = computed(() => (
  Number.isFinite(recentStats.value.min)
    ? recentStats.value.min.toFixed(props.widget.precision || 2)
    : '--'
))

const formattedMax = computed(() => (
  Number.isFinite(recentStats.value.max)
    ? recentStats.value.max.toFixed(props.widget.precision || 2)
    : '--'
))

const trendLabel = computed(() => {
  if (!Number.isFinite(currentValue.value)) return '无效'
  if (recentStats.value.delta > 0.01) return '上升'
  if (recentStats.value.delta < -0.01) return '下降'
  return '平稳'
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
  <div class="w-full h-full flex flex-col justify-between p-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="text-[10px] uppercase tracking-[0.18em] text-cat-muted">实时数值</div>
        <div class="text-sm text-cat-text mt-1">{{ channel?.name || '通道' }}</div>
      </div>
      <div
        class="px-2 py-1 rounded-full text-[10px] bg-cat-surface text-cat-muted"
        :style="{ color: channel?.color }"
      >
        {{ trendLabel }}
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center">
      <div class="text-4xl font-bold leading-none" :style="{ color: channel?.color }">
        {{ formattedValue }}
        <span v-if="Number.isFinite(currentValue)" class="text-lg opacity-60 ml-1">{{ widget.unit || '' }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 text-[11px] text-cat-muted mb-2">
      <div class="bg-cat-surface/70 rounded-lg px-2 py-1.5">
        <div>近段最小</div>
        <div class="text-cat-text mt-0.5">{{ formattedMin }}</div>
      </div>
      <div class="bg-cat-surface/70 rounded-lg px-2 py-1.5">
        <div>近段最大</div>
        <div class="text-cat-text mt-0.5">{{ formattedMax }}</div>
      </div>
    </div>

    <div class="w-full h-8">
      <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline v-if="trendData" :points="trendData" fill="none" :stroke="channel?.color || 'var(--cat-primary)'"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    </div>
  </div>
</template>
