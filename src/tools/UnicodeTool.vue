<script setup>
import { computed, reactive } from 'vue'
import { Braces, Clipboard, Code2, Eraser, FileCode2, FileText, RotateCcw } from '@lucide/vue'
import { formatFileReadMessage, getDroppedFile, readFileForInput } from '../lib/fileInput'

const emit = defineEmits(['copy'])

const CHAR_DETAIL_LIMIT = 200

const escapeForm = reactive({
  input: '',
  result: '',
  escapeScope: 'non-ascii',
  lastAction: '',
  error: '',
  fileDrag: false,
  fileMessage: '',
  fileError: '',
})

const jsEscapes = {
  '\\': '\\\\',
  '"': '\\"',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\v': '\\v',
}

function shouldEscapeCodePoint(codePoint) {
  return escapeForm.escapeScope === 'all' || codePoint < 0x20 || codePoint > 0x7e
}

function toUnicodeEscape(char) {
  const codePoint = char.codePointAt(0)

  if (codePoint <= 0xffff) {
    return `\\u${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
  }

  return `\\u{${codePoint.toString(16).toUpperCase()}}`
}

function encodeUnicode(value) {
  return [...value]
    .map((char) => (shouldEscapeCodePoint(char.codePointAt(0)) ? toUnicodeEscape(char) : char))
    .join('')
}

function encodeJsString(value) {
  return [...value]
    .map((char) => {
      if (char in jsEscapes) {
        return jsEscapes[char]
      }

      return shouldEscapeCodePoint(char.codePointAt(0)) ? toUnicodeEscape(char) : char
    })
    .join('')
}

function encodeHtmlEntity(value) {
  return [...value]
    .map((char) => {
      const codePoint = char.codePointAt(0)

      if (char === '&') {
        return '&amp;'
      }

      if (char === '<') {
        return '&lt;'
      }

      if (char === '>') {
        return '&gt;'
      }

      if (char === '"') {
        return '&quot;'
      }

      if (char === "'") {
        return '&#39;'
      }

      if (shouldEscapeCodePoint(codePoint)) {
        return `&#x${codePoint.toString(16).toUpperCase()};`
      }

      return char
    })
    .join('')
}

function decodeJsEscapes(value) {
  let result = ''

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]

    if (char !== '\\') {
      result += char
      continue
    }

    const next = value[index + 1]

    if (next === undefined) {
      result += '\\'
      continue
    }

    if (next === 'u' && value[index + 2] === '{') {
      const endIndex = value.indexOf('}', index + 3)

      if (endIndex !== -1) {
        const hex = value.slice(index + 3, endIndex)
        const codePoint = Number.parseInt(hex, 16)

        if (/^[\da-f]+$/i.test(hex) && codePoint <= 0x10ffff) {
          result += String.fromCodePoint(codePoint)
          index = endIndex
          continue
        }
      }
    }

    if (next === 'u') {
      const hex = value.slice(index + 2, index + 6)

      if (/^[\da-f]{4}$/i.test(hex)) {
        result += String.fromCharCode(Number.parseInt(hex, 16))
        index += 5
        continue
      }
    }

    if (next === 'x') {
      const hex = value.slice(index + 2, index + 4)

      if (/^[\da-f]{2}$/i.test(hex)) {
        result += String.fromCharCode(Number.parseInt(hex, 16))
        index += 3
        continue
      }
    }

    const simpleEscapes = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      v: '\v',
      0: '\0',
      '\\': '\\',
      '"': '"',
      "'": "'",
    }

    if (next in simpleEscapes) {
      result += simpleEscapes[next]
      index += 1
      continue
    }

    result += next
    index += 1
  }

  return result
}

function decodeHtmlEntity(value) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function runAction(action) {
  escapeForm.error = ''
  escapeForm.lastAction = action

  try {
    if (action === 'unicode-encode') {
      escapeForm.result = encodeUnicode(escapeForm.input)
    } else if (action === 'unicode-decode') {
      escapeForm.result = decodeJsEscapes(escapeForm.input)
    } else if (action === 'js-encode') {
      escapeForm.result = encodeJsString(escapeForm.input)
    } else if (action === 'js-decode') {
      escapeForm.result = decodeJsEscapes(escapeForm.input)
    } else if (action === 'html-encode') {
      escapeForm.result = encodeHtmlEntity(escapeForm.input)
    } else {
      escapeForm.result = decodeHtmlEntity(escapeForm.input)
    }
  } catch (error) {
    escapeForm.result = ''
    escapeForm.error = error.message || String(error)
  }
}

