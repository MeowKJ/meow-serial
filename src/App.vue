<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSerialStore } from './stores/serial'
import { useI18nStore } from './stores/i18n'
import { usePortsStore } from './stores/ports'
import { notify } from './utils/notification'

// Components
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import CanvasView from './components/CanvasView.vue'
import TerminalView from './components/TerminalView.vue'
import ProtocolView from './components/ProtocolView.vue'
import WidgetPanel from './components/WidgetPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ContextMenu from './components/ContextMenu.vue'

const store = useSerialStore()
const i18n = useI18nStore()
const portsStore = usePortsStore()
const basePath = import.meta.env.BASE_URL || '/'

const getSerialUrl = (tab = 'canvas') => {
  const serialRoot = basePath.replace(/\/+$/, '') || '/'
  return tab === 'canvas' ? serialRoot : `${serialRoot}?tab=${tab}`
}

const getInitialSerialTab = () => {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return ['canvas', 'terminal', 'protocol'].includes(tab) ? tab : 'canvas'
}

// 界面状态
const activeTab = ref(getInitialSerialTab())
const tabs = computed(() => [
  { id: 'canvas', name: i18n.t('app.tabs.canvas'), icon: '🎨', emojiName: 'artistPalette' },
  { id: 'terminal', name: i18n.t('app.tabs.terminal'), icon: '🖥️', emojiName: 'desktopComputer' },
  { id: 'protocol', name: i18n.t('app.tabs.protocol'), icon: '📋', emojiName: 'clipboard' }
])

const isPaused = ref(false)
const isRecording = ref(false)
const showWidgetPanel = ref(false)
const showSettingsPanel = ref(false)
const selectedWidgetId = ref(null)

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  items: []
})

// 计算属性
const selectedWidget = computed(() => {
  return store.widgets.find(w => w.id === selectedWidgetId.value)
})

watch(selectedWidgetId, (widgetId) => {
  if (widgetId === null) {
    showSettingsPanel.value = false
  }
})

// 方法
const clearAll = () => {
  store.clearAll()
}

const setSerialTab = (tab) => {
  if (!['canvas', 'terminal', 'protocol'].includes(tab)) return
  activeTab.value = tab
  const url = getSerialUrl(tab)
  window.history.replaceState({ route: 'serial', tab }, '', url)
}

