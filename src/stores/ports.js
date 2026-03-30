import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { SerialManager } from '../utils/serialManager'
import { WebSocketManager } from '../utils/websocketManager'
import { getParser, getAllParsers } from '../utils/parserRegistry'
import { getPortDisplayName, getVendorName } from '../utils/usbVendors'
import { sendFileLineByLine } from '../utils/fileSender'

let portIdCounter = 1
const maxLogsPerPort = 1000
const HIGH_BAUD_SILENT_THRESHOLD = 460800

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const shouldShowTerminalRxByDefault = (baudRate) => Number(baudRate || 0) < HIGH_BAUD_SILENT_THRESHOLD

const formatTime = () => {
  const now = new Date()
  return now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0')
}

const concatBytes = (left, right) => {
  if (!left?.length) return right || null
  if (!right?.length) return left || null
  const merged = new Uint8Array(left.length + right.length)
  merged.set(left)
  merged.set(right, left.length)
  return merged
}

const splitUtf8TextChunks = (text) => {
  if (!text) return []
  const normalized = String(text)
  const chunks = normalized.match(/[^\n]*\n|[^\n]+/g)
  return chunks && chunks.length ? chunks : [normalized]
}

export const usePortsStore = defineStore('ports', () => {
  const ports = ref([])
  const serialSupported = ref('serial' in navigator)

  const resolveParserId = (parserId) => {
    return getParser(parserId)?.id || 'raw'
  }

  const createManager = (transportType = 'serial') => {
    return transportType === 'websocket' ? new WebSocketManager() : new SerialManager()
  }

  // ===== 端口 CRUD =====

  const createPortState = (overrides = {}) => {
    const id = `port-${portIdCounter++}`
    const baudRate = Number(overrides.baudRate) || 115200
    const showTerminalRx = hasOwn(overrides, 'showTerminalRx')
      ? overrides.showTerminalRx !== false
      : shouldShowTerminalRxByDefault(baudRate)
    const terminalRxPreferenceLocked = hasOwn(overrides, 'terminalRxPreferenceLocked')
      ? overrides.terminalRxPreferenceLocked === true
      : hasOwn(overrides, 'showTerminalRx')

    return {
      id,
      label: overrides.label || `端口 ${portIdCounter - 1}`,
      transportType: overrides.transportType === 'websocket' ? 'websocket' : 'serial',
      device: null,         // Web Serial port 对象
      websocketUrl: overrides.websocketUrl || '',
      portName: '',
      savedVendorId: overrides.savedVendorId ?? null,
      savedProductId: overrides.savedProductId ?? null,
      connectOnRestore: overrides.connectOnRestore === true,
      connected: false,
      connecting: false,
      baudRate,
      dataBits: overrides.dataBits || 8,
      stopBits: overrides.stopBits || 1,
      parity: overrides.parity || 'none',
      showTerminalRx,
      terminalRxPreferenceLocked,

      parserId: resolveParserId(overrides.parserId || 'raw'),
      parserConfig: overrides.parserConfig || {},
      hiddenParsedChannelKeys: Array.isArray(overrides.hiddenParsedChannelKeys)
        ? [...new Set(overrides.hiddenParsedChannelKeys.map(item => String(item)))]
        : [],

      channelOffset: 0,
      channelCount: 0,

      logs: [],

      // 自动重连
      autoReconnect: true,
      reconnecting: false,
      reconnectTargetName: '',

      // 统计
      totalRx: 0,
      totalTx: 0,
      rxRate: 0,
      txRate: 0,

      // 内部（不序列化）
      _manager: null,
      _parser: null,
      _statsInterval: null,
      _reconnectTimer: null,
      _lastPortInfo: null,
    }
  }

  const addPort = (overrides = {}) => {
    const portState = reactive(createPortState(overrides))
    portState._manager = createManager(portState.transportType)
    _setupManagerCallbacks(portState)
    _initParser(portState)
    ports.value.push(portState)
    return portState
  }

  const removePort = (portId) => {
    const index = ports.value.findIndex(p => p.id === portId)
    if (index === -1) return false

    const portState = ports.value[index]
    if (portState.connected) {
      disconnectPort(portId)
    }
    _cleanupPort(portState)
    ports.value.splice(index, 1)
    _recalcChannelOffsets()
    return true
  }

  const getPort = (portId) => {
    return ports.value.find(p => p.id === portId) || null
  }

  const setPortBaudRate = (portId, baudRate) => {
    const portState = getPort(portId)
    const nextBaudRate = Number(baudRate)
    if (!portState || !Number.isFinite(nextBaudRate) || nextBaudRate <= 0) return

    portState.baudRate = nextBaudRate
    if (!portState.terminalRxPreferenceLocked) {
      portState.showTerminalRx = shouldShowTerminalRxByDefault(nextBaudRate)
    }
  }

  const setPortTerminalRx = (portId, enabled) => {
    const portState = getPort(portId)
    if (!portState) return
    portState.showTerminalRx = enabled !== false
    portState.terminalRxPreferenceLocked = true
  }

  const setPortTransportType = (portId, transportType) => {
    const portState = getPort(portId)
    const nextType = transportType === 'websocket' ? 'websocket' : 'serial'
    if (!portState || portState.connected || portState.transportType === nextType) return

    _cleanupPort(portState)
    portState.transportType = nextType
    portState.device = null
    portState.portName = nextType === 'websocket' ? (portState.websocketUrl || '') : ''
    portState._manager = createManager(nextType)
    _setupManagerCallbacks(portState)
    _initParser(portState)
  }

  const setPortWebSocketUrl = (portId, url) => {
    const portState = getPort(portId)
    if (!portState) return
    portState.websocketUrl = String(url || '').trim()
    if (portState.transportType === 'websocket' && !portState.connected) {
      portState.portName = portState.websocketUrl
    }
  }

  // ===== 解析器 =====

  const _initParser = (portState) => {
    const resolvedParserId = resolveParserId(portState.parserId)
    portState.parserId = resolvedParserId

    const parserDef = getParser(resolvedParserId)
    if (parserDef) {
      portState._parser = parserDef.createInstance(portState.parserConfig)
    } else {
      portState._parser = { feed: () => [], reset: () => {} }
    }
  }

  const setPortParser = (portId, parserId, config = {}) => {
    const portState = getPort(portId)
    if (!portState) return

    const previousParserId = portState.parserId
    portState.parserId = resolveParserId(parserId)
    portState.parserConfig = config
    if (previousParserId !== portState.parserId) {
      portState.hiddenParsedChannelKeys = []
    }

    const parserDef = getParser(portState.parserId)
    if (parserDef) {
      portState._parser = parserDef.createInstance(config)

      // 应用解析器推荐的底层协议
      if (portState._manager) {
        portState._manager.setProtocol({
          type: parserDef.defaultProtocol || 'raw',
          waitForLF: parserDef.defaultProtocol === 'line',
          filterEmptyLines: parserDef.defaultProtocol === 'line'
        })
      }

      // 如果解析器有推荐波特率且当前未连接，应用之
      if (!portState.connected && parserDef.defaultBaudRate) {
        setPortBaudRate(portState.id, parserDef.defaultBaudRate)
      }
    }
  }

  const getAvailableParsers = () => getAllParsers()

  const hideParsedChannel = (portId, sourceKey) => {
    const portState = getPort(portId)
    if (!portState || !sourceKey) return
    if (!portState.hiddenParsedChannelKeys.includes(sourceKey)) {
      portState.hiddenParsedChannelKeys.push(sourceKey)
    }
  }

  const isParsedChannelHidden = (portId, sourceKey) => {
    const portState = getPort(portId)
    if (!portState || !sourceKey) return false
    return portState.hiddenParsedChannelKeys.includes(sourceKey)
  }

  const refreshParserBindings = () => {
    for (const portState of ports.value) {
      const previousParserId = portState.parserId
      _initParser(portState)

      const parserDef = getParser(portState.parserId)
      if (portState._manager && parserDef) {
        const protocolType = parserDef.defaultProtocol || 'raw'
        portState._manager.setProtocol({
          type: protocolType,
          waitForLF: protocolType === 'line',
          filterEmptyLines: protocolType === 'line'
        })
      }

      if (previousParserId !== portState.parserId) {
        _addLog(portState, 'system', `解析器 ${previousParserId || '(空)'} 不可用，已回退到 Raw`)
      }
    }
  }

  // ===== 通道偏移计算 =====

  const _recalcChannelOffsets = () => {
    let offset = 0
    for (const portState of ports.value) {
      portState.channelOffset = offset
      offset += portState.channelCount
    }
  }

  // ===== 设备选择 =====

  const requestPortDevice = async (portId) => {
    if (!serialSupported.value) return false

    const portState = getPort(portId)
    if (!portState || portState.transportType !== 'serial') return false

    try {
      const device = await navigator.serial.requestPort()
      const info = device.getInfo()
      portState.device = device
      portState.portName = getPortDisplayName(info, 0)
      portState.savedVendorId = info?.usbVendorId ?? null
      portState.savedProductId = info?.usbProductId ?? null
      return true
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        _addLog(portState, 'error', `选择设备失败: ${error.message}`)
      }
      return false
    }
  }

  const getAuthorizedPorts = async () => {
    if (!serialSupported.value) return []
    try {
      const deviceList = await navigator.serial.getPorts()
      return deviceList.map((device, index) => {
        const info = device.getInfo()
        return {
          device,
          index,
          vendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : '',
          productId: info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : '',
          name: getPortDisplayName(info, index)
        }
      })
    } catch {
      return []
    }
  }

  const assignDevice = (portId, device) => {
    const portState = getPort(portId)
    if (!portState) return
    const info = device.getInfo?.() || {}
    portState.device = device
    portState.portName = getPortDisplayName(info, 0)
    portState.savedVendorId = info?.usbVendorId ?? null
    portState.savedProductId = info?.usbProductId ?? null
  }

  const rebindAuthorizedDevices = async () => {
    if (!serialSupported.value) return false

    let authorizedPorts = []
    try {
      authorizedPorts = await navigator.serial.getPorts()
    } catch {
      return false
    }

    if (!authorizedPorts.length) return false

    const unusedPorts = [...authorizedPorts]
    const restoredPorts = []

    const takeMatchingPort = (portState) => {
      if (portState.transportType !== 'serial' || portState.device) return null

      const matchedIndex = unusedPorts.findIndex((device) => {
        const info = device.getInfo?.() || {}

        if (portState.savedVendorId != null && portState.savedProductId != null) {
          return info.usbVendorId === portState.savedVendorId &&
                 info.usbProductId === portState.savedProductId
        }

        const displayName = getPortDisplayName(info, 0)
        return Boolean(portState.portName) && displayName === portState.portName
      })

      if (matchedIndex < 0) return null
      return unusedPorts.splice(matchedIndex, 1)[0] || null
    }

    for (const portState of ports.value) {
      const matchedDevice = takeMatchingPort(portState)
      if (!matchedDevice) continue

      assignDevice(portState.id, matchedDevice)
      restoredPorts.push(portState)
      _addLog(portState, 'system', `已恢复授权设备: ${portState.portName}`)
    }

    for (const portState of restoredPorts) {
      if (portState.connectOnRestore && !portState.connected && !portState.connecting) {
        _addLog(portState, 'system', '正在恢复连接...')
        connectPort(portState.id)
      }
    }

    return restoredPorts.length > 0
  }

  // ===== 连接/断开 =====

  const connectPort = async (portId) => {
    const portState = getPort(portId)
    if (!portState) return false

    if (portState.transportType === 'serial' && !portState.device) {
      const selected = await requestPortDevice(portId)
      if (!selected) return false
    }

    if (portState.transportType === 'websocket' && !portState.websocketUrl) {
      _addLog(portState, 'error', '请先填写 WebSocket 地址')
      return false
    }

    portState.connecting = true

    // 配置底层协议
    const parserDef = getParser(portState.parserId)
    const protocolType = parserDef?.defaultProtocol || 'raw'
    portState._manager.setProtocol({
      type: protocolType,
      waitForLF: protocolType === 'line',
      filterEmptyLines: protocolType === 'line'
    })

    const success = portState.transportType === 'websocket'
      ? await portState._manager.connect(portState.websocketUrl, {})
      : await portState._manager.connect(portState.device, {
          baudRate: portState.baudRate,
          dataBits: portState.dataBits,
          stopBits: portState.stopBits,
          parity: portState.parity
        })

    if (!success) {
      portState.connecting = false
      if (portState.transportType === 'serial') {
        portState.device = null
      }
    }

    return success
  }

  const disconnectPort = async (portId) => {
    const portState = getPort(portId)
    if (!portState || !portState._manager) return false

    _stopAutoReconnect(portState)
    return await portState._manager.disconnect()
  }

  const togglePort = async (portId) => {
    const portState = getPort(portId)
    if (!portState) return false
    return portState.connected ? disconnectPort(portId) : connectPort(portId)
  }

  // ===== 发送 =====

  const sendToPort = async (portId, data, options = {}) => {
    const portState = getPort(portId)
    if (!portState?.connected) return false

    const success = await portState._manager.send(data, options)
    if (success) {
      let rawBytes
      if (options.isHex) {
        const hex = data.replace(/\s/g, '')
        rawBytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < rawBytes.length; i++) {
          rawBytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
      } else {
        rawBytes = new TextEncoder().encode(
          data + (options.appendCR ? '\r' : '') + (options.appendLF ? '\n' : '')
        )
      }
      _addLog(portState, 'tx', data, options.isHex ? 'hex' : 'utf8', rawBytes)
      portState.totalTx += rawBytes.length
    }
    return success
  }

  const sendFileToPort = async (portId, text, options = {}) => {
    const portState = getPort(portId)
    if (!portState?.connected) return false

    _addLog(portState, 'system', `开始逐行发送文件，间隔 ${options.delayMs || 80}ms`)

    const success = await sendFileLineByLine(portState._manager, text, {
      ...options,
      onProgress: (i, total, line) => {
        const rawBytes = new TextEncoder().encode(`${line}\r\n`)
        _addLog(portState, 'tx', line, 'utf8', rawBytes)
        portState.totalTx += rawBytes.length
      },
      onError: (i, line) => {
        _addLog(portState, 'error', `文件发送失败，停止在第 ${i + 1} 行: ${line}`)
      }
    })

    if (success) {
      _addLog(portState, 'system', '文件发送完成')
    }

    return success
  }

  // ===== 日志 =====

  const _addLog = (portState, direction, data, type = 'utf8', rawBytes = null) => {
    if ((direction === 'rx' || direction === 'tx') && type === 'utf8') {
      const chunks = splitUtf8TextChunks(data)

      if (chunks.length > 1) {
        for (const chunk of chunks) {
          _addLog(portState, direction, chunk, type, null)
        }
        return
      }
    }

    const lastLog = portState.logs[portState.logs.length - 1]
    if (
      lastLog &&
      direction === 'rx' &&
      type === 'utf8' &&
      lastLog.dir === 'rx' &&
      lastLog.type === 'utf8' &&
      !String(lastLog.data || '').includes('\n') &&
      !String(data || '').includes('\n')
    ) {
      lastLog.data += data
      lastLog.rawBytes = concatBytes(lastLog.rawBytes, rawBytes)
      lastLog.time = formatTime()
      return
    }

    portState.logs.push({
      id: Date.now() + Math.random(),
      time: formatTime(),
      dir: direction,
      data,
      type,
      rawBytes
    })

    if (portState.logs.length > maxLogsPerPort) {
      portState.logs.splice(0, portState.logs.length - maxLogsPerPort)
    }
  }

  const clearPortLogs = (portId, predicate = null) => {
    const portState = getPort(portId)
    if (!portState) return

    if (typeof predicate === 'function') {
      portState.logs = portState.logs.filter(log => !predicate(log))
      return
    }

    portState.logs = []
  }

  // ===== 外部访问的 addLog (供系统消息用) =====

  const addPortLog = (portId, direction, data, type = 'utf8', rawBytes = null) => {
    const portState = getPort(portId)
    if (portState) _addLog(portState, direction, data, type, rawBytes)
  }

  // ===== 统计 =====

  const _startStatsUpdate = (portState) => {
    let lastRx = portState.totalRx
    let lastTx = portState.totalTx
    let lastTime = Date.now()

    portState._statsInterval = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastTime) / 1000

      portState.rxRate = elapsed > 0 ? (portState.totalRx - lastRx) / elapsed : 0
      portState.txRate = elapsed > 0 ? (portState.totalTx - lastTx) / elapsed : 0

      lastRx = portState.totalRx
      lastTx = portState.totalTx
      lastTime = now
    }, 500)
  }

  const _stopStatsUpdate = (portState) => {
    if (portState._statsInterval) {
      clearInterval(portState._statsInterval)
      portState._statsInterval = null
    }
  }

  // ===== 自动重连 =====

  const _startAutoReconnect = (portState) => {
    if (portState.reconnecting) return
    portState.reconnecting = true
    _addLog(portState, 'system', `等待 ${portState.reconnectTargetName} 重新插入...`)

    portState._reconnectTimer = setInterval(async () => {
      if (!portState.autoReconnect || portState.connected) {
        _stopAutoReconnect(portState)
        return
      }

      try {
        const deviceList = await navigator.serial.getPorts()
        if (portState._lastPortInfo) {
          const matched = deviceList.find(d => {
            const info = d.getInfo?.()
            return info?.usbVendorId === portState._lastPortInfo.vendorId &&
                   info?.usbProductId === portState._lastPortInfo.productId
          })

          if (matched) {
            _addLog(portState, 'system', `检测到设备，正在重连...`)
            portState.device = matched
            portState.portName = getPortDisplayName(matched.getInfo?.() || {}, 0)
            const success = await connectPort(portState.id)
            if (success) _stopAutoReconnect(portState)
          }
        }
      } catch {
        // ignore
      }
    }, 3000)
  }

  const _stopAutoReconnect = (portState) => {
    if (portState._reconnectTimer) {
      clearInterval(portState._reconnectTimer)
      portState._reconnectTimer = null
    }
    portState.reconnecting = false
    portState.reconnectTargetName = ''
  }

  // ===== SerialManager 回调 =====

  /** @type {Function|null} 外部注册的数据回调 (portId, snapshots) */
  let onParsedData = null

  const setOnParsedData = (callback) => {
    onParsedData = callback
  }

  const _setupManagerCallbacks = (portState) => {
    const manager = portState._manager

    manager.onChunk = (data) => {
      const incomingBytes = data.raw?.length ?? new TextEncoder().encode(data.text || '').length
      portState.totalRx += incomingBytes

      if (portState.showTerminalRx) {
        _addLog(portState, 'rx', data.text, 'utf8', data.raw)
      }
    }

    manager.onData = (data) => {
      if (portState._parser && data.raw) {
        const snapshots = portState._parser.feed(data.raw)

        if (snapshots.length > 0) {
          // 更新端口通道数
          const maxChannels = Math.max(...snapshots.map(s => s.values.length))
          if (maxChannels > portState.channelCount) {
            portState.channelCount = maxChannels
            _recalcChannelOffsets()
          }

          // 通知外部（serial store）更新全局通道
          if (onParsedData) {
            onParsedData(portState.id, snapshots, portState.channelOffset)
          }
        }
      }
    }

    manager.onConnect = (info) => {
      portState.connected = true
      portState.connecting = false
      portState.connectOnRestore = true
      portState.reconnecting = false
      portState.totalRx = 0
      portState.totalTx = 0
      portState.rxRate = 0
      portState.txRate = 0

      if (portState.transportType === 'serial') {
        const usbVendorId = info.port?.getInfo?.()?.usbVendorId
        const usbProductId = info.port?.getInfo?.()?.usbProductId
        portState.savedVendorId = usbVendorId ?? null
        portState.savedProductId = usbProductId ?? null
        portState._lastPortInfo = {
          vendorId: usbVendorId,
          productId: usbProductId,
          portName: portState.portName
        }
      } else {
        portState.portName = info.url || portState.websocketUrl
      }

      _startStatsUpdate(portState)
      _addLog(
        portState,
        'system',
        portState.transportType === 'websocket'
          ? `已连接 WebSocket ${portState.portName}`
          : `已连接 ${portState.portName}，波特率 ${portState.baudRate}`
      )
      if (portState.transportType === 'serial' && !portState.showTerminalRx) {
        _addLog(portState, 'system', `已关闭终端接收打印，解析仍会继续（>${HIGH_BAUD_SILENT_THRESHOLD.toLocaleString()} 波特率默认静默）`)
      }
    }

    manager.onDisconnect = (info) => {
      portState.connected = false
      portState.connecting = false
      _stopStatsUpdate(portState)
      portState.rxRate = 0
      portState.txRate = 0

      if (info.reason === 'device') {
        const disconnectedName = portState.portName
        if (portState.transportType === 'serial') {
          portState.device = null
        }
        _addLog(portState, 'system', `设备已拔出: ${disconnectedName}`)

        if (portState.transportType === 'serial' && portState.autoReconnect && portState._lastPortInfo) {
          portState.reconnectTargetName = disconnectedName
          _startAutoReconnect(portState)
        }
      } else {
        _stopAutoReconnect(portState)
        portState._lastPortInfo = null
        portState.connectOnRestore = false
        _addLog(portState, 'system', '连接已断开')
      }
    }

    manager.onError = (error) => {
      portState.connecting = false
      _addLog(portState, 'error', `错误: ${error.message}`)
    }
  }

  const _cleanupPort = (portState) => {
    _stopStatsUpdate(portState)
    _stopAutoReconnect(portState)
    if (portState._parser?.reset) portState._parser.reset()
  }

  // ===== 全局设备监听 =====

  if (serialSupported.value) {
    navigator.serial.addEventListener('connect', (event) => {
      const device = event.target
      const info = device?.getInfo?.()
      const name = getVendorName(info?.usbVendorId) || '未知设备'

      // 通知所有正在重连的端口
      for (const portState of ports.value) {
        if (portState.reconnecting && portState._lastPortInfo) {
          if (info?.usbVendorId === portState._lastPortInfo.vendorId &&
              info?.usbProductId === portState._lastPortInfo.productId) {
            portState.device = device
            portState.portName = getPortDisplayName(info, 0)
            _addLog(portState, 'system', `检测到匹配设备 ${name}，正在重连...`)
            setTimeout(() => connectPort(portState.id), 300)
          }
        }
      }
    })
  }

  // ===== 序列化（用于 workspace 保存） =====

  const serializePorts = () => {
    return ports.value.map(p => ({
      id: p.id,
      label: p.label,
      transportType: p.transportType,
      portName: p.portName,
      savedVendorId: p.savedVendorId,
      savedProductId: p.savedProductId,
      connectOnRestore: p.connectOnRestore,
      websocketUrl: p.websocketUrl,
      baudRate: p.baudRate,
      dataBits: p.dataBits,
      stopBits: p.stopBits,
      parity: p.parity,
      showTerminalRx: p.showTerminalRx,
      terminalRxPreferenceLocked: p.terminalRxPreferenceLocked,
      parserId: p.parserId,
      parserConfig: p.parserConfig,
      hiddenParsedChannelKeys: p.hiddenParsedChannelKeys,
      channelOffset: p.channelOffset,
      channelCount: p.channelCount,
      autoReconnect: p.autoReconnect
    }))
  }

  const restorePorts = (savedPorts) => {
    // 清除现有端口
    for (const portState of ports.value) {
      if (portState.connected) {
        portState._manager?.disconnect()
      }
      _cleanupPort(portState)
    }
    ports.value = []

    if (!Array.isArray(savedPorts) || savedPorts.length === 0) return

    for (const saved of savedPorts) {
      const portState = addPort({
        label: saved.label,
        transportType: saved.transportType,
        websocketUrl: saved.websocketUrl,
        baudRate: saved.baudRate,
        dataBits: saved.dataBits,
        stopBits: saved.stopBits,
        parity: saved.parity,
        savedVendorId: saved.savedVendorId,
        savedProductId: saved.savedProductId,
        connectOnRestore: saved.connectOnRestore,
        showTerminalRx: saved.showTerminalRx,
        terminalRxPreferenceLocked: saved.terminalRxPreferenceLocked,
        parserId: resolveParserId(saved.parserId),
        parserConfig: saved.parserConfig,
        hiddenParsedChannelKeys: saved.hiddenParsedChannelKeys
      })
      portState.portName = saved.portName || ''
      portState.channelCount = saved.channelCount || 0
      portState.autoReconnect = saved.autoReconnect !== false
    }

    _recalcChannelOffsets()
    rebindAuthorizedDevices()
  }

  // ===== 聚合 computed =====

  const anyConnected = computed(() => ports.value.some(p => p.connected))

  const totalStats = computed(() => {
    let rx = 0, tx = 0, rxR = 0, txR = 0
    for (const p of ports.value) {
      rx += p.totalRx
      tx += p.totalTx
      rxR += p.rxRate
      txR += p.txRate
    }
    return { totalRx: rx, totalTx: tx, rxRate: rxR, txRate: txR }
  })

  // ===== 格式化 =====

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return {
    ports,
    isSupported: serialSupported,
    serialSupported,
    anyConnected,
    totalStats,

    addPort,
    removePort,
    getPort,
    setPortBaudRate,
    setPortTerminalRx,
    setPortTransportType,
    setPortWebSocketUrl,
    requestPortDevice,
    getAuthorizedPorts,
    assignDevice,
    rebindAuthorizedDevices,
    connectPort,
    disconnectPort,
    togglePort,
    setPortParser,
    getAvailableParsers,
    hideParsedChannel,
    isParsedChannelHidden,
    refreshParserBindings,
    sendToPort,
    sendFileToPort,
    clearPortLogs,
    addPortLog,
    serializePorts,
    restorePorts,
    formatBytes,
    setOnParsedData,
    highBaudSilentThreshold: HIGH_BAUD_SILENT_THRESHOLD
  }
})
