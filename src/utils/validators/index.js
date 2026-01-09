/**
 * 输入验证和格式化库
 * 提供统一的输入验证、过滤和格式化功能
 */

// ==================== 验证规则 ====================

/**
 * 验证规则定义
 */
export const rules = {
  // HEX 字符 (0-9, A-F, a-f, 空格)
  hex: /^[0-9A-Fa-f\s]*$/,

  // 二进制 (0-1, 空格)
  binary: /^[01\s]*$/,

  // 十进制数字
  decimal: /^-?\d*$/,

  // 正整数
  positiveInt: /^\d*$/,

  // 浮点数
  float: /^-?\d*\.?\d*$/,

  // Unix 时间戳 (10位或13位数字)
  unixTimestamp: /^\d{0,13}$/,

  // 日期时间格式 (YYYY-MM-DD HH:MM:SS)
  datetime: /^[\d\s:-]*$/,

  // IP 地址
  ip: /^[\d.]*$/,

  // 端口号 (0-65535)
  port: /^\d{0,5}$/,

  // ASCII 可打印字符
  ascii: /^[\x20-\x7E]*$/,

  // 字母数字
  alphanumeric: /^[a-zA-Z0-9]*$/,

  // 变量名 (字母开头，字母数字下划线)
  identifier: /^[a-zA-Z_][a-zA-Z0-9_]*$/
}

// ==================== 输入过滤器 ====================

/**
 * 过滤输入，只保留符合规则的字符
 */
export const filters = {
  /**
   * HEX 过滤器 - 只允许 0-9, A-F, 空格
   */
  hex: (value) => {
    return value.replace(/[^0-9A-Fa-f\s]/g, '').toUpperCase()
  },

  /**
   * 二进制过滤器 - 只允许 0-1, 空格
   */
  binary: (value) => {
    return value.replace(/[^01\s]/g, '')
  },

  /**
   * 十进制过滤器 - 只允许数字和负号
   */
  decimal: (value) => {
    // 只保留第一个负号和数字
    let result = value.replace(/[^\d-]/g, '')
    const firstMinus = result.indexOf('-')
    if (firstMinus > 0) {
      result = result.replace(/-/g, '')
    } else if (firstMinus === 0) {
      result = '-' + result.slice(1).replace(/-/g, '')
    }
    return result
  },

  /**
   * 正整数过滤器
   */
  positiveInt: (value) => {
    return value.replace(/\D/g, '')
  },

  /**
   * 浮点数过滤器
   */
  float: (value) => {
    let result = value.replace(/[^\d.-]/g, '')
    // 处理负号
    const firstMinus = result.indexOf('-')
    if (firstMinus > 0) {
      result = result.replace(/-/g, '')
    } else if (firstMinus === 0) {
      result = '-' + result.slice(1).replace(/-/g, '')
    }
    // 处理小数点
    const parts = result.split('.')
    if (parts.length > 2) {
      result = parts[0] + '.' + parts.slice(1).join('')
    }
    return result
  },

  /**
   * Unix 时间戳过滤器 (最多13位)
   */
  unixTimestamp: (value) => {
    return value.replace(/\D/g, '').slice(0, 13)
  },

  /**
   * 日期时间过滤器
   */
  datetime: (value) => {
    return value.replace(/[^\d\s:-]/g, '')
  },

  /**
   * 端口号过滤器 (0-65535)
   */
  port: (value) => {
    const num = value.replace(/\D/g, '')
    const port = parseInt(num) || 0
    if (port > 65535) return '65535'
    return num
  },

  /**
   * HEX 字节格式化 (每2个字符加空格)
   */
  hexBytes: (value) => {
    const hex = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
    return hex.match(/.{1,2}/g)?.join(' ') || hex
  },

  /**
   * 间隔时间过滤器 (最小100ms)
   */
  interval: (value) => {
    const num = parseInt(value.replace(/\D/g, '')) || 100
    return Math.max(100, num).toString()
  }
}

// ==================== 格式化器 ====================

