<script setup>
import { computed, reactive, ref } from 'vue'
import {
  Binary,
  Braces,
  Clipboard,
  Eraser,
  FileCode2,
  Hash,
  RotateCcw,
} from '@lucide/vue'
import {
  calculateHashes,
  decodeToHex,
  decodeToUtf8,
  encodeFromHex,
  encodeFromUtf8,
} from './lib/codec'

const tabs = [
  { id: 'hash', label: 'Hash 计算', icon: Hash },
  { id: 'base', label: 'Base 编解码', icon: Binary },
]

const activeTab = ref('hash')
const copiedKey = ref('')

const hashForm = reactive({
  input: '',
  inputType: 'hex',
})

const baseForm = reactive({
  input: '',
  result: {
    inputHex: '',
    warning: '',
    base64: '',
    base58: '',
  },
  lastAction: '',
})

const hashResult = computed(() => calculateHashes(hashForm.input, hashForm.inputType))

const baseActions = [
  { id: 'encodeHex', label: '对 HEX 编码', icon: FileCode2, run: () => encodeFromHex(baseForm.input) },
  { id: 'encodeUtf8', label: '对 UTF-8 编码', icon: Braces, run: () => encodeFromUtf8(baseForm.input) },
  { id: 'decodeHex', label: '解码为 HEX', icon: Binary, run: () => decodeToHex(baseForm.input) },
  { id: 'decodeUtf8', label: '解码为 UTF-8', icon: Braces, run: () => decodeToUtf8(baseForm.input) },
]

function setBaseResult(action) {
  baseForm.result = action.run()
  baseForm.lastAction = action.id
}

function clearHash() {
  hashForm.input = ''
  hashForm.inputType = 'hex'
}

function clearBase() {
  baseForm.input = ''
  baseForm.result = {
    inputHex: '',
    warning: '',
    base64: '',
    base58: '',
  }
  baseForm.lastAction = ''
}

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
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          type="button"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="18" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </header>

    <section v-if="activeTab === 'hash'" class="tool-panel" aria-labelledby="hash-title">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Hash</p>
          <h2 id="hash-title">Hash 计算</h2>
        </div>
        <button class="ghost-button" type="button" title="清空" @click="clearHash">
          <Eraser :size="18" aria-hidden="true" />
          <span>清空</span>
        </button>
      </div>

      <div class="form-grid">
        <label class="field field-wide">
          <span>输入数据</span>
          <textarea v-model="hashForm.input" placeholder="请输入数据" spellcheck="false" />
        </label>

        <fieldset class="segmented">
          <legend>输入格式</legend>
          <label :class="{ selected: hashForm.inputType === 'hex' }">
            <input v-model="hashForm.inputType" type="radio" value="hex" />
            <span>HEX</span>
          </label>
          <label :class="{ selected: hashForm.inputType === 'utf8' }">
            <input v-model="hashForm.inputType" type="radio" value="utf8" />
            <span>UTF-8</span>
          </label>
        </fieldset>

        <div v-if="hashResult.warning" class="notice" role="status">
          {{ hashResult.warning }}
        </div>
      </div>

      <div class="result-list">
        <div class="result-row">
          <span class="result-label">输入的 HEX</span>
          <output>{{ hashResult.inputHex }}</output>
          <button
            class="icon-button"
            type="button"
            title="复制输入的 HEX"
            @click="copyValue(hashResult.inputHex, 'hash-input-hex')"
          >
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制输入的 HEX</span>
          </button>
        </div>

        <div v-for="row in hashResult.rows" :key="row.label" class="result-row">
          <span class="result-label">{{ row.label }}</span>
          <output :class="{ error: row.error }">{{ row.value }}</output>
          <button
            class="icon-button"
            type="button"
            :title="`复制 ${row.label}`"
            @click="copyValue(row.value, `hash-${row.label}`)"
          >
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制 {{ row.label }}</span>
          </button>
        </div>
      </div>
    </section>

    <section v-else class="tool-panel" aria-labelledby="base-title">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Base</p>
          <h2 id="base-title">Base 编解码</h2>
        </div>
        <button class="ghost-button" type="button" title="清空" @click="clearBase">
          <RotateCcw :size="18" aria-hidden="true" />
          <span>清空</span>
        </button>
      </div>

      <label class="field">
        <span>输入数据</span>
        <textarea v-model="baseForm.input" placeholder="请输入数据" spellcheck="false" />
      </label>

      <div class="action-bar" aria-label="Base 操作">
        <button
          v-for="action in baseActions"
          :key="action.id"
          class="primary-button"
          :class="{ muted: action.id.startsWith('decode'), active: baseForm.lastAction === action.id }"
          type="button"
          @click="setBaseResult(action)"
        >
          <component :is="action.icon" :size="17" aria-hidden="true" />
          <span>{{ action.label }}</span>
        </button>
      </div>

      <div v-if="baseForm.result.warning" class="notice" role="status">
        {{ baseForm.result.warning }}
      </div>

      <div class="result-list">
        <div class="result-row">
          <span class="result-label">输入的 HEX</span>
          <output>{{ baseForm.result.inputHex }}</output>
          <button
            class="icon-button"
            type="button"
            title="复制输入的 HEX"
            @click="copyValue(baseForm.result.inputHex, 'base-input-hex')"
          >
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制输入的 HEX</span>
          </button>
        </div>

        <div class="result-row">
          <span class="result-label">Base64</span>
          <output :class="{ error: baseForm.result.base64.startsWith('[Error]') }">
            {{ baseForm.result.base64 }}
          </output>
          <button class="icon-button" type="button" title="复制 Base64" @click="copyValue(baseForm.result.base64, 'base64')">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制 Base64</span>
          </button>
        </div>

        <div class="result-row">
          <span class="result-label">Base58</span>
          <output :class="{ error: baseForm.result.base58.startsWith('[Error]') }">
            {{ baseForm.result.base58 }}
          </output>
          <button class="icon-button" type="button" title="复制 Base58" @click="copyValue(baseForm.result.base58, 'base58')">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制 Base58</span>
          </button>
        </div>
      </div>
    </section>

    <p v-if="copiedKey" class="toast" role="status">已复制</p>

    <footer class="footer">
      <span>© 2026 itlgl.com</span>
      <a href="https://github.com/itlgl/tools/" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  </main>
</template>
