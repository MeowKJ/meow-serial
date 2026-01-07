import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 初始化主题（必须在其他store之前）
const themeStore = useThemeStore()
themeStore.initTheme()

app.mount('#app')