/**
 * 格式化输出
 */
export const formatters = {
  /**
   * 格式化 HEX 字节 (添加空格分隔)
   */
  hexBytes: (value, separator = ' ') => {
    const hex = value.replace(/\s/g, '').toUpperCase()
    return hex.match(/.{1,2}/g)?.join(separator) || hex
  },

  /**
   * 格式化二进制 (每8位加空格)
   */
  binaryBytes: (value, separator = ' ') => {
    const bin = value.replace(/\s/g, '')
    return bin.match(/.{1,8}/g)?.join(separator) || bin
  },

  /**
   * 格式化数字 (添加千位分隔符)
   */
  number: (value, separator = ',') => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  },

  /**
   * 格式化字节大小
   */
  bytes: (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  },

  /**
   * 格式化时间戳为日期
   */
  timestamp: (ts) => {
    const date = new Date(ts.toString().length <= 10 ? ts * 1000 : ts)
    return date.toLocaleString('zh-CN')
  },

  /**
   * 格式化日期为时间戳
   */
  dateToTimestamp: (dateStr) => {
    const date = new Date(dateStr)
    return Math.floor(date.getTime() / 1000)
  }
}

// ==================== 验证器 ====================

/**
 * 验证函数
 */
export const validators = {
  /**
   * 验证 HEX 字符串
   */
  isHex: (value) => {
    return rules.hex.test(value)
  },

  /**
   * 验证二进制字符串
   */
  isBinary: (value) => {
    return rules.binary.test(value)
  },

  /**
   * 验证十进制数字
   */
  isDecimal: (value) => {
    return rules.decimal.test(value) && !isNaN(parseInt(value))
  },

  /**
   * 验证正整数
   */
  isPositiveInt: (value) => {
    return rules.positiveInt.test(value) && parseInt(value) >= 0
  },

  /**
   * 验证端口号
   */
  isPort: (value) => {
    const port = parseInt(value)
    return !isNaN(port) && port >= 0 && port <= 65535
  },

  /**
   * 验证时间戳
   */
  isTimestamp: (value) => {
    const ts = parseInt(value)
    return !isNaN(ts) && ts > 0
  },

  /**
   * 验证日期时间
   */
  isDatetime: (value) => {
    const date = new Date(value)
    return !isNaN(date.getTime())
  },

  /**
   * 验证 IP 地址
   */
  isIP: (value) => {
    const parts = value.split('.')
    if (parts.length !== 4) return false
    return parts.every(p => {
      const num = parseInt(p)
      return !isNaN(num) && num >= 0 && num <= 255
    })
  }
}

// ==================== 进制转换 ====================

/**
 * 进制转换工具
 */
export const converters = {
  /**
   * 二进制转十进制
   */
  binToDec: (bin) => {
    const clean = bin.replace(/\s/g, '')
    return parseInt(clean, 2)
  },

  /**
   * 二进制转十六进制
   */
  binToHex: (bin) => {
    const dec = converters.binToDec(bin)
    return isNaN(dec) ? '' : dec.toString(16).toUpperCase()
  },

  /**
   * 十进制转二进制
   */
  decToBin: (dec) => {
    const num = parseInt(dec)
    return isNaN(num) ? '' : num.toString(2)
  },

  /**
   * 十进制转十六进制
   */
  decToHex: (dec) => {
    const num = parseInt(dec)
    return isNaN(num) ? '' : num.toString(16).toUpperCase()
  },

  /**
   * 十六进制转二进制
   */
  hexToBin: (hex) => {
    const dec = converters.hexToDec(hex)
    return isNaN(dec) ? '' : dec.toString(2)
  },

  /**
   * 十六进制转十进制
   */
  hexToDec: (hex) => {
    const clean = hex.replace(/\s/g, '')
    return parseInt(clean, 16)
  },

  /**
   * 数字转 ASCII 字符
   */
  toAscii: (num) => {
    if (num < 0 || num > 127) return ''
    if (num < 32) {
      const names = ['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','TAB','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US']
      return `[${names[num]}]`
    }
    if (num === 32) return '[SP]'
    if (num === 127) return '[DEL]'
    return String.fromCharCode(num)
  },

  /**
   * 完整进制转换
   */
  convert: (value, fromBase) => {
    let dec = 0
    const clean = value.replace(/\s/g, '')

    if (fromBase === 'bin') {
      dec = parseInt(clean, 2)
    } else if (fromBase === 'hex') {
      dec = parseInt(clean, 16)
    } else {
      dec = parseInt(clean, 10)
    }

    if (isNaN(dec) || dec < 0) {
      return { bin: '', dec: '', hex: '', ascii: '', valid: false }
    }

    return {
      bin: dec.toString(2),
      dec: dec.toString(10),
      hex: dec.toString(16).toUpperCase(),
      ascii: converters.toAscii(dec),
      valid: true
    }
  }
}

