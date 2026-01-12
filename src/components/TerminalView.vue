<script setup>
import { ref, watch, nextTick, onUnmounted, onMounted, computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { notify } from '../utils/notification'
import BaseConverter from './terminal/BaseConverter.vue'

const store = useSerialStore()

// 工具面板显示状态
const showTools = ref(false)

// 统计数据计算
const sysCount = computed(() =>
  store.terminalLogs.filter(log => log.dir === 'system').length
)
const errCount = computed(() =>
  store.terminalLogs.filter(log => log.dir === 'error').length
)
const txCount = computed(() =>
  store.terminalLogs.filter(log => log.dir === 'tx').length
)
const rxCount = computed(() =>
  store.terminalLogs.filter(log => log.dir === 'rx').length
)

// 获取消息类型对应的颜色
const getLogColor = (dir) => {
  switch (dir) {
    case 'system': return '#a855f7' // purple-500
    case 'error': return '#ef4444' // red-500
    case 'tx': return '#3b82f6' // blue-500
    case 'rx': return '#22c55e' // green-500
    default: return '#6b7280' // gray-500
  }
}

// 生成进度条的消息颜色序列（按实际消息顺序）
const progressSegments = computed(() => {
  const logs = store.terminalLogs
  if (logs.length === 0) return []

  // 将消息分组，相邻相同类型的合并
  const segments = []
  let currentDir = null
  let currentCount = 0

  for (const log of logs) {
    if (log.dir === currentDir) {
      currentCount++
    } else {
      if (currentDir !== null) {
        segments.push({ dir: currentDir, count: currentCount })
      }
      currentDir = log.dir
      currentCount = 1
    }
  }
  if (currentDir !== null) {
    segments.push({ dir: currentDir, count: currentCount })
  }

  // 计算每段的宽度百分比
  const total = logs.length
  return segments.map(seg => ({
    dir: seg.dir,
    width: (seg.count / total) * 100,
    color: getLogColor(seg.dir)
  }))
})

// 视窗位置和大小 (百分比)
const viewportStart = ref(0)
const viewportSize = ref(100)
const isDragging = ref(false)
const progressBarEl = ref(null)

// 计算视窗在进度条上的位置和大小
const updateViewport = () => {
  if (!terminalEl.value) return
  const { scrollTop, scrollHeight, clientHeight } = terminalEl.value

  if (scrollHeight <= clientHeight) {
    viewportStart.value = 0
    viewportSize.value = 100
  } else {
    viewportSize.value = (clientHeight / scrollHeight) * 100
    viewportStart.value = (scrollTop / scrollHeight) * 100
  }
}

// 拖动视窗框开始
const startDrag = (e) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  autoScroll.value = false

  const startX = e.touches ? e.touches[0].clientX : e.clientX
  const startViewport = viewportStart.value
  const rect = progressBarEl.value.getBoundingClientRect()
  const barWidth = rect.width

  const onMove = (moveEvent) => {
    moveEvent.preventDefault()
    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
    const deltaX = clientX - startX
    const deltaPercent = (deltaX / barWidth) * 100

    let newStart = startViewport + deltaPercent
    // 限制范围
    newStart = Math.max(0, Math.min(100 - viewportSize.value, newStart))
    viewportStart.value = newStart

    // 直接设置滚动位置，不触发额外计算
    if (terminalEl.value) {
      const { scrollHeight } = terminalEl.value
      terminalEl.value.scrollTop = (newStart / 100) * scrollHeight
    }
  }

  const onEnd = () => {
    // 延迟重置 isDragging，避免 scroll 事件立即覆盖
    setTimeout(() => {
      isDragging.value = false
    }, 50)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove)
  document.addEventListener('touchend', onEnd)
}

// 点击进度条跳转（点击位置成为视窗中心）
const handleProgressClick = (e) => {
  if (isDragging.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  let clickPercent = ((e.clientX - rect.left) / rect.width) * 100

  // 让点击位置成为视窗中心
  let newStart = clickPercent - viewportSize.value / 2
  newStart = Math.max(0, Math.min(100 - viewportSize.value, newStart))

  viewportStart.value = newStart
  autoScroll.value = false
  scrollToViewport(newStart)
}

// 根据视窗位置滚动终端
const scrollToViewport = (startPercent) => {
  if (!terminalEl.value) return
  const { scrollHeight } = terminalEl.value
  terminalEl.value.scrollTop = (startPercent / 100) * scrollHeight
}

const sendInput = ref('')
const displayMode = ref('UTF-8')
const showTimestamp = ref(true)
const autoScroll = ref(true)
const enableHexHoverTranslation = ref(true) // HEX模式悬停翻译功能开关，默认启用
const appendCR = ref(false)
const appendLF = ref(true)
const sendAsHex = ref(false)
const timerEnabled = ref(false)
const timerInterval = ref(1000)
const terminalEl = ref(null)
const sendHistory = ref([])
const historyIndex = ref(-1)

// 时间轴和过滤相关状态
const dataFilter = ref('all') // 'all' | 'tx' | 'rx'
const scrollPosition = ref(0)
const scrollHeight = ref(1)
const clientHeight = ref(1)

// 过滤后的日志
const filteredTerminalLogs = computed(() => {
  if (dataFilter.value === 'all') {
    return store.terminalLogs
  }
  return store.terminalLogs.filter(log => {
    if (dataFilter.value === 'tx') return log.dir === 'tx'
    if (dataFilter.value === 'rx') return log.dir === 'rx'
    return true
  })
})

// 更新滚动信息
const updateScrollInfo = () => {
  if (terminalEl.value) {
    scrollPosition.value = terminalEl.value.scrollTop
    scrollHeight.value = terminalEl.value.scrollHeight
    clientHeight.value = terminalEl.value.clientHeight
  }
}

// 处理时间轴滚动
const handleTimelineScroll = (newPosition) => {
  if (terminalEl.value) {
    terminalEl.value.scrollTop = newPosition
  }
}

// 处理时间轴导航到指定日志
const handleNavigateToLog = (index, log) => {
  if (!terminalEl.value) return

  // 找到对应的日志元素并滚动到该位置
  const logElements = terminalEl.value.querySelectorAll('[data-log-id]')
  const targetElement = Array.from(logElements).find(el => el.dataset.logId === String(log.id))

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 高亮闪烁效果
    targetElement.classList.add('highlight-flash')
    setTimeout(() => {
      targetElement.classList.remove('highlight-flash')
    }, 1000)
  }
}

// HEX输入验证和格式化
const formatHexInput = (value) => {
  // 移除所有非十六进制字符
  const cleaned = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  // 每两个字符一组，用空格分隔
  if (cleaned.length === 0) return ''
  return cleaned.match(/.{1,2}/g)?.join(' ') || cleaned
}

// HEX输入处理
const handleHexInput = (e) => {
  if (sendAsHex.value) {
    const value = e.target.value
    const formatted = formatHexInput(value)
    sendInput.value = formatted
  }
}

