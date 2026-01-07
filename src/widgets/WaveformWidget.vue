<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const canvasRef = ref(null)
let ctx = null
let animationId = null

// 获取通道数据范围
const getRange = (chId) => {
  const ranges = {
    0: { min: 15, max: 35 },   // 温度
    1: { min: 30, max: 90 },   // 湿度
    2: { min: 98, max: 105 },  // 压力
    3: { min: 300, max: 700 }  // 光照
  }
  return ranges[chId] || { min: 0, max: 100 }
}

// 绘制波形
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
  
  // 垂直网格线
  const gridSpacingX = 50
  for (let x = gridSpacingX; x < width; x += gridSpacingX) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  // 水平网格线
  const gridSpacingY = 30
  for (let y = gridSpacingY; y < height; y += gridSpacingY) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 绘制数据
  const data = store.dataHistory.slice(-200)
  if (data.length < 2) {
    animationId = requestAnimationFrame(draw)
    return
  }
  
  const xStep = width / (data.length - 1)
  
  // 绘制每个启用的通道
  store.channels.filter(ch => ch.enabled).forEach(channel => {
    const range = getRange(channel.id)
    
    ctx.strokeStyle = channel.color
    ctx.lineWidth = 2
    ctx.beginPath()
    
    data.forEach((point, i) => {
      const x = i * xStep
      const normalized = (point.values[channel.id] - range.min) / (range.max - range.min)
      const y = height - normalized * height * 0.9 - height * 0.05
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
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

// 监听尺寸变化
const resizeObserver = ref(null)

onMounted(() => {
  setTimeout(initCanvas, 50)
  
  resizeObserver.value = new ResizeObserver(() => {
    if (canvasRef.value) {
      const container = canvasRef.value.parentElement
      canvasRef.value.width = container.clientWidth
      canvasRef.value.height = container.clientHeight
    }
  })
  
  if (canvasRef.value?.parentElement) {
    resizeObserver.value.observe(canvasRef.value.parentElement)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
})
</script>

<template>
  <div class="w-full h-full relative">
    <canvas ref="canvasRef" class="w-full h-full rounded"></canvas>
    
    <!-- 图例 -->
    <div class="absolute bottom-2 right-2 flex gap-2">
      <div 
        v-for="ch in store.channels.filter(c => c.enabled)" 
        :key="ch.id"
        class="flex items-center gap-1 px-2 py-1 bg-cat-card/80 rounded text-xs"
      >
        <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: ch.color }"></span>
        <span class="text-cat-muted">{{ ch.name }}</span>
      </div>
    </div>
    
    <!-- 工具栏 -->
    <div class="absolute top-2 right-2 flex gap-1">
      <button class="w-6 h-6 bg-cat-card/80 hover:bg-cat-card rounded flex items-center justify-center text-xs text-cat-muted">
        🔍
      </button>
      <button class="px-2 h-6 bg-cat-card/80 hover:bg-cat-card rounded text-xs text-cat-muted">
        Auto
      </button>
    </div>
  </div>
</template>