// ==================== 校验和计算 ====================

/**
 * 校验和计算工具
 */
export const checksums = {
  /**
   * 解析输入为字节数组
   */
  parseInput: (input) => {
    const clean = input.trim()
    if (!clean) return []

    // 如果包含空格且看起来像 HEX，按 HEX 解析
    if (/^[0-9A-Fa-f\s]+$/.test(clean) && clean.includes(' ')) {
      return clean.split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n))
    }
    // 否则按文本编码
    return Array.from(new TextEncoder().encode(clean))
  },

  /**
   * 累加和
   */
  sum: (bytes) => {
    return bytes.reduce((a, b) => a + b, 0) & 0xFF
  },

  /**
   * 异或校验
   */
  xor: (bytes) => {
    return bytes.reduce((a, b) => a ^ b, 0)
  },

  /**
   * LRC (纵向冗余校验)
   */
  lrc: (bytes) => {
    return ((~bytes.reduce((a, b) => a + b, 0) + 1) & 0xFF)
  },

  /**
   * CRC-8
   */
  crc8: (bytes, poly = 0x07) => {
    let crc = 0
    for (const byte of bytes) {
      crc ^= byte
      for (let i = 0; i < 8; i++) {
        crc = crc & 0x80 ? (crc << 1) ^ poly : crc << 1
      }
    }
    return crc & 0xFF
  },

  /**
   * CRC-16 (Modbus)
   */
  crc16: (bytes, poly = 0xA001) => {
    let crc = 0xFFFF
    for (const byte of bytes) {
      crc ^= byte
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >> 1) ^ poly : crc >> 1
      }
    }
    return crc & 0xFFFF
  },

  /**
   * CRC-32
   */
  crc32: (bytes) => {
    let crc = 0xFFFFFFFF
    const table = checksums._crc32Table
    for (const byte of bytes) {
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF]
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  },

  // CRC32 查找表
  _crc32Table: (() => {
    const table = []
    for (let i = 0; i < 256; i++) {
      let crc = i
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
      }
      table[i] = crc >>> 0
    }
    return table
  })(),

  /**
   * 计算校验和并格式化
   */
  calculate: (input, type) => {
    const bytes = checksums.parseInput(input)
    if (bytes.length === 0) return ''

    switch (type) {
      case 'sum':
        return checksums.sum(bytes).toString(16).toUpperCase().padStart(2, '0')
      case 'xor':
        return checksums.xor(bytes).toString(16).toUpperCase().padStart(2, '0')
      case 'lrc':
        return checksums.lrc(bytes).toString(16).toUpperCase().padStart(2, '0')
      case 'crc8':
        return checksums.crc8(bytes).toString(16).toUpperCase().padStart(2, '0')
      case 'crc16':
        return checksums.crc16(bytes).toString(16).toUpperCase().padStart(4, '0')
      case 'crc32':
        return checksums.crc32(bytes).toString(16).toUpperCase().padStart(8, '0')
      default:
        return ''
    }
  }
}

// ==================== 默认导出 ====================

export default {
  rules,
  filters,
  formatters,
  validators,
  converters,
  checksums
}
