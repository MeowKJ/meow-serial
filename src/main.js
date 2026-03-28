import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'
import { useThemeStore } from './stores/theme'
import { useRenderingStore } from './stores/rendering'
import { registerBuiltinParsers } from './parsers'

// 注册内置解析器（必须在 store 初始化之前）
registerBuiltinParsers()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 初始化主题（必须在其他store之前）
const themeStore = useThemeStore()
themeStore.initTheme()

// 初始化渲染加速配置
const renderingStore = useRenderingStore()
renderingStore.init()

app.mount('#app')
