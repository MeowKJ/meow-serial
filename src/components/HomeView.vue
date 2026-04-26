<script setup>
import { computed, onMounted, ref } from 'vue'
import FluentEmoji from './common/FluentEmoji.vue'

const emit = defineEmits(['open-protocol', 'open-canvas', 'open-terminal'])
const basePath = import.meta.env.BASE_URL || '/'

const withBase = (path) => {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

const featureCards = [
  {
    title: 'AI 生成协议 JSON',
    desc: '把设备手册、字段表或样例帧交给 AI，导入生成的协议 JSON 后即可测试解析。',
    action: '打开协议页',
    event: 'open-protocol',
    emoji: 'clipboard'
  },
  {
    title: '串口与 WebSocket 调试',
    desc: '先看终端收发，再决定协议字段，避免一开始就被复杂图表打断。',
    action: '打开终端',
    event: 'open-terminal',
    emoji: 'desktopComputer'
  },
  {
    title: '实时通道看板',
    desc: '解析后的字段会自动成为通道，可绑定到波形图、数值卡片和仪表盘。',
    action: '打开画布',
    event: 'open-canvas',
    emoji: 'chartIncreasing'
  }
]

const aiEndpoints = [
  '/llms.txt',
  '/.well-known/mserial-ai.json',
  '/ai/protocol-profile.schema.json',
  '/ai/browser-automation.json',
  '/api/mserial.json'
]

const apiMeta = ref(null)

const resolvedAiEndpoints = computed(() => (
  Array.isArray(apiMeta.value?.aiEndpoints) && apiMeta.value.aiEndpoints.length
    ? apiMeta.value.aiEndpoints
    : aiEndpoints
))

const resolvedWorkflowImage = computed(() => withBase(apiMeta.value?.primaryWorkflowImage || 'images/ai-protocol-workflow.png'))

onMounted(async () => {
  try {
    const response = await fetch(withBase('api/mserial.json'))
    if (response.ok) {
      apiMeta.value = await response.json()
    }
  } catch {
    apiMeta.value = null
  }
})
</script>

<template>
  <div class="min-h-screen overflow-auto bg-cat-bg" data-ai="home-view">
    <section class="border-b border-cat-border bg-cat-card/60">
      <div class="mx-auto max-w-6xl px-6 py-8">
        <nav class="mb-7 flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-medium text-cat-text">
            <FluentEmoji name="cat" :size="28" alt="Meow Serial" />
            <span>Meow Serial</span>
          </div>
          <button
            type="button"
            class="cat-btn-secondary px-4 py-2 text-sm"
            data-ai="home-enter-serial"
            @click="emit('open-canvas')"
          >
            进入串口工作台
          </button>
        </nav>

        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-5">
            <div class="flex items-center gap-4">
              <div class="grid h-20 w-20 place-items-center rounded-3xl border border-cat-border bg-cat-surface shadow-lg">
                <FluentEmoji name="cat" :size="58" alt="Win11 style cat head" />
              </div>
              <div>
                <div class="text-xs font-medium uppercase text-cat-primary">Meow Serial</div>
                <h1 class="mt-1 text-3xl font-semibold text-cat-text">AI 友好的串口调试工作台</h1>
              </div>
            </div>
            <p class="max-w-2xl text-sm leading-7 text-cat-muted">
              用浏览器连接串口或 WebSocket，确认原始收发数据，再把 AI 生成的协议 JSON 导入为可视化通道。
              从协议验证到实时看板，尽量少绕路。
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="cat-btn px-4 py-2 text-sm text-white"
                data-ai="home-open-protocol"
                @click="emit('open-protocol')"
              >
                导入协议 JSON
              </button>
              <button
                type="button"
                class="cat-btn-secondary px-4 py-2 text-sm"
                data-ai="home-open-terminal"
                @click="emit('open-terminal')"
              >
                查看终端
              </button>
              <button
                type="button"
                class="cat-btn-secondary px-4 py-2 text-sm"
                data-ai="home-open-canvas"
                @click="emit('open-canvas')"
              >
                搭建看板
              </button>
            </div>
          </div>

          <div class="w-full max-w-sm rounded-2xl border border-cat-border bg-cat-surface/70 p-4">
            <div class="mb-3 text-sm font-medium text-cat-text">公开给 AI 的入口</div>
            <div class="space-y-2">
              <code
                v-for="endpoint in resolvedAiEndpoints"
                :key="endpoint"
                class="block rounded-lg border border-cat-border bg-cat-dark px-3 py-2 text-xs text-cat-primary"
              >
                {{ endpoint }}
              </code>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-6">
      <div class="grid gap-4 lg:grid-cols-3">
        <article
          v-for="card in featureCards"
          :key="card.title"
          class="rounded-2xl border border-cat-border bg-cat-card p-4"
        >
          <div class="mb-3 flex items-center gap-3">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-cat-surface">
              <FluentEmoji :name="card.emoji" :size="25" alt="" />
            </div>
            <h2 class="font-medium text-cat-text">{{ card.title }}</h2>
          </div>
          <p class="min-h-[4.5rem] text-sm leading-6 text-cat-muted">{{ card.desc }}</p>
          <button
            type="button"
            class="mt-4 text-sm text-cat-primary hover:underline"
            @click="emit(card.event)"
          >
            {{ card.action }}
          </button>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 pb-8">
      <div class="overflow-hidden rounded-2xl border border-cat-border bg-cat-card">
        <div class="border-b border-cat-border px-4 py-3">
          <h2 class="font-medium text-cat-text">AI 协议工作流</h2>
          <p class="mt-1 text-xs text-cat-muted">设备资料到协议 JSON，再到命名通道和实时控件。</p>
        </div>
        <img
          :src="resolvedWorkflowImage"
          alt="Meow Serial AI protocol workflow"
          class="block w-full bg-white"
          loading="lazy"
          decoding="async"
        >
      </div>
    </section>
  </div>
</template>
