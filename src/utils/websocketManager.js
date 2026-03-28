class WebSocketManager {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.url = ''
    this.buffer = new Uint8Array(0)

    this.onData = null
    this.onConnect = null
    this.onDisconnect = null
    this.onError = null

    this.protocol = {
      type: 'raw',
      delimiter: '\n',
      length: 0,
      timeout: 100,
      waitForLF: false,
      filterEmptyLines: false
    }

    this.stats = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      errors: 0,
      startTime: null
    }
  }

  async connect(target) {
    const url = typeof target === 'string' ? target.trim() : String(target?.url || '').trim()
    if (!url) {
      throw new Error('WebSocket 地址不能为空')
    }

    if (this.socket) {
      await this.disconnect()
    }

    return await new Promise((resolve) => {
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      try {
        const socket = new WebSocket(url)
        socket.binaryType = 'arraybuffer'
        this.url = url

        socket.onopen = () => {
          this.socket = socket
          this.isConnected = true
          this.buffer = new Uint8Array(0)
          this.stats = {
            bytesReceived: 0,
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0,
            errors: 0,
            startTime: Date.now()
          }
          this.onConnect?.({ url })
          finish(true)
        }

        socket.onmessage = async (event) => {
          const data = await this.normalizeIncomingData(event.data)
          if (!data || data.length === 0) return
          this.handleReceivedData(data)
        }

        socket.onerror = () => {
          this.stats.errors += 1
          this.onError?.(new Error(`WebSocket 连接出错: ${url}`))
          finish(false)
        }

        socket.onclose = (event) => {
          const wasConnected = this.isConnected
          this.socket = null
          this.isConnected = false
          this.buffer = new Uint8Array(0)
          if (!wasConnected) {
            finish(false)
            return
          }
          if (wasConnected) {
            this.onDisconnect?.({
              reason: event.wasClean ? 'user' : 'device',
              code: event.code
            })
          }
        }
      } catch (error) {
        this.onError?.(error)
        finish(false)
      }
    })
  }

  async disconnect() {
    if (!this.socket) return true
    const socket = this.socket
    this.socket = null
    this.isConnected = false
    socket.close(1000, 'manual disconnect')
    return true
  }

  async normalizeIncomingData(payload) {
    if (payload instanceof Uint8Array) return payload
    if (payload instanceof ArrayBuffer) return new Uint8Array(payload)
    if (typeof Blob !== 'undefined' && payload instanceof Blob) {
      return new Uint8Array(await payload.arrayBuffer())
    }
    if (typeof payload === 'string') {
      return new TextEncoder().encode(payload)
    }
    return new Uint8Array(0)
  }

  handleReceivedData(data) {
    this.stats.bytesReceived += data.length

    switch (this.protocol.type) {
      case 'raw':
        this.emitPacket(data)
        break
      case 'line':
        if (this.protocol.waitForLF) this.processLineData(data)
        else this.emitPacket(data)
        break
      case 'delimiter':
        this.processDelimiterData(data)
        break
      case 'length':
        this.processLengthData(data)
        break
      default:
        this.emitPacket(data)
        break
    }
  }

  emitPacket(packet) {
    this.stats.packetsReceived += 1
    this.onData?.({
      raw: packet,
      text: new TextDecoder().decode(packet),
      timestamp: Date.now()
    })
  }

  processLineData(data) {
    const next = new Uint8Array(this.buffer.length + data.length)
    next.set(this.buffer)
    next.set(data, this.buffer.length)
    this.buffer = next

    const text = new TextDecoder().decode(this.buffer)
    const lines = text.split(/\r?\n/)

    for (let index = 0; index < lines.length - 1; index++) {
      let line = lines[index]
      if (this.protocol.filterEmptyLines) {
        line = line.trim()
        if (!line) continue
      }
      this.emitPacket(new TextEncoder().encode(this.protocol.filterEmptyLines ? line : lines[index]))
    }

    this.buffer = new TextEncoder().encode(lines[lines.length - 1] || '')
  }

  processDelimiterData(data) {
    const next = new Uint8Array(this.buffer.length + data.length)
    next.set(this.buffer)
    next.set(data, this.buffer.length)
    this.buffer = next

    const delimiter = new TextEncoder().encode(this.protocol.delimiter)
    let lastIndex = 0

    for (let i = 0; i <= this.buffer.length - delimiter.length; i++) {
      let matched = true
      for (let j = 0; j < delimiter.length; j++) {
        if (this.buffer[i + j] !== delimiter[j]) {
          matched = false
          break
        }
      }

      if (matched) {
        const packet = this.buffer.slice(lastIndex, i)
        if (packet.length > 0) {
          this.emitPacket(packet)
        }
        lastIndex = i + delimiter.length
      }
    }

    this.buffer = this.buffer.slice(lastIndex)
  }

  processLengthData(data) {
    const next = new Uint8Array(this.buffer.length + data.length)
    next.set(this.buffer)
    next.set(data, this.buffer.length)
    this.buffer = next

    const packetLength = Math.max(1, Number(this.protocol.length) || 0)
    while (this.buffer.length >= packetLength) {
      const packet = this.buffer.slice(0, packetLength)
      this.buffer = this.buffer.slice(packetLength)
      this.emitPacket(packet)
    }
  }

  async send(data, options = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接')
    }

    const { appendCR = false, appendLF = true, isHex = false } = options
    let bytes

    if (isHex) {
      const hex = String(data || '').replace(/\s/g, '')
      bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
      }
    } else {
      let text = String(data ?? '')
      if (appendCR) text += '\r'
      if (appendLF) text += '\n'
      bytes = new TextEncoder().encode(text)
    }

    this.socket.send(bytes)
    this.stats.bytesSent += bytes.length
    this.stats.packetsSent += 1
    return true
  }

  setProtocol(protocol) {
    this.protocol = { ...this.protocol, ...protocol }
  }

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
}

export { WebSocketManager }
