<script setup>
import { computed, reactive } from 'vue'
import { Clipboard, RotateCcw, Rows3 } from '@lucide/vue'
import { formatFileReadMessage, getDroppedFile, readFileForInput } from '../lib/fileInput'

const emit = defineEmits(['copy'])

const hexForm = reactive({
  input: '',
  inputType: 'hex',
  fileDrag: false,
  fileMessage: '',
  fileError: '',
  bytesPerRow: 16,
})

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseHex(value) {
  const normalized = value.replace(/0x/gi, '').replace(/[\s,;:_-]/g, '')

  if (normalized.length % 2 !== 0) {
    throw new Error('HEX 长度必须为偶数。')
  }

  if (normalized && !/^[\da-fA-F]+$/.test(normalized)) {
    throw new Error('HEX 只能包含 0-9、a-f、A-F。')
  }

  const bytes = new Uint8Array(normalized.length / 2)

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = parseInt(normalized.slice(index, index + 2), 16)
  }

  return bytes
}

function parseBase64(value) {
  const normalized = value.replace(/\s+/g, '')

  if (normalized && !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error('Base64 包含非法字符。')
  }

  if (normalized.length % 4 !== 0) {
    throw new Error('Base64 长度必须为 4 的倍数。')
  }

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function parseBytes() {
  try {
    if (hexForm.inputType === 'utf8') {
      return {
        bytes: new TextEncoder().encode(hexForm.input),
        error: '',
      }
    }

    if (hexForm.inputType === 'base64') {
      return {
        bytes: parseBase64(hexForm.input),
        error: '',
      }
    }

    return {
      bytes: parseHex(hexForm.input),
      error: '',
    }
  } catch (error) {
    return {
      bytes: new Uint8Array(0),
      error: error.message || String(error),
    }
  }
}

const parsed = computed(parseBytes)

const normalizedHex = computed(() => bytesToHex(parsed.value.bytes))

const utf8Preview = computed(() => new TextDecoder().decode(parsed.value.bytes))

const rows = computed(() => {
  const bytes = parsed.value.bytes
  const size = Number(hexForm.bytesPerRow)
  const result = []

  for (let offset = 0; offset < bytes.length; offset += size) {
    const chunk = bytes.slice(offset, offset + size)
    const hex = [...chunk].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
    const ascii = [...chunk]
      .map((byte) => {
        if (byte >= 32 && byte <= 126) {
          return String.fromCharCode(byte)
        }

        return '.'
      })
      .join('')

    result.push({
      offset: offset.toString(16).padStart(8, '0'),
      hex,
      ascii,
    })
  }

  return result
})

function clearHex() {
  hexForm.input = ''
  hexForm.inputType = 'hex'
  hexForm.fileDrag = false
  hexForm.fileMessage = ''
  hexForm.fileError = ''
  hexForm.bytesPerRow = 16
}

function copyValue(value, key) {
  emit('copy', value, key)
}

async function loadDroppedFile(event) {
  hexForm.fileDrag = false
  hexForm.fileMessage = ''
  hexForm.fileError = ''

  const file = getDroppedFile(event)

  if (!file) {
    return
  }

  try {
    hexForm.input = await readFileForInput(file, hexForm.inputType)
    hexForm.fileMessage = formatFileReadMessage(file, hexForm.inputType)
  } catch (error) {
    hexForm.fileError = error.message || String(error)
  }
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="hex-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">HEX</p>
        <h2 id="hex-title">HEX 字节查看器</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearHex">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="controls-row">
        <label class="inline-field short-inline-field">
          <span>输入格式</span>
          <select v-model="hexForm.inputType">
            <option value="hex">HEX</option>
            <option value="utf8">UTF-8</option>
            <option value="base64">Base64</option>
          </select>
        </label>

        <label class="inline-field short-inline-field">
          <span>每行</span>
          <select v-model.number="hexForm.bytesPerRow">
            <option :value="8">8 bytes</option>
            <option :value="16">16 bytes</option>
            <option :value="32">32 bytes</option>
          </select>
        </label>
      </div>

      <label class="field field-wide">
        <span>输入数据</span>
        <textarea
          v-model="hexForm.input"
          class="mono-textarea droppable-textarea"
          :class="{ dragging: hexForm.fileDrag }"
          placeholder="00 01 02 ff 或任意文本"
          spellcheck="false"
          @dragenter.prevent="hexForm.fileDrag = true"
          @dragover.prevent="hexForm.fileDrag = true"
          @dragleave.prevent="hexForm.fileDrag = false"
          @drop.prevent="loadDroppedFile"
        />
      </label>

      <div v-if="hexForm.fileMessage" class="notice soft-notice" role="status">
        {{ hexForm.fileMessage }}
      </div>
      <p v-if="hexForm.fileError" class="field-error" role="alert">{{ hexForm.fileError }}</p>
      <p v-if="parsed.error" class="field-error" role="alert">{{ parsed.error }}</p>

      <div class="result-toolbar">
        <div class="stat-pills">
          <span>{{ parsed.bytes.length }} bytes</span>
          <span>{{ normalizedHex.length }} hex chars</span>
        </div>
        <button class="ghost-button" type="button" :disabled="!normalizedHex" @click="copyValue(normalizedHex, 'hex-normalized')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制 HEX</span>
        </button>
      </div>

      <div class="hex-viewer" aria-label="HEX 字节表">
        <div class="hex-head">
          <span>Offset</span>
          <span>HEX</span>
          <span>ASCII</span>
        </div>
        <div v-for="row in rows" :key="row.offset" class="hex-row">
          <output>{{ row.offset }}</output>
          <output>{{ row.hex }}</output>
          <output>{{ row.ascii }}</output>
        </div>
      </div>

      <label class="field field-wide">
        <span>UTF-8 预览</span>
        <textarea class="compact-textarea mono-textarea" :value="utf8Preview" readonly spellcheck="false" />
      </label>
    </div>
  </section>
</template>
