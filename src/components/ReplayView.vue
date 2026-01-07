<script setup>
// ReplayView.vue - 数据回放功能
</script>

<template>
  <div class="h-full flex flex-col p-4 gap-4">
    <div class="flex items-center gap-4">
      <span class="text-2xl">🎬</span>
      <div>
        <h2 class="text-lg font-semibold">数据回放喵</h2>
        <p class="text-sm text-cat-muted">回放已录制的数据</p>
      </div>
      <div class="ml-auto flex gap-2">
        <button class="cat-btn-secondary px-3 py-1.5 rounded-lg text-sm">📂 加载文件</button>
      </div>
    </div>
    
    <!-- 回放控制 -->
    <div class="bg-cat-card rounded-xl p-4">
      <div class="flex items-center gap-4">
        <button class="cat-btn-secondary w-10 h-10 rounded-lg text-lg">⏮️</button>
        <button class="cat-btn w-12 h-12 rounded-xl text-xl text-white">▶️</button>
        <button class="cat-btn-secondary w-10 h-10 rounded-lg text-lg">⏭️</button>
        <div class="flex-1 mx-4">
          <input type="range" class="w-full accent-cat-primary" min="0" max="100" value="0">
          <div class="flex justify-between text-xs text-cat-muted mt-1">
            <span>00:00:00</span>
            <span>00:05:32</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-cat-muted">速度:</span>
          <select class="bg-cat-surface border border-cat-border rounded px-2 py-1 text-sm">
            <option>0.5x</option>
            <option selected>1x</option>
            <option>2x</option>
            <option>4x</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="flex-1 bg-cat-surface rounded-xl flex items-center justify-center text-cat-muted">
      <div class="text-center">
        <div class="text-4xl mb-2">📼</div>
        <div>加载录制文件开始回放喵~</div>
      </div>
    </div>
  </div>
</template>
