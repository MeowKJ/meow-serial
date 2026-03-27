<script setup>
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue'
import { useBaseWidget } from './base'

const props = defineProps({
  widget: Object
})

const widgetRef = toRef(props, 'widget')
const { getChannelsData, getHistoryData, store } = useBaseWidget(widgetRef)
const canvasRef = ref(null)
const highlightedChannelId = ref(props.widget?.selectedChannelId ?? null)
let ctx = null
let animationId = null
let lastRenderState = {
  plot: null,
  linePoints: [],
  legendBoxes: [],
  dpr: 1
}

const selectedChannels = computed(() => {
  const channelIds = Array.isArray(props.widget?.channels) && props.widget.channels.length > 0
    ? props.widget.channels
    : store.channels.filter(ch => ch.enabled).map(ch => ch.id)

  return getChannelsData(channelIds)
})

const widgetUnit = computed(() => {
  if (props.widget?.unit) return props.widget.unit

  const channelName = selectedChannels.value[0]?.name || ''
  if (channelName.includes('(rad)')) return 'rad'
  if (channelName.includes('(m)')) return 'm'
  if (channelName.toLowerCase().includes('bpm')) return 'bpm'
  return ''
})

const axisTitle = computed(() => props.widget?.yAxisLabel || '数值')

const isTemperatureWaveform = computed(() => {
  const title = props.widget?.title || ''
  const channels = Array.isArray(props.widget?.channels) ? props.widget.channels : []
  return title === '温度曲线' || (channels.length === 1 && channels[0] === 18)
})

const isFullHistoryWidget = computed(() => Boolean(props.widget?.fullHistory || isTemperatureWaveform.value))

const simplifyHistory = (history, targetPoints) => {
  if (!Array.isArray(history) || history.length <= targetPoints) {
    return history
  }

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

const getVisibleHistory = (displayWidth = 0) => {
  if (isFullHistoryWidget.value) {
    const history = store.temperatureHistory.map(point => ({
      time: point.time,
      values: { 18: point.value }
    }))
    const targetPoints = Math.max(120, Math.floor(displayWidth || 240))
    return simplifyHistory(history, targetPoints)
  }

  const limit = Math.max(60, Math.min(props.widget?.historyLength || 180, 500))
  return getHistoryData(limit)
}

const getAutoRange = (history, channels) => {
  const values = []

  history.forEach((point) => {
    channels.forEach((channel) => {
      const value = point.values[channel.id]
      if (Number.isFinite(value)) values.push(value)
    })
  })

  if (values.length === 0) {
    return { min: -1, max: 1 }
  }

  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    min -= 1
    max += 1
  }

  const padding = (max - min) * 0.1
  return {
    min: min - padding,
    max: max + padding
  }
}

