<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePortsStore } from '../stores/ports'
import { notify } from '../utils/notification'

const portsStore = usePortsStore()

const terminalMode = ref('交互')
const selectedPortId = ref('')
const terminalEl = ref(null)
const inputCaptureEl = ref(null)
const pendingInput = ref('')
const sendHistory = ref([])
const historyIndex = ref(-1)
const autoScroll = ref(true)
const isTerminalFocused = ref(false)
const showTimestamp = ref(true)
const analysisDisplayMode = ref('UTF-8')
const enableHexHoverTranslation = ref(true)
const dataFilter = ref('all')
const lastSeenSystemLogIdByPort = new Map()
const hoveredHex = ref({ logId: null, byteIndex: -1 })

const getDefaultPortId = () => {
  const connectedPort = portsStore.ports.find((port) => port.connected)
  return connectedPort?.id || portsStore.ports[0]?.id || ''
}

const selectedPort = computed(() => {
  if (!selectedPortId.value) return null
  return portsStore.getPort(selectedPortId.value) || null
})

const currentLogs = computed(() => selectedPort.value?.logs || [])
const selectedPortLabel = computed(() => selectedPort.value?.label || '未选择串口')
const sendTargetPortId = computed(() => selectedPort.value?.id || null)
const canInteract = computed(() => {
  if (!sendTargetPortId.value) return false
  return portsStore.getPort(sendTargetPortId.value)?.connected === true
})

const mutedVisiblePorts = computed(() => {
  const port = selectedPort.value
  return port && port.connected && !port.showTerminalRx ? [port] : []
})

watch(
  () => portsStore.ports.map((port) => `${port.id}:${port.connected}`).join('|'),
  () => {
    if (selectedPort.value) return
    selectedPortId.value = getDefaultPortId()
  },
  { immediate: true }
)

watch(selectedPortId, () => {
  pendingInput.value = ''
  historyIndex.value = -1
  hoveredHex.value = { logId: null, byteIndex: -1 }

  if (selectedPort.value) {
    const lastSystemLogId = selectedPort.value.logs
      .filter((log) => log.dir === 'system')
      .reduce((maxId, log) => Math.max(maxId, log.id || 0), 0)
    lastSeenSystemLogIdByPort.set(selectedPort.value.id, lastSystemLogId)
  }
})

const getInteractiveLogText = (log) => {
  if (log?.rawBytes instanceof Uint8Array) {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(log.rawBytes).replace(/\0/g, '')
    } catch {
      return Array.from(log.rawBytes).map((byte) => String.fromCharCode(byte)).join('')
    }
  }

  return String(log?.data || '')
}

const getHexBytes = (log) => {
  if (log?.rawBytes instanceof Uint8Array) {
    return Array.from(log.rawBytes)
  }
  return Array.from(new TextEncoder().encode(String(log?.data || '')))
}

const decodeBytesUtf8 = (bytes) => {
  if (!bytes?.length) return ''
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)).replace(/\0/g, '.')
  } catch {
    return bytes.map((byte) => String.fromCharCode(byte)).join('')
  }
}

const escapeVisibleText = (text) => {
  return String(text || '')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
}

const getUtf8CharInfo = (bytes, index) => {
  const byte = bytes[index]

  if (byte < 0x80) {
    return { start: index, length: 1, isComplete: true }
  }

  const getLengthFromLead = (leadByte) => {
    if ((leadByte & 0xE0) === 0xC0) return 2
    if ((leadByte & 0xF0) === 0xE0) return 3
    if ((leadByte & 0xF8) === 0xF0) return 4
    return 1
  }

  if ((byte & 0xC0) !== 0x80) {
    const length = getLengthFromLead(byte)
    return { start: index, length, isComplete: index + length <= bytes.length }
  }

  for (let offset = 1; offset <= 3; offset += 1) {
    const leadIndex = index - offset
    if (leadIndex < 0) break
    const leadByte = bytes[leadIndex]
    if ((leadByte & 0xC0) === 0x80) continue
    const length = getLengthFromLead(leadByte)
    if (leadIndex + length > index) {
      return { start: leadIndex, length, isComplete: leadIndex + length <= bytes.length }
    }
  }

  return { start: index, length: 1, isComplete: false }
}

