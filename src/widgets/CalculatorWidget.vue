<script setup>
import { ref, computed } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()

// 预设表达式
const presets = [
  { label: '求和', expr: 'ch0 + ch1 + ch2' },
  { label: '平均', expr: '(ch0 + ch1 + ch2) / 3' },
  { label: '差值', expr: 'ch0 - ch1' },
  { label: '比率', expr: 'ch0 / ch1 * 100' }
]

// 计算结果
const result = computed(() => {
  const expr = props.widget.expression
  if (!expr) return '—'
  
  try {
    let formula = expr
    
    // 替换通道变量
    store.channels.forEach((ch, i) => {
      const regex = new RegExp(`ch${i}`, 'gi')
      formula = formula.replace(regex, ch.value.toString())
    })
    
    // 支持一些数学函数
    formula = formula.replace(/abs\(/gi, 'Math.abs(')
    formula = formula.replace(/sqrt\(/gi, 'Math.sqrt(')
    formula = formula.replace(/pow\(/gi, 'Math.pow(')
    formula = formula.replace(/min\(/gi, 'Math.min(')
    formula = formula.replace(/max\(/gi, 'Math.max(')
    formula = formula.replace(/round\(/gi, 'Math.round(')
    formula = formula.replace(/floor\(/gi, 'Math.floor(')
    formula = formula.replace(/ceil\(/gi, 'Math.ceil(')
    
    // 计算结果
    const value = eval(formula)
    
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN'
      if (!Number.isFinite(value)) return '∞'
      return value.toFixed(props.widget.precision || 2)
    }
    
    return String(value)
  } catch (e) {
    return 'Error'
  }
})

// 应用预设
const applyPreset = (preset) => {
  props.widget.expression = preset.expr
}
</script>

<template>
  <div class="w-full h-full flex flex-col gap-2 p-1">
    <!-- 表达式输入 -->
    <div class="flex gap-1">
      <input 
        v-model="widget.expression" 
        placeholder="表达式: ch0 + ch1 * 2"
        class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-1 text-xs font-mono"
      >
    </div>
    
    <!-- 快捷预设 -->
    <div class="flex gap-1 flex-wrap">
      <button 
        v-for="preset in presets" 
        :key="preset.label"
        @click="applyPreset(preset)"
        class="px-2 py-0.5 bg-cat-surface hover:bg-cat-border rounded text-[10px] text-cat-muted"
      >
        {{ preset.label }}
      </button>
    </div>
    
    <!-- 结果显示 -->
    <div class="flex-1 flex items-center justify-center">
      <div 
        class="text-2xl font-bold"
        :class="result === 'Error' || result === 'NaN' ? 'text-red-400' : 'text-cat-primary'"
      >
        {{ result }}
      </div>
    </div>
    
    <!-- 通道变量提示 -->
    <div class="text-[10px] text-cat-muted text-center">
      可用变量: 
      <span v-for="(ch, i) in store.channels" :key="ch.id" class="mx-0.5">
        ch{{ i }}={{ ch.value.toFixed(1) }}
      </span>
    </div>
  </div>
</template>
