/**
 * 数据解析工具模块
 * 支持多种协议格式的解析
 */

// FireWater协议解析 (CSV格式)
export const parseFireWater = (data, separator = ',') => {
  try {
    const values = data.trim().split(separator).map(v => {
      const num = parseFloat(v)
      return isNaN(num) ? 0 : num
    })
    return { success: true, values }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// JustFloat协议解析 (二进制浮点)
export const parseJustFloat = (buffer) => {
  try {
    const view = new DataView(buffer)
    const values = []
    
    // 查找帧尾 0x00 0x00 0x80 0x7F
    let endIndex = -1
    for (let i = 0; i < buffer.byteLength - 3; i++) {
      if (view.getUint8(i) === 0x00 && 
          view.getUint8(i + 1) === 0x00 && 
          view.getUint8(i + 2) === 0x80 && 
          view.getUint8(i + 3) === 0x7F) {
        endIndex = i
        break
      }
    }
    
    if (endIndex < 0) {
      return { success: false, error: '未找到帧尾' }
    }
    
    // 解析浮点数
    for (let i = 0; i < endIndex; i += 4) {
      values.push(view.getFloat32(i, true)) // 小端序
    }
    
    return { success: true, values }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// JSON协议解析
export const parseJSON = (data) => {
  try {
    const obj = JSON.parse(data)
    const values = []
    
    // 提取数值字段
    Object.values(obj).forEach(v => {
      if (typeof v === 'number') {
        values.push(v)
      } else if (Array.isArray(v)) {
        values.push(...v.filter(x => typeof x === 'number'))
      }
    })
    
    return { success: true, values, raw: obj }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// 自定义协议解析
export const parseCustom = (data, config) => {
  try {
    const { separator = ',', startMark = '', endMark = '\n', parser = '' } = config
    
    let processedData = data
    
    // 去除起始标记
    if (startMark && processedData.startsWith(startMark)) {
      processedData = processedData.slice(startMark.length)
    }
    
    // 去除结束标记
    if (endMark && processedData.endsWith(endMark)) {
      processedData = processedData.slice(0, -endMark.length)
    }
    
    // 如果有自定义解析函数
    if (parser) {
      const parserFn = new Function('data', parser)
      const values = parserFn(processedData)
      return { success: true, values }
    }
    
    // 默认按分隔符解析
    return parseFireWater(processedData, separator)
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// HEX字符串转字节数组
export const hexToBytes = (hex) => {
  const cleanHex = hex.replace(/\s/g, '')
  const bytes = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16))
  }
  return new Uint8Array(bytes)
}

// 字节数组转HEX字符串
export const bytesToHex = (bytes, separator = ' ') => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(separator)
}

// UTF-8文本转HEX
export const textToHex = (text) => {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')
}

// HEX转UTF-8文本
export const hexToText = (hex) => {
  const bytes = hexToBytes(hex)
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return decoder.decode(bytes)
}

// 向后兼容：保留旧函数名（已废弃，建议使用 textToHex 和 hexToText）
/** @deprecated 使用 textToHex 代替 */
export const asciiToHex = textToHex

/** @deprecated 使用 hexToText 代替 */
export const hexToAscii = hexToText

// 校验和计算
export const calculateChecksum = (bytes, type = 'sum') => {
  switch (type) {
    case 'sum':
      return bytes.reduce((a, b) => (a + b) & 0xFF, 0)
    case 'xor':
      return bytes.reduce((a, b) => a ^ b, 0)
    case 'crc8':
      // 简化的CRC8
      let crc = 0
      bytes.forEach(byte => {
        crc ^= byte
        for (let i = 0; i < 8; i++) {
          if (crc & 0x80) {
            crc = (crc << 1) ^ 0x07
          } else {
            crc <<= 1
          }
        }
        crc &= 0xFF
      })
      return crc
    default:
      return 0
  }
}