const getCharGroupFullInfo = (log, index) => {
  const bytes = getHexBytes(log)
  if (!bytes.length || index < 0 || index >= bytes.length) return null

  const info = getUtf8CharInfo(bytes, index)
  const chunk = bytes.slice(info.start, info.start + info.length)
  const hexBytes = chunk.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  const decoded = info.isComplete ? decodeBytesUtf8(chunk) : ''
  const utf8Char = decoded ? escapeVisibleText(decoded) : '(无效)'
  const codePoint = decoded ? decoded.codePointAt(0) : null

  return {
    start: info.start,
    end: info.start + Math.max(info.length - 1, 0),
    hexBytes,
    utf8Char,
    unicode: codePoint != null ? `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}` : '--',
    byteCount: chunk.length,
    isMultiByte: chunk.length > 1
  }
}

const formatData = (log) => {
  if (analysisDisplayMode.value === 'HEX') {
    return getHexBytes(log).map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  }

  if (analysisDisplayMode.value === '混合') {
    const bytes = getHexBytes(log)
    const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    const utf8 = escapeVisibleText(decodeBytesUtf8(bytes))
    return `${hex} | ${utf8}`
  }

  return getInteractiveLogText(log)
}

const interactiveSourceText = computed(() => {
  const segments = []

  for (const log of currentLogs.value) {
    const text = getInteractiveLogText(log)
    if (!text) continue

    if (log.dir === 'system') {
      continue
    }

    if (log.dir === 'error') {
      segments.push(`\n[ERR] ${text}\n`)
      continue
    }

    segments.push(text)
  }

  return segments.join('')
})

watch(
  () => currentLogs.value.map((log) => `${log.id}:${log.dir}`).join('|'),
  () => {
    if (!selectedPort.value || terminalMode.value !== '交互') return

    const portId = selectedPort.value.id
    const lastSeenId = lastSeenSystemLogIdByPort.get(portId) || 0
    const newSystemLogs = currentLogs.value.filter((log) => log.dir === 'system' && (log.id || 0) > lastSeenId)

    if (newSystemLogs.length === 0) return

    const nextLastSeenId = newSystemLogs.reduce((maxId, log) => Math.max(maxId, log.id || 0), lastSeenId)
    lastSeenSystemLogIdByPort.set(portId, nextLastSeenId)

    for (const log of newSystemLogs) {
      const text = getInteractiveLogText(log).trim()
      if (text) {
        notify.info(text, 2600)
      }
    }
  }
)

const renderInteractiveStream = (sourceText) => {
  const lines = [[]]
  let row = 0
  let col = 0

  const ensureLine = (lineIndex) => {
    while (lines.length <= lineIndex) {
      lines.push([])
    }
  }

  const writeChar = (char) => {
    ensureLine(row)
    const line = lines[row]
    while (line.length < col) {
      line.push(' ')
    }
    line[col] = char
    col += 1
  }

  for (const char of sourceText) {
    if (char === '\r') {
      col = 0
      continue
    }
    if (char === '\n') {
      row += 1
      ensureLine(row)
      col = 0
      continue
    }
    if (char === '\b') {
      if (col > 0) {
        col -= 1
        ensureLine(row)
        lines[row].splice(col, 1)
      }
      continue
    }
    if (char === '\t') {
      const spacesToInsert = 4 - (col % 4)
      for (let index = 0; index < spacesToInsert; index += 1) {
        writeChar(' ')
      }
      continue
    }
    if (char < ' ' && char !== ' ') {
      continue
    }
    writeChar(char)
  }

  return lines.map((line) => line.join('')).join('\n')
}