const formatTick = (value) => {
  if (!Number.isFinite(value)) return '--'
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

const getCssVar = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

const getTimeSpanSec = (history) => {
  if (history.length < 2) return 0
  return Math.max(history[history.length - 1].time - history[0].time, 0) / 1000
}

const drawMetricChip = (x, y, width, title, value, color = null) => {
  ctx.fillStyle = 'rgba(25, 28, 48, 0.72)'
  ctx.fillRect(x, y, width, 34)

  ctx.fillStyle = getCssVar('--cat-muted', '#8E8E93')
  ctx.font = '600 11px "Segoe UI"'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(title, x + 10, y + 6)

  ctx.fillStyle = color || getCssVar('--cat-text', '#FFFFFF')
  ctx.font = '700 14px "Segoe UI"'
  ctx.fillText(value, x + 10, y + 18)
}

const drawLegendChip = (x, y, width, channel) => {
  const valueText = Number.isFinite(channel?.value)
    ? `${channel.value.toFixed(3)}${widgetUnit.value ? ` ${widgetUnit.value}` : ''}`
    : '--'

  ctx.fillStyle = 'rgba(25, 28, 48, 0.72)'
  ctx.fillRect(x, y, width, 32)

  ctx.fillStyle = channel.color
  ctx.beginPath()
  ctx.arc(x + 10, y + 16, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = getCssVar('--cat-muted', '#8E8E93')
  ctx.font = '600 11px "Segoe UI"'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(channel.name, x + 20, y + 5)

  ctx.fillStyle = getCssVar('--cat-text', '#FFFFFF')
  ctx.font = '700 13px "Segoe UI"'
  ctx.fillText(valueText, x + 20, y + 17)
}

const drawGrid = (plot) => {
  const gridColor = getCssVar('--cat-surface', '#3A3A3C')
  const borderColor = getCssVar('--cat-border', '#48484A')

  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(plot.left, plot.top, plot.width, plot.height)

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  const xTicks = 6
  for (let index = 1; index < xTicks; index++) {
    const x = plot.left + (plot.width * index) / xTicks
    ctx.beginPath()
    ctx.moveTo(x, plot.top)
    ctx.lineTo(x, plot.top + plot.height)
    ctx.stroke()
  }

  const yTicks = 5
  for (let index = 1; index < yTicks; index++) {
    const y = plot.top + (plot.height * index) / yTicks
    ctx.beginPath()
    ctx.moveTo(plot.left, y)
    ctx.lineTo(plot.left + plot.width, y)
    ctx.stroke()
  }
}

const drawYAxis = (plot, range) => {
  const axisColor = getCssVar('--cat-muted', '#8E8E93')
  ctx.fillStyle = axisColor
  ctx.font = '600 12px "Segoe UI"'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  const ticks = 5
  for (let index = 0; index <= ticks; index++) {
    const ratio = index / ticks
    const value = range.max - (range.max - range.min) * ratio
    const y = plot.top + plot.height * ratio
    ctx.fillText(formatTick(value), plot.left - 8, y)
  }
}

const drawXAxis = (plot, history) => {
  if (history.length < 2) return

  const axisColor = getCssVar('--cat-muted', '#8E8E93')
  const timeSpanSec = getTimeSpanSec(history)

  ctx.fillStyle = axisColor
  ctx.font = '600 12px "Segoe UI"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const ticks = 6
  for (let index = 0; index <= ticks; index++) {
    const ratio = index / ticks
    const seconds = -timeSpanSec + timeSpanSec * ratio
    const x = plot.left + plot.width * ratio
    const label = index === ticks ? '现在' : `${seconds.toFixed(1)} s`
    ctx.fillText(label, x, plot.top + plot.height + 8)
  }
}

const drawZeroLine = (plot, range) => {
  if (range.min > 0 || range.max < 0) return

  const zeroNorm = (0 - range.min) / Math.max(range.max - range.min, 1e-6)
  const y = plot.top + plot.height - zeroNorm * plot.height
  const zeroColor = getCssVar('--cat-border', '#48484A')

  ctx.strokeStyle = zeroColor
  ctx.lineWidth = 1
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(plot.left, y)
  ctx.lineTo(plot.left + plot.width, y)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = zeroColor
  ctx.font = '600 11px "Segoe UI"'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('0', plot.left + 4, y - 3)
}

const drawChannelLines = (plot, history, channels, range) => {
  const xStep = plot.width / Math.max(history.length - 1, 1)
  const hasHighlight = highlightedChannelId.value !== null
  const linePoints = []

  channels.forEach((channel) => {
    const isHighlighted = highlightedChannelId.value === channel.id
    const isDimmed = hasHighlight && !isHighlighted

    ctx.globalAlpha = isDimmed ? 0.18 : 1
    ctx.strokeStyle = channel.color
    ctx.lineWidth = isHighlighted ? 4.5 : 3
    ctx.beginPath()

    let hasPoint = false
    let lastPoint = null
    const points = []

    history.forEach((point, index) => {
      const value = point.values[channel.id]
      if (!Number.isFinite(value)) return

      const x = plot.left + index * xStep
      const normalized = (value - range.min) / Math.max(range.max - range.min, 1e-6)
      const y = plot.top + plot.height - normalized * plot.height

      if (!hasPoint) {
        ctx.moveTo(x, y)
        hasPoint = true
      } else {
        ctx.lineTo(x, y)
      }

      lastPoint = { x, y, value }
      points.push({ x, y, value })
    })

    if (hasPoint) ctx.stroke()

    if (lastPoint) {
      ctx.fillStyle = channel.color
      ctx.beginPath()
      ctx.arc(lastPoint.x, lastPoint.y, isHighlighted ? 5.5 : 4, 0, Math.PI * 2)
      ctx.fill()
    }

    linePoints.push({
      channelId: channel.id,
      points
    })

    ctx.globalAlpha = 1
  })

  return linePoints
}

const drawTopBar = (displayWidth, history, channels, range) => {
  const timeSpanSec = getTimeSpanSec(history)
  const channelCount = `${channels.length} 路`

  const chips = [
    { title: '纵轴', value: `${axisTitle.value}${widgetUnit.value ? ` (${widgetUnit.value})` : ''}` },
    { title: '窗口', value: `${timeSpanSec.toFixed(1)} s` },
    { title: '量程', value: `${formatTick(range.min)} ~ ${formatTick(range.max)}` },
    { title: '通道', value: channelCount }
  ]

  const gap = 10
  const chipWidth = Math.max(120, (displayWidth - 24 - gap * (chips.length - 1)) / chips.length)
  let x = 12

  chips.forEach((chip) => {
    drawMetricChip(x, 10, chipWidth, chip.title, chip.value, chip.color)
    x += chipWidth + gap
  })
}

const drawBottomLegend = (displayWidth, displayHeight, channels) => {
  let cursorX = displayWidth - 16
  const y = displayHeight - 32
  const legendBoxes = []

  channels.forEach((channel) => {
    ctx.font = '600 11px "Segoe UI"'
    const nameWidth = ctx.measureText(channel.name).width
    ctx.font = '700 13px "Segoe UI"'
    const valueText = Number.isFinite(channel?.value)
      ? `${channel.value.toFixed(3)}${widgetUnit.value ? ` ${widgetUnit.value}` : ''}`
      : '--'
    const valueWidth = ctx.measureText(valueText).width
    const itemWidth = Math.max(132, Math.ceil(Math.max(nameWidth, valueWidth) + 34))
    const isHighlighted = highlightedChannelId.value === channel.id
    const isDimmed = highlightedChannelId.value !== null && !isHighlighted

    cursorX -= itemWidth
    ctx.globalAlpha = isDimmed ? 0.28 : 1
    drawLegendChip(cursorX, y, itemWidth, channel)
    if (isHighlighted) {
      ctx.strokeStyle = channel.color
      ctx.lineWidth = 2
      ctx.strokeRect(cursorX + 0.5, y + 0.5, itemWidth - 1, 31)
    }
    ctx.globalAlpha = 1

    legendBoxes.push({
      channelId: channel.id,
      x: cursorX,
      y,
      width: itemWidth,
      height: 32
    })

    cursorX -= 16
  })

  return legendBoxes
}

const draw = () => {
  if (!canvasRef.value || !ctx) return

  const canvas = canvasRef.value
  const displayWidth = canvas.clientWidth
  const displayHeight = canvas.clientHeight
  const bgColor = getCssVar('--cat-bg', '#1C1C1E')
  const history = getVisibleHistory(displayWidth)
  const channels = selectedChannels.value

  ctx.clearRect(0, 0, displayWidth, displayHeight)
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, displayWidth, displayHeight)

  if (history.length < 2 || channels.length === 0) {
    animationId = requestAnimationFrame(draw)
    return
  }

  const range = getAutoRange(history, channels)
  const plot = {
    left: 58,
    top: 54,
    width: Math.max(displayWidth - 76, 100),
    height: Math.max(displayHeight - 116, 80)
  }

  drawTopBar(displayWidth, history, channels, range)
  drawGrid(plot)
  drawYAxis(plot, range)
  drawXAxis(plot, history)
  drawZeroLine(plot, range)
  const linePoints = drawChannelLines(plot, history, channels, range)
  const legendBoxes = drawBottomLegend(displayWidth, displayHeight, channels)

  lastRenderState = {
    plot,
    linePoints,
    legendBoxes,
    dpr: window.devicePixelRatio || 1
  }

  animationId = requestAnimationFrame(draw)
}

const setHighlightedChannel = (channelId) => {
  const nextValue = highlightedChannelId.value === channelId ? null : channelId
  highlightedChannelId.value = nextValue
  if (props.widget) {
    props.widget.selectedChannelId = nextValue
  }
}

const getNearestChannelFromPlot = (x, y) => {
  let bestMatch = null

  lastRenderState.linePoints.forEach((line) => {
    line.points.forEach((point) => {
      const distance = Math.hypot(point.x - x, point.y - y)
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          channelId: line.channelId,
          distance
        }
      }
    })
  })

  if (!bestMatch || bestMatch.distance > 18) {
    return null
  }

  return bestMatch.channelId
}

