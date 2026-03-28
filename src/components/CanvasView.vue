<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSerialStore } from '../stores/serial'
import WaveformWidget from '../widgets/WaveformWidget.vue'
import ValueWidget from '../widgets/ValueWidget.vue'
import GaugeWidget from '../widgets/GaugeWidget.vue'
import ButtonWidget from '../widgets/ButtonWidget.vue'
import SliderWidget from '../widgets/SliderWidget.vue'
import LedWidget from '../widgets/LedWidget.vue'
import FFTWidget from '../widgets/FFTWidget.vue'
import TerminalWidget from '../widgets/TerminalWidget.vue'
import TriggerWidget from '../widgets/TriggerWidget.vue'
import CalculatorWidget from '../widgets/CalculatorWidget.vue'
import HistogramWidget from '../widgets/HistogramWidget.vue'
import SparklineWidget from '../widgets/SparklineWidget.vue'
import XYPlotWidget from '../widgets/XYPlotWidget.vue'

const store = useSerialStore()
const emit = defineEmits(['update:selectedWidget', 'show-context-menu', 'show-canvas-context-menu'])
const props = defineProps({
  selectedWidget: [Number, null]
})
const canvasRoot = ref(null)

const SNAP_THRESHOLD = 10
const SNAP_GRID = 12
// 控件组件映射
const widgetComponents = {
  waveform: WaveformWidget,
  sparkline: SparklineWidget,
  value: ValueWidget,
  gauge: GaugeWidget,
  button: ButtonWidget,
  slider: SliderWidget,
  led: LedWidget,
  fft: FFTWidget,
  terminal: TerminalWidget,
  trigger: TriggerWidget,
  calculator: CalculatorWidget,
  histogram: HistogramWidget,
  xyplot: XYPlotWidget
}

// 拖拽状态
let dragWidget = null
let dragStartX = 0
let dragStartY = 0
let resizeWidget = null
let resizeDir = ''
let resizeStartW = 0
let resizeStartH = 0
let resizeStartX = 0
let resizeStartY = 0

const snapToGrid = (value) => Math.round(value / SNAP_GRID) * SNAP_GRID

const getCanvasBounds = () => {
  const root = canvasRoot.value
  if (!root) return { width: 0, height: 0 }
  return {
    width: root.clientWidth,
    height: root.clientHeight
  }
}

const getOtherWidgets = (widgetId) => store.widgets.filter(item => item.id !== widgetId)

const snapAxisValue = (value, candidates = []) => {
  let bestValue = value
  let bestDistance = SNAP_THRESHOLD + 1

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value)
    if (distance < bestDistance && distance <= SNAP_THRESHOLD) {
      bestDistance = distance
      bestValue = candidate
    }
  }

  return bestValue
}

const getSnapCandidates = (widgetId, axis, canvasBounds) => {
  const candidates = axis === 'x'
    ? [0, canvasBounds.width]
    : [0, canvasBounds.height]

  for (const widget of getOtherWidgets(widgetId)) {
    if (axis === 'x') {
      candidates.push(widget.x, widget.x + widget.w)
    } else {
      candidates.push(widget.y, widget.y + widget.h)
    }
  }

  return candidates
}

const snapDragPosition = (widget, nextX, nextY) => {
  const canvasBounds = getCanvasBounds()
  const maxX = Math.max(0, canvasBounds.width - widget.w)
  const maxY = Math.max(0, canvasBounds.height - widget.h)

  let x = snapToGrid(nextX)
  let y = snapToGrid(nextY)

  const xCandidates = getSnapCandidates(widget.id, 'x', canvasBounds)
  const yCandidates = getSnapCandidates(widget.id, 'y', canvasBounds)

  x = snapAxisValue(x, [
    ...xCandidates,
    ...xCandidates.map(candidate => candidate - widget.w)
  ])
  y = snapAxisValue(y, [
    ...yCandidates,
    ...yCandidates.map(candidate => candidate - widget.h)
  ])

  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y))
  }
}

