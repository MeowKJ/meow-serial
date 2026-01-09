<script setup>
/**
 * 时间轴导航条组件
 * 显示TX(绿色)/RX(红色)数据流，同步终端滚动
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    required: true
  },
  scrollPosition: {
    type: Number,
    default: 0
  },
  scrollHeight: {
    type: Number,
    default: 1
  },
  clientHeight: {
    type: Number,
    default: 1
  },
  filter: {
    type: String,
    default: 'all' // 'all' | 'tx' | 'rx' | 'system' | 'error'
  }
})

const emit = defineEmits(['scroll-to', 'update:filter', 'navigate-to-log'])

const barRef = ref(null)
const isDragging = ref(false)

// 所有有效日志（tx/rx/system/error）
const validLogs = computed(() => {
  return props.logs.filter(log =>
    log.dir === 'tx' || log.dir === 'rx' || log.dir === 'system' || log.dir === 'error'
  )
})

// 计算每条日志在时间轴上的段信息
const segments = computed(() => {
  const logs = validLogs.value
  if (logs.length === 0) return []

  // 计算每条日志的相对大小（基于数据长度）
  const totalSize = logs.reduce((sum, log) => sum + (log.data?.length || 1), 0)

  let currentPos = 0
  return logs.map((log, index) => {
    const size = log.data?.length || 1
    const width = (size / totalSize) * 100
    const start = currentPos
    currentPos += width

    return {
      id: log.id,
      index,
      dir: log.dir,
      start,
      width,
      log
    }
  })
})

// 当前视口在时间轴上的位置
const viewportIndicator = computed(() => {
  if (props.scrollHeight <= props.clientHeight) {
    return { left: 0, width: 100 }
  }

  const scrollRatio = props.scrollPosition / (props.scrollHeight - props.clientHeight)
  const viewportRatio = props.clientHeight / props.scrollHeight

  return {
    left: scrollRatio * (100 - viewportRatio * 100),
    width: viewportRatio * 100
  }
})

// 处理点击跳转
const handleBarClick = (event) => {
  if (!barRef.value || isDragging.value) return

  const rect = barRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickRatio = clickX / rect.width

  // 找到点击位置对应的日志
  let accumulatedWidth = 0
  for (const segment of segments.value) {
    accumulatedWidth += segment.width / 100
    if (clickRatio <= accumulatedWidth) {
      emit('navigate-to-log', segment.index, segment.log)
      return
    }
  }
}

// 处理拖动开始
const handleDragStart = (event) => {
  event.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

// 处理拖动移动
const handleDragMove = (event) => {
  if (!isDragging.value || !barRef.value) return

  const rect = barRef.value.getBoundingClientRect()
  let dragRatio = (event.clientX - rect.left) / rect.width
  dragRatio = Math.max(0, Math.min(1, dragRatio))

  // 计算新的滚动位置
  const maxScroll = props.scrollHeight - props.clientHeight
  const newScrollPosition = dragRatio * maxScroll

  emit('scroll-to', newScrollPosition)
}

// 处理拖动结束
const handleDragEnd = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// 切换过滤器
const setFilter = (filterType) => {
  emit('update:filter', filterType)
}

// 统计数据
const stats = computed(() => {
  const logs = filteredLogs.value
  const txCount = logs.filter(l => l.dir === 'tx').length
  const rxCount = logs.filter(l => l.dir === 'rx').length
  return { tx: txCount, rx: rxCount, total: logs.length }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
})
</script>

<template>
  <div class="timeline-bar-container flex items-center gap-2">
    <!-- 过滤按钮 -->
    <div class="flex items-center gap-1 shrink-0">
      <button
        @click="setFilter('all')"
        :class="[
          'px-2 py-1 text-xs rounded transition-colors',
          filter === 'all'
            ? 'bg-cat-primary text-white'
            : 'bg-cat-surface text-cat-muted hover:text-cat-text'
        ]"
      >
        全部
      </button>
      <button
        @click="setFilter('tx')"
        :class="[
          'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
          filter === 'tx'
            ? 'bg-blue-500 text-white'
            : 'bg-cat-surface text-cat-muted hover:text-cat-text'
        ]"
      >
        <span class="w-2 h-2 rounded-full bg-blue-400"></span>
        TX
        <span class="text-[10px] opacity-70">({{ stats.tx }})</span>
      </button>
      <button
        @click="setFilter('rx')"
        :class="[
          'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
          filter === 'rx'
            ? 'bg-green-500 text-white'
            : 'bg-cat-surface text-cat-muted hover:text-cat-text'
        ]"
      >
        <span class="w-2 h-2 rounded-full bg-green-400"></span>
        RX
        <span class="text-[10px] opacity-70">({{ stats.rx }})</span>
      </button>
    </div>

    <!-- 时间轴条 -->
    <div
      ref="barRef"
      class="timeline-bar flex-1 h-6 bg-cat-surface rounded-full relative overflow-hidden cursor-pointer"
      @click="handleBarClick"
    >
      <!-- 数据段显示 -->
      <div class="absolute inset-0 flex">
        <template v-for="segment in segments" :key="segment.id">
          <div
            :class="[
              'h-full transition-opacity',
              segment.dir === 'tx' ? 'bg-blue-500' : 'bg-green-500',
              filter !== 'all' && filter !== segment.dir ? 'opacity-20' : 'opacity-80 hover:opacity-100'
            ]"
            :style="{ width: segment.width + '%' }"
            :title="`${segment.dir.toUpperCase()}: ${segment.log.data?.substring(0, 50) || ''}...`"
          ></div>
        </template>
      </div>

      <!-- 空状态 -->
      <div
        v-if="segments.length === 0"
        class="absolute inset-0 flex items-center justify-center text-xs text-cat-muted"
      >
        暂无数据
      </div>

      <!-- 视口指示器/拖动手柄 -->
      <div
        v-if="segments.length > 0"
        class="viewport-handle absolute top-0 h-full border-2 border-white/80 rounded-full cursor-grab active:cursor-grabbing transition-all"
        :class="isDragging ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'"
        :style="{
          left: viewportIndicator.left + '%',
          width: Math.max(viewportIndicator.width, 5) + '%'
        }"
        @mousedown="handleDragStart"
      >
        <!-- 中央把手 -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-1 h-3 bg-white/60 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="text-xs text-cat-muted shrink-0 w-16 text-right">
      {{ stats.total }} 条
    </div>
  </div>
</template>

<style scoped>
.timeline-bar {
  min-height: 24px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.viewport-handle {
  min-width: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>
