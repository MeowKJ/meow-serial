<script setup>
import { useSerialStore } from '../stores/serial'
import { getWidgetDefaults } from '../widgets'

const store = useSerialStore()
const emit = defineEmits(['close'])

const widgetTypes = [
  { type: 'waveform', name: '波形图', icon: '📈', desc: '多通道实时波形', defaultW: 400, defaultH: 200 },
  { type: 'sparkline', name: '迷你波形图', icon: '〰️', desc: '单通道迷你趋势线', defaultW: 180, defaultH: 72 },
  { type: 'fft', name: 'FFT频谱', icon: '📊', desc: '频谱分析', defaultW: 300, defaultH: 180 },
  { type: 'value', name: '数值显示', icon: '🔢', desc: '大字体数值', defaultW: 220, defaultH: 140 },
  { type: 'gauge', name: '仪表盘', icon: '⏱️', desc: '圆弧仪表', defaultW: 150, defaultH: 130 },
  { type: 'button', name: '按钮', icon: '🔘', desc: '发送命令', defaultW: 140, defaultH: 70 },
  { type: 'slider', name: '滑块', icon: '🎚️', desc: '参数调节', defaultW: 200, defaultH: 80 },
  { type: 'led', name: 'LED指示灯', icon: '💡', desc: '状态指示', defaultW: 180, defaultH: 70 },
  { type: 'terminal', name: '迷你终端', icon: '📟', desc: '数据日志', defaultW: 280, defaultH: 150 },
  { type: 'trigger', name: '触发器', icon: '⚡', desc: '条件触发', defaultW: 250, defaultH: 100 },
  { type: 'calculator', name: '计算器', icon: '🧮', desc: '数据运算', defaultW: 200, defaultH: 100 }
]

const addWidget = (widgetType) => {
  store.addWidget({
    ...getWidgetDefaults(widgetType.type),
    x: 50 + Math.random() * 100,
    y: 50 + Math.random() * 100
  })
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-cat-dark/60" @click="emit('close')">
    <div class="bg-cat-card rounded-2xl w-[640px] max-h-[80vh] overflow-hidden shadow-2xl" @click.stop>
      <div class="p-5 border-b border-cat-border flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🧩</span>
          <div>
            <h2 class="font-semibold text-lg">控件喵盒</h2>
            <p class="text-sm text-cat-muted">选择控件添加到画布</p>
          </div>
        </div>
        <button @click="emit('close')" class="w-8 h-8 rounded-lg hover:bg-cat-surface flex items-center justify-center text-cat-muted">✕</button>
      </div>
      
      <div class="p-5 grid grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
        <button 
          v-for="w in widgetTypes" 
          :key="w.type" 
          @click="addWidget(w)"
          class="p-4 rounded-xl bg-cat-surface hover:bg-cat-border/50 text-left transition-all group"
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ w.icon }}</div>
          <div class="font-medium text-sm">{{ w.name }}</div>
          <div class="text-xs text-cat-muted mt-1">{{ w.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
