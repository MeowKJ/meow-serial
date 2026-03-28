<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSerialStore } from './stores/serial'
import { usePortsStore } from './stores/ports'

// Components
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import CanvasView from './components/CanvasView.vue'
import TerminalView from './components/TerminalView.vue'
import ProtocolView from './components/ProtocolView.vue'
import WidgetPanel from './components/WidgetPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import TerminalSettingsPanel from './components/TerminalSettingsPanel.vue'
import ContextMenu from './components/ContextMenu.vue'

const store = useSerialStore()
const portsStore = usePortsStore()

// 界面状态
const activeTab = ref('canvas')
const tabs = [
  { id: 'canvas', name: '画布喵', icon: '🎨' },
  { id: 'terminal', name: '终端喵', icon: '🖥️' },
  { id: 'protocol', name: '协议喵', icon: '📋' }
]

const isPaused = ref(false)
const isRecording = ref(false)
const showWidgetPanel = ref(false)
const showSettingsPanel = ref(false)
const showTerminalSettings = ref(true)
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
      label: '编辑控件',
      action: () => {
        activeTab.value = 'canvas'
        showSettingsPanel.value = true
      }
    },
    {
      icon: '📄',
      label: '复制控件',
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
        label: '清空趋势数据',
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
      label: '置于顶层',
      action: () => store.bringWidgetToFront(widgetId)
    },
    {
      icon: '⬇️',
      label: '置于底层',
      action: () => store.sendWidgetToBack(widgetId)
    },
    { divider: true },
    {
      icon: '🗑️',
      label: '删除控件',
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
        label: '添加控件',
        action: () => {
          activeTab.value = 'canvas'
          showWidgetPanel.value = true
        }
      }
    ]
  }
}

// 导出日志 — 合并所有端口日志
const handleExportLog = ({ format }) => {
  const allLogs = []
  for (const p of portsStore.ports) {
    for (const log of p.logs) {
      allLogs.push({ ...log, _portLabel: p.label })
    }
  }
  allLogs.sort((a, b) => a.id - b.id)
  const logs = allLogs
  let content = ''
  let filename = `serial_log_${new Date().toISOString().slice(0,19).replace(/[:-]/g, '')}`

  if (format === 'json') {
    content = JSON.stringify(logs.map(l => ({
      time: l.time,
      dir: l.dir,
      data: l.data,
      type: l.type
    })), null, 2)
    filename += '.json'
  } else if (format === 'csv') {
    content = 'Time,Direction,Data\n' + logs.map(l => {
      const dir = l.dir === 'rx' ? 'RX' : (l.dir === 'tx' ? 'TX' : 'SYS')
      return `"${l.time}","${dir}","${l.data.replace(/"/g, '""')}"`
    }).join('\n')
    filename += '.csv'
  } else {
    content = logs.map(l => {
      const dir = l.dir === 'rx' ? 'RX' : (l.dir === 'tx' ? 'TX' : 'SYS')
      return `[${l.time}] [${dir}] ${l.data}`
    }).join('\n')
    filename += '.txt'
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 全局点击关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-cat-bg">
    <!-- 顶部栏 -->
    <HeaderBar 
      :tabs="tabs"
      :active-tab="activeTab"
      :is-paused="isPaused"
      :is-recording="isRecording"
      @set-tab="activeTab = $event"
      @toggle-pause="isPaused = !isPaused"
      @clear-all="clearAll"
      @toggle-recording="isRecording = !isRecording"
      @show-widget-panel="showWidgetPanel = true"
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
          />
          <TerminalView
            v-show="activeTab === 'terminal'"
            :settings-visible="showTerminalSettings"
            @toggle-settings="showTerminalSettings = !showTerminalSettings"
          />
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
      <TerminalSettingsPanel
        v-if="showTerminalSettings && activeTab === 'terminal'"
        @close="showTerminalSettings = false"
        @export-log="handleExportLog"
      />
    </div>

    <!-- 控件面板弹窗 -->
    <WidgetPanel 
      v-if="showWidgetPanel" 
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
