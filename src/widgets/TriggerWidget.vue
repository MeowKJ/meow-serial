<script setup>
import { ref, watch, computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { usePortsStore } from '../stores/ports'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const portsStore = usePortsStore()

// 触发状态
const triggered = ref(false)
const lastTriggerTime = ref(null)
const triggerCount = ref(0)

// 获取当前值
const currentValue = computed(() => {
  const channel = store.channels[props.widget.channel || 0]
  return channel?.value || 0
})

// 检查触发条件
const checkTrigger = () => {
  const value = currentValue.value
  const threshold = props.widget.threshold || 50
  const condition = props.widget.condition || '>'
  
  let shouldTrigger = false
  
  switch (condition) {
    case '>':
      shouldTrigger = value > threshold
      break
    case '<':
      shouldTrigger = value < threshold
      break
    case '>=':
      shouldTrigger = value >= threshold
      break
    case '<=':
      shouldTrigger = value <= threshold
      break
    case '=':
      shouldTrigger = Math.abs(value - threshold) < 0.5
      break
  }
  
  // 上升沿触发
  if (shouldTrigger && !triggered.value) {
    triggered.value = true
    triggerCount.value++
    lastTriggerTime.value = new Date().toLocaleTimeString()
    
    // 执行动作
    if (props.widget.action && portsStore.anyConnected) {
      const target = portsStore.ports.find(p => p.connected)
      if (target) {
        portsStore.sendToPort(target.id, props.widget.action, { appendCR: false, appendLF: true })
      }
    }
  } else if (!shouldTrigger) {
    triggered.value = false
  }
}

// 监听数据变化
watch(() => store.dataHistory.length, checkTrigger)

// 重置计数
const resetCount = () => {
  triggerCount.value = 0
  lastTriggerTime.value = null
}
</script>

<template>
  <div class="w-full h-full flex flex-col gap-2 p-1 text-xs">
    <!-- 条件配置 -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-cat-muted">当</span>
      <select 
        v-model="widget.channel" 
        class="bg-cat-surface border border-cat-border rounded px-1.5 py-0.5 text-xs min-w-0"
      >
        <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
      </select>
      <select 
        v-model="widget.condition" 
        class="bg-cat-surface border border-cat-border rounded px-1.5 py-0.5 text-xs w-12"
      >
        <option value=">">&gt;</option>
        <option value="<">&lt;</option>
        <option value=">=">&gt;=</option>
        <option value="<=">&lt;=</option>
        <option value="=">=</option>
      </select>
      <input 
        v-model.number="widget.threshold" 
        type="number" 
        class="w-14 bg-cat-surface border border-cat-border rounded px-1.5 py-0.5 text-xs"
      >
    </div>
    
    <!-- 动作配置 -->
    <div class="flex items-center gap-2">
      <span class="text-cat-muted shrink-0">执行:</span>
      <input 
        v-model="widget.action" 
        placeholder="发送命令..."
        class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-0.5 text-xs"
      >
    </div>
    
    <!-- 状态显示 -->
    <div class="flex items-center justify-between mt-auto pt-1 border-t border-cat-border">
      <div class="flex items-center gap-2">
        <div 
          class="w-2.5 h-2.5 rounded-full transition-all"
          :class="triggered ? 'bg-green-400 shadow-[0_0_8px_#22C55E]' : 'bg-cat-muted'"
        ></div>
        <span class="text-cat-muted">{{ triggered ? '已触发' : '等待中' }}</span>
      </div>
      <div class="flex items-center gap-2 text-cat-muted">
        <span>计数: {{ triggerCount }}</span>
        <button @click="resetCount" class="text-cat-primary hover:underline">重置</button>
      </div>
    </div>
  </div>
</template>
