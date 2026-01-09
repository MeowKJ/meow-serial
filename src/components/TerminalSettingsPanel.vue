<script setup>
import { ref, computed, watch } from 'vue'
import { useSerialStore } from '../stores/serial'

const emit = defineEmits(['close', 'export-log'])
const store = useSerialStore()

// 折叠状态
const collapsed = ref({
  export: true,
  converter: false,
  checksum: true,
  timestamp: true,
  filter: true,
  autoSend: true,
  quickCmd: true,
  ascii: true,
  stats: true,
  appearance: true
})

const toggleCollapse = (section) => {
  collapsed.value[section] = !collapsed.value[section]
}

// ========== 进制转换计算器 ==========
const converterInput = ref('')
const converterBase = ref('dec') // 'bin' | 'dec' | 'hex'
const converterResults = computed(() => {
  const input = converterInput.value.trim()
  if (!input) return { bin: '', dec: '', hex: '', ascii: '' }

  let num = 0
  try {
    if (converterBase.value === 'bin') {
      num = parseInt(input.replace(/\s/g, ''), 2)
    } else if (converterBase.value === 'hex') {
      num = parseInt(input.replace(/\s/g, ''), 16)
    } else {
      num = parseInt(input, 10)
    }

    if (isNaN(num) || num < 0) return { bin: 'Invalid', dec: 'Invalid', hex: 'Invalid', ascii: '' }

    const ascii = num >= 32 && num <= 126 ? String.fromCharCode(num) : (num < 32 ? `[${['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','TAB','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US'][num]}]` : '')

    return {
      bin: num.toString(2),
      dec: num.toString(10),
      hex: num.toString(16).toUpperCase(),
      ascii
    }
  } catch {
    return { bin: 'Invalid', dec: 'Invalid', hex: 'Invalid', ascii: '' }
  }
})

// ========== 校验和计算器 ==========
const checksumInput = ref('')
const checksumType = ref('crc16')
const checksumResult = computed(() => {
  const input = checksumInput.value.trim()
  if (!input) return ''

  // 解析输入（支持 HEX 格式如 "01 02 03" 或普通文本）
  let bytes = []
  if (/^[0-9A-Fa-f\s]+$/.test(input) && input.includes(' ')) {
    bytes = input.split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n))
  } else {
    bytes = Array.from(new TextEncoder().encode(input))
  }

  if (bytes.length === 0) return ''

  switch (checksumType.value) {
    case 'sum':
      return (bytes.reduce((a, b) => a + b, 0) & 0xFF).toString(16).toUpperCase().padStart(2, '0')
    case 'xor':
      return bytes.reduce((a, b) => a ^ b, 0).toString(16).toUpperCase().padStart(2, '0')
    case 'crc8':
      return calcCRC8(bytes).toString(16).toUpperCase().padStart(2, '0')
    case 'crc16':
      return calcCRC16(bytes).toString(16).toUpperCase().padStart(4, '0')
    case 'lrc':
      return ((~bytes.reduce((a, b) => a + b, 0) + 1) & 0xFF).toString(16).toUpperCase().padStart(2, '0')
    default:
      return ''
  }
})

function calcCRC8(bytes) {
  let crc = 0
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? (crc << 1) ^ 0x07 : crc << 1
    }
  }
  return crc & 0xFF
}

function calcCRC16(bytes) {
  let crc = 0xFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xA001 : crc >> 1
    }
  }
  return crc & 0xFFFF
}

// ========== 时间戳转换器 ==========
const timestampInput = ref('')
const timestampMode = ref('toDate') // 'toDate' | 'toUnix'
const timestampResult = computed(() => {
  const input = timestampInput.value.trim()
  if (!input) return ''

  try {
    if (timestampMode.value === 'toDate') {
      const ts = parseInt(input)
      if (isNaN(ts)) return 'Invalid'
      const date = new Date(ts * (input.length <= 10 ? 1000 : 1))
      return date.toLocaleString('zh-CN')
    } else {
      const date = new Date(input)
      if (isNaN(date.getTime())) return 'Invalid'
      return Math.floor(date.getTime() / 1000).toString()
    }
  } catch {
    return 'Invalid'
  }
})

