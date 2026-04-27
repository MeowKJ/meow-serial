<script setup>
import { computed } from 'vue'
import { useSerialStore } from '../stores/serial'
import { useI18nStore } from '../stores/i18n'
import { getWidgetDefaults, widgetTypes } from '../widgets'

const store = useSerialStore()
const i18n = useI18nStore()
const emit = defineEmits(['close', 'widget-added'])

const localizedWidgetTypes = computed(() => widgetTypes.map((widgetType) => ({
  ...widgetType,
  name: i18n.t(widgetType.nameKey || widgetType.name),
  desc: i18n.t(widgetType.descKey || widgetType.desc)
})))

const addWidget = (widgetType) => {
  const createdWidget = store.addWidget({
    ...getWidgetDefaults(widgetType.type),
    x: 50 + Math.random() * 100,
    y: 50 + Math.random() * 100
  })
  emit('widget-added', createdWidget)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-cat-dark/60" data-ai="widget-panel-overlay" @click="emit('close')">
    <div class="bg-cat-card rounded-2xl w-[640px] max-h-[80vh] overflow-hidden shadow-2xl" data-ai="widget-panel" @click.stop>
      <div class="p-5 border-b border-cat-border flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🧩</span>
          <div>
            <h2 class="font-semibold text-lg">{{ i18n.t('widgetPanel.title') }}</h2>
            <p class="text-sm text-cat-muted">{{ i18n.t('widgetPanel.subtitle') }}</p>
          </div>
        </div>
        <button @click="emit('close')" data-ai="close-widget-panel" class="w-8 h-8 rounded-lg hover:bg-cat-surface flex items-center justify-center text-cat-muted">✕</button>
      </div>
      
      <div class="p-5 grid grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
        <button 
          v-for="w in localizedWidgetTypes" 
          :key="w.type" 
          @click="addWidget(w)"
          :data-ai="`add-widget-${w.type}`"
          class="p-4 rounded-xl bg-cat-surface hover:bg-cat-border/50 text-left transition-all group"
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ w.icon }}</div>
          <div class="font-medium text-sm">{{ w.name }}</div>
          <div class="text-xs text-cat-muted mt-1">{{ w.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
