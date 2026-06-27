<script setup>
import { computed, reactive } from 'vue'
import { Clipboard, Eraser, Link, RotateCcw } from '@lucide/vue'

const emit = defineEmits(['copy'])

const urlForm = reactive({
  url: '',
  codecInput: '',
  codecResult: '',
  codecError: '',
  lastAction: '',
})

function createUrl(value) {
  const input = value.trim()

  if (!input) {
    return {
      url: null,
      error: '',
      assumedProtocol: false,
    }
  }

  const candidates = [input]

  if (!/^[a-z][a-z\d+.-]*:/i.test(input)) {
    candidates.push(`https://${input}`)
  }

  for (let index = 0; index < candidates.length; index += 1) {
    try {
      return {
        url: new URL(candidates[index]),
        error: '',
        assumedProtocol: index > 0,
      }
    } catch {
      // Continue trying the normalized candidate.
    }
  }

  return {
    url: null,
    error: 'URL 无法解析，请检查协议、域名和特殊字符。',
    assumedProtocol: false,
  }
}

const parsed = computed(() => createUrl(urlForm.url))

const urlParts = computed(() => {
  const value = parsed.value.url

  if (!value) {
    return []
  }

  return [
    { label: '完整 URL', value: value.href },
    { label: '协议', value: value.protocol.replace(/:$/, '') },
    { label: '主机', value: value.host },
    { label: '路径', value: value.pathname },
    { label: '查询串', value: value.search.replace(/^\?/, '') },
    { label: 'Hash', value: value.hash.replace(/^#/, '') },
  ]
})

const queryRows = computed(() => {
  const value = parsed.value.url

  if (!value) {
    return []
  }

  return [...value.searchParams.entries()].map(([key, itemValue], index) => ({
    id: `${key}-${index}`,
    key,
    value: itemValue,
  }))
})

const paramsJson = computed(() => {
  if (!queryRows.value.length) {
    return ''
  }

  const result = {}

  for (const row of queryRows.value) {
    if (row.key in result) {
      result[row.key] = Array.isArray(result[row.key]) ? [...result[row.key], row.value] : [result[row.key], row.value]
    } else {
      result[row.key] = row.value
    }
  }

  return JSON.stringify(result, null, 2)
})

function runCodec(action) {
  urlForm.codecError = ''
  urlForm.lastAction = action

  try {
    if (action === 'encode-component') {
      urlForm.codecResult = encodeURIComponent(urlForm.codecInput)
    } else if (action === 'decode-component') {
      urlForm.codecResult = decodeURIComponent(urlForm.codecInput)
    } else if (action === 'encode-url') {
      urlForm.codecResult = encodeURI(urlForm.codecInput)
    } else {
      urlForm.codecResult = decodeURI(urlForm.codecInput)
    }
  } catch (error) {
    urlForm.codecResult = ''
    urlForm.codecError = error.message || String(error)
  }
}

function clearUrl() {
  urlForm.url = ''
  urlForm.codecInput = ''
  urlForm.codecResult = ''
  urlForm.codecError = ''
  urlForm.lastAction = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="url-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">URL</p>
        <h2 id="url-title">URL 参数解析</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearUrl">
        <Eraser :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <label class="field field-wide">
        <span>URL</span>
        <textarea v-model="urlForm.url" class="compact-textarea" placeholder="https://example.com/path?a=1&b=中文" spellcheck="false" />
      </label>

      <div v-if="parsed.assumedProtocol" class="notice" role="status">输入未包含协议，已按 HTTPS 解析。</div>
      <div v-if="parsed.error" class="field-error" role="alert">{{ parsed.error }}</div>

      <div v-if="urlParts.length" class="result-list compact-result-list">
        <div v-for="part in urlParts" :key="part.label" class="result-row">
          <span class="result-label">{{ part.label }}</span>
          <output>{{ part.value }}</output>
          <button class="icon-button" type="button" :title="`复制${part.label}`" @click="copyValue(part.value, `url-${part.label}`)">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制{{ part.label }}</span>
          </button>
        </div>
      </div>

      <div class="section-title-row">
        <h3>查询参数</h3>
        <button class="ghost-button slim-button" type="button" :disabled="!paramsJson" @click="copyValue(paramsJson, 'url-params-json')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制 JSON</span>
        </button>
      </div>

      <div v-if="queryRows.length" class="param-table">
        <div class="param-head">
          <span>参数名</span>
          <span>参数值</span>
          <span></span>
        </div>
        <div v-for="row in queryRows" :key="row.id" class="param-row">
          <output>{{ row.key }}</output>
          <output>{{ row.value }}</output>
          <button class="icon-button" type="button" title="复制参数值" @click="copyValue(row.value, `url-param-${row.id}`)">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制参数值</span>
          </button>
        </div>
      </div>
      <p v-else class="empty-state">暂无查询参数</p>

      <div class="divider"></div>

      <div class="section-title-row">
        <h3>URL 编码 / 解码</h3>
      </div>

      <label class="field field-wide">
        <span>待处理文本</span>
        <textarea v-model="urlForm.codecInput" class="compact-textarea" placeholder="输入 URL、参数值或任意文本" spellcheck="false" />
      </label>

      <div class="action-bar">
        <button class="primary-button" :class="{ active: urlForm.lastAction === 'encode-component' }" type="button" @click="runCodec('encode-component')">
          <Link :size="17" aria-hidden="true" />
          <span>编码参数值</span>
        </button>
        <button class="primary-button muted" :class="{ active: urlForm.lastAction === 'decode-component' }" type="button" @click="runCodec('decode-component')">
          <RotateCcw :size="17" aria-hidden="true" />
          <span>解码参数值</span>
        </button>
        <button class="primary-button" :class="{ active: urlForm.lastAction === 'encode-url' }" type="button" @click="runCodec('encode-url')">
          <Link :size="17" aria-hidden="true" />
          <span>编码完整 URL</span>
        </button>
        <button class="primary-button muted" :class="{ active: urlForm.lastAction === 'decode-url' }" type="button" @click="runCodec('decode-url')">
          <RotateCcw :size="17" aria-hidden="true" />
          <span>解码完整 URL</span>
        </button>
      </div>

      <p v-if="urlForm.codecError" class="field-error" role="alert">{{ urlForm.codecError }}</p>

      <label class="field field-wide">
        <span>结果</span>
        <textarea class="compact-textarea mono-textarea" :value="urlForm.codecResult" readonly spellcheck="false" />
      </label>
      <button class="ghost-button self-start" type="button" :disabled="!urlForm.codecResult" @click="copyValue(urlForm.codecResult, 'url-codec-result')">
        <Clipboard :size="16" aria-hidden="true" />
        <span>复制结果</span>
      </button>
    </div>
  </section>
</template>
