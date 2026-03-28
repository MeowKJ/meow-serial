<script setup>
import { computed, ref, onMounted, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'info', // 'info' | 'success' | 'warning' | 'error'
        validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
    },
    duration: {
        type: Number,
        default: 3000 // 显示时长（毫秒），0表示不自动关闭
    },
    show: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['close', 'update:show'])

const visible = ref(props.show)
const isClosing = ref(false)

// 类型配置
const typeConfig = {
  info: {
    icon: 'ℹ',
    title: '提示',
    accent: 'var(--cat-info)',
    iconTone: 'var(--cat-info)',
    iconBg: 'rgba(59, 130, 246, 0.16)',
    progress: 'linear-gradient(90deg, rgba(59,130,246,0.95), rgba(14,165,233,0.75))'
  },
  success: {
    icon: '✓',
    title: '成功',
    accent: 'var(--cat-success)',
    iconTone: 'var(--cat-success)',
    iconBg: 'rgba(16, 185, 129, 0.16)',
    progress: 'linear-gradient(90deg, rgba(16,185,129,0.95), rgba(52,211,153,0.78))'
  },
  warning: {
    icon: '!',
    title: '注意',
    accent: 'var(--cat-warning)',
    iconTone: 'var(--cat-warning)',
    iconBg: 'rgba(245, 158, 11, 0.16)',
    progress: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(251,191,36,0.78))'
  },
  error: {
    icon: '×',
    title: '错误',
    accent: 'var(--cat-error)',
    iconTone: 'var(--cat-error)',
    iconBg: 'rgba(239, 68, 68, 0.16)',
    progress: 'linear-gradient(90deg, rgba(239,68,68,0.95), rgba(248,113,113,0.78))'
  }
}

const config = computed(() => typeConfig[props.type] || typeConfig.info)

let timer = null

const close = () => {
  if (isClosing.value) return
  isClosing.value = true
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  setTimeout(() => {
    visible.value = false
    emit('close')
    emit('update:show', false)
  }, 220)
}

watch(() => props.show, (newVal) => {
    if (newVal) {
        visible.value = true
        isClosing.value = false
        if (props.duration > 0) {
            if (timer) clearTimeout(timer)
            timer = setTimeout(close, props.duration)
        }
    } else {
        close()
    }
})

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-[-10px] translate-x-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 translate-x-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 translate-x-0 scale-100"
    leave-to-class="opacity-0 translate-y-[-8px] translate-x-2 scale-95"
  >
    <div
      v-if="visible"
      class="cat-toast"
      :class="isClosing ? 'opacity-0' : 'opacity-100'"
      :style="{ '--toast-accent': config.accent, '--toast-progress': config.progress, '--toast-icon-bg': config.iconBg, '--toast-icon-tone': config.iconTone }"
      role="status"
      aria-live="polite"
    >
      <div class="cat-toast-accent"></div>
      <div class="cat-toast-body">
        <div class="cat-toast-icon">
          {{ config.icon }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="cat-toast-title-row">
            <span class="cat-toast-title">{{ config.title }}</span>
            <span class="cat-toast-tag">{{ props.type }}</span>
          </div>
          <p class="cat-toast-message">
            {{ message }}
          </p>
        </div>

        <button @click="close" class="cat-toast-close" aria-label="关闭提示">
          ✕
        </button>
      </div>

      <div v-if="duration > 0" class="cat-toast-progress-track">
        <div
          class="cat-toast-progress"
          :style="{ width: '100%', animation: `shrink ${duration}ms linear forwards` }"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes shrink {
  from {
    width: 100%;
  }

  to {
    width: 0%;
  }
}

.cat-toast {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--cat-card) 96%, white 4%) 0%, color-mix(in srgb, var(--cat-card) 98%, transparent) 100%);
  border: 1px solid color-mix(in srgb, var(--toast-accent) 38%, var(--cat-border) 62%);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  transition: opacity 0.2s ease;
}

.cat-toast-accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--toast-accent);
}

.cat-toast-body {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 0.95rem 0.85rem 0.95rem;
}

.cat-toast-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--toast-icon-bg);
  color: var(--toast-icon-tone);
  font-size: 1rem;
  font-weight: 700;
}

.cat-toast-title-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.cat-toast-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--toast-accent);
  letter-spacing: 0.02em;
}

.cat-toast-tag {
  padding: 0.12rem 0.38rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--toast-accent) 14%, transparent);
  color: color-mix(in srgb, var(--toast-accent) 84%, white 16%);
  font-size: 0.65rem;
  line-height: 1.1;
  text-transform: uppercase;
}

.cat-toast-message {
  margin-top: 0.25rem;
  font-size: 0.84rem;
  line-height: 1.4;
  color: var(--cat-text);
  word-break: break-word;
}

.cat-toast-close {
  width: 1.9rem;
  height: 1.9rem;
  flex-shrink: 0;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cat-muted);
  transition: all 0.18s ease;
}

.cat-toast-close:hover {
  color: var(--cat-text);
  background: color-mix(in srgb, var(--cat-surface) 78%, transparent);
}

.cat-toast-progress-track {
  height: 3px;
  background: color-mix(in srgb, var(--cat-border) 42%, transparent);
}

.cat-toast-progress {
  height: 100%;
  background: var(--toast-progress);
}
</style>
