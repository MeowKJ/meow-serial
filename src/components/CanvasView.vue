<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
import XYPlotWidget from '../widgets/XYPlotWidget.vue'

const store = useSerialStore()
const emit = defineEmits(['show-settings', 'update:selectedWidget'])
const props = defineProps({
  selectedWidget: [Number, null]
})

// 控件组件映射
const widgetComponents = {
  waveform: WaveformWidget,
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

// 选择控件
const selectWidget = (widget, e) => {
  e.stopPropagation()
  emit('update:selectedWidget', widget.id)
}

// 取消选择
const deselectWidget = () => {
  emit('update:selectedWidget', null)
}

// 开始拖拽
const startDrag = (widget, e) => {
  if (e.target.classList.contains('resize-handle')) return
  dragWidget = widget
  dragStartX = e.clientX - widget.x
  dragStartY = e.clientY - widget.y
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragWidget) return
  store.updateWidget(dragWidget.id, {
    x: Math.max(0, e.clientX - dragStartX),
    y: Math.max(0, e.clientY - dragStartY)
  })
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
  
  const updates = {}
  if (resizeDir.includes('e')) updates.w = Math.max(minW, resizeStartW + dx)
  if (resizeDir.includes('s')) updates.h = Math.max(minH, resizeStartH + dy)
  
  store.updateWidget(resizeWidget.id, updates)
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
  emit('show-settings')
}

// 初始化默认控件
onMounted(() => {
  if (store.widgets.length === 0) {
    store.addWidget({ type: 'waveform', title: '波形图', x: 20, y: 20, w: 500, h: 250, channels: [0, 1, 2] })
    store.addWidget({ type: 'value', title: '温度显示', x: 540, y: 20, w: 160, h: 120, channel: 0, unit: '°C' })
    store.addWidget({ type: 'gauge', title: '仪表盘', x: 540, y: 160, w: 160, h: 140, channel: 1, unit: '%' })
    store.addWidget({ type: 'button', title: '控制按钮', x: 20, y: 290, w: 150, h: 80, label: '开始采集', command: 'START' })
    store.addWidget({ type: 'led', title: 'LED状态', x: 190, y: 290, w: 180, h: 80 })
  }
})
</script>

<template>
  <div 
    class="h-full grid-pattern paw-pattern relative overflow-auto p-4"
    @click="deselectWidget"
  >
    <!-- 控件渲染 -->
    <div 
      v-for="widget in store.widgets" 
      :key="widget.id"
      :class="[
        'widget-container absolute bg-cat-card border border-cat-border rounded-xl overflow-hidden shadow-lg cursor-move',
        selectedWidget === widget.id ? 'widget-selected' : ''
      ]"
      :style="{
        left: widget.x + 'px', 
        top: widget.y + 'px', 
        width: widget.w + 'px', 
        height: widget.h + 'px'
      }"
      @mousedown.stop="startDrag(widget, $event)"
      @click.stop="selectWidget(widget, $event)"
      @contextmenu.stop="showContextMenu(widget, $event)"
    >
      <!-- 控件头部 -->
      <div class="h-8 bg-cat-surface/80 border-b border-cat-border flex items-center px-3 cursor-move">
        <span class="text-sm text-cat-muted truncate">{{ widget.title }}</span>
        <button 
          @click.stop="emit('show-settings')" 
          class="ml-auto w-6 h-6 rounded hover:bg-cat-border flex items-center justify-center text-cat-muted hover:text-cat-text"
        >
          ⚙️
        </button>
      </div>
      
      <!-- 控件内容 -->
      <div class="h-[calc(100%-32px)] p-2">
        <component 
          :is="widgetComponents[widget.type]" 
          :widget="widget"
        />
      </div>
      
      <!-- 缩放手柄 -->
      <div 
        class="resize-handle w-2 h-8 right-0 top-1/2 -translate-y-1/2 cursor-e-resize" 
        @mousedown.stop="startResize(widget, 'e', $event)"
      ></div>
      <div 
        class="resize-handle w-8 h-2 bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize" 
        @mousedown.stop="startResize(widget, 's', $event)"
      ></div>
      <div 
        class="resize-handle w-3 h-3 right-0 bottom-0 cursor-se-resize rounded-tl" 
        @mousedown.stop="startResize(widget, 'se', $event)"
      ></div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="store.widgets.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center">
        <div class="text-6xl mb-4">🐱</div>
        <div class="text-cat-muted text-lg">画布是空的喵~</div>
        <div class="text-cat-muted text-sm mt-2">点击「控件喵盒」添加控件</div>
      </div>
    </div>
  </div>
</template>
