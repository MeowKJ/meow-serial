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
  dataSource,
  dimensions
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const layoutMetrics = computed(() => {
  const width = dimensions.value.width || props.widget?.w || 220
  const height = dimensions.value.height || props.widget?.h || 140
  const compact = width < 180 || height < 120
  const relaxed = width >= 260 && height >= 170

  return {
    compact,
    relaxed,
    padding: clamp(Math.min(width, height) * 0.08, 10, 22),
    badgePx: clamp(Math.min(width, height) * 0.085, 11, 14),
    overlinePx: clamp(width * 0.05, 10, 13),
    labelPx: clamp(Math.min(width * 0.075, height * 0.16), 12, 22),
    valuePx: clamp(Math.min(width * 0.24, height * 0.34), 30, 76),
    unitPx: clamp(Math.min(width * 0.085, height * 0.15), 14, 28),
    statValuePx: clamp(Math.min(width * 0.06, height * 0.1), 11, 16),
    statLabelPx: clamp(Math.min(width * 0.045, height * 0.075), 9, 12),
    trendHeight: relaxed ? 36 : compact ? 20 : 28
  }
})

const cardStyle = computed(() => ({
  padding: `${layoutMetrics.value.padding}px`
}))

const overlineStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.overlinePx}px`
}))

const labelStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.labelPx}px`
}))

const trendBadgeStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.badgePx}px`
}))

const valueStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.valuePx}px`
}))

const unitStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.unitPx}px`
}))

const statsLabelStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.statLabelPx}px`
}))

const statsValueStyle = computed(() => ({
  fontSize: `${layoutMetrics.value.statValuePx}px`
}))

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
  <div class="w-full h-full flex flex-col justify-between value-card" :style="cardStyle">
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="uppercase tracking-[0.18em] text-cat-muted" :style="overlineStyle">实时数值</div>
        <div class="text-cat-text mt-1 value-channel-name" :style="labelStyle">{{ channel?.name || '通道' }}</div>
      </div>
      <div
        class="px-2 py-1 rounded-full bg-cat-surface text-cat-muted shrink-0"
        :class="layoutMetrics.compact ? 'hidden' : ''"
        :style="[trendBadgeStyle, { color: channel?.color }]"
      >
        {{ trendLabel }}
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center">
      <div class="font-bold leading-none value-main-number" :style="[valueStyle, { color: channel?.color }]">
        {{ formattedValue }}
        <span
          v-if="Number.isFinite(currentValue)"
          class="opacity-60 ml-1 align-baseline"
          :style="unitStyle"
        >
          {{ widget.unit || '' }}
        </span>
      </div>
    </div>

    <div
      class="grid grid-cols-2 gap-2 mb-2"
      :class="layoutMetrics.compact ? 'value-stats-compact' : ''"
    >
      <div class="bg-cat-surface/70 rounded-lg px-2 py-1.5 text-cat-muted">
        <div :style="statsLabelStyle">近段最小</div>
        <div class="text-cat-text mt-0.5" :style="statsValueStyle">{{ formattedMin }}</div>
      </div>
      <div class="bg-cat-surface/70 rounded-lg px-2 py-1.5 text-cat-muted">
        <div :style="statsLabelStyle">近段最大</div>
        <div class="text-cat-text mt-0.5" :style="statsValueStyle">{{ formattedMax }}</div>
      </div>
    </div>

    <div class="w-full" :style="{ height: `${layoutMetrics.trendHeight}px` }">
      <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline v-if="trendData" :points="trendData" fill="none" :stroke="channel?.color || 'var(--cat-primary)'"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.value-card {
  min-height: 100%;
}

.value-channel-name {
  line-height: 1.15;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.value-main-number {
  text-wrap: balance;
}

.value-stats-compact {
  gap: 0.4rem;
}
</style>
