<script setup>
import { computed } from 'vue'
import { useI18nStore } from '../stores/i18n'
import { useThemeStore } from '../stores/theme'
import { useRenderingStore } from '../stores/rendering'

const i18n = useI18nStore()
const themeStore = useThemeStore()
const renderingStore = useRenderingStore()

// 深色/浅色模式切换
const toggleDarkMode = () => {
  themeStore.toggleDarkMode()
}

// 主题图标
const modeIcon = computed(() => {
  return themeStore.isDark ? '🌙' : '☀️'
})

// 主题名称
const modeName = computed(() => {
  return themeStore.isDark ? i18n.t('theme.dark') : i18n.t('theme.light')
})

const renderingModes = computed(() => [
  { key: 'auto', label: i18n.t('theme.renderingModes.auto') },
  { key: 'on', label: i18n.t('theme.renderingModes.on') },
  { key: 'off', label: i18n.t('theme.renderingModes.off') }
])
</script>

<template>
  <div class="relative z-[80] flex items-center gap-2">
    <button
      @click="i18n.toggleLocale()"
      class="min-w-[2.5rem] h-8 rounded-lg bg-cat-surface hover:bg-cat-border border border-cat-border flex items-center justify-center text-xs font-semibold transition-colors"
      :title="`${i18n.t('theme.locale')}: ${i18n.localeOptions.find(item => item.value === i18n.locale)?.label || i18n.locale}`"
    >
      {{ i18n.localeOptions.find(item => item.value === i18n.locale)?.shortLabel || '中' }}
    </button>

    <!-- 主题选择 -->
    <div class="relative group">
      <button
        class="w-8 h-8 rounded-lg bg-cat-surface hover:bg-cat-border border border-cat-border flex items-center justify-center text-lg transition-colors"
        :title="`Theme: ${themeStore.themeName}`">
        {{ themeStore.themeIcon }}
      </button>

      <!-- 主题下拉菜单 -->
      <div
        class="absolute right-0 top-full z-[90] pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto transition-all">
        <div class="w-52 overflow-hidden rounded-xl border border-cat-border bg-cat-card shadow-2xl">
          <div class="p-1">
            <button v-for="theme in themeStore.themeList" :key="theme.key" @click="themeStore.setTheme(theme.key)" :class="[
              'w-full px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 transition-colors',
              themeStore.currentTheme === theme.key
                ? 'bg-cat-primary/20 text-cat-primary'
                : 'hover:bg-cat-surface text-cat-text'
            ]">
              <span class="text-lg">{{ (themeStore.isDark && theme.key === 'ragdoll') ? (theme.darkIcon || '🐈‍⬛') :
                theme.icon }}</span>
              <span>{{ (themeStore.isDark && theme.key === 'ragdoll') ? (theme.darkName || '黑猫') : theme.name }}</span>
              <span v-if="themeStore.currentTheme === theme.key" class="ml-auto text-xs">✓</span>
            </button>
          </div>

          <div class="border-t border-cat-border/70 px-3 py-2">
            <div class="mb-2 flex items-center justify-between text-[11px] text-cat-muted">
              <span>{{ i18n.t('theme.rendering') }}</span>
              <span>{{ renderingStore.statusText }}</span>
            </div>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="mode in renderingModes"
                :key="mode.key"
                @click="renderingStore.setMode(mode.key)"
                :class="[
                  'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  renderingStore.mode === mode.key
                    ? 'bg-cat-primary/20 text-cat-primary'
                    : 'bg-cat-surface text-cat-muted hover:bg-cat-border hover:text-cat-text'
                ]">
                {{ mode.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 深色/浅色模式切换 -->
    <button @click="toggleDarkMode"
      class="w-8 h-8 rounded-lg bg-cat-surface hover:bg-cat-border border border-cat-border flex items-center justify-center text-lg transition-colors"
      :title="i18n.t('theme.switchToMode', { mode: themeStore.isDark ? i18n.t('theme.light') : i18n.t('theme.dark') })">
      {{ modeIcon }}
    </button>
  </div>
</template>
