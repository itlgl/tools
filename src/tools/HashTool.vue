<script setup>
import { computed, reactive } from 'vue'
import { Clipboard, Eraser } from '@lucide/vue'
import { calculateHashes } from '../lib/codec'

const emit = defineEmits(['copy'])

const hashForm = reactive({
  input: '',
  inputType: 'hex',
})

const hashResult = computed(() => calculateHashes(hashForm.input, hashForm.inputType))

function clearHash() {
  hashForm.input = ''
  hashForm.inputType = 'hex'
}

function copyValue(value, key) {
  emit('copy', value, key)
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="hash-title">
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
</template>
