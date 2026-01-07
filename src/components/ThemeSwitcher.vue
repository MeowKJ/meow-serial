<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()

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
  return themeStore.isDark ? '深色' : '浅色'
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- 主题选择 -->
    <div class="relative group">
      <button
        class="w-8 h-8 rounded-lg bg-cat-surface hover:bg-cat-border border border-cat-border flex items-center justify-center text-lg transition-colors"
        :title="`当前主题: ${themeStore.themeName}`">
        {{ themeStore.themeIcon }}
      </button>

      <!-- 主题下拉菜单 -->
      <div
        class="absolute right-0 top-full mt-2 w-40 bg-cat-card border border-cat-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
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
      </div>
    </div>

    <!-- 深色/浅色模式切换 -->
    <button @click="toggleDarkMode"
      class="w-8 h-8 rounded-lg bg-cat-surface hover:bg-cat-border border border-cat-border flex items-center justify-center text-lg transition-colors"
      :title="`切换到${themeStore.isDark ? '浅色' : '深色'}模式`">
      {{ modeIcon }}
    </button>
  </div>
</template>
