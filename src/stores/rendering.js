import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_MODE_KEY = 'meow-rendering-mode'

const detectCapabilities = () => {
  const canvas = document.createElement('canvas')
  let desynchronized2d = false
  let webgl = false
  let webgl2 = false

  try {
    desynchronized2d = Boolean(canvas.getContext('2d', { desynchronized: true }))
  } catch {
    desynchronized2d = false
  }

  try {
    webgl2 = Boolean(canvas.getContext('webgl2'))
  } catch {
    webgl2 = false
  }

  if (!webgl2) {
    try {
      webgl = Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      webgl = false
    }
  }

  const hardwareConcurrency = navigator.hardwareConcurrency || 4
  const deviceMemory = navigator.deviceMemory || 4
  const highTier = hardwareConcurrency >= 8 || deviceMemory >= 8
  const midTier = hardwareConcurrency >= 4 || deviceMemory >= 4

  return {
    desynchronized2d,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    webgl,
    webgl2,
    hardwareConcurrency,
    deviceMemory,
    highTier,
    midTier
  }
}

export const useRenderingStore = defineStore('rendering', () => {
  const mode = ref('auto')
  const capabilities = ref({
    desynchronized2d: false,
    offscreenCanvas: false,
    webgl: false,
    webgl2: false,
    hardwareConcurrency: 4,
    deviceMemory: 4,
    highTier: false,
    midTier: true
  })

  const qualityPreset = computed(() => {
    if (mode.value === 'off') {
      return {
        label: '省电',
        targetFps: 30,
        maxDpr: 1,
        desynchronized: false,
        hardwareClass: 'rendering-off'
      }
    }

    if (mode.value === 'on') {
      return {
        label: '增强',
        targetFps: 60,
        maxDpr: 2,
        desynchronized: capabilities.value.desynchronized2d,
        hardwareClass: 'rendering-on'
      }
    }

    return {
      label: '自动',
      targetFps: 60,
      maxDpr: capabilities.value.highTier ? 2 : capabilities.value.midTier ? 1.5 : 1.25,
      desynchronized: capabilities.value.desynchronized2d,
      hardwareClass: 'rendering-auto'
    }
  })

  const statusText = computed(() => {
    const preset = qualityPreset.value
    return `${preset.label} · ${preset.targetFps} FPS · DPR≤${preset.maxDpr}`
  })

  const init = () => {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY)
    if (savedMode && ['auto', 'on', 'off'].includes(savedMode)) {
      mode.value = savedMode
    }
    capabilities.value = detectCapabilities()
    applyRenderingFlags()
  }

  const setMode = (nextMode) => {
    if (!['auto', 'on', 'off'].includes(nextMode)) return
    mode.value = nextMode
    applyRenderingFlags()
  }

  const applyRenderingFlags = () => {
    document.documentElement.dataset.renderingMode = mode.value
    document.documentElement.dataset.renderingPreset = qualityPreset.value.hardwareClass
  }

  watch(mode, () => {
    localStorage.setItem(STORAGE_MODE_KEY, mode.value)
    applyRenderingFlags()
  })

  return {
    mode,
    capabilities,
    qualityPreset,
    statusText,
    init,
    setMode
  }
})
