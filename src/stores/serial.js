import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  exportWorkspaceToFile,
  extractWorkspaceSnapshot,
  getLayoutList,
  loadLayout,
  loadWorkspace,
  readJsonFile,
  saveLayout,
  saveWorkspace
} from '../utils/storage'
import { getParser } from '../utils/parserRegistry'
import { syncRegisteredParsers } from '../parsers'
import { loadUserProtocolProfiles, saveUserProtocolProfiles } from '../utils/protocolProfiles'
import { useThemeStore } from './theme'
import { useI18nStore } from './i18n'
import { usePortsStore } from './ports'

export const useSerialStore = defineStore('serial', () => {
  let persistenceReady = false

  // ===== 数据通道（全局通道池）=====
  const themeStore = useThemeStore()
  const i18nStore = useI18nStore()
  const portsStore = usePortsStore()

  const channels = ref([])

  const maxChannels = 64

  // value-hold 状态
  const heldChannelState = new Map()

  const getHeldConfig = (portId) => {
    const portState = portsStore.getPort(portId)
    if (!portState) return null
    const parserDef = getParser(portState.parserId)
    if (!parserDef?.heldChannels?.length) return null
    return {
      names: new Set(parserDef.heldChannels),
      windowMs: parserDef.heldWindowMs || 3000
    }
  }

  const updateChannelColors = () => {
    const newColors = themeStore.getChannelColors()
    if (newColors?.length > 0) {
      channels.value.forEach((ch, index) => {
        if (newColors[index]) ch.color = newColors[index]
      })
    }
  }

  watch(() => [themeStore.currentTheme, themeStore.isDark], () => {
    updateChannelColors()
  }, { immediate: false })

  setTimeout(() => updateChannelColors(), 100)

  // ===== 数据历史 =====
  const dataHistory = ref([])
  const fullDataHistory = ref([])
  const maxHistoryLength = 500

  // ===== 控件 =====
  const widgets = ref([])
  let widgetIdCounter = 1
  const canvas = ref({
    backdropMode: 'grid'
  })

  const getNextWidgetZIndex = () => {
    return widgets.value.reduce((max, widget) => Math.max(max, Number(widget.zIndex) || 0), 0) + 1
  }

  // ===== 通道操作 =====

  const getNextChannelId = () => {
    return channels.value.reduce((maxId, channel) => Math.max(maxId, channel.id), -1) + 1
  }

  const getParsedSourceKey = (portId, parserId, index, label = '') => {
    return `${portId}::${parserId || 'raw'}::${index}::${label || ''}`
  }

  const ensureParsedChannel = (portId, sourceKey, fallbackName = '通道') => {
    let channel = channels.value.find(item => item.portId === portId && item.sourceKey === sourceKey)
    if (channel) return channel

    const channelColors = themeStore.getChannelColors()
    const newId = getNextChannelId()
    channel = {
      id: newId,
      name: fallbackName,
      color: channelColors[newId % channelColors.length] || '#7DD3FC',
      enabled: true,
      value: 0,
      portId,
      autoCreated: true,
      sourceKey
    }
    channels.value.push(channel)
    return channel
  }

  const getDeclaredChannelDescriptors = (portId) => {
    const portState = portsStore.getPort(portId)
    if (!portState?.parserId) return []

    const parserDef = getParser(portState.parserId)
    const labels = Array.isArray(parserDef?.channelLabels)
      ? parserDef.channelLabels.filter(label => String(label || '').trim())
      : []

    return labels.map((label, index) => ({
      label,
      sourceKey: getParsedSourceKey(portId, portState.parserId, index, label)
    }))
  }

  const syncAutoChannelsForPort = (portId) => {
    if (!portId) return

    const descriptors = getDeclaredChannelDescriptors(portId)
    const expectedKeys = new Set(descriptors.map(descriptor => descriptor.sourceKey))

    channels.value = channels.value.filter(channel => {
      if (channel.demoChannel === true) return true
      if (channel.portId !== portId || !channel.autoCreated) return true
      return expectedKeys.has(channel.sourceKey)
    })

    for (const descriptor of descriptors) {
      const channel = ensureParsedChannel(portId, descriptor.sourceKey, descriptor.label)
      channel.name = descriptor.label
      channel.portId = portId
    }
  }

  const syncAutoChannelsFromParsers = () => {
    const activePortIds = new Set(portsStore.ports.map(port => port.id))

    channels.value = channels.value.filter(channel => {
      if (channel.demoChannel === true) return true
      if (!channel.autoCreated) return false
      if (!channel.portId) return false
      return activePortIds.has(channel.portId)
    })

    for (const portState of portsStore.ports) {
      syncAutoChannelsForPort(portState.id)
    }
  }

  const pushHistorySnapshot = (timestamp) => {
    const historyEntry = {
      time: timestamp,
      values: channels.value.map(ch => ch.value)
    }

    fullDataHistory.value.push(historyEntry)
    dataHistory.value.push(historyEntry)
    if (dataHistory.value.length > maxHistoryLength) {
      dataHistory.value.shift()
    }
  }

  /**
   * 应用解析值到全局通道
   * @param {number[]} values - 解析出的数值数组
   * @param {string[]} labels - 通道标签
   * @param {number} timestamp - 时间戳
   * @param {number} channelOffset - 在全局通道中的起始偏移
   * @param {string} portId - 来源端口 ID
   */
  const applyParsedValues = (values, labels = [], timestamp = Date.now(), channelOffset = 0, portId = '') => {
    if (!Array.isArray(values) || values.length === 0) return

    // 获取该端口对应解析器的 held 配置
    const heldConfig = getHeldConfig(portId)
    const portState = portsStore.getPort(portId)
    const parserId = portState?.parserId || 'raw'

    for (let i = 0; i < values.length; i++) {
      const fallbackLabel = labels[i] || `通道${i + 1}`
      const sourceKey = getParsedSourceKey(portId, parserId, i, labels[i] || '')

      const channel = ensureParsedChannel(portId, sourceKey, fallbackLabel)
      if (!channel) continue

      // 更新标签
      channel.name = fallbackLabel

      // 标记来源端口
      channel.portId = portId

      // value-hold 逻辑
      const holdKey = labels[i] || channel.name
      const shouldHold = heldConfig?.names?.has(holdKey)
      const incomingValue = values[i]

      if (shouldHold) {
        if (Number.isFinite(incomingValue)) {
          channel.value = incomingValue
          heldChannelState.set(holdKey, { value: incomingValue, timestamp })
        } else {
          const held = heldChannelState.get(holdKey)
          if (held && (timestamp - held.timestamp) <= (heldConfig.windowMs || 3000)) {
            channel.value = held.value
          } else {
            channel.value = Number.NaN
          }
        }
      } else {
        channel.value = Number.isFinite(incomingValue) ? incomingValue : 0
      }
    }

    pushHistorySnapshot(timestamp)
  }

  const removeAutoChannelsForPort = (portId) => {
    if (!portId) return
    channels.value = channels.value.filter(channel => !(channel.portId === portId && channel.autoCreated))
  }

  // ===== 控件管理 =====

  const addWidget = (widget) => {
    const createdWidget = {
      ...widget,
      id: widgetIdCounter++,
      zIndex: Number.isFinite(widget?.zIndex) ? widget.zIndex : getNextWidgetZIndex()
    }
    widgets.value.push(createdWidget)
    return createdWidget
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

  const duplicateWidget = (id) => {
    const widget = widgets.value.find(item => item.id === id)
    if (!widget) return null

    const duplicated = {
      ...JSON.parse(JSON.stringify(widget)),
      x: (widget.x || 0) + 24,
      y: (widget.y || 0) + 24,
      zIndex: getNextWidgetZIndex()
    }

    addWidget(duplicated)
    return widgets.value[widgets.value.length - 1] || null
  }

  const bringWidgetToFront = (id) => {
    const widget = widgets.value.find(item => item.id === id)
    if (!widget) return
    widget.zIndex = getNextWidgetZIndex()
  }

  const sendWidgetToBack = (id) => {
    const widget = widgets.value.find(item => item.id === id)
    if (!widget) return
    const minZ = widgets.value.reduce((min, item) => Math.min(min, Number(item.zIndex) || 0), 0)
    widget.zIndex = minZ - 1
  }

  // ===== Workspace 持久化 =====

  const normalizeWidgets = (items = []) => {
    return items.map((widget, index) => ({
      ...widget,
      id: typeof widget.id === 'number' ? widget.id : index + 1,
      zIndex: Number.isFinite(widget?.zIndex) ? widget.zIndex : index + 1
    }))
  }

  const normalizeChannels = (items = []) => {
    const channelColors = themeStore.getChannelColors()
    return items
      .filter(channel => channel?.demoChannel === true || channel?.autoCreated === true || (channel?.portId && channel?.sourceKey))
      .map((channel, index) => ({
        id: typeof channel.id === 'number' ? channel.id : index,
        name: channel.name || `通道${index + 1}`,
        color: channel.color || channelColors[index % channelColors.length] || '#7DD3FC',
        enabled: channel.enabled !== false,
        value: Number.isFinite(channel.value) ? channel.value : 0,
        portId: channel.portId || '',
        autoCreated: true,
        demoChannel: channel.demoChannel === true,
        sourceKey: channel.sourceKey || ''
      }))
  }

  const normalizeCanvas = (value = {}) => {
    if (value?.backdropMode === 'grid' || value?.backdropMode === 'dots' || value?.backdropMode === 'blank') {
      return {
        backdropMode: value.backdropMode
      }
    }

    if (typeof value?.showBackdropPattern === 'boolean') {
      return {
        backdropMode: value.showBackdropPattern ? 'grid' : 'blank'
      }
    }

    return {
      backdropMode: 'grid'
    }
  }

  const getWorkspaceSnapshot = () => {
    const portsStore = usePortsStore()
    return {
      widgets: widgets.value,
      channels: channels.value,
      ui: {
        locale: i18nStore.locale
      },
      canvas: canvas.value,
      ports: portsStore.serializePorts(),
      protocolProfiles: loadUserProtocolProfiles(),
      theme: {
        currentTheme: themeStore.currentTheme,
        isDark: themeStore.isDark
      }
    }
  }

  const applyWorkspaceSnapshot = (snapshot) => {
    if (!snapshot) return false

    if (Array.isArray(snapshot.protocolProfiles)) {
      saveUserProtocolProfiles(snapshot.protocolProfiles)
      syncRegisteredParsers()
    }

    if (snapshot.theme?.currentTheme) {
      themeStore.setTheme(snapshot.theme.currentTheme)
    }
    if (typeof snapshot.theme?.isDark === 'boolean') {
      themeStore.setDarkMode(snapshot.theme.isDark)
    }
    if (snapshot.ui?.locale) {
      i18nStore.setLocale(snapshot.ui.locale)
    }

    if (Array.isArray(snapshot.channels)) {
      channels.value = normalizeChannels(snapshot.channels)
    }

    canvas.value = normalizeCanvas(snapshot.canvas)

    if (Array.isArray(snapshot.widgets)) {
      widgets.value = normalizeWidgets(snapshot.widgets)
      widgetIdCounter = Math.max(1, ...widgets.value.map(w => w.id || 0)) + 1
    }

    // 恢复多串口配置
    const portsStore = usePortsStore()
    if (Array.isArray(snapshot.ports) && snapshot.ports.length > 0) {
      portsStore.restorePorts(snapshot.ports)
    } else if (snapshot.protocol?.type === 'mmwave') {
      // 向后兼容: 旧版 mmwave workspace → 创建双端口，但默认回到 Raw，由用户在协议页自行配置
      portsStore.restorePorts([
        { label: 'Data', baudRate: 921600, parserId: 'raw', channelCount: 0 },
        { label: 'CLI', baudRate: 115200, parserId: 'raw', channelCount: 0 }
      ])
    } else {
      // 向后兼容: 旧版单串口 workspace → 创建默认 Raw 端口
      const baud = snapshot.protocol?.baudRate || 115200
      portsStore.restorePorts([
        { label: '串口', baudRate: baud, parserId: 'raw', channelCount: 0 }
      ])
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

  const exportWorkspaceConfig = (filename) => {
    return exportWorkspaceToFile(getWorkspaceSnapshot(), filename)
  }

  const importWorkspaceConfig = async (file) => {
    const config = await readJsonFile(file)
    const snapshot = extractWorkspaceSnapshot(config)

    if (!snapshot) {
      throw new Error('不是可识别的全局配置 JSON')
    }

    const applied = applyWorkspaceSnapshot(snapshot)
    if (!applied) {
      throw new Error('全局配置导入失败')
    }

    saveWorkspaceState()
    return snapshot
  }

  const loadNamedLayout = (name) => {
    if (!name) return false
    const snapshot = loadLayout(name)
    if (!snapshot) return false
    return applyWorkspaceSnapshot(snapshot)
  }

  const listSavedLayouts = () => getLayoutList()

  // ===== 清空 =====

  const clearAll = () => {
    dataHistory.value = []
    fullDataHistory.value = []
    const portsStore = usePortsStore()
    for (const p of portsStore.ports) {
      p.logs = []
      p.totalRx = 0
      p.totalTx = 0
      p.rxRate = 0
      p.txRate = 0
      if (p._manager) p._manager.resetStats()
    }
  }

  const clearChannelHistory = (channelId) => {
    if (!Number.isInteger(channelId) || channelId < 0) return false

    const clearValues = (history) => history.map((entry) => {
      if (!entry || !Array.isArray(entry.values)) return entry
      const nextValues = entry.values.slice()
      if (channelId < nextValues.length) {
        nextValues[channelId] = Number.NaN
      }
      return {
        ...entry,
        values: nextValues
      }
    })

    dataHistory.value = clearValues(dataHistory.value)
    fullDataHistory.value = clearValues(fullDataHistory.value)
    return true
  }

  const setCanvasBackdropMode = (mode) => {
    if (!['grid', 'dots', 'blank'].includes(mode)) return false
    canvas.value.backdropMode = mode
    return true
  }

  const toggleCanvasBackdropPattern = () => {
    const modeOrder = ['grid', 'dots', 'blank']
    const currentIndex = modeOrder.indexOf(canvas.value.backdropMode)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modeOrder.length
    canvas.value.backdropMode = modeOrder[nextIndex]
  }

  // ===== 格式化 =====

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  // ===== 注册 ports store 数据回调 =====

  const _setupPortsDataCallback = () => {
    portsStore.setOnParsedData((portId, snapshots, channelOffset) => {
      for (const snapshot of snapshots) {
        applyParsedValues(
          snapshot.values,
          snapshot.labels,
          Date.now(),
          channelOffset,
          portId
        )
      }
    })
  }

  // ===== 持久化 watchers =====

  watch(channels, () => {
    saveWorkspaceState()
  }, { deep: true })

  watch(widgets, () => {
    saveWorkspaceState()
  }, { deep: true })

  watch(canvas, () => {
    saveWorkspaceState()
  }, { deep: true })

  watch(() => i18nStore.locale, () => {
    saveWorkspaceState()
  })

  watch(() => portsStore.serializePorts(), () => {
    saveWorkspaceState()
  }, { deep: true })

  watch(() => portsStore.ports.map(port => `${port.id}:${port.parserId}`), () => {
    syncAutoChannelsFromParsers()
  }, { deep: false })

  // ===== 初始化 =====

  loadWorkspaceState()
  persistenceReady = true
  _setupPortsDataCallback()
  syncAutoChannelsFromParsers()

  // 如果没有端口，创建默认端口
  if (portsStore.ports.length === 0) {
    portsStore.addPort({ label: '串口 1', parserId: 'raw' })
  }

  return {
    // 状态
    channels,
    maxChannels,
    dataHistory,
    fullDataHistory,
    widgets,
    canvas,

    // 通道方法
    applyParsedValues,
    removeAutoChannelsForPort,
    syncAutoChannelsForPort,
    syncAutoChannelsFromParsers,

    // 控件方法
    addWidget,
    removeWidget,
    updateWidget,
    duplicateWidget,
    bringWidgetToFront,
    sendWidgetToBack,
    setCanvasBackdropMode,
    toggleCanvasBackdropPattern,

    // Workspace
    applyWorkspaceSnapshot,
    exportWorkspaceConfig,
    importWorkspaceConfig,
    saveWorkspaceState,
    loadWorkspaceState,
    saveNamedLayout,
    loadNamedLayout,
    listSavedLayouts,

    // 工具
    clearAll,
    clearChannelHistory,
    formatBytes
  }
})
