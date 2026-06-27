<script setup>
import { reactive } from 'vue'
import { Clipboard, KeyRound, RotateCcw, Shuffle } from '@lucide/vue'

const emit = defineEmits(['copy'])

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digit: '0123456789',
  symbol: '!@#$%^&*_-+=?~',
}

const AMBIGUOUS_CHARS = '0O1lI|`\'"'

const passwordForm = reactive({
  length: 16,
  count: 5,
  upper: true,
  lower: true,
  digit: true,
  symbol: true,
  excludeAmbiguous: true,
  customExclude: '',
  results: [],
  error: '',
})

function randomIndex(max) {
  const limit = Math.floor(256 / max) * max
  const value = new Uint8Array(1)

  do {
    crypto.getRandomValues(value)
  } while (value[0] >= limit)

  return value[0] % max
}

function pickFrom(chars) {
  return chars[randomIndex(chars.length)]
}

function shuffleChars(chars) {
  const result = [...chars]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result.join('')
}

function removeExcluded(chars, excluded) {
  return [...chars].filter((char) => !excluded.has(char)).join('')
}

function selectedPools(excluded) {
  return [
    passwordForm.upper ? removeExcluded(CHARSETS.upper, excluded) : '',
    passwordForm.lower ? removeExcluded(CHARSETS.lower, excluded) : '',
    passwordForm.digit ? removeExcluded(CHARSETS.digit, excluded) : '',
    passwordForm.symbol ? removeExcluded(CHARSETS.symbol, excluded) : '',
  ].filter(Boolean)
}

function generateOne(length, pools) {
  const allChars = pools.join('')
  const chars = []

  if (length >= pools.length) {
    for (const pool of pools) {
      chars.push(pickFrom(pool))
    }
  }

  while (chars.length < length) {
    chars.push(pickFrom(allChars))
  }

  return shuffleChars(chars)
}

function generatePasswords() {
  passwordForm.error = ''
  passwordForm.results = []

  const length = Number(passwordForm.length)
  const count = Number(passwordForm.count)

  if (!Number.isInteger(length) || length < 4 || length > 256) {
    passwordForm.error = '密码长度必须是 4 到 256 之间的整数。'
    return
  }

  if (!Number.isInteger(count) || count < 1 || count > 50) {
    passwordForm.error = '生成数量必须是 1 到 50 之间的整数。'
    return
  }

  const excluded = new Set([
    ...(passwordForm.excludeAmbiguous ? [...AMBIGUOUS_CHARS] : []),
    ...passwordForm.customExclude,
  ])
  const pools = selectedPools(excluded)

  if (!pools.length) {
    passwordForm.error = '至少选择一类可用字符。'
    return
  }

  passwordForm.results = Array.from({ length: count }, () => generateOne(length, pools))
}

function clearPassword() {
  passwordForm.length = 16
  passwordForm.count = 5
  passwordForm.upper = true
  passwordForm.lower = true
  passwordForm.digit = true
  passwordForm.symbol = true
  passwordForm.excludeAmbiguous = true
  passwordForm.customExclude = ''
  passwordForm.results = []
  passwordForm.error = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="password-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Password</p>
        <h2 id="password-title">随机密码生成器</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearPassword">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>重置</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="option-grid">
        <label class="inline-field">
          <span>长度</span>
          <input v-model.number="passwordForm.length" type="number" min="4" max="256" step="1" />
        </label>

        <label class="inline-field">
          <span>数量</span>
          <input v-model.number="passwordForm.count" type="number" min="1" max="50" step="1" />
        </label>
      </div>

      <fieldset class="check-grid">
        <legend>字符集</legend>
        <label>
          <input v-model="passwordForm.upper" type="checkbox" />
          <span>大写字母 A-Z</span>
        </label>
        <label>
          <input v-model="passwordForm.lower" type="checkbox" />
          <span>小写字母 a-z</span>
        </label>
        <label>
          <input v-model="passwordForm.digit" type="checkbox" />
          <span>数字 0-9</span>
        </label>
        <label>
          <input v-model="passwordForm.symbol" type="checkbox" />
          <span>符号</span>
        </label>
        <label>
          <input v-model="passwordForm.excludeAmbiguous" type="checkbox" />
          <span>排除易错字符 0 O 1 l I</span>
        </label>
      </fieldset>

      <label class="field field-wide">
        <span>额外排除字符</span>
        <input v-model="passwordForm.customExclude" placeholder="例如：{}[]()/\\&quot;'" spellcheck="false" />
      </label>

      <div class="action-bar flush-action-bar">
        <button class="primary-button" type="button" @click="generatePasswords">
          <KeyRound :size="17" aria-hidden="true" />
          <span>生成密码</span>
        </button>
        <button class="ghost-button" type="button" :disabled="!passwordForm.results.length" @click="generatePasswords">
          <Shuffle :size="17" aria-hidden="true" />
          <span>重新生成</span>
        </button>
      </div>

      <p v-if="passwordForm.error" class="field-error" role="alert">{{ passwordForm.error }}</p>

      <div v-if="passwordForm.results.length" class="result-list compact-result-list">
        <div v-for="(password, index) in passwordForm.results" :key="`${password}-${index}`" class="result-row">
          <span class="result-label">#{{ index + 1 }}</span>
          <output>{{ password }}</output>
          <button class="icon-button" type="button" title="复制密码" @click="copyValue(password, `password-${index}`)">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制密码</span>
          </button>
        </div>
      </div>

      <button
        class="ghost-button self-start"
        type="button"
        :disabled="!passwordForm.results.length"
        @click="copyValue(passwordForm.results.join('\n'), 'password-all')"
      >
        <Clipboard :size="16" aria-hidden="true" />
        <span>复制全部</span>
      </button>
    </div>
  </section>
</template>