const terminalDisplayText = computed(() => {
  const draft = pendingInput.value + (isTerminalFocused.value && canInteract.value ? '|' : '')
  return renderInteractiveStream(interactiveSourceText.value + draft)
})

const filteredAnalysisLogs = computed(() => {
  if (dataFilter.value === 'all') return currentLogs.value
  return currentLogs.value.filter((log) => log.dir === dataFilter.value)
})

const sysCount = computed(() => currentLogs.value.filter((log) => log.dir === 'system').length)
const errCount = computed(() => currentLogs.value.filter((log) => log.dir === 'error').length)
const txCount = computed(() => currentLogs.value.filter((log) => log.dir === 'tx').length)
const rxCount = computed(() => currentLogs.value.filter((log) => log.dir === 'rx').length)

const getLogColor = (dir) => {
  switch (dir) {
    case 'system': return '#a855f7'
    case 'error': return '#ef4444'
    case 'tx': return '#3b82f6'
    case 'rx': return '#22c55e'
    default: return '#6b7280'
  }
}

const progressSegments = computed(() => {
  const logs = terminalMode.value === '分析' ? filteredAnalysisLogs.value : currentLogs.value
  if (logs.length === 0) return []

  const segments = []
  let currentDir = null
  let currentCount = 0

  for (const log of logs) {
    if (log.dir === currentDir) {
      currentCount += 1
    } else {
      if (currentDir !== null) {
        segments.push({ dir: currentDir, count: currentCount })
      }
      currentDir = log.dir
      currentCount = 1
    }
  }

  if (currentDir !== null) {
    segments.push({ dir: currentDir, count: currentCount })
  }

  return segments.map((segment) => ({
    dir: segment.dir,
    width: (segment.count / logs.length) * 100,
    color: getLogColor(segment.dir)
  }))
})

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

const isHoveredByte = (log, index) => {
  if (hoveredHex.value.logId !== log.id) return false
  const info = getCharGroupFullInfo(log, hoveredHex.value.byteIndex)
  if (!info) return false
  return index >= info.start && index <= info.end
}

const copyTerminalLogs = async () => {
  const text = terminalMode.value === '交互'
    ? renderInteractiveStream(interactiveSourceText.value + pendingInput.value)
    : filteredAnalysisLogs.value.map((log) => {
        const segments = []
        if (showTimestamp.value) segments.push(log.time)
        segments.push(`[${getDirLabel(log.dir)}]`)
        segments.push(formatData(log))
        return segments.join(' ')
      }).join('\n')

  if (!text.trim()) {
    notify.error('当前没有可复制的终端内容')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    notify.success('终端内容已复制')
  } catch {
    notify.error('复制失败')
  }
}

const clearTerminal = () => {
  if (!selectedPort.value) return
  if (terminalMode.value === '分析' && dataFilter.value !== 'all') {
    portsStore.clearPortLogs(selectedPort.value.id, (log) => log.dir === dataFilter.value)
    return
  }
  portsStore.clearPortLogs(selectedPort.value.id)
}

const togglePortTerminalRx = (portId, enabled) => {
  portsStore.setPortTerminalRx(portId, enabled)
}

const pushHistory = (command) => {
  if (!command) return
  if (sendHistory.value[0] !== command) {
    sendHistory.value.unshift(command)
    if (sendHistory.value.length > 50) {
      sendHistory.value.pop()
    }
  }
  historyIndex.value = -1
}

const navigateHistory = (direction) => {
  if (sendHistory.value.length === 0) return

  if (direction === 'up') {
    if (historyIndex.value < sendHistory.value.length - 1) {
      historyIndex.value += 1
      pendingInput.value = sendHistory.value[historyIndex.value]
    }
    return
  }

  if (historyIndex.value > 0) {
    historyIndex.value -= 1
    pendingInput.value = sendHistory.value[historyIndex.value]
  } else if (historyIndex.value === 0) {
    historyIndex.value = -1
    pendingInput.value = ''
  }
}

