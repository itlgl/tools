<script setup>
import { reactive } from 'vue'
import { Clipboard, FingerprintPattern, RotateCcw, Shuffle } from '@lucide/vue'

const emit = defineEmits(['copy'])

const uuidForm = reactive({
  count: 5,
  uppercase: false,
  removeHyphens: false,
  results: [],
  error: '',
})

function fallbackUuidV4() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

function createUuidV4() {
  return crypto.randomUUID ? crypto.randomUUID() : fallbackUuidV4()
}

function formatUuid(uuid) {
  let value = uuidForm.removeHyphens ? uuid.replace(/-/g, '') : uuid

  if (uuidForm.uppercase) {
    value = value.toUpperCase()
  }

  return value
}

function generateUuids() {
  uuidForm.error = ''
  uuidForm.results = []

  const count = Number(uuidForm.count)

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    uuidForm.error = '生成数量必须是 1 到 100 之间的整数。'
    return
  }

  uuidForm.results = Array.from({ length: count }, () => formatUuid(createUuidV4()))
}

function clearUuid() {
  uuidForm.count = 5
  uuidForm.uppercase = false
  uuidForm.removeHyphens = false
  uuidForm.results = []
  uuidForm.error = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}

generateUuids()
</script>

<template>
  <section class="tool-panel" aria-labelledby="uuid-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">UUID</p>
        <h2 id="uuid-title">UUID 生成</h2>
      </div>
      <button class="ghost-button" type="button" title="重置" @click="clearUuid">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>重置</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="option-grid">
        <label class="inline-field">
          <span>数量</span>
          <input v-model.number="uuidForm.count" type="number" min="1" max="100" step="1" />
        </label>
      </div>

      <fieldset class="check-grid">
        <legend>格式</legend>
        <label>
          <input v-model="uuidForm.uppercase" type="checkbox" />
          <span>大写</span>
        </label>
        <label>
          <input v-model="uuidForm.removeHyphens" type="checkbox" />
          <span>移除连字符</span>
        </label>
      </fieldset>

      <div class="action-bar flush-action-bar">
        <button class="primary-button" type="button" @click="generateUuids">
          <FingerprintPattern :size="17" aria-hidden="true" />
          <span>生成 UUID</span>
        </button>
        <button class="ghost-button" type="button" :disabled="!uuidForm.results.length" @click="generateUuids">
          <Shuffle :size="17" aria-hidden="true" />
          <span>重新生成</span>
        </button>
      </div>

      <p v-if="uuidForm.error" class="field-error" role="alert">{{ uuidForm.error }}</p>

      <div v-if="uuidForm.results.length" class="result-list compact-result-list">
        <div v-for="(uuid, index) in uuidForm.results" :key="uuid" class="result-row">
          <span class="result-label">#{{ index + 1 }}</span>
          <output>{{ uuid }}</output>
          <button class="icon-button" type="button" title="复制 UUID" @click="copyValue(uuid, `uuid-${index}`)">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制 UUID</span>
          </button>
        </div>
      </div>

      <button class="ghost-button self-start" type="button" :disabled="!uuidForm.results.length" @click="copyValue(uuidForm.results.join('\n'), 'uuid-all')">
        <Clipboard :size="16" aria-hidden="true" />
        <span>复制全部</span>
      </button>
    </div>
  </section>
</template>
