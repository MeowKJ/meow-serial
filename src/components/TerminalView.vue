<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { useSerialStore } from '../stores/serial'
import { notify } from '../utils/notification'

const store = useSerialStore()

const sendInput = ref('')
const displayMode = ref('ASCII')
const showTimestamp = ref(true)
const autoScroll = ref(true)
const appendCR = ref(false)
const appendLF = ref(true)
const sendAsHex = ref(false)
const timerEnabled = ref(false)
const timerInterval = ref(1000)
const terminalEl = ref(null)
const sendHistory = ref([])
const historyIndex = ref(-1)

// HEX输入验证和格式化
const formatHexInput = (value) => {
  // 移除所有非十六进制字符
  const cleaned = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  // 每两个字符一组，用空格分隔
  if (cleaned.length === 0) return ''
  return cleaned.match(/.{1,2}/g)?.join(' ') || cleaned
}

// HEX输入处理
const handleHexInput = (e) => {
  if (sendAsHex.value) {
    const value = e.target.value
    const formatted = formatHexInput(value)
    sendInput.value = formatted
  }
}

// 监听HEX模式切换
watch(sendAsHex, (isHex) => {
  if (isHex && sendInput.value) {
    // 切换到HEX模式时，格式化输入
    sendInput.value = formatHexInput(sendInput.value)
  }
})

// 定时发送定时器
let timerHandle = null

const quickCommands = [
  { name: 'AT', cmd: 'AT' },
  { name: '重启', cmd: 'AT+RST' },
  { name: '版本', cmd: 'AT+GMR' },
  { name: '心跳', cmd: 'PING' },
  { name: 'LED开', cmd: 'LED ON' },
  { name: 'LED关', cmd: 'LED OFF' }
]

// 发送数据
const sendData = async () => {
  if (!sendInput.value.trim()) return

  let data = sendInput.value.trim()

  // HEX模式验证
  if (sendAsHex.value) {
    const cleaned = data.replace(/\s/g, '')
    if (!/^[0-9A-Fa-f]+$/.test(cleaned)) {
      notify.error('HEX格式错误：只能包含0-9和A-F字符喵~')
      return
    }
    if (cleaned.length % 2 !== 0) {
      notify.error('HEX格式错误：必须是偶数个字符喵~')
      return
    }
    // HEX模式下，不需要appendCR/LF，因为这些都是字节数据
    data = cleaned
  }

  // 添加到历史
  if (sendHistory.value[0] !== data) {
    sendHistory.value.unshift(data)
    if (sendHistory.value.length > 50) {
      sendHistory.value.pop()
    }
  }
  historyIndex.value = -1

  // 发送
  await store.send(data, {
    appendCR: sendAsHex.value ? false : appendCR.value,
    appendLF: sendAsHex.value ? false : appendLF.value,
    isHex: sendAsHex.value
  })

  sendInput.value = ''
}

// 历史导航
const navigateHistory = (direction) => {
  if (sendHistory.value.length === 0) return

  if (direction === 'up') {
    if (historyIndex.value < sendHistory.value.length - 1) {
      historyIndex.value++
      sendInput.value = sendHistory.value[historyIndex.value]
    }
  } else {
    if (historyIndex.value > 0) {
      historyIndex.value--
      sendInput.value = sendHistory.value[historyIndex.value]
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      sendInput.value = ''
    }
  }
}

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    navigateHistory('up')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    navigateHistory('down')
  }
}

