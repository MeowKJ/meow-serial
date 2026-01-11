import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

/**
 * 主题配置
 * 包含完整的颜色系统，包括通道颜色、控件颜色等
 */
const themes = {
  // 布偶猫 - 浅蓝可爱风格
  ragdoll: {
    name: '布偶猫',
    darkName: '黑猫',
    icon: '🐱',
    darkIcon: '🐈‍⬛', // 深色模式变黑猫
    colors: {
      light: {
        // 主色调 - 浅蓝色系
        primary: '#7DD3FC',    // 天蓝色
        secondary: '#38BDF8',  // 亮蓝色
        accent: '#BAE6FD',     // 淡蓝色
        warm: '#E0F2FE',       // 极淡蓝

        // 背景色系
        bg: '#F8FAFC',        // 极浅灰蓝
        card: '#FFFFFF',      // 纯白
        surface: '#F1F5F9',   // 浅灰蓝
        border: '#E2E8F0',    // 灰蓝边框
        text: '#0F172A',      // 深灰蓝文字
        muted: '#64748B',     // 中灰蓝
        dark: '#F8FAFC',      // 同bg

        // 终端专用颜色
        terminalText: '#0F172A',      // 终端文字颜色
        terminalAccent: '#0EA5E9',    // 终端强调色（HEX字节等）
        terminalAccentBg: '#BAE6FD',  // 终端强调背景色

        // 通道颜色（可爱风格 - 蓝色系，高对比度，丰富色彩）
        channelColors: ['#0EA5E9', '#06B6D4', '#3B82F6', '#2563EB', '#1D4ED8', '#6366F1', '#8B5CF6', '#0891B2'],

        // 控件特殊颜色
        success: '#10B981',   // 绿色
        warning: '#F59E0B',   // 橙色
        error: '#EF4444',     // 红色
        info: '#3B82F6'       // 蓝色
      },
      dark: {
        // 主色调 - 深色模式保持蓝色但更深
        primary: '#0EA5E9',    // 亮蓝色
        secondary: '#0284C7',  // 深蓝色
        accent: '#FBBF24',     // 琥珀黄（强调色，与蓝色形成对比）
        warm: '#7DD3FC',       // 浅蓝色

        // 背景色系
        bg: '#0F172A',        // 深灰蓝
        card: '#1E293B',      // 深蓝灰
        surface: '#334155',   // 中蓝灰
        border: '#475569',    // 浅蓝灰边框
        text: '#F1F5F9',      // 浅灰蓝文字
        muted: '#94A3B8',     // 中灰蓝
        dark: '#0F172A',      // 同bg

        // 终端专用颜色
        terminalText: '#E2E8F0',      // 终端文字颜色
        terminalAccent: '#FBBF24',    // 终端强调色（琥珀黄）
        terminalAccentBg: '#78350F',  // 终端强调背景色（深琥珀）

        // 通道颜色（深色模式 - 蓝色系，高对比度，丰富色彩）
        channelColors: ['#60A5FA', '#38BDF8', '#3B82F6', '#2563EB', '#1D4ED8', '#22D3EE', '#06B6D4', '#0891B2'],

        // 控件特殊颜色
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    }
  },
  // 暹罗猫 - 黑白灰大气风格
  siamese: {
    name: '暹罗猫',
    darkName: '暹罗猫',
    icon: '🐈',
    darkIcon: '🐈',
    colors: {
      light: {
        // 主色调 - 黑白灰
        primary: '#475569',    // 深灰
        secondary: '#64748B',  // 中灰
        accent: '#94A3B8',     // 浅灰
        warm: '#E2E8F0',       // 极浅灰

        // 背景色系
        bg: '#FFFFFF',        // 纯白
        card: '#F8FAFC',      // 极浅灰
        surface: '#F1F5F9',   // 浅灰
        border: '#E2E8F0',    // 灰边框
        text: '#0F172A',      // 深灰文字
        muted: '#64748B',     // 中灰
        dark: '#FFFFFF',      // 同bg

        // 终端专用颜色
        terminalText: '#1E293B',      // 终端文字颜色
        terminalAccent: '#475569',    // 终端强调色（深灰）
        terminalAccentBg: '#E2E8F0',  // 终端强调背景色

        // 通道颜色（黑白灰系 - 低饱和度蓝灰/紫灰色调，保持主题但提高辨识度）
        channelColors: ['#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0', '#5A6C7D', '#7C8FA1', '#B8C5D1'],

        // 控件特殊颜色
        success: '#059669',   // 深绿
        warning: '#D97706',   // 深橙
        error: '#DC2626',     // 深红
        info: '#1E40AF'       // 深蓝
      },
      dark: {
        // 主色调 - 深色模式黑白灰
        primary: '#E0E0E0',    // 浅灰（提高亮度）
        secondary: '#B0B0B0',  // 中灰
        accent: '#A0A0A0',     // 浅灰（提高对比度）
        warm: '#606060',       // 更深灰

        // 背景色系 - VSCode经典深色方案
        bg: '#1E1E1E',        // VSCode主背景
        card: '#252526',      // VSCode侧边栏背景
        surface: '#2D2D30',   // VSCode编辑器背景
        border: '#3E3E42',    // VSCode边框
        text: '#CCCCCC',      // VSCode主文字
        muted: '#858585',     // VSCode次要文字
        dark: '#1E1E1E',      // 同bg

        // 终端专用颜色
        terminalText: '#D4D4D4',      // 终端文字颜色
        terminalAccent: '#9CDCFE',    // 终端强调色（VSCode蓝）
        terminalAccentBg: '#264F78',  // 终端强调背景色

        // 通道颜色（深色模式黑白灰 - 低饱和度色彩，保持主题但提高辨识度）
        channelColors: ['#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#A0AEC0', '#718096', '#4A5568'],

        // 控件特殊颜色
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#60A5FA'
      }
    }
  },
  // 三花猫 - 花里胡哨土气风格
  calico: {
    name: '三花猫',
    darkName: '三花猫',
    icon: '🐾',
    darkIcon: '🐾',
    colors: {
      light: {
        // 主色调 - 花里胡哨
        primary: '#FF6B9D',    // 粉红
        secondary: '#C44569',  // 深粉
        accent: '#FFB6C1',     // 浅粉
        warm: '#FFE5E5',       // 极浅粉

        // 背景色系 - 土气风格
        bg: '#FFF8E1',        // 米黄色
        card: '#FFFFFF',      // 白色
        surface: '#FFF3C4',   // 浅黄
        border: '#FFE082',    // 黄色边框
        text: '#5D4037',      // 棕色文字
        muted: '#8D6E63',     // 中棕
        dark: '#FFF8E1',      // 同bg

        // 终端专用颜色
        terminalText: '#5D4037',      // 终端文字颜色（棕色）
        terminalAccent: '#FF6B9D',    // 终端强调色（粉红）
        terminalAccentBg: '#FFE5E5',  // 终端强调背景色

        // 通道颜色（花里胡哨）
        channelColors: ['#FF6B9D', '#FF8C42', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#E74C3C', '#F39C12'],

        // 控件特殊颜色（鲜艳）
        success: '#27AE60',   // 鲜绿
        warning: '#F39C12',   // 鲜橙
        error: '#E74C3C',     // 鲜红
        info: '#3498DB'       // 鲜蓝
      },
      dark: {
        // 主色调 - 深色模式也花里胡哨
        primary: '#FF6B9D',    // 粉红
        secondary: '#C44569',  // 深粉
        accent: '#FF8C42',     // 橙色
        warm: '#FFD93D',       // 黄色

        // 背景色系 - 深色土气
        bg: '#2C1810',        // 深棕
        card: '#3E2723',      // 深棕灰
        surface: '#5D4037',   // 中棕
        border: '#8D6E63',    // 浅棕边框
        text: '#FFE5E5',      // 浅粉文字
        muted: '#BCAAA4',     // 中棕灰
        dark: '#2C1810',      // 同bg

        // 终端专用颜色
        terminalText: '#FFE5E5',      // 终端文字颜色
        terminalAccent: '#FFD93D',    // 终端强调色（黄色）
        terminalAccentBg: '#78350F',  // 终端强调背景色

        // 通道颜色（深色模式花里胡哨）
        channelColors: ['#FF6B9D', '#FF8C42', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#E74C3C', '#F39C12'],

        // 控件特殊颜色
        success: '#27AE60',
        warning: '#F39C12',
        error: '#E74C3C',
        info: '#3498DB'
      }
    }
  }
}

export const useThemeStore = defineStore('theme', () => {
  // 当前主题
  const currentTheme = ref('ragdoll') // 'ragdoll' | 'siamese' | 'calico'
  
  // 当前模式
  const isDark = ref(true) // true = 深色模式, false = 浅色模式
  
  // 获取当前主题配置
  const theme = computed(() => themes[currentTheme.value])
  
  // 获取当前颜色
  const colors = computed(() => {
    return theme.value.colors[isDark.value ? 'dark' : 'light']
  })
  
  // 获取主题图标（布偶猫深色模式变黑猫）
  const themeIcon = computed(() => {
    if (currentTheme.value === 'ragdoll' && isDark.value) {
      return themes.ragdoll.darkIcon
    }
    return theme.value.icon
  })
  
  // 获取主题名称（布偶猫深色模式显示"黑猫"）
  const themeName = computed(() => {
    if (currentTheme.value === 'ragdoll' && isDark.value) {
      return theme.value.darkName || '黑猫'
    }
    return theme.value.name
  })
  
  // 切换主题
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      currentTheme.value = themeName
      applyTheme()
    }
  }
  
  // 切换深色/浅色模式
  const toggleDarkMode = () => {
    isDark.value = !isDark.value
    applyTheme()
  }
  
  // 设置深色模式
  const setDarkMode = (dark) => {
    isDark.value = dark
    applyTheme()
  }
  
  // 应用主题到CSS变量
  const applyTheme = () => {
    const root = document.documentElement
    const themeColors = colors.value

    // 设置主色调CSS变量
    root.style.setProperty('--cat-primary', themeColors.primary)
    root.style.setProperty('--cat-secondary', themeColors.secondary)
    root.style.setProperty('--cat-accent', themeColors.accent)
    root.style.setProperty('--cat-warm', themeColors.warm)

    // 设置背景和文本颜色（从主题配置读取）
    root.style.setProperty('--cat-bg', themeColors.bg)
    root.style.setProperty('--cat-card', themeColors.card)
    root.style.setProperty('--cat-surface', themeColors.surface)
    root.style.setProperty('--cat-border', themeColors.border)
    root.style.setProperty('--cat-text', themeColors.text)
    root.style.setProperty('--cat-muted', themeColors.muted)
    root.style.setProperty('--cat-dark', themeColors.dark)

    // 设置终端专用颜色
    root.style.setProperty('--cat-terminal-text', themeColors.terminalText)
    root.style.setProperty('--cat-terminal-accent', themeColors.terminalAccent)
    root.style.setProperty('--cat-terminal-accent-bg', themeColors.terminalAccentBg)

    // 设置特殊颜色
    root.style.setProperty('--cat-success', themeColors.success)
    root.style.setProperty('--cat-warning', themeColors.warning)
    root.style.setProperty('--cat-error', themeColors.error)
    root.style.setProperty('--cat-info', themeColors.info)

    // 设置body类
    document.body.classList.toggle('dark', isDark.value)
    document.body.classList.toggle('light', !isDark.value)
  }
  
  // 获取通道颜色列表
  const getChannelColors = () => {
    return colors.value.channelColors || []
  }
  
  // 初始化主题
  const initTheme = () => {
    // 从localStorage读取
    const savedTheme = localStorage.getItem('cat-theme')
    const savedDark = localStorage.getItem('cat-dark-mode')
    
    if (savedTheme && themes[savedTheme]) {
      currentTheme.value = savedTheme
    }
    
    if (savedDark !== null) {
      isDark.value = savedDark === 'true'
    } else {
      // 默认跟随系统
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    applyTheme()
  }
  
  // 监听变化并保存
  watch([currentTheme, isDark], () => {
    localStorage.setItem('cat-theme', currentTheme.value)
    localStorage.setItem('cat-dark-mode', isDark.value.toString())
  })
  
  // 获取所有主题列表
  const themeList = computed(() => {
    return Object.keys(themes).map(key => ({
      key,
      ...themes[key]
    }))
  })
  
  return {
    currentTheme,
    isDark,
    theme,
    colors,
    themeIcon,
    themeName,
    themeList,
    setTheme,
    toggleDarkMode,
    setDarkMode,
    initTheme,
    applyTheme,
    getChannelColors
  }
})