const snapResizeRect = (widget, rect) => {
  const canvasBounds = getCanvasBounds()
  const minW = widget.minW || 100
  const minH = widget.minH || 60
  const candidatesX = getSnapCandidates(widget.id, 'x', canvasBounds)
  const candidatesY = getSnapCandidates(widget.id, 'y', canvasBounds)

  let left = snapToGrid(rect.x)
  let top = snapToGrid(rect.y)
  let right = snapToGrid(rect.x + rect.w)
  let bottom = snapToGrid(rect.y + rect.h)

  if (resizeDir.includes('w')) {
    left = snapAxisValue(left, candidatesX)
    left = Math.min(left, rect.x + rect.w - minW)
  }
  if (resizeDir.includes('e')) {
    right = snapAxisValue(right, candidatesX)
    right = Math.max(right, rect.x + minW)
  }
  if (resizeDir.includes('n')) {
    top = snapAxisValue(top, candidatesY)
    top = Math.min(top, rect.y + rect.h - minH)
  }
  if (resizeDir.includes('s')) {
    bottom = snapAxisValue(bottom, candidatesY)
    bottom = Math.max(bottom, rect.y + minH)
  }

  left = Math.max(0, left)
  top = Math.max(0, top)
  right = Math.min(canvasBounds.width, right)
  bottom = Math.min(canvasBounds.height, bottom)

  const width = Math.max(minW, right - left)
  const height = Math.max(minH, bottom - top)

  return {
    x: left,
    y: top,
    w: width,
    h: height
  }
}

// 选择控件
const selectWidget = (widget, e) => {
  e.stopPropagation()
  emit('update:selectedWidget', widget.id)
}

// 取消选择
const deselectWidget = () => {
  emit('update:selectedWidget', null)
}

const showCanvasContextMenu = (event) => {
  if (event.target !== event.currentTarget) return
  event.preventDefault()
  deselectWidget()
  emit('show-canvas-context-menu', {
    x: event.clientX,
    y: event.clientY
  })
}

const getWidgetDisplayTitle = (widget) => {
  if (widget?.type === 'sparkline') {
    const channel = store.channels.find(item => item.id === widget.channel)
    if (channel?.name) return channel.name
  }
  return widget?.title || widget?.type || '控件'
}

// 开始拖拽
const startDrag = (widget, e) => {
  dragWidget = widget
  dragStartX = e.clientX - widget.x
  dragStartY = e.clientY - widget.y
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragWidget) return
  const snapped = snapDragPosition(
    dragWidget,
    e.clientX - dragStartX,
    e.clientY - dragStartY
  )
  store.updateWidget(dragWidget.id, snapped)
}

