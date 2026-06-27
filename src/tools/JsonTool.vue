<script setup>
import { computed, reactive, ref } from 'vue'
import { Braces, Clipboard, FileJson, RotateCcw } from '@lucide/vue'
import { formatFileReadMessage, getDroppedFile, readFileForInput } from '../lib/fileInput'

const emit = defineEmits(['copy'])

const jsonForm = reactive({
  input: '',
  indent: 2,
  error: '',
  fileDrag: false,
  fileMessage: '',
  fileError: '',
  lastAction: '',
})

const lineNumberRef = ref(null)

const stats = computed(() => {
  if (!jsonForm.input) {
    return []
  }

  return [
    { label: '字符数', value: String(jsonForm.input.length) },
    { label: '字节数', value: String(new TextEncoder().encode(jsonForm.input).length) },
    { label: '行数', value: String(jsonForm.input.split('\n').length) },
  ]
})

const lineNumbers = computed(() => {
  const count = jsonForm.input ? jsonForm.input.split('\n').length : 1

  return Array.from({ length: count }, (_, index) => index + 1).join('\n')
})

function parseJson() {
  if (!jsonForm.input.trim()) {
    throw new Error('请输入 JSON。')
  }

  return JSON.parse(jsonForm.input)
}

function formatJson() {
  jsonForm.error = ''
  jsonForm.lastAction = 'format'

  try {
    jsonForm.input = JSON.stringify(parseJson(), null, Number(jsonForm.indent))
  } catch (error) {
    jsonForm.error = error.message || String(error)
  }
}

function minifyJson() {
  jsonForm.error = ''
  jsonForm.lastAction = 'minify'

  try {
    jsonForm.input = JSON.stringify(parseJson())
  } catch (error) {
    jsonForm.error = error.message || String(error)
  }
}

function clearJson() {
  jsonForm.input = ''
  jsonForm.indent = 2
  jsonForm.error = ''
  jsonForm.fileDrag = false
  jsonForm.fileMessage = ''
  jsonForm.fileError = ''
  jsonForm.lastAction = ''
}

function syncLineScroll(event) {
  if (lineNumberRef.value) {
    lineNumberRef.value.scrollTop = event.target.scrollTop
  }
}

function copyValue(value, key) {
  emit('copy', value, key)
}

async function loadDroppedFile(event) {
  jsonForm.fileDrag = false
  jsonForm.fileMessage = ''
  jsonForm.fileError = ''
  jsonForm.error = ''

  const file = getDroppedFile(event)

  if (!file) {
    return
  }

  try {
    jsonForm.input = await readFileForInput(file, 'json')
    jsonForm.fileMessage = formatFileReadMessage(file, 'json')
  } catch (error) {
    jsonForm.fileError = error.message || String(error)
  }
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="json-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">JSON</p>
        <h2 id="json-title">JSON 格式化 / 压缩</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearJson">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="field field-wide">
        <span>JSON</span>
        <div class="code-editor" :class="{ error: jsonForm.error, dragging: jsonForm.fileDrag }">
          <pre ref="lineNumberRef" class="line-numbers" aria-hidden="true">{{ lineNumbers }}</pre>
          <textarea
            v-model="jsonForm.input"
            class="mono-textarea json-editor-textarea"
            :class="{ 'droppable-textarea': true, dragging: jsonForm.fileDrag }"
            placeholder='{"name":"itlgl","enabled":true}'
            spellcheck="false"
            @dragenter.prevent="jsonForm.fileDrag = true"
            @dragover.prevent="jsonForm.fileDrag = true"
            @dragleave.prevent="jsonForm.fileDrag = false"
            @drop.prevent="loadDroppedFile"
            @input="jsonForm.error = ''"
            @scroll="syncLineScroll"
          />
        </div>
      </div>

      <div v-if="jsonForm.fileMessage" class="notice soft-notice" role="status">
        {{ jsonForm.fileMessage }}
      </div>
      <p v-if="jsonForm.fileError" class="field-error" role="alert">{{ jsonForm.fileError }}</p>

      <div class="controls-row">
        <label class="inline-field short-inline-field">
          <span>缩进</span>
          <select v-model.number="jsonForm.indent">
            <option :value="2">2 空格</option>
            <option :value="4">4 空格</option>
          </select>
        </label>

        <div class="action-bar flush-action-bar">
          <button class="primary-button" type="button" :class="{ active: jsonForm.lastAction === 'format' }" @click="formatJson">
            <FileJson :size="17" aria-hidden="true" />
            <span>格式化</span>
          </button>
          <button class="primary-button muted" type="button" :class="{ active: jsonForm.lastAction === 'minify' }" @click="minifyJson">
            <Braces :size="17" aria-hidden="true" />
            <span>压缩</span>
          </button>
        </div>
      </div>

      <p v-if="jsonForm.error" class="field-error" role="alert">{{ jsonForm.error }}</p>

      <div class="result-toolbar">
        <button class="ghost-button" type="button" :disabled="!jsonForm.input" @click="copyValue(jsonForm.input, 'json-input')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制 JSON</span>
        </button>
        <div v-if="stats.length" class="stat-pills">
          <span v-for="item in stats" :key="item.label">{{ item.label }} {{ item.value }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