const openHome = () => {
  window.location.href = '/'
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const getSparklineDrawMode = (widget) => {
  if (!widget || widget.type !== 'sparkline') return 'window'
  if (widget.drawMode === 'window') return 'window'
  if (widget.drawMode === 'trend') return 'trend'
  return widget.fullHistory === false ? 'window' : 'trend'
}

const openWidgetContextMenu = ({ widgetId, x, y }) => {
  const widget = store.widgets.find(item => item.id === widgetId)
  if (!widget) return

  const isSparklineTrend = widget.type === 'sparkline' && getSparklineDrawMode(widget) === 'trend'
  const items = [
    {
      icon: '⚙️',
      label: i18n.t('app.contextMenu.editWidget'),
      action: () => {
        activeTab.value = 'canvas'
        showSettingsPanel.value = true
      }
    },
    {
      icon: '📄',
      label: i18n.t('app.contextMenu.duplicateWidget'),
      action: () => {
        const duplicated = store.duplicateWidget(widgetId)
        if (duplicated) {
          selectedWidgetId.value = duplicated.id
          showSettingsPanel.value = true
        }
      }
    }
  ]

  if (isSparklineTrend) {
    items.push(
      { divider: true },
      {
        icon: '🧹',
        label: i18n.t('app.contextMenu.clearTrend'),
        action: () => {
          store.clearChannelHistory(widget.channel)
        }
      }
    )
  }

  items.push(
    { divider: true },
    {
      icon: '⬆️',
      label: i18n.t('app.contextMenu.bringToFront'),
      action: () => store.bringWidgetToFront(widgetId)
    },
    {
      icon: '⬇️',
      label: i18n.t('app.contextMenu.sendToBack'),
      action: () => store.sendWidgetToBack(widgetId)
    },
    { divider: true },
    {
      icon: '🗑️',
      label: i18n.t('app.contextMenu.deleteWidget'),
      danger: true,
      action: () => {
        store.removeWidget(widgetId)
        if (selectedWidgetId.value === widgetId) {
          selectedWidgetId.value = null
          showSettingsPanel.value = false
        }
      }
    }
  )

  selectedWidgetId.value = widgetId
  contextMenu.value = {
    visible: true,
    x,
    y,
    items
  }
}

const openCanvasContextMenu = ({ x, y }) => {
  selectedWidgetId.value = null
  contextMenu.value = {
    visible: true,
    x,
    y,
    items: [
      {
        icon: '🧩',
        label: i18n.t('app.contextMenu.addWidget'),
        action: () => {
          activeTab.value = 'canvas'
          showWidgetPanel.value = true
        }
      }
    ]
  }
}

const handleWidgetAdded = (widget) => {
  if (!widget) return
  selectedWidgetId.value = widget.id
  if (widget.type === 'button') {
    activeTab.value = 'canvas'
    showSettingsPanel.value = true
  }
}

const buildDemoHistory = () => {
  const now = Date.now()
  return Array.from({ length: 180 }, (_, index) => {
    const phase = index / 11
    return {
      time: now - (179 - index) * 420,
      values: {
        0: 74 + Math.sin(phase) * 5 + Math.sin(phase * 0.34) * 2,
        1: 97.6 + Math.cos(phase * 0.62) * 0.9,
        2: 36.65 + Math.sin(phase * 0.24) * 0.22
      }
    }
  })
}

const loadDemoWorkspace = async () => {
  try {
    const response = await fetch('/examples/workspaces/vitals-dashboard.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    const snapshot = payload.workspace || payload
    const applied = store.applyWorkspaceSnapshot(snapshot)
    if (!applied) throw new Error('示例工作区无法应用')

    const demoPort = portsStore.ports[0]
    if (demoPort) {
      demoPort.label = 'Demo JSON'
    }
    const demoChannels = Array.isArray(snapshot.channels) ? snapshot.channels : []
    store.channels.splice(
      0,
      store.channels.length,
      ...demoChannels.map((channel, index) => ({
        id: Number.isInteger(channel.id) ? channel.id : index,
        name: channel.name || `通道${index + 1}`,
        color: channel.color || ['#5EEAD4', '#60A5FA', '#F6C177'][index % 3],
        enabled: channel.enabled !== false,
        value: Number.isFinite(channel.value) ? channel.value : 0,
        portId: demoPort?.id || '',
        autoCreated: true,
        demoChannel: true,
        sourceKey: channel.sourceKey || channel.name || `demo-${index}`
      }))
    )
    if (demoPort) {
      demoPort.logs = []
      const rxText = '{"hr":74,"spo2":98.2,"data":{"temperature":36.7}}'
      const txText = 'status?'
      portsStore.addPortLog(demoPort.id, 'system', 'Demo workspace loaded: JSON lines source ready')
      portsStore.addPortLog(demoPort.id, 'rx', rxText, 'utf8', new TextEncoder().encode(rxText))
      portsStore.addPortLog(demoPort.id, 'tx', txText, 'utf8', new TextEncoder().encode(txText))
      demoPort.totalRx = rxText.length
      demoPort.totalTx = txText.length
    }

    const history = buildDemoHistory()
    store.dataHistory.splice(0, store.dataHistory.length, ...history)
    store.fullDataHistory.splice(0, store.fullDataHistory.length, ...history)
    store.saveWorkspaceState()

    activeTab.value = 'canvas'
    selectedWidgetId.value = null
    showSettingsPanel.value = false
    notify.success('示例看板已加载，可以直接查看图表和数值控件')
  } catch (error) {
    notify.error(error?.message || '示例看板加载失败')
  }
}

// 全局点击关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-cat-bg" data-ai="serial-app">
    <!-- 顶部栏 -->
    <HeaderBar 
      :tabs="tabs"
      :active-tab="activeTab"
      :is-paused="isPaused"
      :is-recording="isRecording"
      @set-tab="setSerialTab"
      @toggle-pause="isPaused = !isPaused"
      @clear-all="clearAll"
      @toggle-recording="isRecording = !isRecording"
      @show-widget-panel="showWidgetPanel = true"
      @load-demo-workspace="loadDemoWorkspace"
      @open-home="openHome"
    />

    <!-- 主体区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧边栏 -->
      <Sidebar />

      <!-- 中间内容区 -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- 内容区域 -->
        <div class="flex-1 overflow-hidden">
          <CanvasView 
            v-show="activeTab === 'canvas'" 
            v-model:selected-widget="selectedWidgetId"
            @show-context-menu="openWidgetContextMenu"
            @show-canvas-context-menu="openCanvasContextMenu"
            @show-widget-panel="showWidgetPanel = true"
            @load-demo-workspace="loadDemoWorkspace"
          />
          <TerminalView v-show="activeTab === 'terminal'" />
          <ProtocolView v-show="activeTab === 'protocol'" />
        </div>
      </main>

      <!-- 右侧设置面板 - 根据标签页显示不同面板 -->
      <SettingsPanel
        v-if="showSettingsPanel && activeTab === 'canvas' && selectedWidget"
        :widget="selectedWidget"
        @close="showSettingsPanel = false"
        @delete="selectedWidgetId = null"
      />
    </div>

    <!-- 控件面板弹窗 -->
    <WidgetPanel 
      v-if="showWidgetPanel" 
      @widget-added="handleWidgetAdded"
      @close="showWidgetPanel = false"
    />

    <!-- 右键菜单 -->
    <ContextMenu 
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @close="closeContextMenu"
    />
  </div>
</template>
