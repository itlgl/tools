<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Clipboard, Clock, RefreshCw, RotateCcw } from '@lucide/vue'

const emit = defineEmits(['copy'])

const timestampUnits = [
  { value: 's', label: '秒' },
  { value: 'ms', label: '毫秒' },
  { value: 'us', label: '微秒' },
  { value: 'ns', label: '纳秒' },
]

function toDatetimeLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 23)
}

function inferTimestampUnit(value) {
  const integerPart = value.replace(/^-/, '').split('.')[0]

  if (integerPart.length >= 18) {
    return 'ns'
  }

  if (integerPart.length >= 15) {
    return 'us'
  }

  if (integerPart.length >= 12) {
    return 'ms'
  }

  return 's'
}

function hasFraction(value) {
  return value.includes('.')
}

function integerTimestampToMs(value, unit) {
  if (unit === 's') {
    return Number(BigInt(value) * 1000n)
  }

  if (unit === 'ms') {
    return Number(BigInt(value))
  }

  const divisor = unit === 'us' ? 1000n : 1000000n
  return Number(BigInt(value) / divisor)
}

function decimalTimestampToMs(value, unit) {
  const multipliers = {
    s: 1000,
    ms: 1,
    us: 1 / 1000,
    ns: 1 / 1000000,
  }

  return Math.trunc(Number(value) * multipliers[unit])
}

function parseTimestamp(value, unit = 'auto') {
  const normalized = value.trim().replace(/_/g, '')

  if (!normalized) {
    throw new Error('请输入时间戳。')
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('时间戳只能包含数字、小数点和负号。')
  }

  const actualUnit = unit === 'auto' ? inferTimestampUnit(normalized) : unit
  const ms = hasFraction(normalized) ? decimalTimestampToMs(normalized, actualUnit) : integerTimestampToMs(normalized, actualUnit)

  if (!Number.isFinite(ms)) {
    throw new Error('时间戳超出可解析范围。')
  }

  return {
    ms: Math.trunc(ms),
    unit: actualUnit,
  }
}

function formatLocalDate(date) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
    timeZoneName: 'short',
  })
}

function formatTimestamp(ms, unit) {
  if (unit === 's') {
    return String(Math.trunc(ms / 1000))
  }

  if (unit === 'ms') {
    return String(ms)
  }

  const value = BigInt(ms)
  return String(unit === 'us' ? value * 1000n : value * 1000000n)
}

const initialMs = Date.now()

const nowMs = ref(initialMs)
let nowTimer = 0

const currentTimestamp = computed(() => formatTimestamp(nowMs.value, 'ms'))

const timestampToTimeForm = reactive({
  timestamp: String(initialMs),
  unit: 'auto',
  resultMs: initialMs,
  detectedUnit: 'ms',
  error: '',
})

const timeToTimestampForm = reactive({
  datetime: toDatetimeLocal(new Date(initialMs)),
  unit: 'ms',
  result: formatTimestamp(initialMs, 'ms'),
  error: '',
})

const timestampToTimeRows = computed(() => {
  if (timestampToTimeForm.resultMs === null) {
    return []
  }

  const ms = timestampToTimeForm.resultMs
  const date = new Date(ms)

  if (Number.isNaN(date.getTime())) {
    return []
  }

  return [
    { label: '本地时间', value: formatLocalDate(date) },
    { label: 'ISO 8601', value: date.toISOString() },
    { label: 'UTC', value: date.toUTCString() },
  ]
})

const selectedOutputUnitLabel = computed(() => timestampUnits.find((unit) => unit.value === timeToTimestampForm.unit)?.label || '毫秒')

function setTimestampToTimeResult(ms, detectedUnit) {
  const date = new Date(ms)

  if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) {
    throw new Error('日期超出浏览器可表示范围。')
  }

  timestampToTimeForm.resultMs = ms
  timestampToTimeForm.detectedUnit = detectedUnit
}

function timestampToDate() {
  timestampToTimeForm.error = ''

  try {
    const parsed = parseTimestamp(timestampToTimeForm.timestamp, timestampToTimeForm.unit)
    setTimestampToTimeResult(parsed.ms, parsed.unit)
  } catch (error) {
    timestampToTimeForm.error = error.message || String(error)
    timestampToTimeForm.resultMs = null
    timestampToTimeForm.detectedUnit = ''
  }
}

function dateToTimestamp() {
  timeToTimestampForm.error = ''

  if (!timeToTimestampForm.datetime) {
    timeToTimestampForm.error = '请选择日期时间。'
    timeToTimestampForm.result = ''
    return
  }

  try {
    const date = new Date(timeToTimestampForm.datetime)

    if (Number.isNaN(date.getTime())) {
      throw new Error('日期时间无法解析。')
    }

    const ms = date.getTime()
    timeToTimestampForm.result = formatTimestamp(ms, timeToTimestampForm.unit)
  } catch (error) {
    timeToTimestampForm.error = error.message || String(error)
    timeToTimestampForm.result = ''
  }
}

