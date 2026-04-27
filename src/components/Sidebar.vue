<script setup>
import { ref, computed, watch } from 'vue'
import { useSerialStore } from '../stores/serial'
import { usePortsStore } from '../stores/ports'
import { getParser } from '../utils/parserRegistry'

const store = useSerialStore()
const portsStore = usePortsStore()

// 折叠状态
const collapsed = ref({
  ports: false,
  channels: false
})

const toggleCollapse = (section) => {
  collapsed.value[section] = !collapsed.value[section]
}

// 展开的端口 (用于编辑配置)
const expandedPortId = ref(null)
const togglePortExpand = (portId) => {
  expandedPortId.value = expandedPortId.value === portId ? null : portId
}

// 可用波特率
const baudRates = [300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600]

// 文件发送相关
const sendFileTarget = ref(null)
const sendFileName = ref('')
const sendFile = ref(null)
const sendFileDelayMs = ref(80)

const onSendFileSelected = (event) => {
  const [file] = event.target.files || []
  sendFile.value = file || null
  sendFileName.value = file?.name || ''
}

const doSendFile = async () => {
  if (!sendFile.value || !sendFileTarget.value) return
  const text = await sendFile.value.text()
  await portsStore.sendFileToPort(sendFileTarget.value, text, {
    delayMs: sendFileDelayMs.value,
    commentPrefixes: ['#', '%']
  })
}

// 端口操作
const onAddPort = () => {
  portsStore.addPort()
}

const onRemovePort = (portId) => {
  store.removeAutoChannelsForPort(portId)
  portsStore.removePort(portId)
}

const onSelectDevice = async (portId) => {
  await portsStore.requestPortDevice(portId)
}

const onTogglePort = async (portId) => {
  await portsStore.togglePort(portId)
}

const onChangeBaudRate = (portId, baudRate) => {
  portsStore.setPortBaudRate(portId, Number(baudRate))
}

const onChangeTransportType = (portId, transportType) => {
  portsStore.setPortTransportType(portId, transportType)
}

const onToggleTerminalRx = (portId, enabled) => {
  portsStore.setPortTerminalRx(portId, enabled)
}

const onSelectParser = (portId, parserId) => {
  store.removeAutoChannelsForPort(portId)
  portsStore.setPortParser(portId, parserId)
  store.syncAutoChannelsForPort(portId)
}

const isPortToggleDisabled = (portState) => {
  if (portState.connecting) return true
  if (portState.connected) return false
  return portState.transportType === 'serial'
    ? !portState.device
    : !portState.websocketUrl
}

// 按端口分组通道
const channelsByPort = computed(() => {
  const groups = new Map()
  for (const ch of store.channels) {
    const key = ch.portId || '_unassigned'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(ch)
  }
  return groups
})

const getPortLabel = (portId) => {
  if (!portId || portId === '_unassigned') return '未分配'
  const p = portsStore.getPort(portId)
  return p ? p.label : portId
}

const getChannelFieldLabel = (channel) => {
  if (!channel?.sourceKey) return channel?.name || '未知字段'
  const parts = String(channel.sourceKey).split('::')
  return parts.length >= 4 ? parts.slice(3).join('::') || channel.name || '未知字段' : channel.name || '未知字段'
}

const getChannelOriginTitle = (channel) => {
  if (!channel?.portId) return '等待协议映射'

  const portState = portsStore.getPort(channel.portId)
  const parserName = getParser(portState?.parserId)?.name || portState?.parserId || 'Raw'
  const portLabel = portState?.label || channel.portId
  const fieldLabel = getChannelFieldLabel(channel)

  return `来源端口: ${portLabel}\n协议: ${parserName}\n字段: ${fieldLabel}`
}

const browserSupportHint = computed(() => {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || ''
  const isMac = /mac/i.test(platform)

  if (isMac) {
    return portsStore.serialSupported
      ? 'macOS 已支持 Web Serial，请使用 Chrome / Edge / Arc。Safari 与 Firefox 暂不支持。'
      : '当前浏览器不支持 Web Serial，但仍可使用 WebSocket 接口。macOS 串口请改用 Chrome / Edge / Arc。'
  }

  return portsStore.serialSupported
    ? '推荐使用支持 Web Serial 的 Chromium 浏览器。'
    : '当前浏览器不支持 Web Serial，但仍可使用 WebSocket 接口。串口请改用 Chrome / Edge 等 Chromium 浏览器。'
})

watch(() => portsStore.ports.map(port => port.id), (portIds) => {
  if (!portIds.length) {
    sendFileTarget.value = null
    return
  }

  if (!portIds.includes(sendFileTarget.value)) {
    sendFileTarget.value = portIds[0]
  }
}, { immediate: true })
</script>

