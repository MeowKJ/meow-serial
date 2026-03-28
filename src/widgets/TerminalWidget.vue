<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePortsStore } from '../stores/ports'

const props = defineProps({
  widget: Object
})

const portsStore = usePortsStore()
const scrollContainer = ref(null)
const inputValue = ref('')

// 合并所有端口日志，显示最近30条
const recentLogs = computed(() => {
  const allLogs = []
  for (const p of portsStore.ports) {
    for (const log of p.logs) {
      allLogs.push(log)
    }
  }
  allLogs.sort((a, b) => a.id - b.id)
  return allLogs.slice(-30)
})

// 发送数据到第一个已连接端口
const sendData = () => {
  if (!inputValue.value.trim() || !portsStore.anyConnected) return
  const target = portsStore.ports.find(p => p.connected)
  if (target) {
    portsStore.sendToPort(target.id, inputValue.value, { appendCR: false, appendLF: true })
  }
  inputValue.value = ''
}

// 自动滚动
watch(() => recentLogs.value.length, async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
})
</script>

<template>
  <div class="w-full h-full flex flex-col text-xs font-mono">
    <!-- 数据显示区 -->
    <div 
      ref="scrollContainer"
      class="flex-1 overflow-auto bg-cat-dark rounded p-2 space-y-0.5"
    >
      <div 
        v-for="log in recentLogs" 
        :key="log.id" 
        class="flex gap-2 items-start"
      >
        <span class="text-cat-muted shrink-0">{{ log.time.slice(-8) }}</span>
        <span 
          :class="[
            'shrink-0',
            log.dir === 'rx' ? 'text-green-400' : 'text-blue-400'
          ]"
        >
          {{ log.dir === 'rx' ? '←' : '→' }}
        </span>
        <span class="text-cat-text break-all">{{ log.data }}</span>
      </div>
      
      <!-- 空状态 -->
      <div v-if="recentLogs.length === 0" class="h-full flex items-center justify-center text-cat-muted">
        等待数据喵~
      </div>
    </div>
    
    <!-- 输入区 -->
    <div class="flex gap-1 mt-1">
      <input
        v-model="inputValue"
        @keyup.enter="sendData"
        :disabled="!portsStore.anyConnected"
        placeholder="输入命令..."
        class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-1 text-xs disabled:opacity-50"
      />
      <button
        @click="sendData"
        :disabled="!portsStore.anyConnected"
        class="px-2 py-1 bg-cat-primary/20 text-cat-primary rounded text-xs hover:bg-cat-primary/30 disabled:opacity-50"
      >
        发送
      </button>
    </div>
  </div>
</template>
