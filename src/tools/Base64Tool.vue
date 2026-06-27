<script setup>
import { reactive } from 'vue'
import { Binary, Braces, Clipboard, FileCode2, RotateCcw } from '@lucide/vue'
import { decodeToHex, decodeToUtf8, encodeFromHex, encodeFromUtf8 } from '../lib/codec'
import { formatFileReadMessage, getDroppedFile, readFileForInput } from '../lib/fileInput'

const emit = defineEmits(['copy'])

const baseForm = reactive({
  input: '',
  fileMode: 'hex',
  fileDrag: false,
  fileMessage: '',
  fileError: '',
  result: {
    inputHex: '',
    warning: '',
    base64: '',
    base58: '',
  },
  lastAction: '',
})

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

function clearBase() {
  baseForm.input = ''
  baseForm.fileMode = 'hex'
  baseForm.fileDrag = false
  baseForm.fileMessage = ''
  baseForm.fileError = ''
  baseForm.result = {
    inputHex: '',
    warning: '',
    base64: '',
    base58: '',
  }
  baseForm.lastAction = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}

async function loadDroppedFile(event) {
  baseForm.fileDrag = false
  baseForm.fileMessage = ''
  baseForm.fileError = ''

  const file = getDroppedFile(event)

  if (!file) {
    return
  }

  try {
    baseForm.input = await readFileForInput(file, baseForm.fileMode)
    baseForm.fileMessage = formatFileReadMessage(file, baseForm.fileMode)
  } catch (error) {
    baseForm.fileError = error.message || String(error)
  }
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="base-title">
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

    <div class="controls-row">
      <label class="inline-field short-inline-field">
        <span>文件读取</span>
        <select v-model="baseForm.fileMode">
          <option value="hex">HEX</option>
          <option value="utf8">UTF-8</option>
          <option value="base64">Base64</option>
        </select>
      </label>
    </div>

    <label class="field">
      <span>输入数据</span>
      <textarea
        v-model="baseForm.input"
        class="droppable-textarea"
        :class="{ dragging: baseForm.fileDrag }"
        placeholder="请输入数据"
        spellcheck="false"
        @dragenter.prevent="baseForm.fileDrag = true"
        @dragover.prevent="baseForm.fileDrag = true"
        @dragleave.prevent="baseForm.fileDrag = false"
        @drop.prevent="loadDroppedFile"
      />
    </label>

    <div v-if="baseForm.fileMessage" class="notice soft-notice" role="status">
      {{ baseForm.fileMessage }}
    </div>
    <p v-if="baseForm.fileError" class="field-error" role="alert">{{ baseForm.fileError }}</p>

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
</template>
