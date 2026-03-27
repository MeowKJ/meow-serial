<script setup>
import { ref, onMounted } from 'vue'
import { useSerialStore } from '../stores/serial'

const store = useSerialStore()

// 折叠状态
const collapsed = ref({
  connection: false,
  radar: false,
  presets: true,
  channels: false,
  protocol: true
})

// 切换折叠
const toggleCollapse = (section) => {
  collapsed.value[section] = !collapsed.value[section]
}

const presets = [
  { name: 'Arduino Uno', baud: 9600, dataBits: 8, parity: 'none', desc: '默认配置' },
  { name: 'Arduino Mega', baud: 115200, dataBits: 8, parity: 'none', desc: '高速' },
  { name: 'ESP32', baud: 115200, dataBits: 8, parity: 'none', desc: 'WiFi模块' },
  { name: 'ESP8266', baud: 74880, dataBits: 8, parity: 'none', desc: '启动日志' },
  { name: 'STM32', baud: 115200, dataBits: 8, parity: 'none', desc: 'ST-Link' },
  { name: 'HC-05蓝牙', baud: 9600, dataBits: 8, parity: 'none', desc: 'AT模式' },
  { name: 'HC-05数据', baud: 38400, dataBits: 8, parity: 'none', desc: '数据模式' },
  { name: 'GPS模块', baud: 9600, dataBits: 8, parity: 'none', desc: 'NMEA' }
]

const baudRates = [300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600]

// 协议类型
const protocolTypes = [
  { value: 'csv', name: 'CSV (逗号分隔)', example: '25.5,60.2,101.3\\n' },
  { value: 'tab', name: 'TSV (制表符分隔)', example: '25.5\\t60.2\\t101.3\\n' },
  { value: 'space', name: '空格分隔', example: '25.5 60.2 101.3\\n' },
  { value: 'json', name: 'JSON对象', example: '{"ch1":25.5,"ch2":60.2}\\n' },
  { value: 'firewater', name: 'FireWater', example: '!1:25.5,2:60.2;\\n' },
  { value: 'custom', name: '自定义', example: '自定义解析器' }
]

// 当前协议
const currentProtocol = ref('csv')

// 应用预设配置
const applyPreset = (preset) => {
  store.baudRate = preset.baud
  store.dataBits = preset.dataBits
  store.parity = preset.parity
}

// 刷新串口列表
const onRefreshPorts = async () => {
  await store.refreshPorts()
}

// 请求新串口
const onRequestPort = async () => {
  await store.requestPort()
}

// 选择串口
const onSelectPort = (portInfo) => {
  store.selectPort(portInfo)
}

// 切换连接
const onToggleConnect = async () => {
  await store.toggleConnect()
}

const radarCfgFile = ref(null)
const radarCfgFileName = ref('')
const radarCfgDelayMs = ref(store.protocol.radarCfgDelayMs || 80)

const applyRadarDataPreset = () => {
  store.baudRate = 921600
  store.setProtocol({
    type: 'mmwave',
    waitForLF: false,
    filterEmptyLines: false,
    radarCfgDelayMs: radarCfgDelayMs.value
  })
}

const onRadarCfgSelected = (event) => {
  const [file] = event.target.files || []
  radarCfgFile.value = file || null
  radarCfgFileName.value = file?.name || ''
}

const sendRadarCfg = async () => {
  if (!radarCfgFile.value) return

  store.setProtocol({
    radarCfgDelayMs: radarCfgDelayMs.value
  })

  const text = await radarCfgFile.value.text()
  await store.sendRadarConfigText(text, {
    delayMs: radarCfgDelayMs.value
  })
}

const onRequestRadarCliPort = async () => {
  await store.requestRadarCliPort()
}

