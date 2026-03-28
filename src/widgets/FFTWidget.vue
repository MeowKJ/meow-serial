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
const { getChannelData, getHistoryData } = useBaseWidget(widgetRef)
const renderingStore = useRenderingStore()
const canvasRef = ref(null)
const resizeObserver = ref(null)

let ctx = null
let rafLoop = null
let lastSpectrum = []

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const nextLowerPowerOfTwo = (value) => {
  let result = 1
  while (result * 2 <= value) result *= 2
  return result
}

const getChannelValueFromHistoryPoint = (point, channelId) => {
  if (!point) return Number.NaN
  if (Array.isArray(point.values) && Number.isFinite(point.values[channelId])) {
    return point.values[channelId]
  }
  return Number.NaN
}

const estimateSampleRate = (points, fallbackHz) => {
  if (Number.isFinite(fallbackHz) && fallbackHz > 0) return fallbackHz
  if (!Array.isArray(points) || points.length < 2) return 10

  const deltas = []
  for (let index = 1; index < points.length; index++) {
    const deltaMs = points[index].time - points[index - 1].time
    if (Number.isFinite(deltaMs) && deltaMs > 0) {
      deltas.push(deltaMs)
    }
  }

  if (!deltas.length) return 10
  const meanDeltaMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length
  return meanDeltaMs > 0 ? 1000 / meanDeltaMs : 10
}

const applyHannWindow = (samples) => {
  const size = samples.length
  if (size <= 1) return samples.slice()

  return samples.map((value, index) => {
    const weight = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1)))
    return value * weight
  })
}

