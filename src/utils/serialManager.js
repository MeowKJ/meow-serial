/**
 * 串口管理模块
 * 使用 Web Serial API 实现真实串口通信
 * 支持 Chrome 89+, Edge 89+
 */

class SerialManager {
  constructor() {
    this.port = null
    this.reader = null
    this.writer = null
    this.readableStreamClosed = null
    this.writableStreamClosed = null
    this.isConnected = false
    this.isReading = false
    
    // 数据缓冲区
    this.buffer = new Uint8Array(0)
    
    // 回调函数
    this.onData = null           // 接收数据回调
    this.onConnect = null        // 连接成功回调
    this.onDisconnect = null     // 断开连接回调
    this.onError = null          // 错误回调
    
    // 配置
    this.config = {
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    }
    
    // 协议解析配置
    this.protocol = {
      type: 'line',        // 'line' | 'length' | 'delimiter' | 'raw'
      delimiter: '\n',     // 行结束符
      length: 0,           // 固定长度
      timeout: 100         // 超时时间(ms)
    }
    
    // 统计信息
    this.stats = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      errors: 0,
      startTime: null
    }
    
    // 检测 Web Serial API 支持
    this.isSupported = 'serial' in navigator
  }
  
  /**
   * 检查浏览器是否支持 Web Serial API
   */
  checkSupport() {
    if (!this.isSupported) {
      const error = new Error('您的浏览器不支持 Web Serial API，请使用 Chrome 89+ 或 Edge 89+')
      if (this.onError) this.onError(error)
      return false
    }
    return true
  }
  
  /**
   * 获取已授权的串口列表
   */
  async getPorts() {
    if (!this.checkSupport()) return []
    
    try {
      const ports = await navigator.serial.getPorts()
      return ports.map((port, index) => {
        const info = port.getInfo()
        return {
          port,
          index,
          vendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : '',
          productId: info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : '',
          name: this.getPortName(info, index)
        }
      })
    } catch (error) {
      if (this.onError) this.onError(error)
      return []
    }
  }
  
  /**
   * 根据设备信息生成端口名称
   */
  getPortName(info, index) {
    // 常见USB转串口芯片的VID
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
    
    const vendorName = knownVendors[info.usbVendorId] || ''
    
    if (vendorName) {
      return `串口 ${index + 1} (${vendorName})`
    }
    
    if (info.usbVendorId) {
      return `串口 ${index + 1} (VID:${info.usbVendorId.toString(16).toUpperCase()})`
    }
    
    return `串口 ${index + 1}`
  }
  
  /**
   * 请求用户选择串口
   */
  async requestPort() {
    if (!this.checkSupport()) return null
    
    try {
      const port = await navigator.serial.requestPort()
      const info = port.getInfo()
      return {
        port,
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
        name: this.getPortName(info, 0)
      }
    } catch (error) {
      // 用户取消选择不算错误
      if (error.name !== 'NotFoundError') {
        if (this.onError) this.onError(error)
      }
      return null
    }
  }
  
  /**
   * 连接到串口
   */
  async connect(portOrInfo, config = {}) {
    if (!this.checkSupport()) return false
    
    // 合并配置
    this.config = { ...this.config, ...config }
    
    try {
      // 获取端口对象
      this.port = portOrInfo.port || portOrInfo
      
      // 打开串口
      await this.port.open({
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity,
        flowControl: this.config.flowControl
      })
      
      this.isConnected = true
      this.stats.startTime = Date.now()
      this.stats.bytesReceived = 0
      this.stats.bytesSent = 0
      
      // 开始读取数据
      this.startReading()
      
      // 监听断开事件
      navigator.serial.addEventListener('disconnect', this.handleDisconnect.bind(this))
      
      if (this.onConnect) {
        this.onConnect({
          port: this.port,
          config: this.config
        })
      }
      
      return true
    } catch (error) {
      this.isConnected = false
      if (this.onError) this.onError(error)
      return false
    }
  }
  
  /**
   * 断开连接
   */
  async disconnect() {
    this.isReading = false
    
    try {
      // 关闭读取器
      if (this.reader) {
        await this.reader.cancel()
        this.reader = null
      }
      
      // 关闭写入器
      if (this.writer) {
        await this.writer.close()
        this.writer = null
      }
      
      // 关闭端口
      if (this.port) {
        await this.port.close()
        this.port = null
      }
      
      this.isConnected = false
      
      if (this.onDisconnect) {
        this.onDisconnect({ reason: 'user' })
      }
      
      return true
    } catch (error) {
      this.isConnected = false
      if (this.onError) this.onError(error)
      return false
    }
  }
  
  /**
   * 处理设备断开
   */
  handleDisconnect(event) {
    if (event.target === this.port) {
      this.isConnected = false
      this.isReading = false
      
      if (this.onDisconnect) {
        this.onDisconnect({ reason: 'device' })
      }
    }
  }
  
  /**
   * 开始读取数据
   */
  async startReading() {
    if (!this.port || !this.port.readable) return
    
    this.isReading = true
    
    while (this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader()
        
        while (this.isReading) {
          const { value, done } = await this.reader.read()
          
          if (done) {
            break
          }
          
          if (value) {
            this.handleReceivedData(value)
          }
        }
      } catch (error) {
        if (this.isReading) {
          this.stats.errors++
          if (this.onError) this.onError(error)
        }
      } finally {
        if (this.reader) {
          this.reader.releaseLock()
          this.reader = null
        }
      }
    }
  }
  
  /**
   * 处理接收到的数据
   */
  handleReceivedData(data) {
    this.stats.bytesReceived += data.length
    
    // 根据协议类型处理数据
    switch (this.protocol.type) {
      case 'raw':
        // 原始数据直接回调
        if (this.onData) {
          this.onData({
            raw: data,
            text: new TextDecoder().decode(data),
            timestamp: Date.now()
          })
        }
        break
        
      case 'line':
        // 行模式：按换行符分割
        this.processLineData(data)
        break
        
      case 'delimiter':
        // 自定义分隔符
        this.processDelimiterData(data)
        break
        
      case 'length':
        // 固定长度
        this.processLengthData(data)
        break
        
      default:
        this.processLineData(data)
    }
  }
  
  /**
   * 行模式数据处理
   */
  processLineData(data) {
    // 合并到缓冲区
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
    
    // 查找换行符
    const decoder = new TextDecoder()
    const text = decoder.decode(this.buffer)
    const lines = text.split(/\r?\n/)
    
    // 处理完整的行
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (line) {
        this.stats.packetsReceived++
        if (this.onData) {
          this.onData({
            raw: new TextEncoder().encode(line),
            text: line,
            timestamp: Date.now(),
            parsed: this.parseLine(line)
          })
        }
      }
    }
    
    // 保留未完成的数据
    const remaining = lines[lines.length - 1]
    this.buffer = new TextEncoder().encode(remaining)
  }
  
  /**
   * 解析数据行
   */
  parseLine(line) {
    // 尝试解析为 CSV 数值
    const values = line.split(/[,\t;]/).map(v => {
      const num = parseFloat(v.trim())
      return isNaN(num) ? null : num
    }).filter(v => v !== null)
    
    if (values.length > 0) {
      return { type: 'values', data: values }
    }
    
    // 尝试解析为 JSON
    try {
      const json = JSON.parse(line)
      return { type: 'json', data: json }
    } catch {
      // 不是 JSON
    }
    
    // 普通文本
    return { type: 'text', data: line }
  }
  
  /**
   * 自定义分隔符数据处理
   */
  processDelimiterData(data) {
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
    
    const delimiter = new TextEncoder().encode(this.protocol.delimiter)
    let lastIndex = 0
    
    for (let i = 0; i <= this.buffer.length - delimiter.length; i++) {
      let match = true
      for (let j = 0; j < delimiter.length; j++) {
        if (this.buffer[i + j] !== delimiter[j]) {
          match = false
          break
        }
      }
      
      if (match) {
        const packet = this.buffer.slice(lastIndex, i)
        if (packet.length > 0) {
          this.stats.packetsReceived++
          if (this.onData) {
            this.onData({
              raw: packet,
              text: new TextDecoder().decode(packet),
              timestamp: Date.now()
            })
          }
        }
        lastIndex = i + delimiter.length
      }
    }
    
    this.buffer = this.buffer.slice(lastIndex)
  }
  
  /**
   * 固定长度数据处理
   */
  processLengthData(data) {
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
    
    const packetLength = this.protocol.length
    
    while (this.buffer.length >= packetLength) {
      const packet = this.buffer.slice(0, packetLength)
      this.buffer = this.buffer.slice(packetLength)
      
      this.stats.packetsReceived++
      if (this.onData) {
        this.onData({
          raw: packet,
          text: new TextDecoder().decode(packet),
          timestamp: Date.now()
        })
      }
    }
  }
  
  /**
   * 发送数据
   */
  async send(data, options = {}) {
    if (!this.isConnected || !this.port || !this.port.writable) {
      throw new Error('串口未连接')
    }
    
    const { appendCR = false, appendLF = true, isHex = false } = options
    
    let bytes
    
    if (isHex) {
      // HEX 字符串转字节
      const hex = data.replace(/\s/g, '')
      bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
    } else {
      // 文本转字节
      let text = data
      if (appendCR) text += '\r'
      if (appendLF) text += '\n'
      bytes = new TextEncoder().encode(text)
    }
    
    try {
      const writer = this.port.writable.getWriter()
      await writer.write(bytes)
      writer.releaseLock()
      
      this.stats.bytesSent += bytes.length
      this.stats.packetsSent++
      
      return true
    } catch (error) {
      this.stats.errors++
      if (this.onError) this.onError(error)
      return false
    }
  }
  
  /**
   * 发送字节数组
   */
  async sendBytes(bytes) {
    if (!this.isConnected || !this.port || !this.port.writable) {
      throw new Error('串口未连接')
    }
    
    try {
      const writer = this.port.writable.getWriter()
      await writer.write(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
      writer.releaseLock()
      
      this.stats.bytesSent += bytes.length
      this.stats.packetsSent++
      
      return true
    } catch (error) {
      this.stats.errors++
      if (this.onError) this.onError(error)
      return false
    }
  }
  
  /**
   * 设置协议配置
   */
  setProtocol(protocol) {
    this.protocol = { ...this.protocol, ...protocol }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    const now = Date.now()
    const duration = this.stats.startTime ? (now - this.stats.startTime) / 1000 : 0
    
    return {
      ...this.stats,
      duration,
      rxRate: duration > 0 ? this.stats.bytesReceived / duration : 0,
      txRate: duration > 0 ? this.stats.bytesSent / duration : 0
    }
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      errors: 0,
      startTime: Date.now()
    }
  }
  
  /**
   * 清空缓冲区
   */
  clearBuffer() {
    this.buffer = new Uint8Array(0)
  }
}

// 创建单例
export const serialManager = new SerialManager()

// 导出类供需要多实例的场景使用
export { SerialManager }
