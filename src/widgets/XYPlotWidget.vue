<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

// 获取主题颜色
const themePrimary = computed(() => {
  return themeStore.colors.primary
})

// 将颜色转换为rgba
const colorToRgba = (color, alpha) => {
  // 处理 #RRGGBB 格式
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

// 绘制XY图
const draw = () => {
  if (!canvasRef.value || !ctx) return

  const canvas = canvasRef.value
  const { width, height } = canvas

  // 清空背景 - 使用CSS变量
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#1C1C1E'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // 绘制网格 - 使用CSS变量
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-surface').trim() || '#3A3A3C'
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  // 绘制坐标轴 - 使用CSS变量
  const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-border').trim() || '#48484A'
  ctx.strokeStyle = axisColor
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()

  // 获取数据
  const xChannel = props.widget.xChannel || 0
  const yChannel = props.widget.yChannel || 1
  const data = store.dataHistory.slice(-200)

  if (data.length < 2) {
    animationId = requestAnimationFrame(draw)
    return
  }

  // 计算范围
  const xValues = data.map(d => d.values[xChannel])
  const yValues = data.map(d => d.values[yChannel])

  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)

  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  // 绘制点 - 使用主题颜色
  const primaryColor = themePrimary.value
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 3)
  gradient.addColorStop(0, primaryColor)
  gradient.addColorStop(1, primaryColor + '00')

  data.forEach((point, i) => {
    const x = ((point.values[xChannel] - xMin) / xRange) * width * 0.9 + width * 0.05
    const y = height - ((point.values[yChannel] - yMin) / yRange) * height * 0.9 - height * 0.05

    // 透明度随时间衰减
    const alpha = (i / data.length) * 0.8 + 0.2

    ctx.fillStyle = colorToRgba(primaryColor, alpha)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // 绘制最新点（高亮）
  if (data.length > 0) {
    const lastPoint = data[data.length - 1]
    const x = ((lastPoint.values[xChannel] - xMin) / xRange) * width * 0.9 + width * 0.05
    const y = height - ((lastPoint.values[yChannel] - yMin) / yRange) * height * 0.9 - height * 0.05

    ctx.fillStyle = primaryColor
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()

    // 光晕效果
    ctx.strokeStyle = colorToRgba(primaryColor, 0.25)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.stroke()
  }

  animationId = requestAnimationFrame(draw)
}

// 初始化Canvas
const initCanvas = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
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
  <div class="w-full h-full relative">
    <canvas ref="canvasRef" class="w-full h-full rounded"></canvas>

    <!-- 轴标签 -->
    <div class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-cat-muted">
      {{ store.channels[widget.xChannel || 0]?.name || 'X' }}
    </div>
    <div class="absolute top-1/2 left-1 -translate-y-1/2 text-[10px] text-cat-muted"
      style="writing-mode: vertical-lr; transform: rotate(180deg);">
      {{ store.channels[widget.yChannel || 1]?.name || 'Y' }}
    </div>

    <!-- 通道选择 -->
    <div class="absolute top-1 right-1 flex gap-1 text-[10px]">
      <select v-model="widget.xChannel"
        class="bg-cat-card/80 border border-cat-border rounded px-1 py-0.5 text-cat-muted">
        <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">X: {{ ch.name }}</option>
      </select>
      <select v-model="widget.yChannel"
        class="bg-cat-card/80 border border-cat-border rounded px-1 py-0.5 text-cat-muted">
        <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">Y: {{ ch.name }}</option>
      </select>
    </div>
  </div>
</template>
