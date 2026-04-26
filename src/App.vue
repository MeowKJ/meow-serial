<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSerialStore } from './stores/serial'
import { useI18nStore } from './stores/i18n'

// Components
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import HomeView from './components/HomeView.vue'
import CanvasView from './components/CanvasView.vue'
import TerminalView from './components/TerminalView.vue'
import ProtocolView from './components/ProtocolView.vue'
import WidgetPanel from './components/WidgetPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ContextMenu from './components/ContextMenu.vue'

const store = useSerialStore()
const i18n = useI18nStore()
const basePath = import.meta.env.BASE_URL || '/'

const withBase = (path) => {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

// 界面状态
const getRouteFromLocation = () => {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  let path = window.location.pathname
  if (normalizedBase !== '/' && path.startsWith(normalizedBase)) {
    path = `/${path.slice(normalizedBase.length)}`
  }
  path = path.replace(/\/+$/, '') || '/'
  return path === '/serial' ? 'serial' : 'home'
}

const getInitialSerialTab = () => {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return ['canvas', 'terminal', 'protocol'].includes(tab) ? tab : 'canvas'
}

const route = ref(getRouteFromLocation())
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

const openSerial = (tab = 'canvas') => {
  const safeTab = ['canvas', 'terminal', 'protocol'].includes(tab) ? tab : 'canvas'
  activeTab.value = safeTab
  route.value = 'serial'
  const url = safeTab === 'canvas' ? withBase('serial') : `${withBase('serial')}?tab=${safeTab}`
  window.history.pushState({ route: 'serial', tab: safeTab }, '', url)
}

const setSerialTab = (tab) => {
  if (!['canvas', 'terminal', 'protocol'].includes(tab)) return
  activeTab.value = tab
  const url = tab === 'canvas' ? withBase('serial') : `${withBase('serial')}?tab=${tab}`
  window.history.replaceState({ route: 'serial', tab }, '', url)
}

const openHome = () => {
  route.value = 'home'
  window.history.pushState({ route: 'home' }, '', withBase(''))
}

const syncRouteFromBrowser = () => {
  route.value = getRouteFromLocation()
  if (route.value === 'serial') {
    activeTab.value = getInitialSerialTab()
  }
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

// 全局点击关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  window.addEventListener('popstate', syncRouteFromBrowser)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  window.removeEventListener('popstate', syncRouteFromBrowser)
})
</script>

<template>
  <HomeView
    v-if="route === 'home'"
    @open-protocol="openSerial('protocol')"
    @open-canvas="openSerial('canvas')"
    @open-terminal="openSerial('terminal')"
  />

  <div v-else class="h-screen flex flex-col overflow-hidden bg-cat-bg" data-ai="serial-app">
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