function clearTimestamp() {
  const ms = Date.now()

  nowMs.value = ms
  timestampToTimeForm.timestamp = ''
  timestampToTimeForm.unit = 'auto'
  timestampToTimeForm.resultMs = null
  timestampToTimeForm.detectedUnit = ''
  timestampToTimeForm.error = ''
  timeToTimestampForm.datetime = toDatetimeLocal(new Date(ms))
  timeToTimestampForm.unit = 'ms'
  timeToTimestampForm.result = formatTimestamp(ms, 'ms')
  timeToTimestampForm.error = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}

onMounted(() => {
  nowTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(nowTimer)
})
</script>

<template>
  <section class="tool-panel" aria-labelledby="timestamp-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Timestamp</p>
        <h2 id="timestamp-title">时间戳转换</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearTimestamp">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="timestamp-section">
        <div class="timestamp-section-head">
          <Clock :size="18" aria-hidden="true" />
          <h3>当前时间戳</h3>
        </div>
        <div class="result-row timestamp-single-row">
          <span class="result-label">毫秒</span>
          <output>{{ currentTimestamp }}</output>
          <button class="icon-button" type="button" title="复制当前时间戳" @click="copyValue(currentTimestamp, 'timestamp-now')">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制当前时间戳</span>
          </button>
        </div>
      </div>

      <div class="timestamp-section">
        <div class="timestamp-section-head">
          <RefreshCw :size="18" aria-hidden="true" />
          <h3>时间戳转时间</h3>
        </div>

        <div class="timestamp-convert-row">
          <label class="inline-field">
            <span>时间戳</span>
            <input v-model="timestampToTimeForm.timestamp" placeholder="1719398400000" spellcheck="false" @keyup.enter="timestampToDate" />
          </label>

          <label class="inline-field timestamp-unit-field">
            <span>单位</span>
            <select v-model="timestampToTimeForm.unit">
              <option value="auto">自动</option>
              <option v-for="unit in timestampUnits" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
            </select>
          </label>

          <button class="primary-button" type="button" @click="timestampToDate">
            <RefreshCw :size="17" aria-hidden="true" />
            <span>转换</span>
          </button>
        </div>

        <div v-if="timestampToTimeForm.detectedUnit && timestampToTimeForm.unit === 'auto'" class="notice soft-notice" role="status">
          已按 {{ timestampToTimeForm.detectedUnit }} 解析。
        </div>
        <p v-if="timestampToTimeForm.error" class="field-error" role="alert">{{ timestampToTimeForm.error }}</p>

        <div v-if="timestampToTimeRows.length" class="result-list compact-result-list">
          <div v-for="row in timestampToTimeRows" :key="row.label" class="result-row">
            <span class="result-label">{{ row.label }}</span>
            <output>{{ row.value }}</output>
            <button class="icon-button" type="button" :title="`复制 ${row.label}`" @click="copyValue(row.value, `timestamp-time-${row.label}`)">
              <Clipboard :size="16" aria-hidden="true" />
              <span class="sr-only">复制 {{ row.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="timestamp-section">
        <div class="timestamp-section-head">
          <RefreshCw :size="18" aria-hidden="true" />
          <h3>时间转时间戳</h3>
        </div>

        <div class="timestamp-convert-row">
          <label class="inline-field">
            <span>时间</span>
            <input v-model="timeToTimestampForm.datetime" type="datetime-local" step="0.001" @change="dateToTimestamp" />
          </label>

          <label class="inline-field timestamp-unit-field">
            <span>单位</span>
            <select v-model="timeToTimestampForm.unit" @change="dateToTimestamp">
              <option v-for="unit in timestampUnits" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
            </select>
          </label>

          <button class="primary-button muted" type="button" @click="dateToTimestamp">
            <RefreshCw :size="17" aria-hidden="true" />
            <span>转换</span>
          </button>
        </div>

        <p v-if="timeToTimestampForm.error" class="field-error" role="alert">{{ timeToTimestampForm.error }}</p>

        <div class="result-row timestamp-single-row">
          <span class="result-label">{{ selectedOutputUnitLabel }}</span>
          <output>{{ timeToTimestampForm.result }}</output>
          <button class="icon-button" type="button" title="复制时间戳" :disabled="!timeToTimestampForm.result" @click="copyValue(timeToTimestampForm.result, 'timestamp-date-result')">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制时间戳</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
