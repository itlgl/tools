<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Binary, Hash, LockKeyhole } from '@lucide/vue'
import AesTool from './tools/AesTool.vue'
import Base64Tool from './tools/Base64Tool.vue'
import HashTool from './tools/HashTool.vue'

const tabs = [
  { id: 'hash', label: 'Hash 计算', icon: Hash, href: '/tools/hash' },
  { id: 'base64', label: 'Base 编解码', icon: Binary, href: '/tools/base64' },
  { id: 'aes', label: 'AES 加解密', icon: LockKeyhole, href: '/tools/aes' },
]

const toolComponents = {
  hash: HashTool,
  base64: Base64Tool,
  aes: AesTool,
}

const pathToolMap = {
  hash: 'hash',
  base64: 'base64',
  base: 'base64',
  aes: 'aes',
}

const currentPath = ref(window.location.pathname)
const copiedKey = ref('')

const activeTab = computed(() => {
  const pathParts = currentPath.value.split('/').filter(Boolean)
  const lastPart = pathParts.at(-1)

  return pathToolMap[lastPart] || 'hash'
})

const activeTool = computed(() => toolComponents[activeTab.value] || HashTool)

function syncPath() {
  currentPath.value = window.location.pathname
}

function selectTab(event, tab) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) {
    return
  }

  event.preventDefault()

  if (window.location.pathname !== tab.href) {
    window.history.pushState({}, '', tab.href)
  }

  syncPath()
}

onMounted(() => {
  window.addEventListener('popstate', syncPath)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncPath)
})

async function copyValue(value, key) {
  if (!value) {
    return
  }

  await navigator.clipboard.writeText(value)
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = ''
    }
  }, 1200)
}
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">ITLGL Tools</p>
        <h1>编码与摘要工具</h1>
      </div>
      <nav class="tabs" aria-label="工具类型">
        <a
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          :href="tab.href"
          @click="selectTab($event, tab)"
        >
          <component :is="tab.icon" :size="18" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </a>
      </nav>
    </header>

    <KeepAlive>
      <component :is="activeTool" @copy="copyValue" />
    </KeepAlive>

    <p v-if="copiedKey" class="toast" role="status">已复制</p>

    <footer class="footer">
      <span>© 2026 itlgl.com</span>
      <a href="https://github.com/itlgl/tools/" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  </main>
</template>
