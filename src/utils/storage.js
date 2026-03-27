/**
 * 本地存储工具模块
 * 用于保存和加载布局、工作区配置等
 */

const STORAGE_PREFIX = 'meow_serial_'
const WORKSPACE_KEY = 'workspace'

const cloneJsonSafe = (value) => JSON.parse(JSON.stringify(value))

// 保存数据到localStorage
export const saveToStorage = (key, data) => {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(STORAGE_PREFIX + key, json)
    return true
  } catch (e) {
    console.error('保存失败:', e)
    return false
  }
}

// 从localStorage加载数据
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const json = localStorage.getItem(STORAGE_PREFIX + key)
    if (!json) return defaultValue
    return JSON.parse(json)
  } catch (e) {
    console.error('加载失败:', e)
    return defaultValue
  }
}

// 删除存储的数据
export const removeFromStorage = (key) => {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

const serializeWidget = (widget) => ({
  ...cloneJsonSafe(widget)
})

const serializeChannel = (channel) => ({
  id: channel.id,
  name: channel.name,
  color: channel.color,
  enabled: channel.enabled,
  value: channel.value ?? 0
})

const serializeWorkspace = ({ widgets = [], channels = [], protocol = {}, canvas = {} }) => ({
  widgets: widgets.map(serializeWidget),
  channels: channels.map(serializeChannel),
  protocol: cloneJsonSafe(protocol),
  canvas: cloneJsonSafe(canvas),
  savedAt: Date.now()
})

// 保存命名布局
export const saveLayout = (name, workspace) => {
  const layouts = loadFromStorage('layouts', {})
  layouts[name] = serializeWorkspace(workspace)
  return saveToStorage('layouts', layouts)
}

// 加载命名布局
export const loadLayout = (name) => {
  const layouts = loadFromStorage('layouts', {})
  return layouts[name] || null
}

// 获取所有布局列表
export const getLayoutList = () => {
  const layouts = loadFromStorage('layouts', {})
  return Object.entries(layouts)
    .map(([name, data]) => ({
      name,
      widgetCount: Array.isArray(data.widgets) ? data.widgets.length : 0,
      savedAt: new Date(data.savedAt).toLocaleString()
    }))
    .sort((left, right) => new Date(right.savedAt) - new Date(left.savedAt))
}

// 删除布局
export const deleteLayout = (name) => {
  const layouts = loadFromStorage('layouts', {})
  delete layouts[name]
  return saveToStorage('layouts', layouts)
}

// 保存当前工作区
export const saveWorkspace = (workspace) => {
  return saveToStorage(WORKSPACE_KEY, serializeWorkspace(workspace))
}

// 加载当前工作区
export const loadWorkspace = () => {
  return loadFromStorage(WORKSPACE_KEY, null)
}

// 保存连接配置
export const saveConnectionConfig = (config) => {
  return saveToStorage('connection', config)
}

// 加载连接配置
export const loadConnectionConfig = () => {
  return loadFromStorage('connection', {
    port: 'COM3',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  })
}

// 保存协议配置
export const saveProtocolConfig = (config) => {
  return saveToStorage('protocol', config)
}

// 加载协议配置
export const loadProtocolConfig = () => {
  return loadFromStorage('protocol', {
    type: 'firewater',
    separator: ',',
    endMark: '\n'
  })
}

// 导出配置到文件
export const exportConfig = (filename = 'meow_config.json') => {
  const config = {
    layouts: loadFromStorage('layouts', {}),
    workspace: loadWorkspace(),
    connection: loadFromStorage('connection', {}),
    protocol: loadFromStorage('protocol', {}),
    exportedAt: Date.now()
  }

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 导入配置文件
export const importConfig = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)

        if (config.layouts) {
          saveToStorage('layouts', config.layouts)
        }
        if (config.workspace) {
          saveWorkspace(config.workspace)
        }
        if (config.connection) {
          saveToStorage('connection', config.connection)
        }
        if (config.protocol) {
          saveToStorage('protocol', config.protocol)
        }

        resolve(config)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
