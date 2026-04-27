/**
 * 本地存储工具模块
 * 用于保存和加载布局、工作区配置等
 */

const STORAGE_PREFIX = 'meow_serial_'
const WORKSPACE_KEY = 'workspace'
const WORKSPACE_EXPORT_KIND = 'meow-serial-workspace'
const WORKSPACE_EXPORT_VERSION = 1

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
  value: channel.value ?? 0,
  portId: channel.portId || '',
  autoCreated: channel.autoCreated === true,
  demoChannel: channel.demoChannel === true,
  sourceKey: channel.sourceKey || ''
})

const serializeWorkspace = ({
  widgets = [],
  channels = [],
  protocol = {},
  protocolProfiles = [],
  theme = {},
  ui = {},
  canvas = {},
  ports = []
}) => ({
  widgets: widgets.map(serializeWidget),
  channels: channels.map(serializeChannel),
  protocol: cloneJsonSafe(protocol),
  protocolProfiles: Array.isArray(protocolProfiles) ? cloneJsonSafe(protocolProfiles) : [],
  theme: cloneJsonSafe(theme),
  ui: cloneJsonSafe(ui),
  canvas: cloneJsonSafe(canvas),
  ports: Array.isArray(ports) ? cloneJsonSafe(ports) : [],
  savedAt: Date.now()
})

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const looksLikeWorkspaceSnapshot = (value) => {
  if (!isPlainObject(value)) return false

  return [
    Array.isArray(value.widgets),
    Array.isArray(value.channels),
    Array.isArray(value.ports),
    Array.isArray(value.protocolProfiles)
  ].some(Boolean)
}

const createWorkspaceExportPayload = (workspace) => ({
  kind: WORKSPACE_EXPORT_KIND,
  version: WORKSPACE_EXPORT_VERSION,
  exportedAt: Date.now(),
  workspace: serializeWorkspace(workspace)
})

const formatTimestampForFilename = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
}

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

export const exportWorkspaceToFile = (workspace, filename = `meow_workspace_${formatTimestampForFilename()}.json`) => {
  try {
    const payload = createWorkspaceExportPayload(workspace)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return filename
  } catch (e) {
    console.error('导出失败:', e)
    return null
  }
}

export const readJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result || 'null'))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export const normalizeJsonImportUrl = (input) => {
  const value = String(input || '').trim()
  if (!value) {
    throw new Error('请输入 JSON 地址')
  }

  const url = new URL(value, window.location.origin)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('只支持 HTTP/HTTPS JSON 地址')
  }

  return url.toString()
}

export const readJsonFromUrl = async (input) => {
  const url = normalizeJsonImportUrl(input)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/json, */*'
    },
    credentials: url.startsWith(window.location.origin) ? 'same-origin' : 'omit'
  })

  if (!response.ok) {
    throw new Error(`在线 JSON 加载失败: HTTP ${response.status}`)
  }

  try {
    return await response.json()
  } catch {
    throw new Error('在线内容不是合法 JSON')
  }
}

export const extractWorkspaceSnapshot = (config) => {
  if (config?.kind === WORKSPACE_EXPORT_KIND && looksLikeWorkspaceSnapshot(config.workspace)) {
    return config.workspace
  }

  if (looksLikeWorkspaceSnapshot(config?.workspace)) {
    return config.workspace
  }

  if (looksLikeWorkspaceSnapshot(config)) {
    return config
  }

  return null
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
    version: 2,
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
