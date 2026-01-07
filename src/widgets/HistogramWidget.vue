<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useThemeStore } from '../stores/theme'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const themeStore = useThemeStore()
const canvasRef = ref(null)
let ctx = null
let animationId = null

// 获取主题渐变颜色
const gradientColors = computed(() => {
  const colors = themeStore.colors
  return {
    start: colors.primary,
    end: colors.accent
  }
})

// 统计数据
const stats = computed(() => {
  const chId = props.widget.channel || 0
  const data = store.dataHistory.map(d => d.values[chId])

  if (data.length === 0) {
    return { min: 0, max: 100, mean: 0, std: 0, count: 0 }
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const sum = data.reduce((a, b) => a + b, 0)
  const mean = sum / data.length

  const squaredDiffs = data.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / data.length
  const std = Math.sqrt(avgSquaredDiff)

  return { min, max, mean, std, count: data.length }
})

// 计算直方图数据
const computeHistogram = () => {
  const chId = props.widget.channel || 0
  const data = store.dataHistory.map(d => d.values[chId])

  if (data.length === 0) return []

  const bins = props.widget.bins || 20
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const binWidth = range / bins

  const histogram = new Array(bins).fill(0)

  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
    histogram[binIndex]++
  })

  return histogram
}

// 绘制直方图
const draw = () => {
  if (!canvasRef.value || !ctx) return

  const canvas = canvasRef.value
  const { width, height } = canvas

  // 清空背景
  // 清空背景 - 使用CSS变量
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#1C1C1E'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  const histogram = computeHistogram()
  if (histogram.length === 0) {
    animationId = requestAnimationFrame(draw)
    return
  }

  const maxCount = Math.max(...histogram)
  const barWidth = width / histogram.length

  // 创建渐变 - 使用主题颜色
  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  const gc = gradientColors.value
  gradient.addColorStop(0, gc.start)
  gradient.addColorStop(1, gc.end)

  // 绘制柱状图
  histogram.forEach((count, i) => {
    const barHeight = maxCount > 0 ? (count / maxCount) * height * 0.85 : 0
    const x = i * barWidth
    const y = height - barHeight

    ctx.fillStyle = gradient
    ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
  })

  animationId = requestAnimationFrame(draw)
}

// 初始化Canvas
const initCanvas = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight - 40 // 留出统计信息的空间
  ctx = canvas.getContext('2d')

  draw()
}

onMounted(() => {
  setTimeout(initCanvas, 50)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- 直方图 -->
    <div class="flex-1 relative">
      <canvas ref="canvasRef" class="w-full h-full rounded"></canvas>
    </div>

    <!-- 统计信息 -->
    <div class="h-10 flex items-center justify-around text-[10px] text-cat-muted border-t border-cat-border mt-1 pt-1">
      <div class="text-center">
        <div class="font-medium text-cat-text">{{ stats.mean.toFixed(2) }}</div>
        <div>均值</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-cat-text">{{ stats.std.toFixed(2) }}</div>
        <div>标准差</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-cat-text">{{ stats.min.toFixed(1) }}</div>
        <div>最小</div>
      </div>
      <div class="text-center">
        <div class="font-medium text-cat-text">{{ stats.max.toFixed(1) }}</div>
        <div>最大</div>
      </div>
    </div>
  </div>
</template>