// 监听HEX模式切换
watch(sendAsHex, (isHex) => {
  if (isHex && sendInput.value) {
    // 切换到HEX模式时，格式化输入
    sendInput.value = formatHexInput(sendInput.value)
  }
})

// 定时发送定时器
let timerHandle = null

const quickCommands = [
  { name: 'AT', cmd: 'AT' },
  { name: '重启', cmd: 'AT+RST' },
  { name: '版本', cmd: 'AT+GMR' },
  { name: '心跳', cmd: 'PING' },
  { name: 'LED开', cmd: 'LED ON' },
  { name: 'LED关', cmd: 'LED OFF' }
]

// 发送数据
const sendData = async () => {
  if (!sendInput.value.trim()) return

  let data = sendInput.value.trim()

  // HEX模式验证
  if (sendAsHex.value) {
    const cleaned = data.replace(/\s/g, '')
    if (!/^[0-9A-Fa-f]+$/.test(cleaned)) {
      notify.error('HEX格式错误：只能包含0-9和A-F字符喵~')
      return
    }
    if (cleaned.length % 2 !== 0) {
      notify.error('HEX格式错误：必须是偶数个字符喵~')
      return
    }
    // HEX模式下，不需要appendCR/LF，因为这些都是字节数据
    data = cleaned
  }

  // 添加到历史
  if (sendHistory.value[0] !== data) {
    sendHistory.value.unshift(data)
    if (sendHistory.value.length > 50) {
      sendHistory.value.pop()
    }
  }
  historyIndex.value = -1

  // 发送
  await store.send(data, {
    appendCR: sendAsHex.value ? false : appendCR.value,
    appendLF: sendAsHex.value ? false : appendLF.value,
    isHex: sendAsHex.value
  })

  sendInput.value = ''
}

// 历史导航
const navigateHistory = (direction) => {
  if (sendHistory.value.length === 0) return

  if (direction === 'up') {
    if (historyIndex.value < sendHistory.value.length - 1) {
      historyIndex.value++
      sendInput.value = sendHistory.value[historyIndex.value]
    }
  } else {
    if (historyIndex.value > 0) {
      historyIndex.value--
      sendInput.value = sendHistory.value[historyIndex.value]
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      sendInput.value = ''
    }
  }
}

// 键盘事件处理
const handleKeyDown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    navigateHistory('up')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    navigateHistory('down')
  }
}

// 清空终端
const clearTerminal = () => {
  store.clearTerminal()
}

// 获取HEX字节数组
const getHexBytes = (log) => {
  const { data, rawBytes } = log
  if (rawBytes && rawBytes instanceof Uint8Array) {
    return Array.from(rawBytes)
  }
  // 如果没有原始字节，从文本转换
  const encoder = new TextEncoder()
  return Array.from(encoder.encode(data))
}

// 格式化显示
const formatData = (log) => {
  const { data, type, rawBytes } = log

  if (displayMode.value === 'HEX') {
    // HEX模式：显示为十六进制（返回字节数组用于渲染）
    const bytes = getHexBytes(log)
    return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  } else if (displayMode.value === '混合') {
    // 混合模式：HEX + UTF-8
    let hexStr = ''
    let utf8Str = ''

    if (rawBytes && rawBytes instanceof Uint8Array) {
      hexStr = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      // 使用UTF-8解码
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false })
        utf8Str = decoder.decode(rawBytes)
        // 替换不可打印字符
        utf8Str = utf8Str.replace(/[\x00-\x1F\x7F-\x9F]/g, '.')
      } catch (e) {
        // 解码失败，使用单字节处理
        utf8Str = Array.from(rawBytes).map(b => {
          const char = String.fromCharCode(b)
          return (b >= 32 && b <= 126) ? char : '.'
        }).join('')
      }
    } else {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data)
      hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      utf8Str = data.replace(/[\x00-\x1F\x7F-\x9F]/g, '.')
    }

    return `${hexStr} | ${utf8Str}`
  }

  // UTF-8模式：显示UTF-8文本
  // 如果有原始字节数据，将字节转换为UTF-8文本
  if (rawBytes && rawBytes instanceof Uint8Array) {
    try {
      // 使用UTF-8解码器处理多字节字符
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let text = decoder.decode(rawBytes)

      // 处理控制字符，保持可读性（这些字符在HTML中会正常显示）
      // Tab、LF、CR等控制字符保持原样，浏览器会正确处理
      // NULL字符和其他不可打印字符替换为点
      text = text.replace(/\0/g, '.')
      // 其他控制字符（0x01-0x1F, 0x7F-0x9F）保持原样，让浏览器处理

      return text
    } catch (e) {
      // 解码失败，使用单字节处理（向后兼容）
      return Array.from(rawBytes).map(b => {
        const char = String.fromCharCode(b)
        if (b >= 32 && b <= 126) {
          return char
        } else if (b === 9) {
          return '\t'
        } else if (b === 10) {
          return '\n'
        } else if (b === 13) {
          return '\r'
        } else {
          return '.'
        }
      }).join('')
    }
  }

  // 如果type是hex但data是HEX字符串，尝试转换
  if (type === 'hex' && /^[0-9A-Fa-f\s]+$/.test(data)) {
    try {
      const hex = data.replace(/\s/g, '')
      const bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
      // 使用UTF-8解码
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false })
        let text = decoder.decode(bytes)
        return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '.')
      } catch (e) {
        return Array.from(bytes).map(b => {
          const char = String.fromCharCode(b)
          return (b >= 32 && b <= 126) ? char : '.'
        }).join('')
      }
    } catch {
      return data
    }
  }

  // 直接显示文本
  return data
}

// 获取日志样式
const getLogClass = (dir) => {
  switch (dir) {
    case 'rx': return 'bg-green-500/20 text-green-400'
    case 'tx': return 'bg-blue-500/20 text-blue-400'
    case 'system': return 'bg-purple-500/20 text-purple-400'
    case 'error': return 'bg-red-500/20 text-red-400'
    default: return 'bg-cat-surface text-cat-muted'
  }
}

const getDirLabel = (dir) => {
  switch (dir) {
    case 'rx': return 'RX'
    case 'tx': return 'TX'
    case 'system': return 'SYS'
    case 'error': return 'ERR'
    default: return '---'
  }
}