function clearEscape() {
  escapeForm.input = ''
  escapeForm.result = ''
  escapeForm.escapeScope = 'non-ascii'
  escapeForm.lastAction = ''
  escapeForm.error = ''
  escapeForm.fileDrag = false
  escapeForm.fileMessage = ''
  escapeForm.fileError = ''
}

function swapResultToInput() {
  escapeForm.input = escapeForm.result
  escapeForm.result = ''
  escapeForm.lastAction = ''
  escapeForm.error = ''
}

function formatVisibleChar(char) {
  return {
    ' ': 'Space',
    '\n': 'LF',
    '\r': 'CR',
    '\t': 'Tab',
  }[char] || char
}

function formatCodePoint(char) {
  return `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
}

function formatUtf16(char) {
  return Array.from({ length: char.length }, (_, index) => char.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')).join(' ')
}

function formatUtf8(char) {
  return [...new TextEncoder().encode(char)].map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ')
}

const stats = computed(() => {
  if (!escapeForm.input && !escapeForm.result) {
    return []
  }

  return [
    { label: '输入字符', value: String([...escapeForm.input].length) },
    { label: '输入字节', value: String(new TextEncoder().encode(escapeForm.input).length) },
    { label: '结果字符', value: String([...escapeForm.result].length) },
    { label: '结果字节', value: String(new TextEncoder().encode(escapeForm.result).length) },
  ]
})

const charRows = computed(() =>
  [...escapeForm.input].slice(0, CHAR_DETAIL_LIMIT).map((char, index) => ({
    id: `${index}-${char.codePointAt(0)}`,
    index: index + 1,
    char: formatVisibleChar(char),
    codePoint: formatCodePoint(char),
    utf16: formatUtf16(char),
    utf8: formatUtf8(char),
    entity: `&#x${char.codePointAt(0).toString(16).toUpperCase()};`,
  })),
)

const charLimitMessage = computed(() => {
  const count = [...escapeForm.input].length

  if (count <= CHAR_DETAIL_LIMIT) {
    return ''
  }

  return `字符详情仅显示前 ${CHAR_DETAIL_LIMIT} 个字符，共 ${count} 个字符。`
})

function copyValue(value, key) {
  emit('copy', value, key)
}

