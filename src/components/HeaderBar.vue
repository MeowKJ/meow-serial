<script setup>
import { computed, ref } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useI18nStore } from '../stores/i18n'
import { usePortsStore } from '../stores/ports'
import { notify } from '../utils/notification'
import FluentEmoji from './common/FluentEmoji.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

const store = useSerialStore()
const i18n = useI18nStore()
const portsStore = usePortsStore()
const importInput = ref(null)

const connectedCount = computed(() => portsStore.ports.filter(port => port.connected).length)
const totalRateLabel = computed(() => {
  if (!portsStore.anyConnected) return ''
  return `↓${(portsStore.totalStats.rxRate / 1000).toFixed(1)}K/s · ↑${(portsStore.totalStats.txRate / 1000).toFixed(1)}K/s`
})

defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: 'canvas'
  },
  isPaused: Boolean,
  isRecording: Boolean
})

const emit = defineEmits(['set-tab', 'clear-all', 'show-widget-panel'])

const exportLayout = () => {
  store.saveWorkspaceState()
  const filename = store.exportWorkspaceConfig()
  if (filename) {
    notify.success(i18n.t('header.notifications.exportSuccess', { filename }))
    return
  }
  notify.error(i18n.t('header.notifications.exportError'))
}

const importLayout = () => {
  importInput.value?.click()
}

const handleImportChange = async (event) => {
  const file = event.target?.files?.[0]
  event.target.value = ''

  if (!file) return

  const confirmed = confirm(i18n.t('header.confirmImport'))
  if (!confirmed) return

  try {
    await store.importWorkspaceConfig(file)
    notify.success(i18n.t('header.notifications.importSuccess', { filename: file.name }))
  } catch (error) {
    notify.error(error?.message || i18n.t('header.notifications.importError'))
    return
  }
}

const confirmClearAll = () => {
  const confirmed = confirm(i18n.t('header.confirmClearAll'))
  if (!confirmed) return
  emit('clear-all')
  notify.success(i18n.t('header.notifications.clearAllSuccess'))
}

const canvasBackdropIconMap = {
  grid: '┼',
  dots: '⋯',
  blank: '□'
}

const canvasBackdropMode = computed(() => store.canvas?.backdropMode || 'grid')
const canvasBackdropLabel = computed(() => i18n.t(`header.backgroundModes.${canvasBackdropMode.value}`))
const canvasBackdropIcon = computed(() => canvasBackdropIconMap[canvasBackdropMode.value] || '┼')

const toggleCanvasBackdropPattern = () => {
  store.toggleCanvasBackdropPattern()
  notify.success(i18n.t('header.notifications.backgroundChanged', { mode: canvasBackdropLabel.value }))
}
</script>

<template>
  <header class="relative z-[70] bg-cat-card/92 backdrop-blur-xl border-b border-cat-border/45 px-2 py-1 shrink-0 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cat-primary to-cat-secondary flex items-center justify-center text-sm shadow-sm shrink-0">
          <FluentEmoji name="cat" :size="18" alt="cat" />
        </div>
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="font-semibold text-sm text-cat-text truncate">{{ i18n.t('header.appTitle') }}</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-cat-surface rounded-full text-cat-muted shrink-0">{{ i18n.t('header.version') }}</span>
        </div>
      </div>

      <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
        <div class="header-group shrink-0">
          <button @click="$emit('show-widget-panel')" class="header-action">
            <FluentEmoji name="puzzlePiece" :size="16" alt="" /> {{ i18n.t('header.buttons.widgets') }}
          </button>
          <button
            v-if="activeTab === 'canvas'"
            @click="toggleCanvasBackdropPattern"
            :class="[
              'header-action',
              canvasBackdropMode !== 'blank' ? 'header-action-active' : ''
            ]"
            :title="i18n.t('header.backgroundTitle')"
          >
            <span>{{ canvasBackdropIcon }}</span> {{ i18n.t('header.buttons.background') }}: {{ canvasBackdropLabel }}
          </button>
          <button
            @click="exportLayout"
            :title="i18n.t('header.exportTitle')"
            class="header-action"
          >
            <FluentEmoji name="floppyDisk" :size="16" alt="" /> {{ i18n.t('header.buttons.export') }}
          </button>
          <button
            @click="importLayout"
            :title="i18n.t('header.importTitle')"
            class="header-action"
          >
            <FluentEmoji name="fileFolder" :size="16" alt="" /> {{ i18n.t('header.buttons.import') }}
          </button>
          <button @click="confirmClearAll" class="header-action header-action-danger">
            <FluentEmoji name="wastebasket" :size="16" alt="" /> {{ i18n.t('header.buttons.clearAll') }}
          </button>
        </div>

        <div class="header-group shrink-0">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="$emit('set-tab', tab.id)"
            :class="[
              'header-tab',
              activeTab === tab.id
                ? 'header-tab-active'
                : 'header-tab-idle'
            ]"
          >
            <FluentEmoji v-if="tab.emojiName" :name="tab.emojiName" :size="16" alt="" />
            <span v-else>{{ tab.icon }}</span>
            {{ tab.name }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <div class="header-status-pill">
          {{ i18n.t('header.portsOnline', { online: connectedCount, total: portsStore.ports.length }) }}
        </div>

        <div
          v-if="portsStore.anyConnected"
          class="header-status-pill text-cat-primary"
        >
          {{ totalRateLabel }}
        </div>

        <ThemeSwitcher />

        <div v-if="!portsStore.serialSupported" class="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-yellow-400 shrink-0 shadow-[inset_0_1px_0_rgba(250,204,21,0.15)]">
          <FluentEmoji name="warning" :size="14" alt="" />
          <span class="text-[10px]">{{ i18n.t('header.websocketOnly') }}</span>
        </div>
      </div>
    </div>
    <input
      ref="importInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="handleImportChange"
    >
  </header>
</template>

<style scoped>
.header-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--cat-surface) 48%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.header-action,
.header-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem 0.68rem;
  border-radius: 9999px;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  color: var(--cat-muted);
  transition: all 0.2s ease;
}

.header-action:hover,
.header-tab-idle:hover {
  color: var(--cat-text);
  background: color-mix(in srgb, var(--cat-card) 90%, transparent);
}

.header-action-danger {
  color: #f87171;
}

.header-action-danger:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
}

.header-action-active {
  color: var(--cat-primary);
  background: color-mix(in srgb, var(--cat-primary) 12%, transparent);
}

.header-tab-active {
  color: white;
  background: linear-gradient(135deg, var(--cat-primary) 0%, var(--cat-secondary) 100%);
  box-shadow: 0 6px 14px rgba(14, 165, 233, 0.24);
}

.header-tab-idle {
  color: var(--cat-muted);
}

.header-status-pill {
  display: flex;
  align-items: center;
  height: 1.75rem;
  padding: 0 0.7rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--cat-surface) 44%, transparent);
  color: var(--cat-muted);
  font-size: 10px;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
</style>