// 检测UTF-8字符的起始位置和长度
const getUtf8CharInfo = (bytes, index) => {
  const byte = bytes[index]

  // ASCII字符（单字节）
  if (byte < 0x80) {
    return { start: index, length: 1, isComplete: true }
  }

  // UTF-8多字节字符检测
  // 2字节: 110xxxxx 10xxxxxx
  if ((byte & 0xE0) === 0xC0 && index + 1 < bytes.length) {
    return { start: index, length: 2, isComplete: true }
  }
  // 3字节: 1110xxxx 10xxxxxx 10xxxxxx
  if ((byte & 0xF0) === 0xE0 && index + 2 < bytes.length) {
    return { start: index, length: 3, isComplete: true }
  }
  // 4字节: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
  if ((byte & 0xF8) === 0xF0 && index + 3 < bytes.length) {
    return { start: index, length: 4, isComplete: true }
  }

  // 可能是多字节序列的中间字节
  if ((byte & 0xC0) === 0x80) {
    // 向前查找起始字节
    for (let i = Math.max(0, index - 3); i < index; i++) {
      const b = bytes[i]
      if ((b & 0xE0) === 0xC0 && i + 1 >= index) {
        return { start: i, length: 2, isComplete: i + 1 < bytes.length }
      }
      if ((b & 0xF0) === 0xE0 && i + 2 >= index) {
        return { start: i, length: 3, isComplete: i + 2 < bytes.length }
      }
      if ((b & 0xF8) === 0xF0 && i + 3 >= index) {
        return { start: i, length: 4, isComplete: i + 3 < bytes.length }
      }
    }
  }

  // 不完整的字符或无效字节
  return { start: index, length: 1, isComplete: false }
}

