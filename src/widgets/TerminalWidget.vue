<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useSerialStore } from '../stores/serial'

const props = defineProps({
  widget: Object
})

const store = useSerialStore()
const scrollContainer = ref(null)
const inputValue = ref('')

// 显示最近的日志
const recentLogs = computed(() => {
  return store.terminalLogs.slice(-30)
})

// 发送数据
const sendData = () => {
  if (!inputValue.value.trim() || !store.connected) return
  store.send(inputValue.value, false)
  inputValue.value = ''
}

// 自动滚动
watch(() => store.terminalLogs.length, async () => {
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
        :disabled="!store.connected"
        placeholder="输入命令..."
        class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-1 text-xs disabled:opacity-50"
      />
      <button
        @click="sendData"
        :disabled="!store.connected"
        class="px-2 py-1 bg-cat-primary/20 text-cat-primary rounded text-xs hover:bg-cat-primary/30 disabled:opacity-50"
      >
        发送
      </button>
    </div>
  </div>
</template>
