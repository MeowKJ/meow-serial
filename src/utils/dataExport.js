/**
 * 数据导出工具模块
 * 支持多种格式的数据导出
 */

// 导出为CSV
export const exportToCSV = (data, channels, filename = 'data.csv') => {
  // 表头
  const headers = ['timestamp', ...channels.map(ch => ch.name)]
  
  // 数据行
  const rows = data.map(point => {
    const time = new Date(point.time).toISOString()
    const values = point.values.map(v => v.toFixed(4))
    return [time, ...values].join(',')
  })
  
  const content = [headers.join(','), ...rows].join('\n')
  downloadFile(content, filename, 'text/csv')
}

// 导出为JSON
export const exportToJSON = (data, channels, filename = 'data.json') => {
  const exportData = {
    channels: channels.map(ch => ({ id: ch.id, name: ch.name, color: ch.color })),
    data: data.map(point => ({
      time: point.time,
      values: point.values
    })),
    exportedAt: Date.now()
  }
  
  const content = JSON.stringify(exportData, null, 2)
  downloadFile(content, filename, 'application/json')
}

// 导出终端日志
export const exportLogs = (logs, filename = 'logs.txt') => {
  const content = logs.map(log => 
    `[${log.time}] ${log.dir === 'rx' ? 'RX' : 'TX'}: ${log.data}`
  ).join('\n')
  
  downloadFile(content, filename, 'text/plain')
}

// 导出为二进制格式 (用于大数据量)
export const exportToBinary = (data, filename = 'data.bin') => {
  const channelCount = data[0]?.values.length || 0
  const pointCount = data.length
  
  // 头部: [通道数(4字节), 点数(4字节)]
  // 数据: [时间戳(8字节), 值1(4字节), 值2(4字节), ...]
  const bytesPerPoint = 8 + channelCount * 4
  const buffer = new ArrayBuffer(8 + pointCount * bytesPerPoint)
  const view = new DataView(buffer)
  
  // 写入头部
  view.setUint32(0, channelCount, true)
  view.setUint32(4, pointCount, true)
  
  // 写入数据
  let offset = 8
  data.forEach(point => {
    view.setBigUint64(offset, BigInt(point.time), true)
    offset += 8
    
    point.values.forEach(value => {
      view.setFloat32(offset, value, true)
      offset += 4
    })
  })
  
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 下载文件通用函数
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 截图功能
export const captureCanvas = (canvasElement, filename = 'screenshot.png') => {
  const dataUrl = canvasElement.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

// 截取整个画布区域
export const captureElement = async (element, filename = 'screenshot.png') => {
  // 需要使用 html2canvas 库
  // 这里提供一个简化版本
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(element)
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  } catch (e) {
    console.error('截图失败:', e)
    throw e
  }
}