// 获取字节的UTF-8字符表示（优化版）
const getUtf8Char = (byte, allBytes, index) => {
  // 控制字符特殊处理
  if (byte === 9) return { char: '\\t', name: 'Tab', unicode: 'U+0009' }
  if (byte === 10) return { char: '\\n', name: 'LF', unicode: 'U+000A' }
  if (byte === 13) return { char: '\\r', name: 'CR', unicode: 'U+000D' }
  if (byte === 0) return { char: '\\0', name: 'NULL', unicode: 'U+0000' }

  // 可打印ASCII字符（UTF-8兼容ASCII，0-127范围相同）
  if (byte >= 32 && byte <= 126) {
    const char = String.fromCharCode(byte)
    return { char, name: char, unicode: `U+${byte.toString(16).padStart(4, '0').toUpperCase()}` }
  }

  // 尝试处理UTF-8多字节字符
  if (allBytes && index !== undefined) {
    const charInfo = getUtf8CharInfo(allBytes, index)
    const charBytes = allBytes.slice(charInfo.start, charInfo.start + charInfo.length)

    if (charInfo.isComplete && charBytes.length === charInfo.length) {
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false })
        const decoded = decoder.decode(new Uint8Array(charBytes))

        if (decoded.length > 0) {
          const codePoint = decoded.codePointAt(0)
          const unicode = `U+${codePoint.toString(16).padStart(4, '0').toUpperCase()}`

          // 获取字符名称（如果可能）
          let name = decoded
          try {
            // 尝试获取Unicode名称（需要浏览器支持）
            if (codePoint > 127) {
              name = decoded
            }
          } catch (e) {
            // 忽略
          }

          return {
            char: decoded,
            name: name.length > 1 ? name : decoded,
            unicode,
            isMultiByte: charInfo.length > 1
          }
        }
      } catch (e) {
        // 解码失败
      }
    }
  }

  // 高字节范围（128-255）：可能是UTF-8多字节序列的一部分
  return {
    char: `\\x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    name: 'Invalid/Incomplete',
    unicode: `U+00${byte.toString(16).padStart(2, '0').toUpperCase()}`
  }
}

// 悬停状态
const hoveredHexIndex = ref(null)
const hoveredLogId = ref(null)
const clickedDirLabel = ref(null) // 点击的TX/RX/SYS标签ID
const dirTooltipDirection = ref({}) // 存储每个log的tooltip方向：'top' 或 'bottom'
const hexTooltipDirection = ref({}) // 存储每个字节的tooltip方向：'top' 或 'bottom'，key格式为 'logId-index'
const hexTooltipPosition = ref({}) // 存储每个字节的tooltip水平位置信息，key格式为 'logId-index'

// HEX字节悬停处理
const handleHexByteMouseEnter = (event, log, index) => {
  if (!enableHexHoverTranslation.value) return

  hoveredHexIndex.value = index
  hoveredLogId.value = log.id

  // 在显示tooltip之前就计算好方向，避免闪烁
  if (!terminalEl.value) return

  const tooltipKey = `${log.id}-${index}`
  const triggerRect = event.currentTarget.getBoundingClientRect()
  const containerRect = terminalEl.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  // 估算tooltip尺寸
  const estimatedTooltipHeight = 150 // 根据实际内容估算
  const estimatedTooltipWidth = 220 // 根据实际内容估算
  const spaceBelow = Math.min(containerRect.bottom, viewportHeight) - triggerRect.bottom
  const spaceAbove = triggerRect.top - containerRect.top

  // 计算垂直方向
  if (spaceAbove < estimatedTooltipHeight + 10 && spaceBelow > estimatedTooltipHeight + 10) {
    hexTooltipDirection.value[tooltipKey] = 'bottom' // tooltip在字节下方，箭头在tooltip顶部
  } else {
    hexTooltipDirection.value[tooltipKey] = 'top' // tooltip在字节上方，箭头在tooltip底部（默认）
  }

  // 计算水平位置，避免被遮挡
  const triggerCenterX = triggerRect.left + triggerRect.width / 2
  const tooltipLeftEdge = triggerCenterX - estimatedTooltipWidth / 2
  const tooltipRightEdge = triggerCenterX + estimatedTooltipWidth / 2

  // 获取容器的实际边界（考虑padding）
  const containerLeft = containerRect.left + 10
  const containerRight = Math.min(containerRect.right, viewportWidth) - 10

  // 检查左边界
  if (tooltipLeftEdge < containerLeft) {
    // 左侧空间不足，tooltip靠左对齐，箭头显示在左侧
    hexTooltipPosition.value[tooltipKey] = { align: 'left' }
  }
  // 检查右边界
  else if (tooltipRightEdge > containerRight) {
    // 右侧空间不足，tooltip靠右对齐，箭头显示在右侧
    hexTooltipPosition.value[tooltipKey] = { align: 'right' }
  }
  // 正常居中
  else {
    hexTooltipPosition.value[tooltipKey] = { align: 'center' }
  }
}

const handleHexByteMouseLeave = () => {
  if (enableHexHoverTranslation.value) {
    hoveredHexIndex.value = null
    hoveredLogId.value = null
  }
}

// 同步高亮 - 记录悬停的字节范围
const hoveredByteRange = ref({ start: null, end: null })

// 通用字节悬停处理（用于HEX和混合模式）
const handleByteHover = (event, log, index) => {
  hoveredLogId.value = log.id
  hoveredHexIndex.value = index
  // 计算字符组范围
  const bytes = getHexBytes(log)
  const groupInfo = getCharGroupInfo(bytes, index)
  hoveredByteRange.value = { start: groupInfo.start, end: groupInfo.start + groupInfo.length - 1 }

  // 计算tooltip位置（防止超出终端边界）
  if (!terminalEl.value || !event) return

  const tooltipKey = `${log.id}-${index}`
  const triggerRect = event.currentTarget.getBoundingClientRect()
  const containerRect = terminalEl.value.getBoundingClientRect()

  // 估算tooltip尺寸
  const estimatedTooltipHeight = 130
  const estimatedTooltipWidth = 200

  // 计算垂直方向：优先显示在上方，空间不足时显示在下方
  const spaceAbove = triggerRect.top - containerRect.top
  const spaceBelow = containerRect.bottom - triggerRect.bottom

  if (spaceAbove >= estimatedTooltipHeight + 10) {
    hexTooltipDirection.value[tooltipKey] = 'top'
  } else if (spaceBelow >= estimatedTooltipHeight + 10) {
    hexTooltipDirection.value[tooltipKey] = 'bottom'
  } else {
    // 两边都不够，选择空间更大的一边
    hexTooltipDirection.value[tooltipKey] = spaceAbove > spaceBelow ? 'top' : 'bottom'
  }

  // 计算水平位置
  const triggerCenterX = triggerRect.left + triggerRect.width / 2
  const containerLeft = containerRect.left + 8
  const containerRight = containerRect.right - 8

  // 计算tooltip左右边缘
  const tooltipLeft = triggerCenterX - estimatedTooltipWidth / 2
  const tooltipRight = triggerCenterX + estimatedTooltipWidth / 2

  if (tooltipLeft < containerLeft) {
    // 左侧空间不足
    hexTooltipPosition.value[tooltipKey] = { align: 'left', offset: Math.max(8, triggerRect.left - containerLeft) }
  } else if (tooltipRight > containerRight) {
    // 右侧空间不足
    hexTooltipPosition.value[tooltipKey] = { align: 'right', offset: Math.max(8, containerRight - triggerRect.right) }
  } else {
    hexTooltipPosition.value[tooltipKey] = { align: 'center' }
  }
}

// UTF-8字符悬停处理（混合模式中UTF-8行）
const handleCharHover = (log, byteStart, byteEnd) => {
  hoveredLogId.value = log.id
  hoveredHexIndex.value = byteStart
  hoveredByteRange.value = { start: byteStart, end: byteEnd }
}

// 悬停离开
const handleByteLeave = () => {
  hoveredHexIndex.value = null
  hoveredLogId.value = null
  hoveredByteRange.value = { start: null, end: null }
}

// 获取UTF-8字符数组（用于混合模式）
const getUtf8Chars = (log) => {
  const bytes = getHexBytes(log)
  if (bytes.length === 0) return []

  // 特殊字符映射表
  const specialChars = {
    0x00: '\\0',   // NULL
    0x07: '\\a',   // Bell
    0x08: '\\b',   // Backspace
    0x09: '\\t',   // Tab
    0x0A: '\\n',   // LF
    0x0B: '\\v',   // Vertical Tab
    0x0C: '\\f',   // Form Feed
    0x0D: '\\r',   // CR
    0x1B: '\\e',   // Escape
  }

  const chars = []
  let i = 0
  while (i < bytes.length) {
    const charInfo = getUtf8CharInfo(bytes, i)
    const charBytes = bytes.slice(charInfo.start, charInfo.start + charInfo.length)

    let display = ''

    // 单字节时检查特殊字符
    if (charBytes.length === 1) {
      const byte = charBytes[0]
      if (specialChars[byte] !== undefined) {
        display = specialChars[byte]
      } else if (byte >= 32 && byte <= 126) {
        // 可打印ASCII
        display = String.fromCharCode(byte)
      } else if (byte < 32 || (byte >= 127 && byte < 160)) {
        // 其他控制字符用十六进制表示
        display = '\\x' + byte.toString(16).padStart(2, '0').toUpperCase()
      } else {
        display = '.'
      }
    } else {
      // 多字节UTF-8字符
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false })
        display = decoder.decode(new Uint8Array(charBytes))
        // 检查解码结果是否有效
        if (!display || display.charCodeAt(0) < 32) {
          display = '.'
        }
      } catch (e) {
        display = '.'
      }
    }

    chars.push({
      display,
      byteStart: charInfo.start,
      byteEnd: charInfo.start + charInfo.length - 1,
      byteCount: charInfo.length
    })

    i = charInfo.start + charInfo.length
  }
  return chars
}

// 混合模式HEX字节样式类
const getMixedByteClass = (log, index, type) => {
  const isHovered = hoveredLogId.value === log.id &&
    hoveredByteRange.value.start !== null &&
    index >= hoveredByteRange.value.start &&
    index <= hoveredByteRange.value.end

  let baseClass = 'inline-block transition-all cursor-pointer'
  if (isHovered) {
    return baseClass + ' hex-byte-highlight text-cat-terminal-accent font-bold rounded'
  }
  return baseClass + ' text-cat-terminal-accent'
}

// 混合模式UTF-8字符样式类
const getMixedCharClass = (log, char) => {
  const isHovered = hoveredLogId.value === log.id &&
    hoveredByteRange.value.start !== null &&
    char.byteStart <= hoveredByteRange.value.end &&
    char.byteEnd >= hoveredByteRange.value.start

  let baseClass = 'inline transition-all cursor-pointer'
  if (isHovered) {
    return baseClass + ' hex-byte-highlight text-cat-terminal-accent font-bold rounded px-0.5'
  }
  return baseClass + ' text-cat-muted'
}

// 混合模式UTF-8文本（简单显示，不需要同步高亮）
const getMixedUtf8Text = (log) => {
  const bytes = getHexBytes(log)
  if (bytes.length === 0) return ''

  try {
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let text = decoder.decode(new Uint8Array(bytes))
    // 替换不可打印字符为点
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '.')
  } catch (e) {
    return Array.from(bytes).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('')
  }
}

// 获取悬停字节的UTF-8信息
const getHoveredUtf8Info = (log, index) => {
  if (!log || index === undefined) return null
  const bytes = getHexBytes(log)
  if (index >= bytes.length) return null
  return getUtf8Char(bytes[index], bytes, index)
}

// 获取字符组的完整信息（所有字节的HEX和UTF-8字符）
const getCharGroupFullInfo = (log, index) => {
  if (!log || index === undefined) return null
  const bytes = getHexBytes(log)
  if (index >= bytes.length) return null

  const groupInfo = getCharGroupInfo(bytes, index)
  const charBytes = bytes.slice(groupInfo.start, groupInfo.start + groupInfo.length)

  // 获取所有字节的HEX
  const hexBytes = charBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')

  // 获取UTF-8字符
  let utf8Char = ''
  let unicode = ''
  let name = ''

  try {
    const decoder = new TextDecoder('utf-8', { fatal: false })
    utf8Char = decoder.decode(new Uint8Array(charBytes))

    if (utf8Char.length > 0) {
      const codePoint = utf8Char.codePointAt(0)
      unicode = `U+${codePoint.toString(16).padStart(4, '0').toUpperCase()}`
      name = utf8Char
    }
  } catch (e) {
    // 解码失败，使用单字节处理
    if (charBytes.length === 1) {
      const byte = charBytes[0]
      if (byte === 9) {
        utf8Char = '\\t'
        name = 'Tab'
        unicode = 'U+0009'
      } else if (byte === 10) {
        utf8Char = '\\n'
        name = 'LF'
        unicode = 'U+000A'
      } else if (byte === 13) {
        utf8Char = '\\r'
        name = 'CR'
        unicode = 'U+000D'
      } else if (byte === 0) {
        utf8Char = '\\0'
        name = 'NULL'
        unicode = 'U+0000'
      } else if (byte >= 32 && byte <= 126) {
        utf8Char = String.fromCharCode(byte)
        name = utf8Char
        unicode = `U+${byte.toString(16).padStart(4, '0').toUpperCase()}`
      } else {
        utf8Char = `\\x${byte.toString(16).padStart(2, '0').toUpperCase()}`
        name = 'Invalid/Incomplete'
        unicode = `U+00${byte.toString(16).padStart(2, '0').toUpperCase()}`
      }
    }
  }

  return {
    hexBytes,
    utf8Char,
    unicode,
    name,
    byteCount: charBytes.length,
    isMultiByte: groupInfo.length > 1
  }
}

// 获取字节所属的UTF-8字符组信息（用于背景色分组）
const getCharGroupInfo = (bytes, index) => {
  if (!bytes || index >= bytes.length) return { start: index, length: 1, groupId: index }
  const charInfo = getUtf8CharInfo(bytes, index)
  // 使用起始位置作为groupId，同一字符的所有字节有相同的groupId
  return {
    start: charInfo.start,
    length: charInfo.length,
    groupId: charInfo.start,
    isMultiByte: charInfo.length > 1
  }
}

// 获取完整句子的UTF-8翻译
const getFullSentenceUtf8 = (log) => {
  if (!log) return ''
  try {
    const bytes = getHexBytes(log)
    if (bytes.length === 0) return ''

    const decoder = new TextDecoder('utf-8', { fatal: false })
    const text = decoder.decode(new Uint8Array(bytes))

    // 处理控制字符，使其可读
    return text
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x01-\x1F\x7F-\x9F]/g, '.')
  } catch (e) {
    return ''
  }
}

// 获取完整的HEX源码显示
const getFullSentenceHex = (log) => {
  if (!log) return ''
  try {
    const bytes = getHexBytes(log)
    if (bytes.length === 0) return ''

    // 将字节数组格式化为HEX字符串，每两个字节一组，用空格分隔
    return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  } catch (e) {
    return ''
  }
}

// 获取字节的样式类（用于字符组背景色）
const getByteClass = (log, index) => {
  if (!log || index === undefined) return 'text-cat-terminal-accent hover:bg-cat-surface/50'

  // 如果翻译功能被禁用，只返回基础样式
  if (!enableHexHoverTranslation.value) {
    return 'inline-block mr-1.5 transition-all cursor-help relative group text-cat-terminal-accent hover:bg-cat-surface/50 rounded'
  }

  const bytes = getHexBytes(log)
  const groupInfo = getCharGroupInfo(bytes, index)
  const isInGroup = index >= groupInfo.start && index < groupInfo.start + groupInfo.length
  const isHovered = hoveredHexIndex.value === index && hoveredLogId.value === log.id

  // 使用hoveredByteRange检查是否在高亮范围内（支持同步高亮）
  const isInHighlightRange = hoveredLogId.value === log.id &&
    hoveredByteRange.value.start !== null &&
    index >= hoveredByteRange.value.start &&
    index <= hoveredByteRange.value.end

  // 判断圆角位置
  let isFirstInHighlight = index === hoveredByteRange.value.start
  let isLastInHighlight = index === hoveredByteRange.value.end

  let baseClass = 'inline-block mr-1.5 transition-all cursor-help relative group'

  // 添加圆角类
  if (isInHighlightRange) {
    if (isFirstInHighlight && isLastInHighlight) {
      baseClass += ' rounded'
    } else if (isFirstInHighlight) {
      baseClass += ' rounded-l'
    } else if (isLastInHighlight) {
      baseClass += ' rounded-r'
    } else {
      baseClass += ' rounded-none'
    }
  } else {
    baseClass += ' rounded'
  }

  if (isInHighlightRange) {
    return baseClass + ' hex-byte-highlight text-cat-terminal-accent font-bold'
  } else if (groupInfo.isMultiByte && isInGroup) {
    // 多字节字符组使用不同的背景色，确保连接在一起
    return baseClass + ' bg-cat-surface/30 text-cat-terminal-accent'
  }
  return baseClass + ' text-cat-terminal-accent hover:bg-cat-surface/50'
}

// 检查是否在底部
const isAtBottom = () => {
  if (!terminalEl.value) return false
  const { scrollTop, scrollHeight, clientHeight } = terminalEl.value
  // 允许5px的误差
  return scrollHeight - scrollTop - clientHeight < 5
}

// 获取HEX tooltip位置类
const getHexTooltipPositionClass = (log, index) => {
  const tooltipKey = `${log.id}-${index}`
  const direction = hexTooltipDirection.value[tooltipKey] || 'top'
  return direction === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
}

// 获取HEX tooltip水平位置样式
const getHexTooltipPositionStyle = (log, index) => {
  const tooltipKey = `${log.id}-${index}`
  const position = hexTooltipPosition.value[tooltipKey] || { align: 'center' }

  if (position.align === 'left') {
    return { left: '0', right: 'auto', transform: 'none' }
  } else if (position.align === 'right') {
    return { left: 'auto', right: '0', transform: 'none' }
  } else {
    return { left: '50%', right: 'auto', transform: 'translateX(-50%)' }
  }
}

// 获取HEX tooltip箭头类
const getHexTooltipArrowClass = (log, index, arrowIndex) => {
  const tooltipKey = `${log.id}-${index}`
  const direction = hexTooltipDirection.value[tooltipKey] || 'top'

  if (direction === 'bottom') {
    // tooltip在下方，箭头在tooltip顶部
    return arrowIndex === 0
      ? 'absolute top-0 -mt-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-cat-border'
      : 'absolute top-0 -mt-[1px] w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-cat-card'
  } else {
    // tooltip在上方，箭头在tooltip底部（默认）
    return arrowIndex === 0
      ? 'absolute bottom-0 -mb-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cat-border'
      : 'absolute bottom-0 -mb-[1px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cat-card'
  }
}

// 获取HEX tooltip箭头样式（动态计算位置，始终指向触发元素）
const getHexTooltipArrowStyle = (log, index) => {
  const tooltipKey = `${log.id}-${index}`
  const position = hexTooltipPosition.value[tooltipKey] || { align: 'center' }

  if (position.align === 'left') {
    // tooltip靠左，箭头在左侧，根据offset调整
    const offset = position.offset || 12
    return { left: `${offset}px`, transform: 'translateX(-50%)' }
  } else if (position.align === 'right') {
    // tooltip靠右，箭头在右侧，根据offset调整
    const offset = position.offset || 12
    return { right: `${offset}px`, transform: 'translateX(50%)' }
  } else {
    return { left: '50%', transform: 'translateX(-50%)' }
  }
}

// 获取标签提示框位置类
const getDirTooltipPositionClass = (logId) => {
  const direction = dirTooltipDirection.value[logId] || 'top'
  return direction === 'bottom' ? 'bottom-full mb-2' : 'top-full mt-2'
}

// 获取标签提示框箭头类
const getDirTooltipArrowClass = (logId, arrowIndex) => {
  const direction = dirTooltipDirection.value[logId] || 'top'
  if (direction === 'bottom') {
    // tooltip在上方，箭头在tooltip底部
    return arrowIndex === 0
      ? 'dir-tooltip-arrow absolute left-4 bottom-0 -mb-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cat-border'
      : 'dir-tooltip-arrow absolute left-4 bottom-0 -mb-[1px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cat-card'
  } else {
    // tooltip在下方，箭头在tooltip顶部
    return arrowIndex === 0
      ? 'dir-tooltip-arrow absolute left-4 top-0 -mt-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-cat-border'
      : 'dir-tooltip-arrow absolute left-4 top-0 -mt-[1px] w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-cat-card'
  }
}

// 处理标签点击事件
const handleDirLabelClick = (event, logId) => {
  event.stopPropagation() // 阻止事件冒泡

  // 如果点击的是同一个标签，则关闭tooltip
  if (clickedDirLabel.value === logId) {
    clickedDirLabel.value = null
    return
  }

  // 设置点击的标签ID
  clickedDirLabel.value = logId

  // 计算tooltip位置
  if (!terminalEl.value) return

  nextTick(() => {
    const triggerElement = event.currentTarget
    if (!triggerElement) return

    const triggerRect = triggerElement.getBoundingClientRect()
    const containerRect = terminalEl.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    // 估算tooltip高度（避免实际渲染后再调整）
    const estimatedTooltipHeight = 120 // 根据实际内容估算
    const spaceBelow = Math.min(containerRect.bottom, viewportHeight) - triggerRect.bottom
    const spaceAbove = triggerRect.top - containerRect.top

    // 如果下方空间不足，且上方空间足够，则向上显示
    if (spaceBelow < estimatedTooltipHeight + 10 && spaceAbove > estimatedTooltipHeight + 10) {
      dirTooltipDirection.value[logId] = 'bottom' // tooltip在标签上方，箭头在tooltip底部
    } else {
      dirTooltipDirection.value[logId] = 'top' // tooltip在标签下方，箭头在tooltip顶部
    }
  })
}

// 点击外部关闭tooltip
const handleClickOutside = (event) => {
  // 检查点击是否在tooltip内部
  const tooltip = event.target.closest('.dir-tooltip')
  const label = event.target.closest('[data-dir-label]')

  // 如果点击不在tooltip和标签上，则关闭tooltip
  if (!tooltip && !label) {
    clickedDirLabel.value = null
  }
}

// 自动滚动
watch(() => store.terminalLogs.length, async () => {
  if (autoScroll.value && terminalEl.value) {
    await nextTick()
    terminalEl.value.scrollTop = terminalEl.value.scrollHeight
    updateScrollInfo()
  }
  // 更新视窗大小
  await nextTick()
  updateViewport()
})

// 过滤器变化时更新滚动信息
watch(dataFilter, async () => {
  await nextTick()
  updateScrollInfo()
})

// 监听终端滚动，同步视窗位置
const handleTerminalScroll = () => {
  if (isDragging.value) return
  updateViewport()
}

// 监听显示模式切换
watch(displayMode, async (newMode, oldMode) => {
  if (!terminalEl.value || newMode === oldMode) return

  // 等待DOM更新
  await nextTick()

  const wasAtBottom = isAtBottom()
  const oldScrollTop = terminalEl.value.scrollTop
  const oldScrollHeight = terminalEl.value.scrollHeight

  // 等待内容重新渲染
  await nextTick()

  const newScrollHeight = terminalEl.value.scrollHeight

  if (wasAtBottom) {
    // 如果之前在底部，保持在底部
    terminalEl.value.scrollTop = terminalEl.value.scrollHeight
  } else {
    // 如果之前在中间浏览，保持相对位置
    // 计算内容高度变化的比例
    const heightRatio = oldScrollHeight > 0 ? oldScrollTop / oldScrollHeight : 0
    const newScrollTop = newScrollHeight * heightRatio
    terminalEl.value.scrollTop = newScrollTop
  }
})

// 定时发送
watch(timerEnabled, (enabled) => {
  if (enabled && sendInput.value) {
    timerHandle = setInterval(async () => {
      if (sendInput.value && store.connected) {
        await store.send(sendInput.value, {
          appendCR: appendCR.value,
          appendLF: appendLF.value,
          isHex: sendAsHex.value
        })
      }
    }, timerInterval.value)
  } else {
    if (timerHandle) {
      clearInterval(timerHandle)
      timerHandle = null
    }
  }
})

// 清理定时器
onUnmounted(() => {
  if (timerHandle) {
    clearInterval(timerHandle)
  }
  // 移除点击外部关闭的监听器
  document.removeEventListener('click', handleClickOutside)
  // 移除滚动监听器
  if (terminalEl.value) {
    terminalEl.value.removeEventListener('scroll', updateScrollInfo)
  }
})

// 添加点击外部关闭的监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // 添加滚动监听器
  if (terminalEl.value) {
    terminalEl.value.addEventListener('scroll', updateScrollInfo)
    updateScrollInfo()
  }
})

// 监听terminalEl变化
watch(terminalEl, (el) => {
  if (el) {
    el.addEventListener('scroll', updateScrollInfo)
    updateScrollInfo()
  }
})
</script>

<template>
  <div class="h-full flex flex-col p-4 gap-4">
    <!-- 工具栏 -->
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-sm text-cat-muted">显示格式:</span>
        <div class="flex bg-cat-surface rounded-lg p-0.5">
          <button v-for="m in ['UTF-8', 'HEX', '混合']" :key="m" @click="displayMode = m" :class="[
            'px-3 py-1 text-sm rounded-md transition-colors',
            displayMode === m ? 'bg-cat-primary text-white' : 'text-cat-muted hover:text-cat-text'
          ]">
            {{ m }}
          </button>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-cat-muted cursor-pointer">
        <input type="checkbox" v-model="showTimestamp" class="accent-cat-primary"> 时间戳
      </label>
      <label class="flex items-center gap-2 text-sm text-cat-muted cursor-pointer">
        <input type="checkbox" v-model="autoScroll" class="accent-cat-primary"> 自动滚动
      </label>
      <label v-if="displayMode === 'HEX'" class="flex items-center gap-2 text-sm text-cat-muted cursor-pointer">
        <input type="checkbox" v-model="enableHexHoverTranslation" class="accent-cat-primary"> HEX翻译
      </label>
      <div class="ml-auto flex gap-2">
        <button @click="showTools = !showTools"
          :class="[
            'cat-btn-secondary px-3 py-1.5 rounded-lg text-sm transition-colors',
            showTools ? 'bg-cat-primary/20 border-cat-primary text-cat-primary' : ''
          ]">
          🔧 工具
        </button>
        <button @click="clearTerminal" class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm">
          🗑️ 清空
        </button>
      </div>
    </div>

    <!-- 工具面板 -->
    <div v-if="showTools" class="flex gap-4 flex-wrap">
      <BaseConverter class="w-72" />
    </div>

    <!-- 终端显示 -->
    <div ref="terminalEl" class="flex-1 bg-cat-surface rounded-xl p-4 overflow-auto font-mono text-sm"
         @scroll="handleTerminalScroll">
      <div v-for="log in filteredTerminalLogs" :key="log.id"
        :data-log-id="log.id"
        class="flex items-start gap-3 py-0.5 hover:bg-cat-border/30 px-2 -mx-2 rounded log-item">
        <span v-if="showTimestamp" class="text-cat-muted shrink-0 text-xs">{{ log.time }}</span>
        <span :class="['shrink-0 text-xs w-8 text-center py-0.5 rounded cursor-pointer relative', getLogClass(log.dir)]"
          :data-dir-label="log.id"
          @click.stop="(displayMode === 'HEX' || displayMode === 'UTF-8') && handleDirLabelClick($event, log.id)">
          {{ getDirLabel(log.dir) }}
          <!-- 完整句子提示（HEX模式显示UTF-8翻译，UTF-8模式显示HEX源码，防止超出视口） -->
          <div v-if="(displayMode === 'HEX' || displayMode === 'UTF-8') && clickedDirLabel === log.id"
            class="absolute left-0 z-50 pointer-events-auto dir-tooltip" :class="getDirTooltipPositionClass(log.id)"
            style="min-width: 300px; max-width: 500px;" @click.stop>
            <div class="bg-cat-card border border-cat-border rounded-lg shadow-xl p-3">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs text-cat-muted">
                  字节数: <span class="text-cat-terminal-accent font-bold">{{ getHexBytes(log).length }}</span>
                </div>
                <button @click.stop="clickedDirLabel = null"
                  class="text-cat-muted hover:text-cat-text text-xs">✕</button>
              </div>
              <div class="text-xs text-cat-muted font-medium mb-1">
                {{ displayMode === 'HEX' ? '完整UTF-8翻译:' : '完整HEX源码:' }}
              </div>
              <div class="text-sm font-mono text-cat-terminal-text break-words bg-cat-surface/50 p-2 rounded">
                {{ displayMode === 'HEX' ? (getFullSentenceUtf8(log) || '(空)') : (getFullSentenceHex(log) || '(空)') }}
              </div>
            </div>
            <!-- 小箭头 -->
            <div :class="getDirTooltipArrowClass(log.id, 0)"></div>
            <div :class="getDirTooltipArrowClass(log.id, 1)"></div>
          </div>
        </span>
        <span class="break-all font-mono text-cat-terminal-text">
          <!-- HEX模式：每个字节可悬停，UTF-8字符组用背景色划分 -->
          <template v-if="displayMode === 'HEX'">
            <template v-for="(byte, index) in getHexBytes(log)" :key="index">
              <span @mouseenter="handleByteHover($event, log, index)" @mouseleave="handleByteLeave()"
                :class="getByteClass(log, index)">
                {{ byte.toString(16).padStart(2, '0').toUpperCase() }}
                <!-- UTF-8提示框（优化版，防止超出视口导致闪烁） -->
                <div v-if="enableHexHoverTranslation && hoveredHexIndex === index && hoveredLogId === log.id"
                  class="absolute z-50 pointer-events-none tooltip-container"
                  :class="getHexTooltipPositionClass(log, index)" :style="{
                    minWidth: '200px',
                    ...getHexTooltipPositionStyle(log, index)
                  }">
                  <template v-if="getCharGroupFullInfo(log, index)">
                    <div class="bg-cat-card border border-cat-border rounded-lg shadow-xl p-3 space-y-2">
                      <!-- HEX字节显示 -->
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-cat-muted font-medium">HEX:</span>
                        <span class="text-base font-mono font-bold text-cat-terminal-accent">
                          {{ getCharGroupFullInfo(log, index)?.hexBytes }}
                        </span>
                      </div>

                      <!-- UTF-8字符显示 -->
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-cat-muted font-medium">UTF-8:</span>
                        <span class="text-base font-bold text-cat-terminal-accent">
                          {{ getCharGroupFullInfo(log, index)?.utf8Char }}
                        </span>
                      </div>

                      <!-- Unicode信息 -->
                      <div class="text-xs">
                        <span class="text-cat-muted">Unicode:</span>
                        <span class="ml-1 font-mono font-bold text-cat-terminal-accent">
                          {{ getCharGroupFullInfo(log, index)?.unicode }}
                        </span>
                        <span v-if="getCharGroupFullInfo(log, index)?.isMultiByte"
                          class="ml-2 text-cat-terminal-accent text-[10px]">
                          ({{ getCharGroupFullInfo(log, index)?.byteCount }}字节)
                        </span>
                      </div>

                      <!-- 字符名称（如果是特殊字符） -->
                      <div v-if="getCharGroupFullInfo(log, index)?.name &&
                        getCharGroupFullInfo(log, index)?.name !== getCharGroupFullInfo(log, index)?.utf8Char"
                        class="text-xs text-cat-muted border-t border-cat-border pt-1.5 mt-1.5">
                        <span class="font-bold">{{ getCharGroupFullInfo(log, index)?.name }}</span>
                      </div>
                    </div>
                    <!-- 小箭头 -->
                    <div :class="getHexTooltipArrowClass(log, index, 0)" :style="getHexTooltipArrowStyle(log, index)"></div>
                    <div :class="getHexTooltipArrowClass(log, index, 1)" :style="getHexTooltipArrowStyle(log, index)"></div>
                  </template>
                </div>
              </span>
              <!-- 移除字节之间的间距，让背景色连接在一起 -->
            </template>
          </template>
          <!-- 混合模式：HEX和UTF-8分行显示，同步高亮 -->
          <template v-else-if="displayMode === '混合'">
            <div class="flex flex-col gap-1">
              <!-- HEX行 -->
              <div class="flex flex-wrap gap-1.5">
                <template v-for="(byte, index) in getHexBytes(log)" :key="'hex-'+index">
                  <span @mouseenter="handleByteHover($event, log, index)" @mouseleave="handleByteLeave()"
                    :class="getMixedByteClass(log, index, 'hex')">
                    {{ byte.toString(16).padStart(2, '0').toUpperCase() }}
                  </span>
                </template>
              </div>
              <!-- UTF-8行（同步高亮） -->
              <div>
                <template v-for="(char, idx) in getUtf8Chars(log)" :key="'char-'+idx">
                  <span @mouseenter="handleCharHover(log, char.byteStart, char.byteEnd)"
                        @mouseleave="handleByteLeave()"
                        :class="getMixedCharClass(log, char)">{{ char.display }}</span>
                </template>
              </div>
            </div>
          </template>
          <!-- UTF-8模式：正常显示 -->
          <template v-else>
            <span class="whitespace-pre-wrap">{{ formatData(log) }}</span>
          </template>
        </span>
      </div>
      <div v-if="filteredTerminalLogs.length === 0" class="h-full flex items-center justify-center text-cat-muted">
        <div class="text-center">
          <div class="text-2xl mb-2">🐱</div>
          <div v-if="store.terminalLogs.length === 0">{{ store.connected ? '等待数据喵~' : '请先连接串口喵~' }}</div>
          <div v-else>当前过滤条件下没有数据喵~</div>
        </div>
      </div>
    </div>

    <!-- 状态栏 - 横向消息地图进度条 -->
    <div class="bg-cat-surface rounded-lg px-3 py-2">
      <div class="flex items-center gap-3">
        <!-- 消息地图进度条 -->
        <div ref="progressBarEl"
             class="flex-1 h-4 bg-cat-dark rounded-full overflow-hidden flex cursor-pointer relative"
             @click="handleProgressClick">
          <!-- 按实际消息顺序渲染颜色段 -->
          <template v-if="progressSegments.length > 0">
            <div v-for="(seg, idx) in progressSegments"
                 :key="idx"
                 class="h-full transition-all duration-150"
                 :style="{ width: seg.width + '%', backgroundColor: seg.color, opacity: dataFilter === 'all' || dataFilter === seg.dir ? 1 : 0.2 }">
            </div>
          </template>
          <!-- 空状态 -->
          <div v-else class="w-full h-full bg-cat-border/30"></div>
          <!-- 视窗框 -->
          <div class="absolute top-0 h-full bg-white/20 border-2 border-white/60 rounded cursor-ew-resize"
               :class="{ 'transition-none': isDragging }"
               :style="{ left: viewportStart + '%', width: Math.max(viewportSize, 2) + '%' }"
               @mousedown="startDrag"
               @touchstart="startDrag">
          </div>
        </div>
        <!-- 图例和统计（可点击筛选） -->
        <div class="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <div @click="dataFilter = dataFilter === 'all' ? 'all' : 'all'"
               class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
               :class="dataFilter === 'all' ? 'bg-cat-border' : 'hover:bg-cat-border/50'">
            <span class="text-cat-muted">全部</span>
          </div>
          <div @click="dataFilter = dataFilter === 'system' ? 'all' : 'system'"
               class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
               :class="dataFilter === 'system' ? 'bg-purple-500/30 ring-1 ring-purple-500' : 'hover:bg-cat-border/50'">
            <span class="w-2 h-2 rounded-sm bg-purple-500"></span>
            <span class="text-purple-400">{{ sysCount }}</span>
          </div>
          <div @click="dataFilter = dataFilter === 'error' ? 'all' : 'error'"
               class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
               :class="dataFilter === 'error' ? 'bg-red-500/30 ring-1 ring-red-500' : 'hover:bg-cat-border/50'">
            <span class="w-2 h-2 rounded-sm bg-red-500"></span>
            <span class="text-red-400">{{ errCount }}</span>
          </div>
          <div @click="dataFilter = dataFilter === 'tx' ? 'all' : 'tx'"
               class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
               :class="dataFilter === 'tx' ? 'bg-blue-500/30 ring-1 ring-blue-500' : 'hover:bg-cat-border/50'">
            <span class="w-2 h-2 rounded-sm bg-blue-500"></span>
            <span class="text-blue-400">{{ txCount }}</span>
          </div>
          <div @click="dataFilter = dataFilter === 'rx' ? 'all' : 'rx'"
               class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
               :class="dataFilter === 'rx' ? 'bg-green-500/30 ring-1 ring-green-500' : 'hover:bg-cat-border/50'">
            <span class="w-2 h-2 rounded-sm bg-green-500"></span>
            <span class="text-green-400">{{ rxCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 发送区 -->
    <div class="bg-cat-surface rounded-xl p-4">
      <div class="flex gap-3">
        <div class="flex-1 relative">
          <input v-model="sendInput" @keyup.enter="sendData" @keydown="handleKeyDown" @input="handleHexInput"
            :disabled="!store.connected"
            :placeholder="sendAsHex ? '输入HEX数据，如: 01 02 FF (空格可选)' : (store.connected ? '输入要发送的数据... (↑↓ 历史)' : '请先连接串口...')"
            class="w-full bg-cat-dark border border-cat-border rounded-lg px-4 py-2.5 pr-20 disabled:opacity-50"
            :class="{ 'font-mono text-cat-accent': sendAsHex }">
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cat-muted">
            {{ sendInput.length }} 字符
          </span>
        </div>
        <button @click="sendData" :disabled="!store.connected || !sendInput.trim()"
          class="cat-btn px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-50">
          发送喵 🐾
        </button>
      </div>

      <div class="flex items-center gap-6 mt-3 text-sm flex-wrap">
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="appendCR" class="accent-cat-primary"> +CR
        </label>
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="appendLF" class="accent-cat-primary"> +LF
        </label>
        <label class="flex items-center gap-2 text-cat-muted cursor-pointer">
          <input type="checkbox" v-model="sendAsHex" class="accent-cat-primary"> HEX发送
          <span v-if="sendAsHex && sendInput" class="text-xs text-cat-accent ml-1">
            ({{ Math.floor(sendInput.replace(/\s/g, '').length / 2) }} 字节)
          </span>
        </label>
        <div class="flex items-center gap-2 text-cat-muted">
          <input type="checkbox" v-model="timerEnabled" :disabled="!sendInput.trim()" class="accent-cat-primary">
          定时发送
          <input type="number" v-model.number="timerInterval" :disabled="!timerEnabled" min="100" step="100"
            class="w-20 bg-cat-dark border border-cat-border rounded px-2 py-1 text-center disabled:opacity-50">
          ms
        </div>
      </div>

      <!-- 快捷命令 -->
      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-cat-border flex-wrap">
        <span class="text-xs text-cat-muted">快捷:</span>
        <button v-for="cmd in quickCommands" :key="cmd.name" @click="sendInput = cmd.cmd"
          class="cat-btn-secondary px-2 py-1 rounded text-xs">
          {{ cmd.name }}
        </button>
        <div class="flex-1"></div>
        <span class="text-xs text-cat-muted">历史: {{ sendHistory.length }} 条</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 日志项高亮闪烁动画 */
.log-item.highlight-flash {
  animation: highlight-flash 1s ease-out;
}

@keyframes highlight-flash {
  0% {
    background-color: rgba(var(--cat-primary-rgb, 139, 92, 246), 0.5);
  }
  100% {
    background-color: transparent;
  }
}

/* 终端中悬浮HEX字节的强调背景色 */
.hex-byte-highlight {
  background-color: var(--cat-terminal-accent-bg);
}
</style>