const runRadix2FFT = (samples) => {
  const size = samples.length
  const re = samples.slice()
  const im = new Array(size).fill(0)

  let j = 0
  for (let i = 1; i < size; i++) {
    let bit = size >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit

    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  for (let len = 2; len <= size; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wLenCos = Math.cos(angle)
    const wLenSin = Math.sin(angle)

    for (let start = 0; start < size; start += len) {
      let wRe = 1
      let wIm = 0
      for (let offset = 0; offset < len / 2; offset++) {
        const evenIndex = start + offset
        const oddIndex = evenIndex + len / 2

        const oddRe = re[oddIndex] * wRe - im[oddIndex] * wIm
        const oddIm = re[oddIndex] * wIm + im[oddIndex] * wRe

        re[oddIndex] = re[evenIndex] - oddRe
        im[oddIndex] = im[evenIndex] - oddIm
        re[evenIndex] += oddRe
        im[evenIndex] += oddIm

        const nextWRe = wRe * wLenCos - wIm * wLenSin
        const nextWIm = wRe * wLenSin + wIm * wLenCos
        wRe = nextWRe
        wIm = nextWIm
      }
    }
  }

  return { re, im }
}

const selectedChannelId = computed(() => {
  if (Number.isInteger(props.widget?.channel)) return props.widget.channel
  if (Array.isArray(props.widget?.channels) && Number.isInteger(props.widget.channels[0])) {
    return props.widget.channels[0]
  }
  return null
})

const selectedChannel = computed(() => {
  if (!Number.isInteger(selectedChannelId.value)) return null
  return getChannelData(selectedChannelId.value)
})

const fftConfig = computed(() => {
  const requestedSize = clamp(props.widget?.fftSize, 32, 512, 128)
  return {
    fftSize: nextLowerPowerOfTwo(requestedSize),
    minFreq: clamp(props.widget?.minFreq, 0, 100000, 0),
    maxFreq: clamp(props.widget?.maxFreq, 0, 100000, 2),
    sampleRateHz: clamp(props.widget?.sampleRateHz, 0, 100000, 0)
  }
})

const fftAnalysis = computed(() => {
  const channel = selectedChannel.value
  if (!channel) {
    return {
      hasData: false,
      reason: '请选择一个通道',
      bins: [],
      peak: null,
      sampleRateHz: 0,
      fftSize: 0,
      sampleCount: 0,
      visibleMaxFreq: 0
    }
  }

  const historyLimit = Math.max(fftConfig.value.fftSize * 2, 128)
  const history = getHistoryData(historyLimit)
  const samplesWithTime = history
    .map(point => ({
      time: point.time,
      value: getChannelValueFromHistoryPoint(point, channel.id)
    }))
    .filter(point => Number.isFinite(point.value))

  const availableCount = samplesWithTime.length
  const actualFftSize = nextLowerPowerOfTwo(Math.min(fftConfig.value.fftSize, availableCount))
  if (actualFftSize < 32) {
    return {
      hasData: false,
      reason: '等待更多历史数据',
      bins: [],
      peak: null,
      sampleRateHz: 0,
      fftSize: actualFftSize,
      sampleCount: availableCount,
      visibleMaxFreq: fftConfig.value.maxFreq
    }
  }

  const segment = samplesWithTime.slice(-actualFftSize)
  const sampleRateHz = estimateSampleRate(segment, fftConfig.value.sampleRateHz)

  const values = segment.map(point => point.value)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const centered = values.map(value => value - mean)
  const windowed = applyHannWindow(centered)
  const { re, im } = runRadix2FFT(windowed)

  const nyquist = sampleRateHz / 2
  const maxFreq = fftConfig.value.maxFreq > 0 ? Math.min(fftConfig.value.maxFreq, nyquist) : nyquist
  const minFreq = Math.min(fftConfig.value.minFreq, maxFreq)

  const bins = []
  for (let index = 1; index < actualFftSize / 2; index++) {
    const frequency = (index * sampleRateHz) / actualFftSize
    if (frequency < minFreq || frequency > maxFreq) continue

    const magnitude = Math.hypot(re[index], im[index]) / (actualFftSize / 2)
    bins.push({
      frequency,
      magnitude,
      bpm: frequency * 60
    })
  }

  if (!bins.length) {
    return {
      hasData: false,
      reason: '当前频率范围内没有可用频谱',
      bins: [],
      peak: null,
      sampleRateHz,
      fftSize: actualFftSize,
      sampleCount: availableCount,
      visibleMaxFreq: maxFreq
    }
  }

  const maxMagnitude = Math.max(...bins.map(bin => bin.magnitude), 1e-9)
  const smoothing = 0.4
  const normalizedBins = bins.map((bin, index) => {
    const normalized = bin.magnitude / maxMagnitude
    const previous = lastSpectrum[index] ?? normalized
    const smoothMagnitude = previous * smoothing + normalized * (1 - smoothing)
    return {
      ...bin,
      normalizedMagnitude: smoothMagnitude
    }
  })
  lastSpectrum = normalizedBins.map(bin => bin.normalizedMagnitude)

  const peak = normalizedBins.reduce((best, current) => {
    if (!best || current.normalizedMagnitude > best.normalizedMagnitude) return current
    return best
  }, null)

  return {
    hasData: true,
    reason: '',
    bins: normalizedBins,
    peak,
    sampleRateHz,
    fftSize: actualFftSize,
    sampleCount: availableCount,
    visibleMaxFreq: maxFreq
  }
})

const metricChips = computed(() => {
  const analysis = fftAnalysis.value
  return [
    { label: '通道', value: selectedChannel.value?.name || '--' },
    { label: '采样', value: analysis.sampleRateHz > 0 ? `${analysis.sampleRateHz.toFixed(2)} Hz` : '--' },
    { label: '主峰', value: analysis.peak ? `${analysis.peak.frequency.toFixed(3)} Hz` : '--' },
    { label: 'BPM', value: analysis.peak ? analysis.peak.bpm.toFixed(1) : '--' }
  ]
})

const drawEmptyState = (width, height, message) => {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#0F172A'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cat-muted').trim() || '#94A3B8'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(message, width / 2, height / 2)
}

const draw = () => {
  if (!canvasRef.value || !ctx) return

  const canvas = canvasRef.value
  const width = canvas.width
  const height = canvas.height
  const dpr = window.devicePixelRatio || 1
  const drawWidth = width / dpr
  const drawHeight = height / dpr

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.scale(dpr, dpr)

  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#0F172A'
  const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-surface').trim() || '#334155'
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-text').trim() || '#F1F5F9'
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-muted').trim() || '#94A3B8'
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-primary').trim() || '#7DD3FC'
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-accent').trim() || '#BAE6FD'

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, drawWidth, drawHeight)

  const analysis = fftAnalysis.value
  if (!analysis.hasData) {
    drawEmptyState(drawWidth, drawHeight, analysis.reason)
    return
  }

  const topInset = 52
  const bottomInset = 22
  const leftInset = 16
  const rightInset = 12
  const plotWidth = Math.max(10, drawWidth - leftInset - rightInset)
  const plotHeight = Math.max(10, drawHeight - topInset - bottomInset)

  ctx.strokeStyle = surfaceColor
  ctx.lineWidth = 1
  for (let index = 0; index <= 4; index++) {
    const y = topInset + (plotHeight / 4) * index
    ctx.beginPath()
    ctx.moveTo(leftInset, y)
    ctx.lineTo(drawWidth - rightInset, y)
    ctx.stroke()
  }

  for (let index = 0; index <= 4; index++) {
    const x = leftInset + (plotWidth / 4) * index
    ctx.beginPath()
    ctx.moveTo(x, topInset)
    ctx.lineTo(x, topInset + plotHeight)
    ctx.stroke()
  }

  const gradient = ctx.createLinearGradient(0, topInset + plotHeight, 0, topInset)
  gradient.addColorStop(0, primaryColor)
  gradient.addColorStop(1, accentColor)

  const barWidth = plotWidth / analysis.bins.length
  analysis.bins.forEach((bin, index) => {
    const magnitude = Math.max(0, Math.min(1, bin.normalizedMagnitude))
    const x = leftInset + index * barWidth
    const barHeight = magnitude * plotHeight
    const y = topInset + plotHeight - barHeight
    ctx.fillStyle = gradient
    ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight)
  })

  if (analysis.peak) {
    const peakIndex = analysis.bins.findIndex(bin => bin.frequency === analysis.peak.frequency)
    if (peakIndex >= 0) {
      const peakX = leftInset + peakIndex * barWidth + barWidth / 2
      const peakY = topInset + plotHeight - analysis.peak.normalizedMagnitude * plotHeight
      ctx.strokeStyle = accentColor
      ctx.fillStyle = accentColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(peakX, topInset)
      ctx.lineTo(peakX, topInset + plotHeight)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(peakX, peakY, 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = textColor
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      const labelX = Math.min(drawWidth - 84, peakX + 6)
      const labelY = Math.max(topInset + 14, peakY - 10)
      ctx.fillText(`${analysis.peak.bpm.toFixed(1)} BPM`, labelX, labelY)
    }
  }

  ctx.fillStyle = textColor
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${fftConfig.value.minFreq.toFixed(2)} Hz`, leftInset, drawHeight - 6)
  ctx.textAlign = 'right'
  ctx.fillText(`${analysis.visibleMaxFreq.toFixed(2)} Hz`, drawWidth - rightInset, drawHeight - 6)

  ctx.textAlign = 'left'
  metricChips.value.forEach((chip, index) => {
    const x = 12 + index * (drawWidth / 4)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
    ctx.fillRect(x - 4, 6, Math.max(76, drawWidth / 4 - 10), 30)
    ctx.fillStyle = mutedColor
    ctx.font = '10px sans-serif'
    ctx.fillText(chip.label, x, 12)
    ctx.fillStyle = textColor
    ctx.font = '11px sans-serif'
    ctx.fillText(chip.value, x, 25)
  })

}

const initCanvas = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const container = canvas.parentElement
  if (!container) return

  resizeCanvasToContainer(canvas, container, renderingStore)
  ctx = getAccelerated2DContext(canvas, renderingStore)
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
  <div class="w-full h-full relative">
    <canvas ref="canvasRef" class="w-full h-full rounded"></canvas>
  </div>
</template>