const sendRawHex = async (hex) => {
  if (!sendTargetPortId.value) return
  await portsStore.sendToPort(sendTargetPortId.value, hex, {
    appendCR: false,
    appendLF: false,
    isHex: true
  })
}

const submitPendingInput = async () => {
  if (!canInteract.value || !sendTargetPortId.value) return

  const command = pendingInput.value
  pushHistory(command)

  await portsStore.sendToPort(sendTargetPortId.value, command, {
    appendCR: false,
    appendLF: true,
    isHex: false
  })

  pendingInput.value = ''
}

const handleTerminalInput = (event) => {
  const value = event.target.value
  if (!value) return
  pendingInput.value += value.replace(/\r/g, '')
  event.target.value = ''
}

const handleTerminalPaste = async (event) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') || ''
  if (!text) return

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  if (lines.length === 1) {
    pendingInput.value += lines[0]
    return
  }

  const queuedLines = [...lines]
  queuedLines[0] = pendingInput.value + queuedLines[0]
  pendingInput.value = queuedLines.pop() || ''

  for (const line of queuedLines) {
    if (!canInteract.value) break
    pushHistory(line)
    await portsStore.sendToPort(sendTargetPortId.value, line, {
      appendCR: false,
      appendLF: true,
      isHex: false
    })
  }
}

