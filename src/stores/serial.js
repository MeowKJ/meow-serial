import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { serialManager, SerialManager } from '../utils/serialManager'
import {
  getLayoutList,
  loadConnectionConfig,
  loadLayout,
  loadProtocolConfig,
  loadWorkspace,
  saveConnectionConfig,
  saveLayout,
  saveProtocolConfig,
  saveWorkspace
} from '../utils/storage'
import { useThemeStore } from './theme'

export const useSerialStore = defineStore('serial', () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  const radarCliManager = new SerialManager()
  const heldValueWindowMs = 3000
  const heldChannelNames = new Set(['BPM', '置信度'])
  const heldChannelState = new Map()
  let persistenceReady = false

  // ===== 连接状态 =====
  const connected = ref(false)
  const connecting = ref(false)
  const selectedPort = ref(null)
  const selectedPortName = ref('')
  const radarCliPort = ref(null)
  const radarCliPortName = ref('')
  const radarCliConnected = ref(false)
  const radarCliConnecting = ref(false)
  const baudRate = ref(115200)
  const dataBits = ref(8)
  const stopBits = ref(1)
  const parity = ref('none')
  
  // 可用端口列表
  const ports = ref([])
  
  // Web Serial API 支持状态
  const isSupported = ref(serialManager.isSupported)
  
  // 错误信息
  const lastError = ref('')

  // 自动重连
  const autoReconnect = ref(true)
  const reconnecting = ref(false)
  const reconnectTargetName = ref('') // 重连目标端口名称，用于UI显示
  let reconnectTimer = null
  let lastPortInfo = null // 保存最后连接的端口信息用于重连

  // ===== 数据统计 =====
  const totalRx = ref(0)
  const totalTx = ref(0)
  const rxRate = ref(0)
  const txRate = ref(0)
  const fps = ref(60)
  
  // 统计更新定时器
  let statsInterval = null

  // 端口列表刷新定时器
  let portsRefreshInterval = null

  // ===== 数据通道 =====
  // 获取主题系统的通道颜色
  const themeStore = useThemeStore()
  
  // 初始化通道（使用默认颜色，主题初始化后会更新）
  const channels = ref([
    { id: 0, name: '通道1', color: '#7DD3FC', enabled: true, value: 0 },
    { id: 1, name: '通道2', color: '#38BDF8', enabled: true, value: 0 },
    { id: 2, name: '通道3', color: '#0EA5E9', enabled: true, value: 0 },
    { id: 3, name: '通道4', color: '#0284C7', enabled: false, value: 0 }
  ])
  
  // 更新通道颜色的函数
  const updateChannelColors = () => {
    const newColors = themeStore.getChannelColors()
    if (newColors && newColors.length > 0) {
      channels.value.forEach((ch, index) => {
        if (newColors[index]) {
          ch.color = newColors[index]
        }
      })
    }
  }
  
  // 监听主题变化，更新通道颜色
  watch(() => [themeStore.currentTheme, themeStore.isDark], () => {
    updateChannelColors()
  }, { immediate: false })
  
  // 延迟更新通道颜色（等待主题初始化）
  setTimeout(() => {
    updateChannelColors()
  }, 100)

  const savedConnectionConfig = loadConnectionConfig()
  if (savedConnectionConfig) {
    baudRate.value = savedConnectionConfig.baudRate ?? baudRate.value
    dataBits.value = savedConnectionConfig.dataBits ?? dataBits.value
    stopBits.value = savedConnectionConfig.stopBits ?? stopBits.value
    parity.value = savedConnectionConfig.parity ?? parity.value
  }

  // ===== 数据历史 =====
  const dataHistory = ref([])
  const temperatureHistory = ref([])
  const maxHistoryLength = 500
  const temperatureHistoryMaxLength = 20000

  // ===== 终端日志 =====
  const terminalLogs = ref([])
  const maxTerminalLogs = 1000

  // ===== 协议配置 =====
  const protocol = ref({
    type: 'line',
    separator: ',',
    endMark: '\n',
    customParser: '',
    radarCfgDelayMs: 80,
    waitForLF: false,        // 等待LF才输出（默认关闭，保持原生实时输出）
    filterEmptyLines: false // 过滤空行（默认关闭）
  })

  const savedProtocolConfig = loadProtocolConfig()
  if (savedProtocolConfig) {
    protocol.value = { ...protocol.value, ...savedProtocolConfig }
  }

  // ===== 控件 =====
  const widgets = ref([])
  let widgetIdCounter = 1
  let lastMmwaveLoggedFrame = -1

  const normalizeWidgets = (items = []) => {
    return items.map((widget, index) => ({
      ...widget,
      id: typeof widget.id === 'number' ? widget.id : index + 1
    }))
  }

  const normalizeChannels = (items = []) => {
    const channelColors = themeStore.getChannelColors()

    return items.map((channel, index) => ({
      id: typeof channel.id === 'number' ? channel.id : index,
      name: channel.name || `通道${index + 1}`,
      color: channel.color || channelColors[index % channelColors.length] || '#7DD3FC',
      enabled: channel.enabled !== false,
      value: Number.isFinite(channel.value) ? channel.value : 0
    }))
  }

  const getWorkspaceSnapshot = () => ({
    widgets: widgets.value,
    channels: channels.value,
    protocol: protocol.value
  })

  const applyWorkspaceSnapshot = (snapshot) => {
    if (!snapshot) return false

    if (Array.isArray(snapshot.channels) && snapshot.channels.length > 0) {
      channels.value = normalizeChannels(snapshot.channels)
    }

    if (snapshot.protocol && typeof snapshot.protocol === 'object') {
      protocol.value = { ...protocol.value, ...snapshot.protocol }
      serialManager.setProtocol({
        type: protocol.value.type || 'line',
        delimiter: protocol.value.endMark || '\n',
        length: protocol.value.length || 0,
        waitForLF: protocol.value.waitForLF,
        filterEmptyLines: protocol.value.filterEmptyLines
      })
    }

    if (Array.isArray(snapshot.widgets)) {
      widgets.value = normalizeWidgets(snapshot.widgets)
      widgetIdCounter = Math.max(1, ...widgets.value.map(widget => widget.id || 0)) + 1
    }

    return true
  }

  const saveWorkspaceState = () => {
    if (!persistenceReady) return false
    return saveWorkspace(getWorkspaceSnapshot())
  }

  const loadWorkspaceState = () => {
    const snapshot = loadWorkspace()
    if (!snapshot) return false
    return applyWorkspaceSnapshot(snapshot)
  }

  const saveNamedLayout = (name) => {
    if (!name) return false
    return saveLayout(name, getWorkspaceSnapshot())
  }

  const loadNamedLayout = (name) => {
    if (!name) return false
    const snapshot = loadLayout(name)
    if (!snapshot) return false
    return applyWorkspaceSnapshot(snapshot)
  }

  const listSavedLayouts = () => getLayoutList()

  const ensureChannelCount = (count, labels = []) => {
    const channelColors = themeStore.getChannelColors()

    while (channels.value.length < count) {
      const newId = channels.value.length
      channels.value.push({
        id: newId,
        name: labels[newId] || `通道${newId + 1}`,
        color: channelColors[newId % channelColors.length] || channelColors[0] || '#7DD3FC',
        enabled: true,
        value: 0
      })
    }
  }

  const pushHistorySnapshot = (timestamp) => {
    const historyEntry = {
      time: timestamp,
      values: channels.value.map(ch => ch.value)
    }

    dataHistory.value.push(historyEntry)
    if (dataHistory.value.length > maxHistoryLength) {
      dataHistory.value.shift()
    }
  }

  const applyParsedValues = (values, labels = [], timestamp = Date.now()) => {
    if (!Array.isArray(values) || values.length === 0) return

    ensureChannelCount(values.length, labels)

    channels.value.forEach((channel, index) => {
      const nextLabel = labels[index]
      if (nextLabel) {
        channel.name = nextLabel
      } else if (index >= values.length) {
        channel.name = `通道${index + 1}`
      }

      const holdKey = nextLabel || channel.name
      const shouldHold = heldChannelNames.has(holdKey)
      const hasIncomingValue = index < values.length
      const incomingValue = hasIncomingValue ? values[index] : Number.NaN

      if (index < values.length) {
        if (shouldHold) {
          if (Number.isFinite(incomingValue)) {
            channel.value = incomingValue
            heldChannelState.set(holdKey, {
              value: incomingValue,
              timestamp
            })
          } else {
            const held = heldChannelState.get(holdKey)
            if (held && (timestamp - held.timestamp) <= heldValueWindowMs) {
              channel.value = held.value
            } else {
              channel.value = Number.NaN
            }
          }
        } else {
          channel.value = incomingValue
        }
      } else {
        if (shouldHold) {
          const held = heldChannelState.get(holdKey)
          if (held && (timestamp - held.timestamp) <= heldValueWindowMs) {
            channel.value = held.value
          } else {
            channel.value = Number.NaN
          }
        } else {
          channel.value = 0
        }
      }
    })

    pushHistorySnapshot(timestamp)
  }

  const updateNamedChannelValue = (channelName, value, timestamp = Date.now()) => {
    if (!channelName) return

    const channel = channels.value.find(item => item.name === channelName)
    if (!channel) return

    channel.value = Number.isFinite(value) ? value : Number.NaN
    if (channelName === '温度(°C)') {
      recordTemperatureSample(value, timestamp)
    }

    pushHistorySnapshot(timestamp)
  }

  const recordTemperatureSample = (value, timestamp = Date.now()) => {
    if (!Number.isFinite(value)) return

    const lastPoint = temperatureHistory.value[temperatureHistory.value.length - 1]
    if (!lastPoint || lastPoint.time !== timestamp || lastPoint.value !== value) {
      temperatureHistory.value.push({
        time: timestamp,
        value
      })

      if (temperatureHistory.value.length > temperatureHistoryMaxLength) {
        temperatureHistory.value.shift()
      }
    }
  }

  const parseRadarCliTemperature = (text) => {
    if (typeof text !== 'string' || !text.includes('Temp:')) {
      return null
    }

    const pmMatch = text.match(/pm\s+(-?\d+(?:\.\d+)?)\s*C/i)
    if (pmMatch) {
      return Number.parseFloat(pmMatch[1])
    }

    const digMatch = text.match(/dig\s+(-?\d+(?:\.\d+)?)/i)
    if (digMatch) {
      return Number.parseFloat(digMatch[1])
    }

    return null
  }

  const parseRadarConfigLines = (text) => {
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('%'))
  }

  // ===== 串口管理器回调 =====
  
  // 数据接收回调
  serialManager.onData = (data) => {
    let logText = data.text
    let logType = 'utf8'
    let logRawBytes = data.raw
    let shouldAddTerminalLog = true

    if (data.parsed && data.parsed.type === 'mmwave') {
      logText = `[Data] ${data.parsed.summary}`
      logType = 'mmwave'
      logRawBytes = null

      const frameNumber = Number(data.parsed.header?.frameNumber ?? -1)
      const isKeyFrame = frameNumber >= 0 && (frameNumber <= 3 || frameNumber % 10 === 0)

      shouldAddTerminalLog = frameNumber < 0 || isKeyFrame
      if (frameNumber === lastMmwaveLoggedFrame) {
        shouldAddTerminalLog = false
      }
      if (shouldAddTerminalLog && frameNumber >= 0) {
        lastMmwaveLoggedFrame = frameNumber
      }
    }

    // 添加到终端日志（包含原始字节数据用于HEX显示）
    if (shouldAddTerminalLog) {
      addLog('rx', logText, logType, logRawBytes)
    }
    
    // 解析数据并更新通道
    if (data.parsed && data.parsed.type === 'values') {
      applyParsedValues(data.parsed.data, [], data.timestamp)
    } else if (data.parsed && data.parsed.type === 'mmwave') {
      applyParsedValues(data.parsed.channelValues, data.parsed.channelLabels, data.timestamp)
      if (data.parsed.temperature?.valid &&
          Number.isFinite(data.parsed.temperature.pmTempC)) {
        recordTemperatureSample(data.parsed.temperature.pmTempC, data.timestamp)
      }
      if (!data.parsed.breathSummary &&
          data.parsed.temperature?.valid &&
          Number.isFinite(data.parsed.temperature.pmTempC)) {
        updateNamedChannelValue('温度(°C)', data.parsed.temperature.pmTempC, data.timestamp)
      }
    }
  }
  
  // 连接成功回调
  serialManager.onConnect = (info) => {
    connected.value = true
    connecting.value = false
    reconnecting.value = false
    lastError.value = ''

    // 保存端口信息用于自动重连
    lastPortInfo = {
      vendorId: info.port?.getInfo?.()?.usbVendorId,
      productId: info.port?.getInfo?.()?.usbProductId,
      portName: selectedPortName.value
    }

    // 启动统计更新
    startStatsUpdate()

    addLog('system', `已连接到 ${selectedPortName.value}，波特率 ${baudRate.value}`)
  }
  
  // 断开连接回调
  serialManager.onDisconnect = (info) => {
    connected.value = false
    connecting.value = false

    // 停止统计更新
    stopStatsUpdate()

    // 如果是设备断开，清理端口引用（旧的port引用已失效）
    if (info.reason === 'device') {
      const disconnectedPortName = selectedPortName.value
      selectedPort.value = null

      addLog('system', `连接已断开: ${disconnectedPortName} 设备已拔出`)

      // 启动自动重连
      if (autoReconnect.value && lastPortInfo) {
        reconnectTargetName.value = disconnectedPortName
        startAutoReconnect()
      }
    } else {
      // 用户主动断开，清理重连状态
      stopAutoReconnect()
      lastPortInfo = null
      reconnectTargetName.value = ''
      addLog('system', `连接已断开: 用户断开`)
    }
  }
  
  // 错误回调
  serialManager.onError = (error) => {
    lastError.value = error.message
    addLog('error', `错误: ${error.message}`)
  }

  // 设备变化回调（设备插入/拔出）
  serialManager.onDeviceChange = async (event) => {
    // 立即刷新端口列表
    await refreshPorts()

    if (event.type === 'connect') {
      // 设备插入
      const port = event.port
      const info = port?.getInfo?.()
      const portName = getPortNameFromInfo(info)
      addLog('system', `检测到设备插入: ${portName}`)

      // 如果正在等待重连，尝试自动连接
      if (reconnecting.value && autoReconnect.value && lastPortInfo) {
        // 检查是否匹配之前的设备
        let isMatch = false
        if (lastPortInfo.vendorId && lastPortInfo.productId) {
          isMatch = info?.usbVendorId === lastPortInfo.vendorId &&
                    info?.usbProductId === lastPortInfo.productId
        }

        if (isMatch) {
          addLog('system', `设备匹配，正在自动重连 ${reconnectTargetName.value}...`)
          // 找到匹配的端口并连接
          const matchedPort = ports.value.find(p => {
            const pInfo = p.port?.getInfo?.()
            return pInfo?.usbVendorId === info?.usbVendorId &&
                   pInfo?.usbProductId === info?.usbProductId
          })

          if (matchedPort) {
            selectPort(matchedPort)
            // 稍微延迟一下让端口准备好
            setTimeout(async () => {
              const success = await connect()
              if (success) {
                stopAutoReconnect()
              }
            }, 300)
          }
        }
      }
    } else if (event.type === 'disconnect') {
      // 设备拔出（非当前连接的设备）
      const port = event.port
      const info = port?.getInfo?.()
      const portName = getPortNameFromInfo(info)

      // 如果拔出的是当前选中但未连接的设备，清理选择
      if (!connected.value && selectedPort.value) {
        const selectedInfo = selectedPort.value?.getInfo?.()
        if (selectedInfo?.usbVendorId === info?.usbVendorId &&
            selectedInfo?.usbProductId === info?.usbProductId) {
          selectedPort.value = null
          selectedPortName.value = ''
          addLog('system', `选中的设备已拔出: ${portName}`)
        }
      }
    }
  }

  // 根据设备信息生成端口名称
  const getPortNameFromInfo = (info) => {
    const knownVendors = {
      0x0403: 'FTDI',
      0x067B: 'Prolific',
      0x10C4: 'Silicon Labs',
      0x1A86: 'CH340',
      0x2341: 'Arduino',
      0x239A: 'Adafruit',
      0x303A: 'Espressif',
      0x1366: 'SEGGER'
    }
    const vendorName = knownVendors[info?.usbVendorId] || ''
    if (vendorName) return vendorName
    if (info?.usbVendorId) return `VID:${info.usbVendorId.toString(16).toUpperCase()}`
    return '未知设备'
  }

  // ===== 方法 =====
  
  /**
   * 刷新端口列表
   */
  const refreshPorts = async () => {
    if (!isSupported.value) return

    const portList = await serialManager.getPorts()
    const newPorts = portList.map(p => ({
      name: p.name,
      port: p.port,
      vendorId: p.vendorId,
      productId: p.productId
    }))

    // 只有当端口列表变化时才更新（通过比较名称列表）
    const oldNames = ports.value.map(p => p.name).sort().join(',')
    const newNames = newPorts.map(p => p.name).sort().join(',')

    if (oldNames !== newNames) {
      ports.value = newPorts
    }
  }
  
  /**
   * 请求选择新端口
   */
  const requestPort = async () => {
    const result = await serialManager.requestPort()
    if (result) {
      selectedPort.value = result.port
      selectedPortName.value = result.name
      
      // 刷新端口列表
      await refreshPorts()
      
      return true
    }
    return false
  }

  /**
   * 请求选择雷达 CLI 串口
   */
  const requestRadarCliPort = async () => {
    addLog('system', '正在请求雷达 CLI 串口授权...')
    const result = await radarCliManager.requestPort()
    if (result) {
      radarCliPort.value = result.port
      radarCliPortName.value = result.name
      addLog('system', `已授权雷达 CLI 串口: ${result.name}`)
      return true
    }

    addLog('system', '未选择雷达 CLI 串口')
    return false
  }

  /**
   * 连接雷达 CLI 串口
   */
  const connectRadarCli = async () => {
    if (!radarCliPort.value) {
      const selected = await requestRadarCliPort()
      if (!selected) {
        return false
      }
    }

    radarCliConnecting.value = true
    radarCliManager.setProtocol({
      type: 'line',
      delimiter: '\n',
      length: 0,
      waitForLF: true,
      filterEmptyLines: false
    })

    const success = await radarCliManager.connect(radarCliPort.value, {
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    })

    if (!success) {
      radarCliConnecting.value = false
    }

    return success
  }

  /**
   * 断开雷达 CLI 串口
   */
  const disconnectRadarCli = async () => {
    radarCliConnecting.value = false
    return await radarCliManager.disconnect()
  }

  /**
   * 切换雷达 CLI 监听状态
   */
  const toggleRadarCli = async () => {
    if (radarCliConnected.value) {
      return await disconnectRadarCli()
    }
    return await connectRadarCli()
  }
  
  /**
   * 连接串口
   */
  const connect = async () => {
    if (!selectedPort.value) {
      // 如果没有选择端口，请求用户选择
      const result = await requestPort()
      if (!result) return false
    }
    
    connecting.value = true
    lastError.value = ''
    
    // 应用协议配置
    serialManager.setProtocol({
      type: protocol.value.type || 'line',
      delimiter: protocol.value.endMark || '\n',
      length: protocol.value.length || 0,
      waitForLF: protocol.value.waitForLF,
      filterEmptyLines: protocol.value.filterEmptyLines
    })
    
    const success = await serialManager.connect(selectedPort.value, {
      baudRate: baudRate.value,
      dataBits: dataBits.value,
      stopBits: stopBits.value,
      parity: parity.value
    })

    if (!success) {
      connecting.value = false
      // 连接失败时清理端口选择并刷新列表，可能是端口已失效
      selectedPort.value = null
      await refreshPorts()
    }

    return success
  }
  
  /**
   * 断开连接
   */
  const disconnect = async () => {
    return await serialManager.disconnect()
  }
  
  /**
   * 切换连接状态
   */
  const toggleConnect = async () => {
    if (connected.value) {
      return await disconnect()
    } else {
      return await connect()
    }
  }
  
  /**
   * 选择端口
   */
  const selectPort = (portInfo) => {
    selectedPort.value = portInfo.port
    selectedPortName.value = portInfo.name
  }

  /**
   * 启动统计更新
   */
  const startStatsUpdate = () => {
    let lastRx = 0
    let lastTx = 0
    let lastTime = Date.now()
    
    statsInterval = setInterval(() => {
      const stats = serialManager.getStats()
      const now = Date.now()
      const elapsed = (now - lastTime) / 1000
      
      totalRx.value = stats.bytesReceived
      totalTx.value = stats.bytesSent
      
      // 计算速率
      rxRate.value = (stats.bytesReceived - lastRx) / elapsed
      txRate.value = (stats.bytesSent - lastTx) / elapsed
      
      lastRx = stats.bytesReceived
      lastTx = stats.bytesSent
      lastTime = now
    }, 500)
  }
  
  /**
   * 停止统计更新
   */
  const stopStatsUpdate = () => {
    if (statsInterval) {
      clearInterval(statsInterval)
      statsInterval = null
    }
  }

  /**
   * 启动自动重连
   * 主要依靠设备插入事件触发，轮询作为备用机制
   */
  const startAutoReconnect = () => {
    if (reconnecting.value) return // 已经在重连中

    reconnecting.value = true
    addLog('system', `等待 ${reconnectTargetName.value} 重新插入...`)

    // 备用轮询机制，每3秒检查一次（主要依靠设备事件）
    reconnectTimer = setInterval(async () => {
      if (!autoReconnect.value || connected.value) {
        stopAutoReconnect()
        return
      }

      // 静默刷新端口列表
      await refreshPorts()

      // 尝试找到匹配的端口
      if (lastPortInfo && ports.value.length > 0) {
        const matchedPort = ports.value.find(p => {
          const info = p.port?.getInfo?.()
          if (lastPortInfo.vendorId && lastPortInfo.productId) {
            return info?.usbVendorId === lastPortInfo.vendorId &&
                   info?.usbProductId === lastPortInfo.productId
          }
          return false
        })

        if (matchedPort) {
          addLog('system', `检测到 ${reconnectTargetName.value}，正在重连...`)
          selectPort(matchedPort)
          const success = await connect()
          if (success) {
            stopAutoReconnect()
          }
        }
      }
    }, 3000)
  }

  /**
   * 停止自动重连
   */
  const stopAutoReconnect = () => {
    if (reconnectTimer) {
      clearInterval(reconnectTimer)
      reconnectTimer = null
    }
    reconnecting.value = false
    reconnectTargetName.value = ''
  }

  /**
   * 添加日志
   */
  const addLog = (direction, data, type = 'utf8', rawBytes = null) => {
    const now = new Date()
    const time = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0')
    
    terminalLogs.value.push({
      id: Date.now() + Math.random(),
      time,
      dir: direction,
      data,
      type,
      rawBytes: rawBytes || (type === 'hex' ? null : null) // 保存原始字节用于HEX显示
    })
    
    if (terminalLogs.value.length > maxTerminalLogs) {
      terminalLogs.value.shift()
    }
  }

  radarCliManager.onError = (error) => {
    radarCliConnecting.value = false
    addLog('error', `雷达 CLI 错误: ${error.message}`)
  }

  radarCliManager.onData = (data) => {
    addLog('rx', `[CLI] ${data.text}`, 'utf8', data.raw)

    const temperature = parseRadarCliTemperature(data.text)
    if (Number.isFinite(temperature)) {
      updateNamedChannelValue('温度(°C)', temperature, data.timestamp || Date.now())
    }
  }

  radarCliManager.onConnect = () => {
    radarCliConnected.value = true
    radarCliConnecting.value = false
    addLog('system', `雷达 CLI 串口已连接: ${radarCliPortName.value}`)
  }

  radarCliManager.onDisconnect = () => {
    radarCliConnected.value = false
    radarCliConnecting.value = false
    addLog('system', '雷达 CLI 串口已关闭')
  }

  /**
   * 发送数据
   */
  const send = async (data, options = {}) => {
    if (!connected.value) {
      lastError.value = '串口未连接'
      return false
    }
    
    const success = await serialManager.send(data, options)
    
    if (success) {
      // 如果是HEX发送，保存原始字节数据
      let rawBytes = null
      if (options.isHex) {
        const hex = data.replace(/\s/g, '')
        rawBytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < rawBytes.length; i++) {
          rawBytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
      } else {
        const encoder = new TextEncoder()
        rawBytes = encoder.encode(data + (options.appendCR ? '\r' : '') + (options.appendLF ? '\n' : ''))
      }
      addLog('tx', data, options.isHex ? 'hex' : 'utf8', rawBytes)
    }
    
    return success
  }
  
  /**
   * 发送字节
   */
  const sendBytes = async (bytes) => {
    if (!connected.value) {
      lastError.value = '串口未连接'
      return false
    }
    
    const success = await serialManager.sendBytes(bytes)
    
    if (success) {
      const bytesArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const hex = Array.from(bytesArray).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      addLog('tx', hex, 'hex', bytesArray)
    }
    
    return success
  }

  /**
   * 发送数据到雷达 CLI 串口
   */
  const sendRadarCli = async (data, options = {}) => {
    if (!radarCliPort.value) {
      addLog('error', '未授权雷达 CLI 串口')
      return false
    }

    if (!radarCliConnected.value) {
      const cliConnected = await connectRadarCli()
      if (!cliConnected) {
        addLog('error', '雷达 CLI 串口连接失败')
        return false
      }
    }

    const success = await radarCliManager.send(data, options)

    if (success) {
      let rawBytes = null
      if (options.isHex) {
        const hex = data.replace(/\s/g, '')
        rawBytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < rawBytes.length; i++) {
          rawBytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
      } else {
        const encoder = new TextEncoder()
        rawBytes = encoder.encode(data + (options.appendCR ? '\r' : '') + (options.appendLF ? '\n' : ''))
      }
      addLog('tx', `[CLI] ${data}`, options.isHex ? 'hex' : 'utf8', rawBytes)
    }

    return success
  }

  /**
   * 按行发送雷达 cfg 文本
   */
  const sendRadarConfigText = async (text, options = {}) => {
    const lines = parseRadarConfigLines(text)
    const delayMs = Number.isFinite(options.delayMs)
      ? options.delayMs
      : protocol.value.radarCfgDelayMs

    if (lines.length === 0) {
      addLog('error', 'cfg 文件为空或只包含注释')
      return false
    }

    addLog('system', `开始发送雷达 cfg，共 ${lines.length} 行，间隔 ${delayMs} ms`)

    if (!radarCliPort.value) {
      addLog('error', '双串口模式下发送 cfg 必须先授权专用雷达 CLI 串口')
      return false
    }

    if (!radarCliConnected.value) {
      const cliConnected = await connectRadarCli()
      if (!cliConnected) {
        addLog('error', '雷达 CLI 串口打开失败，请重新授权该端口')
        radarCliPort.value = null
        radarCliPortName.value = ''
        return false
      }
    }

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      const success = await radarCliManager.send(line, {
        appendCR: true,
        appendLF: true,
        isHex: false
      })

      if (!success) {
        addLog('error', `cfg 发送失败，停止在第 ${index + 1} 行: ${line}`)
        return false
      }

      addLog('tx', `[CLI] ${line}`, 'utf8', new TextEncoder().encode(`${line}\r\n`))

      if (delayMs > 0 && index < lines.length - 1) {
        await sleep(delayMs)
      }
    }

    addLog('system', `雷达 cfg 发送完成，CLI 串口保持监听: ${radarCliPortName.value}`)
    return true
  }

  /**
   * 清空所有数据
   */
  const clearAll = () => {
    dataHistory.value = []
    temperatureHistory.value = []
    terminalLogs.value = []
    serialManager.resetStats()
    totalRx.value = 0
    totalTx.value = 0
  }
  
  /**
   * 清空终端
   */
  const clearTerminal = () => {
    terminalLogs.value = []
  }

  /**
   * 设置协议
   */
  const setProtocol = (config) => {
    protocol.value = { ...protocol.value, ...config }
    serialManager.setProtocol({
      type: config.type || protocol.value.type || 'line',
      delimiter: config.endMark !== undefined ? config.endMark : (protocol.value.endMark || '\n'),
      length: config.length !== undefined ? config.length : (protocol.value.length || 0),
      waitForLF: config.waitForLF !== undefined ? config.waitForLF : protocol.value.waitForLF,
      filterEmptyLines: config.filterEmptyLines !== undefined ? config.filterEmptyLines : protocol.value.filterEmptyLines
    })
  }
  
  // 监听协议配置变化，同步到 serialManager
  watch(() => [protocol.value.waitForLF, protocol.value.filterEmptyLines], () => {
    if (connected.value) {
      serialManager.setProtocol({
        type: protocol.value.type,
        delimiter: protocol.value.endMark || '\n',
        length: protocol.value.length || 0,
        waitForLF: protocol.value.waitForLF,
        filterEmptyLines: protocol.value.filterEmptyLines
      })
    }
  })

  // ===== 控件管理 =====
  
  const addWidget = (widget) => {
    widgets.value.push({
      ...widget,
      id: widgetIdCounter++
    })
  }

  const removeWidget = (id) => {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index !== -1) {
      widgets.value.splice(index, 1)
    }
  }

  const updateWidget = (id, updates) => {
    const widget = widgets.value.find(w => w.id === id)
    if (widget) {
      Object.assign(widget, updates)
    }
  }

  /**
   * 格式化字节数
   */
  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }
  
  /**
   * 添加通道
   */
  const addChannel = () => {
    const channelColors = themeStore.getChannelColors()
    const newId = channels.value.length
    
    channels.value.push({
      id: newId,
      name: `通道${newId + 1}`,
      color: channelColors[newId % channelColors.length] || channelColors[0] || '#7DD3FC',
      enabled: true,
      value: 0
    })
  }
  
  /**
   * 删除通道
   */
  const removeChannel = (id) => {
    const index = channels.value.findIndex(ch => ch.id === id)
    if (index !== -1 && channels.value.length > 1) {
      channels.value.splice(index, 1)
    }
  }

  /**
   * 启动端口列表自动刷新
   */
  const startPortsRefresh = () => {
    if (portsRefreshInterval) return

    // 每2秒刷新一次端口列表
    portsRefreshInterval = setInterval(() => {
      refreshPorts()
    }, 2000)
  }

  /**
   * 停止端口列表自动刷新
   */
  const stopPortsRefresh = () => {
    if (portsRefreshInterval) {
      clearInterval(portsRefreshInterval)
      portsRefreshInterval = null
    }
  }

  watch([baudRate, dataBits, stopBits, parity], () => {
    if (!persistenceReady) return

    saveConnectionConfig({
      baudRate: baudRate.value,
      dataBits: dataBits.value,
      stopBits: stopBits.value,
      parity: parity.value
    })
  })

  watch(protocol, (nextProtocol) => {
    if (!persistenceReady) return

    saveProtocolConfig(nextProtocol)
    saveWorkspaceState()
  }, { deep: true })

  watch(channels, () => {
    saveWorkspaceState()
  }, { deep: true })

  watch(widgets, () => {
    saveWorkspaceState()
  }, { deep: true })

  // 初始化
  loadWorkspaceState()
  persistenceReady = true

  if (isSupported.value) {
    refreshPorts()
    startPortsRefresh() // 启动自动刷新
  }

  return {
    // 状态
    connected,
    connecting,
    reconnecting,
    reconnectTargetName,
    autoReconnect,
    selectedPort,
    selectedPortName,
    radarCliPort,
    radarCliPortName,
    radarCliConnected,
    radarCliConnecting,
    baudRate,
    dataBits,
    stopBits,
    parity,
    ports,
    isSupported,
    lastError,
    totalRx,
    totalTx,
    rxRate,
    txRate,
    fps,
    channels,
    dataHistory,
    temperatureHistory,
    terminalLogs,
    protocol,
    widgets,
    
    // 方法
    refreshPorts,
    requestPort,
    requestRadarCliPort,
    connectRadarCli,
    disconnectRadarCli,
    toggleRadarCli,
    connect,
    disconnect,
    toggleConnect,
    selectPort,
    send,
    sendBytes,
    sendRadarCli,
    sendRadarConfigText,
    addLog,
    clearAll,
    clearTerminal,
    setProtocol,
    addWidget,
    removeWidget,
    updateWidget,
    saveWorkspaceState,
    saveNamedLayout,
    loadNamedLayout,
    listSavedLayouts,
    formatBytes,
    addChannel,
    removeChannel,
    stopAutoReconnect
  }
})
