<script setup>
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import { useBaseWidget } from './base'
import { useRenderingStore } from '../stores/rendering'
import {
  createRafLoop,
  getAccelerated2DContext,
  resizeCanvasToContainer
} from '../utils/canvasAcceleration'

const props = defineProps({
  widget: Object
})

const widgetRef = toRef(props, 'widget')
const { getChannelData, getHistoryData, getFullHistoryData } = useBaseWidget(widgetRef)
const renderingStore = useRenderingStore()
const canvasRef = ref(null)
const resizeObserver = ref(null)

let ctx = null
let rafLoop = null

const selectedChannel = computed(() => getChannelData(props.widget?.channel ?? 0))
const currentValue = computed(() => {
  const value = selectedChannel.value?.value
  return Number.isFinite(value) ? value : Number.NaN
})

const drawMode = computed(() => {
  if (props.widget?.drawMode === 'window') return 'window'
  if (props.widget?.drawMode === 'trend') return 'trend'
  return props.widget?.fullHistory === false ? 'window' : 'trend'
})

const formattedValue = computed(() => {
  const precision = props.widget?.precision ?? 2
  return Number.isFinite(currentValue.value) ? currentValue.value.toFixed(precision) : '--'
})

const displayUnit = computed(() => {
  if (props.widget?.unit) return props.widget.unit
  const channelName = selectedChannel.value?.name || ''
  if (channelName.includes('(rad)')) return 'rad'
  if (channelName.includes('(m)')) return 'm'
  if (channelName.toLowerCase().includes('bpm')) return 'bpm'
  return ''
})

const simplifyHistoryToPixels = (history, pixelWidth) => {
  const targetPoints = Math.max(24, Math.floor(pixelWidth || 0))
  if (!Array.isArray(history) || history.length <= targetPoints) return history

  const step = history.length / targetPoints
  const simplified = []
  for (let index = 0; index < targetPoints; index++) {
    const sourceIndex = Math.min(history.length - 1, Math.floor(index * step))
    simplified.push(history[sourceIndex])
  }

  const lastPoint = history[history.length - 1]
  if (simplified[simplified.length - 1] !== lastPoint) {
    simplified[simplified.length - 1] = lastPoint
  }

  return simplified
}

const getVisibleHistory = (pixelWidth = 0) => {
  const channelId = props.widget?.channel ?? 0
  const useFullHistory = drawMode.value === 'trend'
  const historySource = useFullHistory
    ? getFullHistoryData()
    : getHistoryData(Math.max(30, Math.min(props.widget?.historyLength || 120, 300)))

  const history = historySource
    .map((point, index) => ({
      index,
      value: point.values[channelId]
    }))
    .filter(point => Number.isFinite(point.value))

  return useFullHistory ? simplifyHistoryToPixels(history, pixelWidth) : history
}

const initCanvas = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const container = canvas.parentElement
  if (!container) return

  resizeCanvasToContainer(canvas, container, renderingStore)
  ctx = getAccelerated2DContext(canvas, renderingStore)
}

const draw = () => {
  if (!canvasRef.value || !ctx) return

  const canvas = canvasRef.value
  const dpr = canvas.width / Math.max(canvas.clientWidth || 1, 1)
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#0F172A'
  const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-surface').trim() || '#334155'
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-text').trim() || '#F1F5F9'
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-muted').trim() || '#94A3B8'
  const lineColor = selectedChannel.value?.color || getComputedStyle(document.documentElement).getPropertyValue('--cat-primary').trim() || '#7DD3FC'
  const history = getVisibleHistory(width - 16)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  if (history.length < 2) {
    ctx.fillStyle = surfaceColor
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('等待数据', width / 2, height / 2)
    return
  }

  const values = history.map(point => point.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }

  const paddingX = 8
  const topInfoHeight = 18
  const paddingY = 8
  const plotWidth = Math.max(12, width - paddingX * 2)
  const plotHeight = Math.max(12, height - paddingY * 2 - topInfoHeight)
  const plotTop = paddingY + topInfoHeight

  const gradient = ctx.createLinearGradient(0, plotTop, 0, height - paddingY)
  gradient.addColorStop(0, `${lineColor}AA`)
  gradient.addColorStop(1, `${lineColor}08`)

  ctx.fillStyle = mutedColor
  ctx.font = '600 10px sans-serif'
  ctx.textAlign = 'left'
  const label = selectedChannel.value?.name || '通道'
  ctx.fillText(label.length > 18 ? `${label.slice(0, 18)}...` : label, paddingX, 12)

  ctx.fillStyle = textColor
  ctx.font = '700 11px sans-serif'
  ctx.textAlign = 'right'
  const valueLabel = displayUnit.value ? `${formattedValue.value} ${displayUnit.value}` : formattedValue.value
  ctx.fillText(valueLabel, width - paddingX, 12)

  ctx.beginPath()
  history.forEach((point, index) => {
    const x = paddingX + (index / Math.max(history.length - 1, 1)) * plotWidth
    const ratio = (point.value - min) / (max - min)
    const y = plotTop + (1 - ratio) * plotHeight
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })

  ctx.lineWidth = 2
  ctx.strokeStyle = lineColor
  ctx.stroke()

  ctx.lineTo(width - paddingX, height - paddingY)
  ctx.lineTo(paddingX, height - paddingY)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  const lastPoint = history[history.length - 1]
  const lastRatio = (lastPoint.value - min) / (max - min)
  const lastX = paddingX + plotWidth
  const lastY = plotTop + (1 - lastRatio) * plotHeight
  ctx.fillStyle = lineColor
  ctx.beginPath()
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
  ctx.fill()
}

onMounted(() => {
  setTimeout(() => {
    initCanvas()
    if (canvasRef.value?.parentElement) {
      resizeObserver.value = new ResizeObserver(() => initCanvas())
      resizeObserver.value.observe(canvasRef.value.parentElement)
    }
    rafLoop = createRafLoop(draw, renderingStore)
    rafLoop.start()
  }, 50)
})

onUnmounted(() => {
  rafLoop?.stop()
  if (resizeObserver.value) resizeObserver.value.disconnect()
})

watch(
  () => [renderingStore.mode, renderingStore.qualityPreset.maxDpr, renderingStore.qualityPreset.desynchronized],
  () => initCanvas()
)
</script>

<template>
  <div class="w-full h-full">
    <canvas ref="canvasRef" class="w-full h-full rounded-md"></canvas>
  </div>
</template>