const handleTerminalKeyDown = async (event) => {
  if (!canInteract.value || terminalMode.value !== '交互') return

  if (event.key === 'Enter') {
    event.preventDefault()
    await submitPendingInput()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    pendingInput.value = pendingInput.value.slice(0, -1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    navigateHistory('up')
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    navigateHistory('down')
    return
  }

  if (event.key === 'Tab') {
    event.preventDefault()
    pendingInput.value += '\t'
    return
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    pendingInput.value = ''
    await sendRawHex('03')
    notify.success('已发送 Ctrl+C')
    return
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault()
    clearTerminal()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    pendingInput.value = ''
  }
}

const focusTerminal = () => {
  if (!canInteract.value || terminalMode.value !== '交互') return
  inputCaptureEl.value?.focus()
}

const scrollToBottom = async () => {
  if (!terminalEl.value) return
  await nextTick()
  terminalEl.value.scrollTop = terminalEl.value.scrollHeight
}

watch(
  () => [
    terminalMode.value,
    terminalDisplayText.value,
    filteredAnalysisLogs.value.length,
    analysisDisplayMode.value,
    dataFilter.value
  ].join('|'),
  async () => {
    if (autoScroll.value) {
      await scrollToBottom()
    }
  }
)

const handleTerminalScroll = () => {
  if (!terminalEl.value) return
  const { scrollTop, scrollHeight, clientHeight } = terminalEl.value
  autoScroll.value = scrollHeight - scrollTop - clientHeight < 8
}

const emptyStateCopy = computed(() => {
  if (!selectedPort.value) return '请先添加并选择串口喵~'
  if (!selectedPort.value.connected) return '当前终端串口未连接喵~'
  if (terminalMode.value === '分析' && currentLogs.value.length > 0 && filteredAnalysisLogs.value.length === 0) {
    return '当前过滤条件下没有数据喵~'
  }
  if (mutedVisiblePorts.value.length > 0 && currentLogs.value.length === 0) {
    return '当前串口已关闭终端接收打印，解析和图表仍在继续'
  }
  return '等待数据喵~'
})

onMounted(() => {
  if (canInteract.value && terminalMode.value === '交互') {
    inputCaptureEl.value?.focus()
  }
})

onUnmounted(() => {
  inputCaptureEl.value?.blur()
})
</script>

<template>
  <div class="h-full flex flex-col gap-3 p-3">
    <div class="rounded-xl border border-cat-border bg-cat-card px-3 py-2 overflow-x-auto">
      <div class="flex items-center gap-2 min-w-max flex-nowrap">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] text-cat-muted">终端模式</span>
          <div class="flex bg-cat-surface rounded-lg p-0.5">
            <button
              v-for="mode in ['交互', '分析']"
              :key="mode"
              @click="terminalMode = mode"
              :class="[
                'px-2.5 py-0.5 text-[11px] rounded-md transition-colors',
                terminalMode === mode ? 'bg-cat-primary text-white' : 'text-cat-muted hover:text-cat-text'
              ]"
            >
              {{ mode }}
            </button>
          </div>
        </div>

        <div v-if="terminalMode === '分析'" class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] text-cat-muted">显示格式</span>
          <div class="flex bg-cat-surface rounded-lg p-0.5">
            <button
              v-for="mode in ['UTF-8', 'HEX', '混合']"
              :key="mode"
              @click="analysisDisplayMode = mode"
              :class="[
                'px-2.5 py-0.5 text-[11px] rounded-md transition-colors',
                analysisDisplayMode === mode ? 'bg-cat-primary text-white' : 'text-cat-muted hover:text-cat-text'
              ]"
            >
              {{ mode }}
            </button>
          </div>
        </div>

        <div v-if="portsStore.ports.length > 0" class="flex items-center gap-1.5 shrink-0">
          <span class="text-[11px] text-cat-muted">终端范围</span>
          <select
            v-model="selectedPortId"
            class="min-w-[9.5rem] bg-cat-surface border border-cat-border rounded-lg px-2.5 py-1 text-[11px] text-cat-text"
          >
            <option v-for="port in portsStore.ports" :key="port.id" :value="port.id">
              {{ port.label }}
            </option>
          </select>
        </div>

        <label v-if="selectedPort" class="flex items-center gap-1.5 text-[11px] text-cat-muted cursor-pointer shrink-0">
          <input
            type="checkbox"
            :checked="selectedPort.showTerminalRx"
            @change="event => togglePortTerminalRx(selectedPort.id, event.target.checked)"
            class="accent-cat-primary"
          >
          终端输出
        </label>

        <label v-if="terminalMode === '分析'" class="flex items-center gap-1.5 text-[11px] text-cat-muted cursor-pointer shrink-0">
          <input type="checkbox" v-model="showTimestamp" class="accent-cat-primary">
          时间戳
        </label>

        <label class="flex items-center gap-1.5 text-[11px] text-cat-muted cursor-pointer shrink-0">
          <input type="checkbox" v-model="autoScroll" class="accent-cat-primary">
          自动滚动
        </label>

        <label v-if="terminalMode === '分析' && analysisDisplayMode === 'HEX'" class="flex items-center gap-1.5 text-[11px] text-cat-muted cursor-pointer shrink-0">
          <input type="checkbox" v-model="enableHexHoverTranslation" class="accent-cat-primary">
          HEX翻译
        </label>

        <button @click="copyTerminalLogs" class="cat-btn-secondary px-2.5 py-1 rounded-lg text-[11px] shrink-0">
          复制
        </button>

        <div class="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            v-if="terminalMode === '交互'"
            @click="focusTerminal"
            :disabled="!canInteract"
            class="cat-btn-secondary px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50"
          >
            聚焦输入
          </button>
          <button @click="clearTerminal" class="cat-btn-secondary px-2.5 py-1 rounded-lg text-[11px]">
            🗑️ 清空
          </button>
        </div>
      </div>
    </div>

    <div v-if="mutedVisiblePorts.length > 0" class="rounded-2xl border border-cat-border bg-cat-card px-3 py-2.5">
      <div class="flex items-start gap-3">
        <div class="text-sm text-cat-text">
          {{ selectedPortLabel }} 已关闭终端接收打印，避免终端刷屏。解析器、图表和统计仍然继续。
        </div>
        <div class="ml-auto">
          <label
            v-for="port in mutedVisiblePorts"
            :key="port.id"
            class="flex items-center gap-2 rounded-full bg-cat-surface px-2.5 py-1 text-xs text-cat-muted cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="port.showTerminalRx"
              @change="event => togglePortTerminalRx(port.id, event.target.checked)"
              class="accent-cat-primary"
            >
            {{ port.label }} 打印
          </label>
        </div>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-0 rounded-2xl border border-cat-border bg-cat-surface p-3"
      @click="focusTerminal"
    >
      <div
        ref="terminalEl"
        class="h-full overflow-auto rounded-xl bg-cat-dark/45 px-4 py-3 font-mono text-sm text-cat-terminal-text terminal-screen"
        @scroll="handleTerminalScroll"
      >
        <template v-if="terminalMode === '交互'">
          <pre v-if="terminalDisplayText" class="whitespace-pre-wrap break-words">{{ terminalDisplayText }}</pre>
        </template>

        <template v-else>
          <div v-for="log in filteredAnalysisLogs" :key="log.id" class="flex items-start gap-3 py-0.5 hover:bg-cat-border/30 px-2 -mx-2 rounded">
            <span v-if="showTimestamp" class="text-cat-muted shrink-0 text-xs">{{ log.time }}</span>
            <span :class="['shrink-0 text-xs w-8 text-center py-0.5 rounded', getLogClass(log.dir)]">
              {{ getDirLabel(log.dir) }}
            </span>

            <span class="break-all font-mono text-cat-terminal-text relative">
              <template v-if="analysisDisplayMode === 'HEX'">
                <template v-for="(byte, index) in getHexBytes(log)" :key="index">
                  <span
                    class="relative px-[1px] rounded cursor-default"
                    :class="isHoveredByte(log, index) ? 'bg-cat-primary/20 text-cat-primary' : ''"
                    @mouseenter="hoveredHex = { logId: log.id, byteIndex: index }"
                    @mouseleave="hoveredHex = { logId: null, byteIndex: -1 }"
                  >
                    {{ byte.toString(16).padStart(2, '0').toUpperCase() }}
                    <div
                      v-if="enableHexHoverTranslation && hoveredHex.logId === log.id && hoveredHex.byteIndex === index"
                      class="absolute left-0 top-full mt-2 z-50 min-w-[12rem] rounded-lg border border-cat-border bg-cat-card p-3 shadow-xl"
                    >
                      <template v-if="getCharGroupFullInfo(log, index)">
                        <div class="text-xs text-cat-muted">HEX</div>
                        <div class="font-mono text-sm text-cat-terminal-accent mb-2">{{ getCharGroupFullInfo(log, index)?.hexBytes }}</div>
                        <div class="text-xs text-cat-muted">UTF-8</div>
                        <div class="text-sm text-cat-terminal-text mb-2">{{ getCharGroupFullInfo(log, index)?.utf8Char }}</div>
                        <div class="text-xs text-cat-muted">Unicode</div>
                        <div class="text-sm text-cat-terminal-text">{{ getCharGroupFullInfo(log, index)?.unicode }}</div>
                      </template>
                    </div>
                  </span>
                  <span v-if="index !== getHexBytes(log).length - 1"> </span>
                </template>
              </template>

              <template v-else-if="analysisDisplayMode === '混合'">
                <span class="whitespace-pre-wrap">{{ formatData(log) }}</span>
              </template>

              <template v-else>
                <span class="whitespace-pre-wrap">{{ formatData(log) }}</span>
              </template>
            </span>
          </div>
        </template>

        <div
          v-if="(terminalMode === '交互' && !terminalDisplayText) || (terminalMode === '分析' && filteredAnalysisLogs.length === 0)"
          class="h-full flex items-center justify-center text-cat-muted"
        >
          <div class="text-center">
            <div class="text-2xl mb-2">🐱</div>
            <div>{{ emptyStateCopy }}</div>
          </div>
        </div>
      </div>

      <textarea
        v-if="terminalMode === '交互'"
        ref="inputCaptureEl"
        class="terminal-capture"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        @focus="isTerminalFocused = true"
        @blur="isTerminalFocused = false"
        @keydown="handleTerminalKeyDown"
        @input="handleTerminalInput"
        @paste="handleTerminalPaste"
      />
    </div>

    <div v-if="terminalMode === '分析'" class="rounded-2xl border border-cat-border bg-cat-card px-3 py-2">
      <div class="flex items-center gap-2 text-[10px] font-mono shrink-0 flex-wrap">
        <div
          @click="dataFilter = 'all'"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          :class="dataFilter === 'all' ? 'bg-cat-border' : 'hover:bg-cat-border/50'"
        >
          <span class="text-cat-muted">全部</span>
        </div>
        <div
          @click="dataFilter = dataFilter === 'system' ? 'all' : 'system'"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          :class="dataFilter === 'system' ? 'bg-purple-500/30 ring-1 ring-purple-500' : 'hover:bg-cat-border/50'"
        >
          <span class="w-2 h-2 rounded-sm bg-purple-500"></span>
          <span class="text-purple-400">{{ sysCount }}</span>
        </div>
        <div
          @click="dataFilter = dataFilter === 'error' ? 'all' : 'error'"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          :class="dataFilter === 'error' ? 'bg-red-500/30 ring-1 ring-red-500' : 'hover:bg-cat-border/50'"
        >
          <span class="w-2 h-2 rounded-sm bg-red-500"></span>
          <span class="text-red-400">{{ errCount }}</span>
        </div>
        <div
          @click="dataFilter = dataFilter === 'tx' ? 'all' : 'tx'"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          :class="dataFilter === 'tx' ? 'bg-blue-500/30 ring-1 ring-blue-500' : 'hover:bg-cat-border/50'"
        >
          <span class="w-2 h-2 rounded-sm bg-blue-500"></span>
          <span class="text-blue-400">{{ txCount }}</span>
        </div>
        <div
          @click="dataFilter = dataFilter === 'rx' ? 'all' : 'rx'"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          :class="dataFilter === 'rx' ? 'bg-green-500/30 ring-1 ring-green-500' : 'hover:bg-cat-border/50'"
        >
          <span class="w-2 h-2 rounded-sm bg-green-500"></span>
          <span class="text-green-400">{{ rxCount }}</span>
        </div>

        <div class="ml-auto flex-1 min-w-[12rem] max-w-[20rem] h-3 bg-cat-dark rounded-full overflow-hidden flex">
          <template v-if="progressSegments.length > 0">
            <div
              v-for="(segment, index) in progressSegments"
              :key="index"
              class="h-full"
              :style="{ width: segment.width + '%', backgroundColor: segment.color }"
            />
          </template>
          <div v-else class="w-full h-full bg-cat-border/30" />
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-cat-border bg-cat-card px-3 py-2.5">
      <div v-if="terminalMode === '交互'" class="flex items-center gap-3 text-xs text-cat-muted flex-wrap">
        <span>当前串口: {{ selectedPortLabel }}</span>
        <span>输入方式: 直接在终端里键入</span>
        <span>Enter 发送</span>
        <span>↑↓ 历史</span>
        <span>Ctrl+C 中断</span>
        <span>Ctrl+L 清屏</span>
        <span v-if="isTerminalFocused" class="text-cat-primary">输入已聚焦</span>
        <span v-else-if="canInteract">点击终端开始输入</span>
      </div>

      <div v-else class="flex items-center gap-3 text-xs text-cat-muted flex-wrap">
        <span>当前串口: {{ selectedPortLabel }}</span>
        <span>彩色日志分析</span>
        <span>支持 UTF-8 / HEX / 混合</span>
        <span>HEX 模式可悬停翻译</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-screen {
  position: relative;
}

.terminal-capture {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}
</style>