async function loadDroppedFile(event) {
  escapeForm.fileDrag = false
  escapeForm.fileMessage = ''
  escapeForm.fileError = ''
  escapeForm.error = ''

  const file = getDroppedFile(event)

  if (!file) {
    return
  }

  try {
    escapeForm.input = await readFileForInput(file, 'utf8')
    escapeForm.fileMessage = formatFileReadMessage(file, 'utf8')
  } catch (error) {
    escapeForm.fileError = error.message || String(error)
  }
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="unicode-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Unicode</p>
        <h2 id="unicode-title">Unicode / 转义工具</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearEscape">
        <Eraser :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="controls-row">
        <label class="inline-field unicode-scope-field">
          <span>转义范围</span>
          <select v-model="escapeForm.escapeScope">
            <option value="non-ascii">非 ASCII 和控制字符</option>
            <option value="all">全部字符</option>
          </select>
        </label>
      </div>

      <label class="field field-wide">
        <span>输入文本</span>
        <textarea
          v-model="escapeForm.input"
          class="mono-textarea droppable-textarea"
          :class="{ dragging: escapeForm.fileDrag }"
          placeholder="输入文本、\u4F60\u597D、&amp;lt;div&amp;gt; 或 JS 字符串转义内容"
          spellcheck="false"
          @dragenter.prevent="escapeForm.fileDrag = true"
          @dragover.prevent="escapeForm.fileDrag = true"
          @dragleave.prevent="escapeForm.fileDrag = false"
          @drop.prevent="loadDroppedFile"
        />
      </label>

      <div v-if="escapeForm.fileMessage" class="notice soft-notice" role="status">
        {{ escapeForm.fileMessage }}
      </div>
      <p v-if="escapeForm.fileError" class="field-error" role="alert">{{ escapeForm.fileError }}</p>

      <div class="unicode-action-grid" aria-label="转义操作">
        <button class="primary-button" type="button" :class="{ active: escapeForm.lastAction === 'unicode-encode' }" @click="runAction('unicode-encode')">
          <Braces :size="17" aria-hidden="true" />
          <span>Unicode 转义</span>
        </button>
        <button class="primary-button muted" type="button" :class="{ active: escapeForm.lastAction === 'unicode-decode' }" @click="runAction('unicode-decode')">
          <RotateCcw :size="17" aria-hidden="true" />
          <span>Unicode 反转义</span>
        </button>
        <button class="primary-button" type="button" :class="{ active: escapeForm.lastAction === 'js-encode' }" @click="runAction('js-encode')">
          <Code2 :size="17" aria-hidden="true" />
          <span>JS 转义</span>
        </button>
        <button class="primary-button muted" type="button" :class="{ active: escapeForm.lastAction === 'js-decode' }" @click="runAction('js-decode')">
          <RotateCcw :size="17" aria-hidden="true" />
          <span>JS 反转义</span>
        </button>
        <button class="primary-button" type="button" :class="{ active: escapeForm.lastAction === 'html-encode' }" @click="runAction('html-encode')">
          <FileCode2 :size="17" aria-hidden="true" />
          <span>HTML 实体转义</span>
        </button>
        <button class="primary-button muted" type="button" :class="{ active: escapeForm.lastAction === 'html-decode' }" @click="runAction('html-decode')">
          <FileText :size="17" aria-hidden="true" />
          <span>HTML 实体反转义</span>
        </button>
      </div>

      <p v-if="escapeForm.error" class="field-error" role="alert">{{ escapeForm.error }}</p>

      <label class="field field-wide">
        <span>结果</span>
        <textarea class="mono-textarea" :value="escapeForm.result" readonly spellcheck="false" />
      </label>

      <div class="result-toolbar">
        <div v-if="stats.length" class="stat-pills">
          <span v-for="item in stats" :key="item.label">{{ item.label }} {{ item.value }}</span>
        </div>
        <div class="controls-row">
          <button class="ghost-button" type="button" :disabled="!escapeForm.result" @click="copyValue(escapeForm.result, 'unicode-result')">
            <Clipboard :size="16" aria-hidden="true" />
            <span>复制结果</span>
          </button>
          <button class="ghost-button" type="button" :disabled="!escapeForm.result" @click="swapResultToInput">
            <RotateCcw :size="16" aria-hidden="true" />
            <span>结果转输入</span>
          </button>
        </div>
      </div>

      <div class="section-title-row">
        <h3>字符详情</h3>
        <button class="ghost-button slim-button" type="button" :disabled="!charRows.length" @click="copyValue(charRows.map((row) => `${row.char}\t${row.codePoint}\t${row.utf16}\t${row.utf8}`).join('\n'), 'unicode-char-rows')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制详情</span>
        </button>
      </div>

      <div v-if="charRows.length" class="unicode-table">
        <div class="unicode-head">
          <span>#</span>
          <span>字符</span>
          <span>Code point</span>
          <span>UTF-16</span>
          <span>UTF-8</span>
          <span>HTML</span>
        </div>
        <div v-for="row in charRows" :key="row.id" class="unicode-row">
          <output>{{ row.index }}</output>
          <output>{{ row.char }}</output>
          <output>{{ row.codePoint }}</output>
          <output>{{ row.utf16 }}</output>
          <output>{{ row.utf8 }}</output>
          <output>{{ row.entity }}</output>
        </div>
      </div>
      <p v-else class="empty-state">输入内容后显示字符详情。</p>
      <div v-if="charLimitMessage" class="notice" role="status">{{ charLimitMessage }}</div>
    </div>
  </section>
</template>