// 导出日志
const exportLog = () => {
  const content = store.terminalLogs.map(l => {
    const dir = l.dir === 'rx' ? 'RX' : (l.dir === 'tx' ? 'TX' : 'SYS')
    return `[${l.time}] [${dir}] ${l.data}`
  }).join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `serial_log_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 清空终端
const clearTerminal = () => {
  store.clearTerminal()
}

// 格式化显示
const formatData = (log) => {
  const { data, type, rawBytes } = log

  if (displayMode.value === 'HEX') {
    // HEX模式：显示为十六进制
    if (rawBytes && rawBytes instanceof Uint8Array) {
      return Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    }
    // 如果没有原始字节，从文本转换
    const encoder = new TextEncoder()
    const bytes = encoder.encode(data)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  } else if (displayMode.value === '混合') {
    // 混合模式：HEX + ASCII
    let hexStr = ''
    let asciiStr = ''

    if (rawBytes && rawBytes instanceof Uint8Array) {
      hexStr = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      asciiStr = Array.from(rawBytes).map(b => {
        const char = String.fromCharCode(b)
        return (b >= 32 && b <= 126) ? char : '.'
      }).join('')
    } else {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data)
      hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      asciiStr = data.replace(/[\x00-\x1F\x7F-\x9F]/g, '.')
    }

    return `${hexStr} | ${asciiStr}`
  }

  // ASCII模式：显示ASCII文本
  // 如果有原始字节数据，将字节转换为ASCII文本
  if (rawBytes && rawBytes instanceof Uint8Array) {
    return Array.from(rawBytes).map(b => {
      const char = String.fromCharCode(b)
      // 可打印字符直接显示，不可打印字符显示为点或转义序列
      if (b >= 32 && b <= 126) {
        return char
      } else if (b === 9) {
        return '\t' // Tab
      } else if (b === 10) {
        return '\n' // LF
      } else if (b === 13) {
        return '\r' // CR
      } else {
        return '.' // 其他不可打印字符
      }
    }).join('')
  }

  // 如果type是hex但data是HEX字符串，尝试转换
  if (type === 'hex' && /^[0-9A-Fa-f\s]+$/.test(data)) {
    try {
      const hex = data.replace(/\s/g, '')
      const bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
      return Array.from(bytes).map(b => {
        const char = String.fromCharCode(b)
        return (b >= 32 && b <= 126) ? char : '.'
      }).join('')
    } catch {
      return data
    }
  }

  // 直接显示文本
  return data
}

// 获取日志样式
const getLogClass = (dir) => {
  switch (dir) {
    case 'rx': return 'bg-green-500/20 text-green-400'
    case 'tx': return 'bg-blue-500/20 text-blue-400'
    case 'system': return 'bg-purple-500/20 text-purple-400'
    case 'error': return 'bg-red-500/20 text-red-400'
    default: return 'bg-cat-surface text-cat-muted'
  }
}

const getDirLabel = (dir) => {
  switch (dir) {
    case 'rx': return 'RX'
    case 'tx': return 'TX'
    case 'system': return 'SYS'
    case 'error': return 'ERR'
    default: return '---'
  }
}

// 检查是否在底部
const isAtBottom = () => {
  if (!terminalEl.value) return false
  const { scrollTop, scrollHeight, clientHeight } = terminalEl.value
  // 允许5px的误差
  return scrollHeight - scrollTop - clientHeight < 5
}

// 自动滚动
watch(() => store.terminalLogs.length, async () => {
  if (autoScroll.value && terminalEl.value) {
    await nextTick()
    terminalEl.value.scrollTop = terminalEl.value.scrollHeight
  }
})

// 监听显示模式切换
watch(displayMode, async (newMode, oldMode) => {
  if (!terminalEl.value || newMode === oldMode) return

  // 等待DOM更新
  await nextTick()

  const wasAtBottom = isAtBottom()
  const oldScrollTop = terminalEl.value.scrollTop
  const oldScrollHeight = terminalEl.value.scrollHeight

  // 等待内容重新渲染
  await nextTick()

  const newScrollHeight = terminalEl.value.scrollHeight

  if (wasAtBottom) {
    // 如果之前在底部，保持在底部
    terminalEl.value.scrollTop = terminalEl.value.scrollHeight
  } else {
    // 如果之前在中间浏览，保持相对位置
    // 计算内容高度变化的比例
    const heightRatio = oldScrollHeight > 0 ? oldScrollTop / oldScrollHeight : 0
    const newScrollTop = newScrollHeight * heightRatio
    terminalEl.value.scrollTop = newScrollTop
  }
})

// 定时发送
watch(timerEnabled, (enabled) => {
  if (enabled && sendInput.value) {
    timerHandle = setInterval(async () => {
      if (sendInput.value && store.connected) {
        await store.send(sendInput.value, {
          appendCR: appendCR.value,
          appendLF: appendLF.value,
          isHex: sendAsHex.value
        })
      }
    }, timerInterval.value)
  } else {
    if (timerHandle) {
      clearInterval(timerHandle)
      timerHandle = null
    }
  }
})

// 清理定时器
onUnmounted(() => {
  if (timerHandle) {
    clearInterval(timerHandle)
  }
})
</script>

<template>
  <div class="h-full flex flex-col p-4 gap-4">
    <!-- 工具栏 -->
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-sm text-cat-muted">显示格式:</span>
        <div class="flex bg-cat-surface rounded-lg p-0.5">
          <button v-for="m in ['ASCII', 'HEX', '混合']" :key="m" @click="displayMode = m" :class="[
            'px-3 py-1 text-sm rounded-md transition-colors',
            displayMode === m ? 'bg-cat-primary text-white' : 'text-cat-muted hover:text-cat-text'
          ]">
            {{ m }}
          </button>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-cat-muted cursor-pointer">
        <input type="checkbox" v-model="showTimestamp" class="accent-cat-primary"> 时间戳
      </label>
      <label class="flex items-center gap-2 text-sm text-cat-muted cursor-pointer">
        <input type="checkbox" v-model="autoScroll" class="accent-cat-primary"> 自动滚动
      </label>
      <div class="ml-auto flex gap-2">
        <button @click="clearTerminal" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm">
          🗑️ 清空
        </button>
        <button @click="exportLog" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm">
          📥 导出日志
        </button>
      </div>
    </div>

    <!-- 终端显示 -->
    <div ref="terminalEl" class="flex-1 bg-cat-surface rounded-xl p-4 overflow-auto font-mono text-sm">
      <div v-for="log in store.terminalLogs" :key="log.id"
        class="flex items-start gap-3 py-0.5 hover:bg-cat-border/30 px-2 -mx-2 rounded">
        <span v-if="showTimestamp" class="text-cat-muted shrink-0 text-xs">{{ log.time }}</span>
        <span :class="['shrink-0 text-xs px-1.5 py-0.5 rounded', getLogClass(log.dir)]">
          {{ getDirLabel(log.dir) }}
        </span>
        <span class="break-all font-mono" :class="log.type === 'hex' ? 'text-cat-accent' : 'text-cat-text'">
          {{ formatData(log) }}
        </span>
      </div>
      <div v-if="store.terminalLogs.length === 0" class="h-full flex items-center justify-center text-cat-muted">
        <div class="text-center">
          <div class="text-2xl mb-2">🐱</div>
          <div>{{ store.connected ? '等待数据喵~' : '请先连接串口喵~' }}</div>
        </div>
      </div>
    </div>

    <!-- 发送区 -->
    <div class="bg-cat-surface rounded-xl p-4">
      <div class="flex gap-3">
        <div class="flex-1 relative">
          <input v-model="sendInput" @keyup.enter="sendData" @keydown="handleKeyDown" @input="handleHexInput"
            :disabled="!store.connected"
            :placeholder="sendAsHex ? '输入HEX数据，如: 01 02 FF (空格可选)' : (store.connected ? '输入要发送的数据... (↑↓ 历史)' : '请先连接串口...')"
            class="w-full bg-cat-dark border border-cat-border rounded-lg px-4 py-2.5 pr-20 disabled:opacity-50"
            :class="{ 'font-mono text-cat-accent': sendAsHex }">
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cat-muted">
            {{ sendInput.length }} 字符
          </span>
        </div>
        <button @click="sendData" :disabled="!store.connected || !sendInput.trim()"
          class="cat-btn px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-50">
          发送喵 🐾
        </button>
      </div>

      <div class="flex items-center gap-6 mt-3 text-sm flex-wrap">
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="appendCR" class="accent-cat-primary"> +CR
        </label>
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="appendLF" class="accent-cat-primary"> +LF
        </label>
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="sendAsHex" class="accent-cat-primary"> HEX发送
          <span v-if="sendAsHex && sendInput" class="text-xs text-cat-accent ml-1">
            ({{ Math.floor(sendInput.replace(/\s/g, '').length / 2) }} 字节)
          </span>
        </label>
        <div class="flex items-center gap-2 text-cat-muted">
          <input type="checkbox" v-model="timerEnabled" :disabled="!sendInput.trim()" class="accent-cat-primary">
          定时发送
          <input type="number" v-model.number="timerInterval" :disabled="!timerEnabled" min="100" step="100"
            class="w-20 bg-cat-dark border border-cat-border rounded px-2 py-1 text-center disabled:opacity-50">
          ms
        </div>
      </div>

      <!-- 快捷命令 -->
      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-cat-border flex-wrap">
        <span class="text-xs text-cat-muted">快捷:</span>
        <button v-for="cmd in quickCommands" :key="cmd.name" @click="sendInput = cmd.cmd"
          class="cat-btn-secondary px-2 py-1 rounded text-xs">
          {{ cmd.name }}
        </button>
        <div class="flex-1"></div>
        <span class="text-xs text-cat-muted">历史: {{ sendHistory.length }} 条</span>
      </div>
    </div>
  </div>
</template>