const insertNow = () => {
  if (timestampMode.value === 'toDate') {
    timestampInput.value = Math.floor(Date.now() / 1000).toString()
  } else {
    timestampInput.value = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
}

// ========== 数据过滤器 ==========
const filterEnabled = ref(false)
const filterKeyword = ref('')
const filterType = ref('include') // 'include' | 'exclude' | 'regex'

// ========== 自动发送 ==========
const autoSendEnabled = ref(false)
const autoSendData = ref('')
const autoSendInterval = ref(1000)
const autoSendHex = ref(false)
let autoSendTimer = null

watch(autoSendEnabled, (val) => {
  if (val) {
    startAutoSend()
  } else {
    stopAutoSend()
  }
})

function startAutoSend() {
  stopAutoSend()
  if (!autoSendData.value || !store.connected) return

  autoSendTimer = setInterval(() => {
    if (store.connected) {
      store.send(autoSendData.value, { isHex: autoSendHex.value, appendLF: !autoSendHex.value })
    }
  }, autoSendInterval.value)
}

function stopAutoSend() {
  if (autoSendTimer) {
    clearInterval(autoSendTimer)
    autoSendTimer = null
  }
}

// ========== 快捷指令 ==========
const quickCommands = ref([
  { name: 'AT测试', data: 'AT', hex: false },
  { name: '重启', data: 'AT+RST', hex: false },
  { name: '查询版本', data: 'AT+GMR', hex: false }
])
const newCmdName = ref('')
const newCmdData = ref('')
const newCmdHex = ref(false)
const showAddCmd = ref(false)

const addQuickCommand = () => {
  if (newCmdName.value && newCmdData.value) {
    quickCommands.value.push({
      name: newCmdName.value,
      data: newCmdData.value,
      hex: newCmdHex.value
    })
    newCmdName.value = ''
    newCmdData.value = ''
    newCmdHex.value = false
    showAddCmd.value = false
  }
}

const sendQuickCommand = (cmd) => {
  if (store.connected) {
    store.send(cmd.data, { isHex: cmd.hex, appendLF: !cmd.hex })
  }
}

const removeQuickCommand = (index) => {
  quickCommands.value.splice(index, 1)
}

// ========== ASCII码表 ==========
const asciiPage = ref(0) // 0: 0-63, 1: 64-127
const asciiTable = computed(() => {
  const start = asciiPage.value * 64
  const chars = []
  for (let i = start; i < start + 64; i++) {
    let char = ''
    if (i < 32) {
      char = ['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','TAB','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US'][i]
    } else if (i === 32) {
      char = 'SP'
    } else if (i === 127) {
      char = 'DEL'
    } else {
      char = String.fromCharCode(i)
    }
    chars.push({ code: i, char, hex: i.toString(16).toUpperCase().padStart(2, '0') })
  }
  return chars
})

// ========== 字节统计 ==========
const byteStats = computed(() => {
  const logs = store.terminalLogs
  let rxBytes = 0, txBytes = 0, rxCount = 0, txCount = 0

  logs.forEach(log => {
    const len = log.rawBytes?.length || new TextEncoder().encode(log.data).length
    if (log.dir === 'rx') {
      rxBytes += len
      rxCount++
    } else if (log.dir === 'tx') {
      txBytes += len
      txCount++
    }
  })

  return { rxBytes, txBytes, rxCount, txCount, total: rxBytes + txBytes }
})

// ========== 终端外观 ==========
const terminalFontSize = ref(14)
const terminalLineHeight = ref(1.5)

// ========== 导出日志 ==========
const exportFormat = ref('txt')

const exportLog = () => {
  emit('export-log', { format: exportFormat.value })
}
</script>

<template>
  <aside class="w-80 bg-cat-card border-l border-cat-border flex flex-col shrink-0 overflow-hidden">
    <!-- 标题栏 -->
    <div class="h-12 px-4 flex items-center justify-between border-b border-cat-border shrink-0">
      <span class="font-medium flex items-center gap-2">
        <span>🛠️</span> 终端设置
      </span>
      <button @click="$emit('close')" class="text-cat-muted hover:text-cat-text p-1">✕</button>
    </div>

    <!-- 可滚动内容 -->
    <div class="flex-1 overflow-y-auto">

      <!-- 进制转换计算器 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('converter')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="text-cat-primary">🔢</span>
            <span class="font-medium text-sm">进制转换</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.converter ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.converter" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1">
            <button v-for="b in [{id:'bin',name:'BIN'},{id:'dec',name:'DEC'},{id:'hex',name:'HEX'}]" :key="b.id"
              @click="converterBase = b.id"
              :class="['flex-1 py-1 text-xs rounded', converterBase === b.id ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              {{ b.name }}
            </button>
          </div>
          <input v-model="converterInput"
            :placeholder="converterBase === 'bin' ? '输入二进制...' : converterBase === 'hex' ? '输入十六进制...' : '输入十进制...'"
            class="w-full bg-cat-surface border border-cat-border rounded px-2 py-1.5 text-sm font-mono">
          <div class="bg-cat-surface rounded p-2 space-y-1 text-xs font-mono">
            <div class="flex justify-between"><span class="text-cat-muted">BIN:</span><span class="text-cat-text">{{ converterResults.bin }}</span></div>
            <div class="flex justify-between"><span class="text-cat-muted">DEC:</span><span class="text-cat-text">{{ converterResults.dec }}</span></div>
            <div class="flex justify-between"><span class="text-cat-muted">HEX:</span><span class="text-cat-text">{{ converterResults.hex }}</span></div>
            <div v-if="converterResults.ascii" class="flex justify-between"><span class="text-cat-muted">ASCII:</span><span class="text-cat-primary font-bold">{{ converterResults.ascii }}</span></div>
          </div>
        </div>
      </div>

      <!-- 校验和计算器 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('checksum')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="text-cat-secondary">🔐</span>
            <span class="font-medium text-sm">校验和计算</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.checksum ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.checksum" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1 flex-wrap">
            <button v-for="t in [{id:'sum',name:'SUM'},{id:'xor',name:'XOR'},{id:'crc8',name:'CRC8'},{id:'crc16',name:'CRC16'},{id:'lrc',name:'LRC'}]" :key="t.id"
              @click="checksumType = t.id"
              :class="['px-2 py-1 text-xs rounded', checksumType === t.id ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              {{ t.name }}
            </button>
          </div>
          <input v-model="checksumInput" placeholder="输入HEX(如: 01 02 03)或文本..."
            class="w-full bg-cat-surface border border-cat-border rounded px-2 py-1.5 text-sm font-mono">
          <div class="bg-cat-surface rounded p-2 text-center">
            <span class="text-cat-muted text-xs">结果: </span>
            <span class="text-cat-primary font-bold font-mono text-lg">{{ checksumResult || '--' }}</span>
          </div>
        </div>
      </div>

      <!-- 时间戳转换器 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('timestamp')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="text-cat-accent">⏰</span>
            <span class="font-medium text-sm">时间戳转换</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.timestamp ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.timestamp" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1">
            <button @click="timestampMode = 'toDate'"
              :class="['flex-1 py-1 text-xs rounded', timestampMode === 'toDate' ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              时间戳→日期
            </button>
            <button @click="timestampMode = 'toUnix'"
              :class="['flex-1 py-1 text-xs rounded', timestampMode === 'toUnix' ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              日期→时间戳
            </button>
          </div>
          <div class="flex gap-1">
            <input v-model="timestampInput"
              :placeholder="timestampMode === 'toDate' ? 'Unix时间戳...' : '2024-01-01 12:00:00'"
              class="flex-1 bg-cat-surface border border-cat-border rounded px-2 py-1.5 text-sm font-mono">
            <button @click="insertNow" class="px-2 bg-cat-surface border border-cat-border rounded text-xs text-cat-muted hover:text-cat-text">Now</button>
          </div>
          <div class="bg-cat-surface rounded p-2 text-center">
            <span class="text-cat-primary font-mono text-sm">{{ timestampResult || '--' }}</span>
          </div>
        </div>
      </div>

      <!-- 自动发送 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('autoSend')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>🔄</span>
            <span class="font-medium text-sm">自动发送</span>
            <span v-if="autoSendEnabled" class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.autoSend ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.autoSend" class="px-3 pb-3 space-y-2">
          <input v-model="autoSendData" placeholder="发送内容..."
            class="w-full bg-cat-surface border border-cat-border rounded px-2 py-1.5 text-sm font-mono">
          <div class="flex items-center gap-2">
            <span class="text-xs text-cat-muted">间隔:</span>
            <input v-model.number="autoSendInterval" type="number" min="100" step="100"
              class="w-20 bg-cat-surface border border-cat-border rounded px-2 py-1 text-sm text-center">
            <span class="text-xs text-cat-muted">ms</span>
            <label class="flex items-center gap-1 text-xs text-cat-muted ml-auto">
              <input type="checkbox" v-model="autoSendHex" class="accent-cat-primary"> HEX
            </label>
          </div>
          <button @click="autoSendEnabled = !autoSendEnabled" :disabled="!store.connected"
            :class="['w-full py-2 rounded text-sm font-medium', autoSendEnabled ? 'bg-red-500/20 text-red-400' : 'cat-btn', !store.connected ? 'opacity-50' : '']">
            {{ autoSendEnabled ? '⏹️ 停止' : '▶️ 开始' }}
          </button>
        </div>
      </div>

      <!-- 快捷指令 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('quickCmd')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>⚡</span>
            <span class="font-medium text-sm">快捷指令</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.quickCmd ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.quickCmd" class="px-3 pb-3 space-y-2">
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <div v-for="(cmd, i) in quickCommands" :key="i"
              class="flex items-center gap-2 bg-cat-surface rounded px-2 py-1.5 group">
              <button @click="sendQuickCommand(cmd)" :disabled="!store.connected"
                class="flex-1 text-left text-sm truncate hover:text-cat-primary disabled:opacity-50">
                {{ cmd.name }}
              </button>
              <span class="text-xs text-cat-muted font-mono truncate max-w-20">{{ cmd.data }}</span>
              <button @click="removeQuickCommand(i)" class="text-cat-muted hover:text-red-400 opacity-0 group-hover:opacity-100">×</button>
            </div>
          </div>
          <div v-if="showAddCmd" class="space-y-1 bg-cat-surface rounded p-2">
            <input v-model="newCmdName" placeholder="指令名称" class="w-full bg-cat-card border border-cat-border rounded px-2 py-1 text-xs">
            <input v-model="newCmdData" placeholder="指令内容" class="w-full bg-cat-card border border-cat-border rounded px-2 py-1 text-xs font-mono">
            <div class="flex items-center gap-2">
              <label class="flex items-center gap-1 text-xs text-cat-muted">
                <input type="checkbox" v-model="newCmdHex" class="accent-cat-primary"> HEX
              </label>
              <div class="flex-1"></div>
              <button @click="showAddCmd = false" class="text-xs text-cat-muted">取消</button>
              <button @click="addQuickCommand" class="text-xs text-cat-primary">保存</button>
            </div>
          </div>
          <button v-else @click="showAddCmd = true" class="w-full py-1.5 border border-dashed border-cat-border rounded text-xs text-cat-muted hover:text-cat-primary hover:border-cat-primary">
            ➕ 添加指令
          </button>
        </div>
      </div>

      <!-- ASCII码表 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('ascii')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>📋</span>
            <span class="font-medium text-sm">ASCII码表</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.ascii ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.ascii" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1">
            <button @click="asciiPage = 0" :class="['flex-1 py-1 text-xs rounded', asciiPage === 0 ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">0-63</button>
            <button @click="asciiPage = 1" :class="['flex-1 py-1 text-xs rounded', asciiPage === 1 ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">64-127</button>
          </div>
          <div class="grid grid-cols-8 gap-0.5 text-xs font-mono">
            <div v-for="item in asciiTable" :key="item.code"
              class="bg-cat-surface rounded p-1 text-center hover:bg-cat-primary/20 cursor-default"
              :title="`DEC: ${item.code}, HEX: ${item.hex}`">
              <div class="text-cat-muted text-[10px]">{{ item.hex }}</div>
              <div class="text-cat-text font-bold">{{ item.char }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 字节统计 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('stats')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>📊</span>
            <span class="font-medium text-sm">数据统计</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.stats ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.stats" class="px-3 pb-3">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="bg-cat-surface rounded p-2 text-center">
              <div class="text-green-400 font-bold">{{ byteStats.rxBytes }}</div>
              <div class="text-xs text-cat-muted">接收字节</div>
            </div>
            <div class="bg-cat-surface rounded p-2 text-center">
              <div class="text-blue-400 font-bold">{{ byteStats.txBytes }}</div>
              <div class="text-xs text-cat-muted">发送字节</div>
            </div>
            <div class="bg-cat-surface rounded p-2 text-center">
              <div class="text-green-400 font-bold">{{ byteStats.rxCount }}</div>
              <div class="text-xs text-cat-muted">接收条数</div>
            </div>
            <div class="bg-cat-surface rounded p-2 text-center">
              <div class="text-blue-400 font-bold">{{ byteStats.txCount }}</div>
              <div class="text-xs text-cat-muted">发送条数</div>
            </div>
          </div>
          <div class="mt-2 bg-cat-surface rounded p-2 text-center">
            <div class="text-cat-primary font-bold text-lg">{{ byteStats.total }}</div>
            <div class="text-xs text-cat-muted">总字节数</div>
          </div>
        </div>
      </div>

      <!-- 数据过滤 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('filter')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>🔍</span>
            <span class="font-medium text-sm">数据过滤</span>
            <span v-if="filterEnabled" class="w-2 h-2 rounded-full bg-cat-primary"></span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.filter ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.filter" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1">
            <button v-for="t in [{id:'include',name:'包含'},{id:'exclude',name:'排除'},{id:'regex',name:'正则'}]" :key="t.id"
              @click="filterType = t.id"
              :class="['flex-1 py-1 text-xs rounded', filterType === t.id ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              {{ t.name }}
            </button>
          </div>
          <input v-model="filterKeyword" placeholder="过滤关键词..."
            class="w-full bg-cat-surface border border-cat-border rounded px-2 py-1.5 text-sm">
          <label class="flex items-center gap-2 text-sm text-cat-muted">
            <input type="checkbox" v-model="filterEnabled" class="accent-cat-primary"> 启用过滤
          </label>
        </div>
      </div>

      <!-- 导出日志 -->
      <div class="border-b border-cat-border">
        <button @click="toggleCollapse('export')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>📥</span>
            <span class="font-medium text-sm">导出日志</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.export ? '' : 'rotate-180'">▼</span>
        </button>
        <div v-show="!collapsed.export" class="px-3 pb-3 space-y-2">
          <div class="flex gap-1">
            <button v-for="f in [{id:'txt',name:'TXT'},{id:'csv',name:'CSV'},{id:'json',name:'JSON'}]" :key="f.id"
              @click="exportFormat = f.id"
              :class="['flex-1 py-1 text-xs rounded', exportFormat === f.id ? 'bg-cat-primary text-white' : 'bg-cat-surface text-cat-muted']">
              {{ f.name }}
            </button>
          </div>
          <button @click="exportLog" class="w-full cat-btn py-2 rounded text-sm">
            📥 导出日志
          </button>
        </div>
      </div>

    </div>
  </aside>
</template>
