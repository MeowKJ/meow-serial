<script setup>
import { useSerialStore } from '../stores/serial'

const store = useSerialStore()
const props = defineProps({
  widget: Object
})
const emit = defineEmits(['close', 'delete'])

const deleteWidget = () => {
  if (props.widget) {
    store.removeWidget(props.widget.id)
    emit('delete')
  }
}
</script>

<template>
  <aside class="w-72 bg-cat-card border-l border-cat-border flex flex-col shrink-0">
    <div class="p-4 border-b border-cat-border flex items-center justify-between">
      <span class="font-medium">🔧 控件设置</span>
      <button @click="emit('close')" class="text-cat-muted hover:text-cat-text">✕</button>
    </div>
    
    <div v-if="widget" class="p-4 space-y-4 overflow-auto">
      <div>
        <label class="text-xs text-cat-muted block mb-1">标题</label>
        <input v-model="widget.title" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
      </div>
      
      <div v-if="['waveform', 'value', 'gauge'].includes(widget.type)">
        <label class="text-xs text-cat-muted block mb-1">绑定通道</label>
        <select v-model="widget.channel" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
          <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
      </div>
      
      <div v-if="widget.type === 'button'">
        <label class="text-xs text-cat-muted block mb-1">按钮文字</label>
        <input v-model="widget.label" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
        <label class="text-xs text-cat-muted block mb-1 mt-3">发送命令</label>
        <input v-model="widget.command" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm font-mono">
      </div>

      <div v-if="['value', 'gauge'].includes(widget.type)">
        <label class="text-xs text-cat-muted block mb-1">单位</label>
        <input v-model="widget.unit" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-cat-muted block mb-1">宽度</label>
          <input v-model.number="widget.w" type="number" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">高度</label>
          <input v-model.number="widget.h" type="number" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
        </div>
      </div>
      
      <button @click="deleteWidget" class="w-full py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">
        🗑️ 删除控件
      </button>
    </div>
    
    <div v-else class="flex-1 flex items-center justify-center text-cat-muted text-sm">
      选择一个控件进行设置
    </div>
  </aside>
</template>