const onToggleRadarCli = async () => {
  if (typeof store.toggleRadarCli === 'function') {
    await store.toggleRadarCli()
    return
  }

  if (store.radarCliConnected && typeof store.disconnectRadarCli === 'function') {
    await store.disconnectRadarCli()
    return
  }

  if (!store.radarCliConnected && typeof store.connectRadarCli === 'function') {
    await store.connectRadarCli()
    return
  }

  store.addLog('error', '当前页面还在使用旧版前端脚本，请刷新页面或重启 pnpm dev')
}

const onSendRadarCliCommand = async (command) => {
  await store.sendRadarCli(command, {
    appendCR: false,
    appendLF: true,
    isHex: false
  })
}

const radarWidgetSpecs = [
  {
    key: 'breathWave',
    label: '主bin解缠绕相位',
    widget: {
      type: 'waveform',
      title: '主bin解缠绕相位',
      x: 20,
      y: 20,
      w: 560,
      h: 220,
      channels: [0],
      historyLength: 240,
      unit: 'rad',
      yAxisLabel: '主bin解缠绕相位'
    }
  },
  {
    key: 'neighborPhase',
    label: '邻域解缠绕相位',
    widget: {
      type: 'waveform',
      title: '邻域解缠绕相位',
      x: 20,
      y: 260,
      w: 560,
      h: 220,
      channels: [8, 9, 10, 11, 12],
      historyLength: 240,
      unit: 'rad',
      yAxisLabel: '邻域解缠绕相位'
    }
  },
  {
    key: 'neighborEnergy',
    label: '能量对比',
    widget: {
      type: 'waveform',
      title: '能量对比',
      x: 600,
      y: 20,
      w: 420,
      h: 220,
      channels: [13, 14, 15, 16, 17],
      historyLength: 240,
      unit: '',
      yAxisLabel: '当前bin与邻域能量'
    }
  },
  {
    key: 'bpm',
    label: '呼吸 BPM',
    widget: {
      type: 'value',
      title: '呼吸 BPM',
      x: 600,
      y: 260,
      w: 200,
      h: 120,
      channel: 5,
      unit: 'bpm',
      precision: 2
    }
  },
  {
    key: 'confidence',
    label: '置信度',
    widget: {
      type: 'value',
      title: '置信度',
      x: 820,
      y: 260,
      w: 200,
      h: 120,
      channel: 6,
      unit: '',
      precision: 2
    }
  },
  {
    key: 'peakEnergy',
    label: '峰值能量',
    widget: {
      type: 'value',
      title: '峰值能量',
      x: 600,
      y: 400,
      w: 200,
      h: 120,
      channel: 3,
      unit: '',
      precision: 3
    }
  },
  {
    key: 'range',
    label: '目标距离',
    widget: {
      type: 'value',
      title: '目标距离',
      x: 820,
      y: 400,
      w: 200,
      h: 120,
      channel: 7,
      unit: 'm',
      precision: 2
    }
  },
  {
    key: 'temperature',
    label: '温度',
    widget: {
      type: 'value',
      title: '温度',
      x: 1040,
      y: 260,
      w: 180,
      h: 120,
      channel: 18,
      unit: '°C',
      precision: 1
    }
  },
  {
    key: 'temperatureTrend',
    label: '温度曲线',
    widget: {
      type: 'waveform',
      title: '温度曲线',
      x: 1040,
      y: 20,
      w: 360,
      h: 220,
      channels: [18],
      historyLength: 240,
      fullHistory: true,
      unit: '°C',
      yAxisLabel: '温度'
    }
  }
]

const findRadarWidgetIdsByTitle = (title) => {
  return store.widgets.filter(widget => widget.title === title).map(widget => widget.id)
}

const hasRadarWidget = (title) => {
  return findRadarWidgetIdsByTitle(title).length > 0
}

const toggleRadarWidget = (spec) => {
  const existingIds = findRadarWidgetIdsByTitle(spec.widget.title)
  if (existingIds.length > 0) {
    existingIds.forEach(id => store.removeWidget(id))
    return
  }

  store.addWidget({ ...spec.widget })
}

// 添加通道
const onAddChannel = () => {
  if (store.channels.length < 19) {
    store.addChannel()
  }
}

