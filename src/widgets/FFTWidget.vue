<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
    start: colors.secondary,
    middle: colors.primary,
    end: colors.accent
  }
})

// 模拟FFT数据生成 (实际项目中需要真正的FFT算法)
const generateFFTData = () => {
  const bins = 32
  const data = []
  const t = Date.now() / 1000
  
  for (let i = 0; i < bins; i++) {
    // 模拟频谱数据，带有一些基础频率
    let magnitude = Math.exp(-i / 10) * 0.6
    
    // 添加一些峰值
    if (i === 3) magnitude += 0.3 * (0.5 + 0.5 * Math.sin(t * 2))
    if (i === 8) magnitude += 0.2 * (0.5 + 0.5 * Math.sin(t * 3))
    if (i === 15) magnitude += 0.15 * (0.5 + 0.5 * Math.sin(t * 1.5))
    
    // 添加随机噪声
    magnitude += Math.random() * 0.1
    
    data.push(Math.min(1, magnitude))
  }
  
  return data
}

// 绘制FFT
const draw = () => {
  if (!canvasRef.value || !ctx) return
  
  const canvas = canvasRef.value
  const { width, height } = canvas
  
  // 清空背景
  // 清空背景 - 使用CSS变量
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim() || '#1C1C1E'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)
  
  // 绘制网格 - 使用CSS变量
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--cat-surface').trim() || '#3A3A3C'
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  for (let y = height * 0.25; y < height; y += height * 0.25) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 获取FFT数据
  const fftData = generateFFTData()
  const barWidth = width / fftData.length
  
  // 创建渐变 - 使用主题颜色
  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  const gc = gradientColors.value
  gradient.addColorStop(0, gc.start)
  gradient.addColorStop(0.5, gc.middle)
  gradient.addColorStop(1, gc.end)
  
  // 绘制频谱柱
  fftData.forEach((magnitude, i) => {
    const barHeight = magnitude * height * 0.85
    const x = i * barWidth
    const y = height - barHeight
    
    ctx.fillStyle = gradient
    ctx.fillRect(x + 2, y, barWidth - 4, barHeight)
  })
  
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
    
    <!-- 频率标签 -->
    <div class="absolute bottom-1 left-2 text-[10px] text-cat-muted">0 Hz</div>
    <div class="absolute bottom-1 right-2 text-[10px] text-cat-muted">{{ widget.maxFreq || 1000 }} Hz</div>
  </div>
</template>
