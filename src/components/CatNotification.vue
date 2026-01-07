<script setup>
import { ref, onMounted, watch } from 'vue'

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
        icon: '🐱',
        bgColor: 'bg-cat-primary/20',
        borderColor: 'border-cat-primary/50',
        textColor: 'text-cat-primary',
        iconBg: 'bg-cat-primary/30'
    },
    success: {
        icon: '✅',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-300',
        iconBg: 'bg-green-500/30'
    },
    warning: {
        icon: '⚠️',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-300',
        iconBg: 'bg-yellow-500/30'
    },
    error: {
        icon: '❌',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-300',
        iconBg: 'bg-red-500/30'
    }
}

const config = typeConfig[props.type]

let timer = null

const close = () => {
    isClosing.value = true
    setTimeout(() => {
        visible.value = false
        emit('close')
        emit('update:show', false)
    }, 300)
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
</script>

<template>
    <Transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-[-20px] scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-[-20px] scale-95">
        <div v-if="visible" :class="[
            'fixed top-4 right-4 z-50 min-w-[300px] max-w-[500px]',
            'bg-cat-card border rounded-xl shadow-2xl',
            'backdrop-blur-lg',
            config.bgColor,
            config.borderColor,
            'border',
            isClosing ? 'opacity-0' : 'opacity-100'
        ]">
            <div class="flex items-start gap-3 p-4">
                <!-- 图标 -->
                <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-xl', config.iconBg]">
                    {{ config.icon }}
                </div>

                <!-- 内容 -->
                <div class="flex-1">
                    <p :class="['text-sm font-medium', config.textColor]">
                        {{ message }}
                    </p>
                </div>

                <!-- 关闭按钮 - 哭泣猫 -->
                <button @click="close"
                    class="w-8 h-8 rounded-full hover:bg-cat-border/50 flex items-center justify-center text-lg transition-all shrink-0 cat-close-button">
                    😿
                </button>
            </div>

            <!-- 进度条（如果有duration） -->
            <div v-if="duration > 0" class="h-1 bg-cat-border/30 rounded-b-xl overflow-hidden">
                <div :class="['h-full transition-all ease-linear', config.bgColor.replace('/20', '')]"
                    :style="{ width: '100%', animation: `shrink ${duration}ms linear forwards` }"></div>
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

/* 哭泣猫流动动画 */
@keyframes catFlow {

    0%,
    100% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
    }

    25% {
        transform: translateY(-2px) rotate(-5deg);
        opacity: 0.9;
    }

    50% {
        transform: translateY(-4px) rotate(0deg);
        opacity: 0.8;
    }

    75% {
        transform: translateY(-2px) rotate(5deg);
        opacity: 0.9;
    }
}

.cat-close-button {
    animation: catFlow 2s ease-in-out infinite;
    cursor: pointer;
}

.cat-close-button:hover {
    animation: none;
    transform: scale(1.2);
    filter: brightness(1.2);
}
</style>
