import { createApp, h, ref } from 'vue'
import CatNotification from '../components/CatNotification.vue'

/**
 * 通知管理器
 */
class NotificationManager {
  constructor() {
    this.container = null
    this.notifications = []
    this.maxNotifications = 5
  }

  /**
   * 初始化容器
   */
  init() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'cat-notification-container'
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none'
      document.body.appendChild(this.container)
    }
  }

  /**
   * 显示通知
   */
  show(message, type = 'info', duration = 3000) {
    this.init()

    const notificationId = Date.now() + Math.random()
    const notificationEl = document.createElement('div')
    notificationEl.className = 'pointer-events-auto'
    
    const manager = this
    // 创建Vue应用
    const app = createApp({
      setup() {
        const visible = ref(true)
        
        const close = () => {
          visible.value = false
          setTimeout(() => {
            app.unmount()
            notificationEl.remove()
            const index = manager.notifications.findIndex(n => n.id === notificationId)
            if (index > -1) {
              manager.notifications.splice(index, 1)
            }
          }, 300)
        }

        return () => h(CatNotification, {
          message,
          type,
          duration,
          show: visible.value,
          onClose: close,
          'onUpdate:show': (val) => { visible.value = val }
        })
      }
    })

    app.mount(notificationEl)
    this.container.appendChild(notificationEl)

    // 限制通知数量
    if (this.notifications.length >= this.maxNotifications) {
      const oldest = this.notifications.shift()
      if (oldest && oldest.el) {
        oldest.el.remove()
        if (oldest.app) {
          oldest.app.unmount()
        }
      }
    }

    this.notifications.push({
      id: notificationId,
      el: notificationEl,
      app
    })

    return notificationId
  }

  /**
   * 显示信息通知
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration)
  }

  /**
   * 显示成功通知
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration)
  }

  /**
   * 显示警告通知
   */
  warning(message, duration = 3000) {
    return this.show(message, 'warning', duration)
  }

  /**
   * 显示错误通知
   */
  error(message, duration = 4000) {
    return this.show(message, 'error', duration)
  }
}

// 创建单例
export const notification = new NotificationManager()

// 便捷方法
export const showNotification = (message, type = 'info', duration = 3000) => {
  return notification.show(message, type, duration)
}

export const notify = {
  info: (message, duration) => notification.info(message, duration),
  success: (message, duration) => notification.success(message, duration),
  warning: (message, duration) => notification.warning(message, duration),
  error: (message, duration) => notification.error(message, duration)
}
