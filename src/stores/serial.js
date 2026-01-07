import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { serialManager } from '../utils/serialManager'
import { useThemeStore } from './theme'

export const useSerialStore = defineStore('serial', () => {
  // ===== 连接状态 =====
  const connected = ref(false)
  const connecting = ref(false)
  const selectedPort = ref(null)
  const selectedPortName = ref('')
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

  // ===== 数据统计 =====
  const totalRx = ref(0)
  const totalTx = ref(0)
  const rxRate = ref(0)
  const txRate = ref(0)
  const fps = ref(60)
  
  // 统计更新定时器
  let statsInterval = null

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

  // ===== 数据历史 =====
  const dataHistory = ref([])
  const maxHistoryLength = 500

  // ===== 终端日志 =====
  const terminalLogs = ref([])
  const maxTerminalLogs = 1000

  // ===== 协议配置 =====
  const protocol = ref({
    type: 'line',
    separator: ',',
    endMark: '\n',
    customParser: ''
  })

  // ===== 控件 =====
  const widgets = ref([])
  let widgetIdCounter = 1

  // ===== 串口管理器回调 =====
  
  // 数据接收回调
  serialManager.onData = (data) => {
    // 添加到终端日志（包含原始字节数据用于HEX显示）
    addLog('rx', data.text, 'ascii', data.raw)
    
    // 解析数据并更新通道
    if (data.parsed && data.parsed.type === 'values') {
      const values = data.parsed.data
      
      // 更新通道值
      values.forEach((value, index) => {
        if (index < channels.value.length) {
          channels.value[index].value = value
        }
      })
      
      // 添加到历史记录
      const historyEntry = {
        time: data.timestamp,
        values: channels.value.map(ch => ch.value)
      }
      
      dataHistory.value.push(historyEntry)
      if (dataHistory.value.length > maxHistoryLength) {
        dataHistory.value.shift()
      }
    }
  }
  
  // 连接成功回调
  serialManager.onConnect = (info) => {
    connected.value = true
    connecting.value = false
    lastError.value = ''
    
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
    
    const reason = info.reason === 'device' ? '设备已断开' : '用户断开'
    addLog('system', `连接已断开: ${reason}`)
  }
  
  // 错误回调
  serialManager.onError = (error) => {
    lastError.value = error.message
    addLog('error', `错误: ${error.message}`)
  }

  // ===== 方法 =====
  
  /**
   * 刷新端口列表
   */
  const refreshPorts = async () => {
    if (!isSupported.value) return
    
    const portList = await serialManager.getPorts()
    ports.value = portList.map(p => ({
      name: p.name,
      port: p.port,
      vendorId: p.vendorId,
      productId: p.productId
    }))
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
    
    const success = await serialManager.connect(selectedPort.value, {
      baudRate: baudRate.value,
      dataBits: dataBits.value,
      stopBits: stopBits.value,
      parity: parity.value
    })
    
    if (!success) {
      connecting.value = false
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
   * 添加日志
   */
  const addLog = (direction, data, type = 'ascii', rawBytes = null) => {
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
      addLog('tx', data, options.isHex ? 'hex' : 'ascii', rawBytes)
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
   * 清空所有数据
   */
  const clearAll = () => {
    dataHistory.value = []
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
      type: config.type || 'line',
      delimiter: config.endMark || '\n',
      length: config.length || 0
    })
  }

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

  // 初始化时刷新端口列表
  if (isSupported.value) {
    refreshPorts()
  }

  return {
    // 状态
    connected,
    connecting,
    selectedPort,
    selectedPortName,
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
    terminalLogs,
    protocol,
    widgets,
    
    // 方法
    refreshPorts,
    requestPort,
    connect,
    disconnect,
    toggleConnect,
    selectPort,
    send,
    sendBytes,
    addLog,
    clearAll,
    clearTerminal,
    setProtocol,
    addWidget,
    removeWidget,
    updateWidget,
    formatBytes,
    addChannel,
    removeChannel
  }
})