const onCanvasClick = (event) => {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const legendHit = lastRenderState.legendBoxes.find((box) =>
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  )

  if (legendHit) {
    setHighlightedChannel(legendHit.channelId)
    return
  }

  if (
    lastRenderState.plot &&
    x >= lastRenderState.plot.left &&
    x <= lastRenderState.plot.left + lastRenderState.plot.width &&
    y >= lastRenderState.plot.top &&
    y <= lastRenderState.plot.top + lastRenderState.plot.height
  ) {
    const channelId = getNearestChannelFromPlot(x, y)
    if (channelId !== null) {
      setHighlightedChannel(channelId)
      return
    }
  }

  setHighlightedChannel(null)
}

const initCanvas = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const container = canvas.parentElement
  const dpr = window.devicePixelRatio || 1

  canvas.width = Math.floor(container.clientWidth * dpr)
  canvas.height = Math.floor(container.clientHeight * dpr)
  canvas.style.width = `${container.clientWidth}px`
  canvas.style.height = `${container.clientHeight}px`

  ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
}

const resizeObserver = ref(null)

onMounted(() => {
  setTimeout(initCanvas, 50)

  resizeObserver.value = new ResizeObserver(() => {
    if (canvasRef.value) initCanvas()
  })

  if (canvasRef.value?.parentElement) {
    resizeObserver.value.observe(canvasRef.value.parentElement)
  }

  if (canvasRef.value) {
    canvasRef.value.addEventListener('click', onCanvasClick)
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (resizeObserver.value) resizeObserver.value.disconnect()
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('click', onCanvasClick)
  }
})
</script>

<template>
  <div class="w-full h-full relative">
    <canvas ref="canvasRef" class="w-full h-full rounded"></canvas>
  </div>
</template>