// 删除通道
const onRemoveChannel = (id) => {
  if (store.channels.length > 1) {
    store.removeChannel(id)
  }
}

// 初始化
onMounted(() => {
  store.refreshPorts()
})
</script>

<template>
  <aside class="w-72 bg-cat-card border-r border-cat-border flex flex-col shrink-0 overflow-hidden">
    
    <!-- 浏览器支持检测 -->
    <div v-if="!store.isSupported" class="p-3 bg-yellow-500/20 border-b border-yellow-500/30">
      <div class="flex items-center gap-2 text-yellow-400 text-sm">
        <span>⚠️</span>
        <span>浏览器不支持 Web Serial API</span>
      </div>
      <div class="text-xs text-yellow-400/70 mt-1">请使用 Chrome 89+ 或 Edge 89+</div>
    </div>
    
    <!-- 可滚动区域 -->
    <div class="flex-1 overflow-y-auto">
      
      <!-- ===== 连接设置 ===== -->
      <div class="border-b border-cat-border">
        <button 
          @click="toggleCollapse('connection')" 
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-primary">🔌</span>
            <span class="font-medium text-sm">串口连接</span>
            <span v-if="store.connected" class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.connection ? '' : 'rotate-180'">▼</span>
        </button>
        
        <div v-show="!collapsed.connection" class="px-3 pb-3 space-y-3">
          <!-- 端口选择 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-cat-muted">端口</label>
              <button @click="onRefreshPorts" class="text-cat-muted hover:text-cat-text text-xs" title="刷新">🔄</button>
            </div>
            <div class="relative">
              <select 
                :value="store.selectedPortName"
                @change="e => onSelectPort(store.ports.find(p => p.name === e.target.value))"
                :disabled="store.connected"
                class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled>选择串口...</option>
                <option v-for="p in store.ports" :key="p.name" :value="p.name">{{ p.name }}</option>
              </select>
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-cat-muted pointer-events-none text-xs">▾</span>
            </div>
            <button 
              @click="onRequestPort"
              :disabled="store.connected"
              class="w-full mt-2 py-1.5 text-xs text-cat-primary hover:text-cat-text border border-dashed border-cat-border hover:border-cat-primary rounded-lg disabled:opacity-50 transition-colors"
            >
              ➕ 添加新串口设备
            </button>
          </div>
          
          <!-- 波特率 -->
          <div>
            <label class="text-xs text-cat-muted block mb-1">波特率</label>
            <select 
              v-model.number="store.baudRate" 
              :disabled="store.connected"
              class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            >
              <option v-for="b in baudRates" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          
          <!-- 数据位/停止位/校验 -->
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-xs text-cat-muted block mb-1">数据位</label>
              <select 
                v-model.number="store.dataBits" 
                :disabled="store.connected"
                class="w-full bg-cat-surface border border-cat-border rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
              >
                <option :value="8">8</option>
                <option :value="7">7</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">停止位</label>
              <select 
                v-model.number="store.stopBits" 
                :disabled="store.connected"
                class="w-full bg-cat-surface border border-cat-border rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
              >
                <option :value="1">1</option>
                <option :value="2">2</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-cat-muted block mb-1">校验</label>
              <select 
                v-model="store.parity" 
                :disabled="store.connected"
                class="w-full bg-cat-surface border border-cat-border rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
              >
                <option value="none">无</option>
                <option value="even">偶</option>
                <option value="odd">奇</option>
              </select>
            </div>
          </div>

          <!-- 自动重连开关 -->
          <div class="flex items-center justify-between">
            <label class="text-xs text-cat-muted">自动重连</label>
            <button
              @click="store.autoReconnect = !store.autoReconnect"
              :class="[
                'relative w-10 h-5 rounded-full transition-colors',
                store.autoReconnect ? 'bg-cat-primary' : 'bg-cat-surface border border-cat-border'
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                  store.autoReconnect ? 'left-5 bg-white' : 'left-0.5 bg-cat-muted'
                ]"
              ></span>
            </button>
          </div>

          <!-- 重连状态提示 -->
          <div v-if="store.reconnecting" class="text-xs text-cat-primary bg-cat-primary/10 px-3 py-2 rounded-lg">
            <div class="flex items-center gap-2">
              <span class="animate-spin">🔄</span>
              <span>等待重连...</span>
              <button @click="store.stopAutoReconnect()" class="ml-auto text-cat-muted hover:text-cat-text">✕</button>
            </div>
            <div v-if="store.reconnectTargetName" class="mt-1 text-cat-text font-medium truncate">
              {{ store.reconnectTargetName }}
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="store.lastError && !store.reconnecting" class="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            {{ store.lastError }}
          </div>

          <!-- 连接按钮 -->
          <button 
            @click="onToggleConnect"
            :disabled="store.connecting || (!store.selectedPort && !store.connected)"
            :class="[
              'w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all',
              store.connected 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'cat-btn text-white',
              (store.connecting || (!store.selectedPort && !store.connected)) ? 'opacity-50 cursor-not-allowed' : ''
            ]"
          >
            <span v-if="store.connecting" class="animate-spin">⏳</span>
            <span v-else>{{ store.connected ? '😿' : '😺' }}</span>
            {{ store.connecting ? '连接中...' : (store.connected ? '断开连接喵' : '连接喵!') }}
          </button>
        </div>
      </div>

      <!-- ===== 雷达工具 ===== -->
      <div class="border-b border-cat-border">
        <button
          @click="toggleCollapse('radar')"
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-accent">📡</span>
            <span class="font-medium text-sm">雷达工具</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.radar ? '' : 'rotate-180'">▼</span>
        </button>

        <div v-show="!collapsed.radar" class="px-3 pb-3 space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="applyRadarDataPreset"
              :disabled="store.connected"
              class="cat-btn-secondary px-2 py-2 rounded-lg text-xs text-left disabled:opacity-50"
            >
              <div class="font-medium">主连接 = Data</div>
              <div class="text-cat-muted text-[10px]">921600 + mmWave</div>
            </button>
            <button
              disabled
              class="cat-btn-secondary px-2 py-2 rounded-lg text-xs text-left disabled:opacity-50"
            >
              <div class="font-medium">专用 CLI</div>
              <div class="text-cat-muted text-[10px]">115200 + 授权后发送</div>
            </button>
          </div>

          <div class="space-y-2 bg-cat-surface rounded-lg p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-cat-muted">雷达 cfg 文件</span>
              <span class="text-[10px] text-cat-primary">{{ radarCfgFileName || '未选择' }}</span>
            </div>

            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-xs text-cat-muted">专用 CLI 口</div>
                <div class="text-[10px] text-cat-primary truncate">{{ store.radarCliPortName || '未授权' }}</div>
              </div>
              <button
                @click="onRequestRadarCliPort"
                class="cat-btn-secondary px-2 py-1 rounded text-xs shrink-0"
              >
                选择 CLI
              </button>
            </div>

            <button
              @click="onToggleRadarCli"
              :disabled="!store.radarCliPort && !store.radarCliConnected"
              class="w-full cat-btn-secondary py-2 rounded text-sm disabled:opacity-50"
            >
              {{ store.radarCliConnecting ? '连接 CLI 中...' : (store.radarCliConnected ? '断开 CLI 监听' : '连接 CLI 监听') }}
            </button>

            <div class="text-[10px] text-cat-muted">
              CLI 状态:
              <span :class="store.radarCliConnected ? 'text-green-400' : 'text-cat-muted'">
                {{ store.radarCliConnected ? '已监听' : '未监听' }}
              </span>
            </div>

            <div class="grid grid-cols-1 gap-2">
              <button
                @click="onSendRadarCliCommand('queryDemoStatus')"
                :disabled="!store.radarCliConnected"
                class="w-full cat-btn-secondary py-2 rounded text-xs disabled:opacity-50"
              >
                查询状态
              </button>
              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="onSendRadarCliCommand('sensorStop')"
                  :disabled="!store.radarCliConnected"
                  class="w-full cat-btn-secondary py-2 rounded text-xs disabled:opacity-50"
                >
                  停止传感器
                </button>
                <button
                  @click="onSendRadarCliCommand('sensorStart 0')"
                  :disabled="!store.radarCliConnected"
                  class="w-full cat-btn-secondary py-2 rounded text-xs disabled:opacity-50"
                >
                  重新启动
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-xs text-cat-muted">雷达控件</div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="spec in radarWidgetSpecs"
                  :key="spec.key"
                  @click="toggleRadarWidget(spec)"
                  :class="[
                    'w-full py-2 rounded text-xs transition-colors',
                    hasRadarWidget(spec.widget.title)
                      ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
                      : 'cat-btn-secondary'
                  ]"
                >
                  {{ hasRadarWidget(spec.widget.title) ? `删除${spec.label}` : `添加${spec.label}` }}
                </button>
              </div>
            </div>

            <input
              type="file"
              accept=".cfg,.txt"
              @change="onRadarCfgSelected"
              class="w-full text-xs text-cat-muted file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-cat-card file:text-cat-text"
            >

            <div class="flex items-center gap-2">
              <span class="text-xs text-cat-muted shrink-0">行间隔</span>
              <input
                v-model.number="radarCfgDelayMs"
                type="number"
                min="0"
                step="10"
                class="w-20 bg-cat-card border border-cat-border rounded px-2 py-1 text-xs text-center"
              >
              <span class="text-xs text-cat-muted">ms</span>
            </div>

            <button
              @click="sendRadarCfg"
              :disabled="!radarCfgFile || !store.radarCliPort"
              class="w-full cat-btn py-2 rounded text-sm text-white disabled:opacity-50"
            >
              发送雷达 cfg
            </button>
          </div>

          <div class="text-[10px] text-cat-muted bg-cat-dark/30 rounded p-2">
            <span class="text-cat-text">提示:</span>
            双串口模式固定为：主连接只收 `Data`，`cfg` 只走专用 `CLI` 口。
          </div>
        </div>
      </div>

      <!-- ===== 快捷配置 ===== -->
      <div class="border-b border-cat-border">
        <button 
          @click="toggleCollapse('presets')" 
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-secondary">⚡</span>
            <span class="font-medium text-sm">快捷配置</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.presets ? '' : 'rotate-180'">▼</span>
        </button>
        
        <div v-show="!collapsed.presets" class="px-3 pb-3">
          <div class="grid grid-cols-2 gap-2">
            <button 
              v-for="preset in presets" 
              :key="preset.name" 
              @click="applyPreset(preset)"
              :disabled="store.connected"
              class="cat-btn-secondary px-2 py-2 rounded-lg text-xs text-left disabled:opacity-50 hover:border-cat-primary transition-colors group"
            >
              <div class="font-medium group-hover:text-cat-primary transition-colors">{{ preset.name }}</div>
              <div class="text-cat-muted text-[10px] flex justify-between">
                <span>{{ preset.baud }}</span>
                <span>{{ preset.desc }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 数据协议 ===== -->
      <div class="border-b border-cat-border">
        <button 
          @click="toggleCollapse('protocol')" 
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-warm">📋</span>
            <span class="font-medium text-sm">数据协议</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.protocol ? '' : 'rotate-180'">▼</span>
        </button>
        
        <div v-show="!collapsed.protocol" class="px-3 pb-3 space-y-3">
          <!-- 协议选择 -->
          <div>
            <label class="text-xs text-cat-muted block mb-1">解析协议</label>
            <select 
              v-model="currentProtocol"
              class="w-full bg-cat-surface border border-cat-border rounded-lg px-3 py-2 text-sm"
            >
              <option v-for="p in protocolTypes" :key="p.value" :value="p.value">{{ p.name }}</option>
            </select>
          </div>
          
          <!-- 协议示例 -->
          <div class="bg-cat-surface rounded-lg p-3">
            <div class="text-xs text-cat-muted mb-2">数据格式示例:</div>
            <code class="text-xs text-cat-primary font-mono break-all">
              {{ protocolTypes.find(p => p.value === currentProtocol)?.example }}
            </code>
          </div>
          
          <!-- 数据输出选项 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between p-2 bg-cat-surface rounded-lg">
              <div class="flex-1">
                <div class="text-xs font-medium text-cat-text">等待LF才输出</div>
                <div class="text-[10px] text-cat-muted mt-0.5">关闭时实时输出所有数据</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="store.protocol.waitForLF"
                  @change="store.setProtocol({ waitForLF: store.protocol.waitForLF })"
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-cat-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cat-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cat-primary"></div>
              </label>
            </div>
            
            <div class="flex items-center justify-between p-2 bg-cat-surface rounded-lg">
              <div class="flex-1">
                <div class="text-xs font-medium text-cat-text">过滤空行</div>
                <div class="text-[10px] text-cat-muted mt-0.5">开启时忽略只包含空白字符的行</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="store.protocol.filterEmptyLines"
                  @change="store.setProtocol({ filterEmptyLines: store.protocol.filterEmptyLines })"
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-cat-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cat-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cat-primary"></div>
              </label>
            </div>
          </div>
          
          <!-- 协议说明 -->
          <div class="text-xs text-cat-muted space-y-1 bg-cat-dark/50 rounded-lg p-3">
            <div class="font-medium text-cat-text mb-2">📖 协议说明</div>
            <template v-if="currentProtocol === 'csv'">
              <p>• 每行一组数据，以换行符结尾</p>
              <p>• 数值之间用逗号分隔</p>
              <p>• 示例: <code class="text-cat-accent">25.5,60.2,101.3\n</code></p>
              <p>• Arduino代码:</p>
              <pre class="bg-cat-surface p-2 rounded mt-1 overflow-x-auto">Serial.print(val1);
Serial.print(",");
Serial.print(val2);
Serial.print(",");
Serial.println(val3);</pre>
            </template>
            <template v-else-if="currentProtocol === 'tab'">
              <p>• 数值之间用制表符(Tab)分隔</p>
              <p>• 示例: <code class="text-cat-accent">25.5\t60.2\t101.3\n</code></p>
            </template>
            <template v-else-if="currentProtocol === 'json'">
              <p>• 每行一个JSON对象</p>
              <p>• 键名对应通道名称</p>
              <p>• 示例: <code class="text-cat-accent">{"temp":25.5,"humi":60}</code></p>
              <p>• Arduino代码 (需ArduinoJson库):</p>
              <pre class="bg-cat-surface p-2 rounded mt-1 overflow-x-auto">StaticJsonDocument&lt;64&gt; doc;
doc["temp"] = temperature;
doc["humi"] = humidity;
serializeJson(doc, Serial);
Serial.println();</pre>
            </template>
            <template v-else-if="currentProtocol === 'firewater'">
              <p>• VOFA+ FireWater协议</p>
              <p>• 格式: !通道:数值,通道:数值;</p>
              <p>• 示例: <code class="text-cat-accent">!1:25.5,2:60.2;\n</code></p>
            </template>
            <template v-else>
              <p>• 空格分隔数值</p>
              <p>• 示例: <code class="text-cat-accent">25.5 60.2 101.3\n</code></p>
            </template>
          </div>
        </div>
      </div>

      <!-- ===== 数据通道 ===== -->
      <div class="border-b border-cat-border">
        <button 
          @click="toggleCollapse('channels')" 
          class="w-full p-3 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-accent">📊</span>
            <span class="font-medium text-sm">数据通道</span>
            <span class="text-xs text-cat-muted">({{ store.channels.length }}/19)</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.channels ? '' : 'rotate-180'">▼</span>
        </button>
        
        <div v-show="!collapsed.channels" class="px-3 pb-3">
          <!-- 添加按钮 -->
          <div class="flex justify-end mb-2">
            <button 
              @click="onAddChannel" 
                :disabled="store.channels.length >= 19"
              class="text-xs text-cat-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              + 添加通道
            </button>
          </div>
          
          <!-- 通道列表 -->
          <div class="space-y-2">
            <div 
              v-for="ch in store.channels" 
              :key="ch.id" 
              class="flex items-center gap-2 p-2 bg-cat-surface rounded-lg group hover:bg-cat-border/50 transition-colors"
            >
              <!-- 启用开关 -->
              <input 
                type="checkbox" 
                v-model="ch.enabled" 
                class="w-4 h-4 rounded border-cat-border bg-cat-dark accent-cat-primary cursor-pointer"
              >
              
              <!-- 颜色选择 -->
              <input 
                type="color" 
                v-model="ch.color"
                class="w-6 h-6 rounded border-0 cursor-pointer bg-transparent shrink-0"
                title="选择颜色"
              >
              
              <!-- 通道名称 -->
              <input 
                v-model="ch.name" 
                class="flex-1 bg-transparent text-sm min-w-0 focus:outline-none focus:bg-cat-dark/50 px-1 rounded"
                placeholder="通道名称"
              >
              
              <!-- 当前值 -->
              <span class="font-mono text-xs tabular-nums w-16 text-right" :style="{color: ch.color}">
                {{ Number.isFinite(ch.value) ? ch.value.toFixed(2) : '--' }}
              </span>
              
              <!-- 删除按钮 -->
              <button 
                @click="onRemoveChannel(ch.id)"
                :disabled="store.channels.length <= 1"
                class="w-5 h-5 rounded flex items-center justify-center text-cat-muted hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                title="删除通道"
              >
                ✕
              </button>
            </div>
          </div>
          
          <!-- 数据提示 -->
          <div v-if="store.connected && store.dataHistory.length === 0" class="mt-3 text-xs text-cat-muted text-center bg-cat-dark/50 rounded-lg p-3">
            <div class="text-base mb-1">📡</div>
            <div>等待数据...</div>
            <div class="mt-1 text-cat-primary">发送: 值1,值2,值3\n</div>
          </div>
          
          <!-- 通道映射说明 -->
          <div class="mt-3 text-[10px] text-cat-muted bg-cat-dark/30 rounded p-2">
            <span class="text-cat-text">💡 提示:</span> 
            接收数据按顺序映射到通道，如 <code class="text-cat-accent">25,60,101</code> → 通道1=25, 通道2=60, 通道3=101
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 底部统计 ===== -->
    <div class="p-3 border-t border-cat-border bg-cat-surface/50 shrink-0">
      <div class="grid grid-cols-2 gap-3 text-center">
        <div>
          <div class="text-lg font-semibold text-green-400">{{ store.formatBytes(store.totalRx) }}</div>
          <div class="text-[10px] text-cat-muted">
            接收 
            <span v-if="store.connected" class="text-green-400">({{ (store.rxRate/1000).toFixed(1) }} KB/s)</span>
          </div>
        </div>
        <div>
          <div class="text-lg font-semibold text-blue-400">{{ store.formatBytes(store.totalTx) }}</div>
          <div class="text-[10px] text-cat-muted">
            发送
            <span v-if="store.connected" class="text-blue-400">({{ (store.txRate/1000).toFixed(1) }} KB/s)</span>
          </div>
        </div>
      </div>
      
      <!-- 快捷操作 -->
      <div class="flex gap-2 mt-2">
        <button 
          @click="store.clearAll" 
          class="flex-1 py-1.5 text-xs text-cat-muted hover:text-cat-text bg-cat-dark hover:bg-cat-border rounded transition-colors"
        >
          🗑️ 清空数据
        </button>
      </div>
    </div>
  </aside>
</template>
