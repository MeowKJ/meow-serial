<script setup>
import { ref, watch } from 'vue'
import { useSerialStore } from '../stores/serial'

const store = useSerialStore()
const props = defineProps({
  widget: Object
})
const emit = defineEmits(['close', 'delete'])

const waveformChannelsText = ref('')
const isFullHistoryWaveform = ref(false)

watch(
  () => props.widget,
  (widget) => {
    if (widget?.type === 'waveform') {
      waveformChannelsText.value = Array.isArray(widget.channels) ? widget.channels.join(', ') : ''
      const channels = Array.isArray(widget.channels) ? widget.channels : []
      isFullHistoryWaveform.value = Boolean(widget.fullHistory || widget.title === '温度曲线' || (channels.length === 1 && channels[0] === 18))
    }
  },
  { immediate: true, deep: true }
)

const applyWaveformChannels = () => {
  if (!props.widget || props.widget.type !== 'waveform') return

  const channelIds = waveformChannelsText.value
    .split(/[\s,]+/)
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isInteger(value) && value >= 0)

  props.widget.channels = channelIds
}

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
      
      <div v-if="['value', 'gauge'].includes(widget.type)">
        <label class="text-xs text-cat-muted block mb-1">绑定通道</label>
        <select v-model="widget.channel" class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm">
          <option v-for="ch in store.channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
      </div>

      <div v-if="widget.type === 'waveform'" class="space-y-3">
        <div>
          <label class="text-xs text-cat-muted block mb-1">波形通道</label>
          <input
            v-model="waveformChannelsText"
            @change="applyWaveformChannels"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: 0,1,2"
          >
          <div class="text-[10px] text-cat-muted mt-1">输入通道编号，用逗号分隔。当前通道名请看左侧数据通道列表。</div>
        </div>
        <div v-if="!isFullHistoryWaveform">
          <label class="text-xs text-cat-muted block mb-1">历史长度</label>
          <input
            v-model.number="widget.historyLength"
            type="number"
            min="60"
            max="500"
            step="10"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
          >
        </div>
        <div v-else class="text-[11px] text-cat-muted bg-cat-surface/70 rounded-lg px-3 py-2">
          该曲线保留全历史，显示时会自动抽稀，不受“历史长度”限制。
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">纵轴标题</label>
          <input
            v-model="widget.yAxisLabel"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: 呼吸相位"
          >
        </div>
        <div>
          <label class="text-xs text-cat-muted block mb-1">单位</label>
          <input
            v-model="widget.unit"
            class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            placeholder="例如: rad"
          >
        </div>
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
