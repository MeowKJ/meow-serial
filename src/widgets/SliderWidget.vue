<script setup>
import { ref, watch } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const currentValue = ref(props.widget.value || 50)

// 计算百分比
const percentage = computed(() => {
  const min = props.widget.min || 0
  const max = props.widget.max || 100
  return ((currentValue.value - min) / (max - min)) * 100
})

// 发送命令
const sendValue = () => {
  if (!store.connected) return
  
  const command = props.widget.command 
    ? props.widget.command.replace('{value}', currentValue.value.toString())
    : `SET:${currentValue.value}`
  
  store.send(command, false)
}

// 监听值变化
watch(currentValue, (newVal) => {
  props.widget.value = newVal
})

import { computed } from 'vue'
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center px-3 gap-2">
    <!-- 标签和值 -->
    <div class="flex justify-between items-center text-sm">
      <span class="text-cat-muted">{{ widget.label || '参数' }}</span>
      <span class="font-mono text-cat-primary font-medium">{{ currentValue }}</span>
    </div>
    
    <!-- 滑块容器 -->
    <div class="relative h-3">
      <!-- 轨道背景 -->
      <div class="absolute inset-0 bg-cat-surface rounded-full"></div>
      
      <!-- 进度条 -->
      <div 
        class="absolute top-0 left-0 h-full bg-gradient-to-r from-cat-primary to-cat-secondary rounded-full transition-all duration-100"
        :style="{ width: percentage + '%' }"
      ></div>
      
      <!-- 滑块输入 -->
      <input
        type="range"
        v-model.number="currentValue"
        :min="widget.min || 0"
        :max="widget.max || 100"
        :step="widget.step || 1"
        @change="sendValue"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <!-- 滑块手柄 -->
      <div 
        class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-100"
        :style="{ left: `calc(${percentage}% - 8px)` }"
      ></div>
    </div>
    
    <!-- 范围标签 -->
    <div class="flex justify-between text-[10px] text-cat-muted">
      <span>{{ widget.min || 0 }}</span>
      <span>{{ widget.max || 100 }}</span>
    </div>
  </div>
</template>