const stopDrag = () => {
  dragWidget = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 开始缩放
const startResize = (widget, dir, e) => {
  e.stopPropagation()
  resizeWidget = widget
  resizeDir = dir
  resizeStartX = widget.x
  resizeStartY = widget.y
  resizeStartW = widget.w
  resizeStartH = widget.h
  dragStartX = e.clientX
  dragStartY = e.clientY
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e) => {
  if (!resizeWidget) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  
  // 使用控件的最小尺寸配置
  const minW = resizeWidget.minW || 100
  const minH = resizeWidget.minH || 60

  const rect = {
    x: resizeStartX,
    y: resizeStartY,
    w: resizeStartW,
    h: resizeStartH
  }

  if (resizeDir.includes('e')) rect.w = Math.max(minW, resizeStartW + dx)
  if (resizeDir.includes('s')) rect.h = Math.max(minH, resizeStartH + dy)
  if (resizeDir.includes('w')) {
    rect.x = resizeStartX + dx
    rect.w = resizeStartW - dx
    if (rect.w < minW) {
      rect.x = resizeStartX + resizeStartW - minW
      rect.w = minW
    }
  }
  if (resizeDir.includes('n')) {
    rect.y = resizeStartY + dy
    rect.h = resizeStartH - dy
    if (rect.h < minH) {
      rect.y = resizeStartY + resizeStartH - minH
      rect.h = minH
    }
  }

  const snapped = snapResizeRect(resizeWidget, rect)
  store.updateWidget(resizeWidget.id, snapped)
}

const stopResize = () => {
  resizeWidget = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// 右键菜单
const showContextMenu = (widget, e) => {
  e.preventDefault()
  emit('update:selectedWidget', widget.id)
  emit('show-context-menu', {
    widgetId: widget.id,
    x: e.clientX,
    y: e.clientY
  })
}

onMounted(() => {
  // 保持画布默认空白，避免自动插入与雷达场景无关的控件。
})

onUnmounted(() => {
  stopDrag()
  stopResize()
})
</script>

<template>
  <div 
    ref="canvasRoot"
    class="h-full grid-pattern paw-pattern relative overflow-auto p-4"
    @click="deselectWidget"
    @contextmenu="showCanvasContextMenu"
  >
    <!-- 控件渲染 -->
    <div 
      v-for="widget in store.widgets" 
      :key="widget.id"
      :class="[
        'widget-container widget-shell absolute bg-cat-card border border-cat-border/70 rounded-xl overflow-hidden cursor-move',
        selectedWidget === widget.id ? 'widget-selected' : ''
      ]"
      :style="{
        left: widget.x + 'px', 
        top: widget.y + 'px', 
        width: widget.w + 'px', 
        height: widget.h + 'px',
        zIndex: widget.zIndex || 1
      }"
      @click.stop="selectWidget(widget, $event)"
      @contextmenu.stop="showContextMenu(widget, $event)"
    >
      <!-- 控件头部 -->
      <div
        class="h-8 bg-cat-surface/80 border-b border-cat-border flex items-center px-3 cursor-move"
        @mousedown.stop="startDrag(widget, $event)"
      >
        <span class="text-sm text-cat-muted truncate">{{ getWidgetDisplayTitle(widget) }}</span>
      </div>
      
      <!-- 控件内容 -->
      <div
        :class="[
          'h-[calc(100%-32px)] p-2',
          widget.type === 'waveform' ? 'cursor-move' : ''
        ]"
        @mousedown.stop="widget.type === 'waveform' && startDrag(widget, $event)"
      >
        <component 
          :is="widgetComponents[widget.type]" 
          :widget="widget"
        />
      </div>
      
      <!-- 边缘拉伸热区 -->
      <div 
        class="edge-resize-zone edge-resize-top"
        @mousedown.stop="startResize(widget, 'n', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-right"
        @mousedown.stop="startResize(widget, 'e', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-bottom"
        @mousedown.stop="startResize(widget, 's', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-left"
        @mousedown.stop="startResize(widget, 'w', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-corner edge-resize-top-left"
        @mousedown.stop="startResize(widget, 'nw', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-corner edge-resize-top-right"
        @mousedown.stop="startResize(widget, 'ne', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-corner edge-resize-bottom-left"
        @mousedown.stop="startResize(widget, 'sw', $event)"
      ></div>
      <div 
        class="edge-resize-zone edge-resize-corner edge-resize-bottom-right"
        @mousedown.stop="startResize(widget, 'se', $event)"
      ></div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="store.widgets.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center">
        <div class="text-6xl mb-4">📈</div>
        <div class="text-cat-text text-lg">画布当前没有图表</div>
        <div class="text-cat-muted text-sm mt-2">左侧雷达工具里点「添加呼吸图」或「添加能量图」</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edge-resize-zone {
  position: absolute;
  z-index: 4;
}

.edge-resize-top,
.edge-resize-bottom {
  left: 12px;
  right: 12px;
  height: 10px;
}

.edge-resize-left,
.edge-resize-right {
  top: 12px;
  bottom: 12px;
  width: 10px;
}

.edge-resize-top {
  top: -5px;
  cursor: n-resize;
}

.edge-resize-right {
  right: -5px;
  cursor: e-resize;
}

.edge-resize-bottom {
  bottom: -5px;
  cursor: s-resize;
}

.edge-resize-left {
  left: -5px;
  cursor: w-resize;
}

.edge-resize-corner {
  width: 14px;
  height: 14px;
}

.edge-resize-top-left {
  top: -7px;
  left: -7px;
  cursor: nw-resize;
}

.edge-resize-top-right {
  top: -7px;
  right: -7px;
  cursor: ne-resize;
}

.edge-resize-bottom-left {
  bottom: -7px;
  left: -7px;
  cursor: sw-resize;
}

.edge-resize-bottom-right {
  bottom: -7px;
  right: -7px;
  cursor: se-resize;
}

.widget-shell {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform, width, height;
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.18),
    0 2px 8px rgba(15, 23, 42, 0.08);
  transition:
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.widget-shell:hover {
  border-color: color-mix(in srgb, var(--cat-primary) 38%, var(--cat-border) 62%);
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.22),
    0 0 0 1px color-mix(in srgb, var(--cat-primary) 24%, transparent);
}

.widget-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px transparent;
  transition: box-shadow 0.18s ease;
}

.widget-shell:hover::after,
.widget-selected.widget-shell::after {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cat-primary) 18%, transparent);
}

.widget-selected.widget-shell {
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.24),
    0 0 0 1px color-mix(in srgb, var(--cat-primary) 14%, transparent);
}

.widget-shell canvas {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}
</style>