<template>
  <aside class="w-[16.5rem] bg-cat-card border-r border-cat-border flex flex-col shrink-0 overflow-hidden">

    <!-- 浏览器支持检测 -->
    <div v-if="!portsStore.serialSupported" class="p-3 bg-yellow-500/20 border-b border-yellow-500/30">
      <div class="flex items-center gap-2 text-yellow-400 text-sm">
        <span>⚠️</span>
        <span>浏览器不支持 Web Serial API</span>
      </div>
      <div class="text-xs text-yellow-400/70 mt-1">{{ browserSupportHint }}</div>
    </div>

    <!-- 可滚动区域 -->
    <div class="flex-1 overflow-y-auto">

      <!-- ===== 串口管理 ===== -->
      <div class="border-b border-cat-border">
        <button
          @click="toggleCollapse('ports')"
          class="w-full px-3 py-2.5 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-primary">🔌</span>
            <span class="font-medium text-sm">串口管理</span>
            <span v-if="portsStore.anyConnected" class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span class="text-xs text-cat-muted">({{ portsStore.ports.length }})</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.ports ? '' : 'rotate-180'">▼</span>
        </button>

        <div v-show="!collapsed.ports" class="px-3 pb-3 space-y-2.5">

          <!-- 端口列表 -->
          <div v-for="portState in portsStore.ports" :key="portState.id" class="bg-cat-surface rounded-xl overflow-hidden border border-cat-border/70">

            <!-- 端口头部 -->
            <div
              class="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-cat-border/30 transition-colors"
              @click="togglePortExpand(portState.id)"
            >
              <span :class="portState.connected ? 'text-green-400' : 'text-cat-muted'" class="text-xs">●</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  {{ portState.label }}
                </div>
                <div class="text-[10px] text-cat-muted truncate">
                  {{ portState.transportType === 'websocket'
                    ? (portState.websocketUrl || '未填写地址')
                    : (portState.portName || '未选择设备') }}
                  | {{ portState.transportType === 'websocket' ? 'ws' : portState.baudRate }}
                  | {{ portState.parserId }}
                </div>
              </div>

              <!-- 快速连接/断开 -->
              <button
                @click.stop="onTogglePort(portState.id)"
                :disabled="isPortToggleDisabled(portState)"
                :class="[
                  'px-2.5 py-1 rounded-lg text-[11px] shrink-0 transition-colors',
                  portState.connected
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'cat-btn text-white',
                  isPortToggleDisabled(portState) ? 'opacity-50' : ''
                ]"
              >
                {{ portState.connecting ? '...' : (portState.connected ? '断开' : '连接') }}
              </button>

              <span class="text-cat-muted text-xs transition-transform" :class="expandedPortId === portState.id ? 'rotate-180' : ''">▼</span>
            </div>

            <!-- 端口详细配置（展开时） -->
            <div v-if="expandedPortId === portState.id" class="px-2.5 pb-2.5 space-y-2 border-t border-cat-border/50">

              <!-- 名称 -->
              <div class="pt-2">
                <label class="text-[10px] text-cat-muted block mb-0.5">端口名称</label>
                <input
                  v-model="portState.label"
                  class="w-full bg-cat-dark border border-cat-border rounded-lg px-2 py-1.5 text-xs"
                  placeholder="例如: 雷达DATA"
                >
              </div>

              <div>
                <label class="text-[10px] text-cat-muted block mb-0.5">接口类型</label>
                <select
                  :value="portState.transportType"
                  @change="event => onChangeTransportType(portState.id, event.target.value)"
                  :disabled="portState.connected"
                  class="w-full bg-cat-dark border border-cat-border rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"
                >
                  <option value="serial">Web Serial 串口</option>
                  <option value="websocket">WebSocket</option>
                </select>
              </div>

              <!-- 设备选择 -->
              <div v-if="portState.transportType === 'serial'">
                <button
                  @click="onSelectDevice(portState.id)"
                  :disabled="portState.connected"
                  class="w-full py-1.5 text-xs text-cat-primary hover:text-cat-text border border-dashed border-cat-border hover:border-cat-primary rounded-lg disabled:opacity-50 transition-colors"
                >
                  {{ portState.portName ? '重新选择设备' : '➕ 选择设备' }}
                </button>
              </div>

              <div v-else>
                <label class="text-[10px] text-cat-muted block mb-0.5">WebSocket 地址</label>
                <input
                  :value="portState.websocketUrl"
                  @input="event => portsStore.setPortWebSocketUrl(portState.id, event.target.value)"
                  :disabled="portState.connected"
                  class="w-full bg-cat-dark border border-cat-border rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"
                  placeholder="例如: ws://192.168.4.1:81/tlv"
                >
              </div>

              <!-- 波特率 -->
              <div v-if="portState.transportType === 'serial'">
                <label class="text-[10px] text-cat-muted block mb-0.5">波特率</label>
                <select
                  :value="portState.baudRate"
                  @change="event => onChangeBaudRate(portState.id, event.target.value)"
                  :disabled="portState.connected"
                  class="w-full bg-cat-dark border border-cat-border rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"
                >
                  <option v-for="b in baudRates" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>

              <!-- 数据位/停止位/校验 -->
              <div v-if="portState.transportType === 'serial'" class="grid grid-cols-3 gap-1">
                <div>
                  <label class="text-[10px] text-cat-muted block mb-0.5">数据位</label>
                  <select v-model.number="portState.dataBits" :disabled="portState.connected" class="w-full bg-cat-dark border border-cat-border rounded-lg px-1 py-1 text-xs disabled:opacity-50">
                    <option :value="8">8</option>
                    <option :value="7">7</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-cat-muted block mb-0.5">停止位</label>
                  <select v-model.number="portState.stopBits" :disabled="portState.connected" class="w-full bg-cat-dark border border-cat-border rounded-lg px-1 py-1 text-xs disabled:opacity-50">
                    <option :value="1">1</option>
                    <option :value="2">2</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-cat-muted block mb-0.5">校验</label>
                  <select v-model="portState.parity" :disabled="portState.connected" class="w-full bg-cat-dark border border-cat-border rounded-lg px-1 py-1 text-xs disabled:opacity-50">
                    <option value="none">无</option>
                    <option value="even">偶</option>
                    <option value="odd">奇</option>
                  </select>
                </div>
              </div>

              <!-- 解析器选择 -->
              <div>
                <label class="text-[10px] text-cat-muted block mb-0.5">数据解析器</label>
                <select
                  :value="portState.parserId"
                  @change="e => onSelectParser(portState.id, e.target.value)"
                  class="w-full bg-cat-dark border border-cat-border rounded-lg px-2 py-1.5 text-xs"
                >
                  <option v-for="p in portsStore.getAvailableParsers()" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>

              <!-- 终端接收打印 -->
              <div class="rounded-lg border border-cat-border/70 bg-cat-dark/30 px-2.5 py-2 space-y-1.5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-[11px] text-cat-text">终端接收打印</div>
                  </div>
                  <label class="mt-0.5 flex items-center gap-1 text-[10px] text-cat-muted cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      :checked="portState.showTerminalRx"
                      @change="event => onToggleTerminalRx(portState.id, event.target.checked)"
                      class="accent-cat-primary"
                    >
                    打印
                  </label>
                </div>
                <div
                  v-if="portState.transportType === 'serial' && portState.baudRate >= portsStore.highBaudSilentThreshold && !portState.showTerminalRx"
                  class="text-[10px] text-cat-primary bg-cat-primary/10 rounded-md px-2 py-1"
                >
                  当前是高速端口，终端已默认静默，只保留解析与统计。
                </div>
              </div>

              <!-- 自动重连 -->
              <div class="flex items-center justify-between">
                <label class="text-[10px] text-cat-muted">自动重连</label>
                <button
                  @click="portState.autoReconnect = !portState.autoReconnect"
                  :class="[
                    'relative w-8 h-4 rounded-full transition-colors',
                    portState.autoReconnect ? 'bg-cat-primary' : 'bg-cat-dark border border-cat-border'
                  ]"
                >
                  <span :class="[
                    'absolute top-0.5 w-3 h-3 rounded-full transition-all',
                    portState.autoReconnect ? 'left-4 bg-white' : 'left-0.5 bg-cat-muted'
                  ]"></span>
                </button>
              </div>

              <!-- 重连状态 -->
              <div v-if="portState.reconnecting" class="text-[10px] text-cat-primary bg-cat-primary/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <span class="animate-spin">🔄</span>
                <span>等待重连 {{ portState.reconnectTargetName }}...</span>
              </div>

              <!-- 删除端口 -->
              <button
                @click="onRemovePort(portState.id)"
                :disabled="portState.connected || portsStore.ports.length <= 1"
                class="w-full py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg disabled:opacity-30 transition-colors"
              >
                删除此端口
              </button>
            </div>
          </div>

          <!-- 添加端口 -->
          <button
            @click="onAddPort"
            class="w-full py-2 text-xs text-cat-primary hover:text-cat-text border border-dashed border-cat-border hover:border-cat-primary rounded-xl transition-colors"
          >
            ➕ 添加串口
          </button>

          <!-- 发送文件 -->
          <div class="bg-cat-surface rounded-xl border border-cat-border/70 p-2.5 space-y-2">
            <div class="text-xs text-cat-muted font-medium">发送文件</div>
            <div class="flex items-center gap-2">
              <select v-model="sendFileTarget" class="flex-1 bg-cat-dark border border-cat-border rounded-lg px-2 py-1 text-xs">
                <option v-for="p in portsStore.ports" :key="p.id" :value="p.id">{{ p.label }}</option>
              </select>
              <input type="number" v-model.number="sendFileDelayMs" min="0" step="10" class="w-14 bg-cat-dark border border-cat-border rounded-lg px-1 py-1 text-xs text-center">
              <span class="text-[10px] text-cat-muted">ms</span>
            </div>
            <input type="file" accept=".cfg,.txt,.csv" @change="onSendFileSelected" class="w-full text-[10px] text-cat-muted file:mr-1 file:px-2 file:py-0.5 file:rounded file:border-0 file:bg-cat-card file:text-cat-text">
            <button
              @click="doSendFile"
              :disabled="!sendFile || !sendFileTarget"
              class="w-full cat-btn py-1.5 rounded-lg text-xs text-white disabled:opacity-50"
            >
              发送 {{ sendFileName || '文件' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 数据通道 ===== -->
      <div class="border-b border-cat-border">
        <button
          @click="toggleCollapse('channels')"
          class="w-full px-3 py-2.5 flex items-center justify-between hover:bg-cat-surface/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-cat-accent">📊</span>
            <span class="font-medium text-sm">数据通道</span>
            <span class="text-xs text-cat-muted">({{ store.channels.length }})</span>
          </div>
          <span class="text-cat-muted text-xs transition-transform" :class="collapsed.channels ? '' : 'rotate-180'">▼</span>
        </button>

        <div v-show="!collapsed.channels" class="px-3 pb-3">
          <!-- 按端口分组的通道列表 -->
          <div v-for="[portId, chs] in channelsByPort" :key="portId" class="mb-2">
            <div class="text-[10px] text-cat-muted mb-1 font-medium">{{ getPortLabel(portId) }}</div>
            <div class="space-y-1">
              <div
                v-for="ch in chs"
                :key="ch.id"
                class="flex items-center gap-2 p-2 bg-cat-surface rounded-lg border border-cat-border/60"
                :title="getChannelOriginTitle(ch)"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: ch.color }"></span>
                <div class="flex-1 min-w-0">
                  <div class="channel-title text-xs text-cat-text">{{ ch.name }}</div>
                </div>
                <span class="font-mono text-[10px] tabular-nums w-14 text-right" :style="{color: ch.color}">
                  {{ Number.isFinite(ch.value) ? ch.value.toFixed(2) : '--' }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="store.channels.length === 0" class="rounded-lg border border-dashed border-cat-border px-3 py-4 text-center text-[11px] text-cat-muted">
            还没有协议字段通道。
            去“协议喵”创建并应用协议后，这里会自动出现。
          </div>

          <div class="mt-2 text-[10px] text-cat-muted bg-cat-dark/30 rounded-lg p-2">
            <span class="text-cat-text">💡</span>
            数据通道只由“协议喵”里的协议字段自动生成，用户不能手动添加、删除或改名。
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 底部统计 ===== -->
    <div class="px-3 py-2.5 border-t border-cat-border bg-cat-surface/50 shrink-0">
      <div class="grid grid-cols-2 gap-2 text-center">
        <div>
          <div class="text-base font-semibold text-green-400">{{ portsStore.formatBytes(portsStore.totalStats.totalRx) }}</div>
          <div class="text-[10px] text-cat-muted">
            接收
            <span v-if="portsStore.anyConnected" class="text-green-400">({{ (portsStore.totalStats.rxRate/1000).toFixed(1) }} KB/s)</span>
          </div>
        </div>
        <div>
          <div class="text-base font-semibold text-blue-400">{{ portsStore.formatBytes(portsStore.totalStats.totalTx) }}</div>
          <div class="text-[10px] text-cat-muted">
            发送
            <span v-if="portsStore.anyConnected" class="text-blue-400">({{ (portsStore.totalStats.txRate/1000).toFixed(1) }} KB/s)</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mt-2">
        <button
          @click="store.clearAll"
          class="flex-1 py-1.5 text-xs text-cat-muted hover:text-cat-text bg-cat-dark hover:bg-cat-border rounded-lg transition-colors"
        >
          🗑️ 清空数据
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.channel-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.2;
}
</style>
