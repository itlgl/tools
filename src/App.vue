<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Binary, Braces, Clock, FileDiff, FingerprintPattern, Hash, KeyRound, Link, LockKeyhole, QrCode, Rows3 } from '@lucide/vue'
import AesTool from './tools/AesTool.vue'
import Base64Tool from './tools/Base64Tool.vue'
import DiffTool from './tools/DiffTool.vue'
import HashTool from './tools/HashTool.vue'
import HexViewerTool from './tools/HexViewerTool.vue'
import JsonTool from './tools/JsonTool.vue'
import PasswordTool from './tools/PasswordTool.vue'
import QrTool from './tools/QrTool.vue'
import TimestampTool from './tools/TimestampTool.vue'
import UrlTool from './tools/UrlTool.vue'
import UuidTool from './tools/UuidTool.vue'

const tabs = [
  { id: 'hash', label: 'Hash 计算', icon: Hash, href: '/tools/hash' },
  { id: 'base64', label: 'Base 编解码', icon: Binary, href: '/tools/base64' },
  { id: 'aes', label: 'AES 加解密', icon: LockKeyhole, href: '/tools/aes' },
  { id: 'url', label: 'URL 工具', icon: Link, href: '/tools/url' },
  { id: 'timestamp', label: '时间戳转换', icon: Clock, href: '/tools/timestamp' },
  { id: 'uuid', label: 'UUID 生成', icon: FingerprintPattern, href: '/tools/uuid' },
  { id: 'json', label: 'JSON 格式化', icon: Braces, href: '/tools/json' },
  { id: 'diff', label: '文本 / JSON Diff', icon: FileDiff, href: '/tools/diff' },
  { id: 'password', label: '密码生成', icon: KeyRound, href: '/tools/password' },
  { id: 'hex', label: 'HEX 查看器', icon: Rows3, href: '/tools/hex' },
  { id: 'qr', label: '二维码', icon: QrCode, href: '/tools/qr' },
]

const toolComponents = {
  hash: HashTool,
  base64: Base64Tool,
  aes: AesTool,
  url: UrlTool,
  timestamp: TimestampTool,
  uuid: UuidTool,
  json: JsonTool,
  diff: DiffTool,
  password: PasswordTool,
  hex: HexViewerTool,
  qr: QrTool,
}

const pathToolMap = {
  hash: 'hash',
  base64: 'base64',
  base: 'base64',
  aes: 'aes',
  url: 'url',
  time: 'timestamp',
  timestamp: 'timestamp',
  uuid: 'uuid',
  json: 'json',
  diff: 'diff',
  compare: 'diff',
  password: 'password',
  pwd: 'password',
  hex: 'hex',
  qr: 'qr',
  qrcode: 'qr',
}

const currentPath = ref(window.location.pathname)
const copiedKey = ref('')
const copyMessage = ref('')
const appTitle = '开发者工具箱'

const activeTab = computed(() => {
  const pathParts = currentPath.value.split('/').filter(Boolean)
  const lastPart = pathParts.at(-1)

  return pathToolMap[lastPart] || 'hash'
})

const activeTool = computed(() => toolComponents[activeTab.value] || HashTool)
const activeTabInfo = computed(() => tabs.find((tab) => tab.id === activeTab.value) || tabs[0])

watch(
  activeTabInfo,
  (tab) => {
    document.title = `${tab.label}-${appTitle}`
  },
  { immediate: true },
)

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

  try {
    await navigator.clipboard.writeText(value)
    copyMessage.value = '已复制'
  } catch {
    copyMessage.value = '复制失败'
  }

  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = ''
      copyMessage.value = ''
    }
  }, 1200)
}
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">ITLGL Tools</p>
        <h1>开发者工具箱</h1>
        <p class="privacy-note">隐私提示：所有计算均在本地浏览器完成，输入内容不会上传到服务器。</p>
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

    <p v-if="copiedKey" class="toast" role="status">{{ copyMessage }}</p>

    <footer class="footer">
      <span>© 2026 itlgl.com</span>
      <a href="https://github.com/itlgl/tools/" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  </main>
</template>
