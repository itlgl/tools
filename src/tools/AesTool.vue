<script setup>
import { computed, reactive, watch } from 'vue'
import { LockKeyhole, LockKeyholeOpen, RotateCcw } from '@lucide/vue'
import { AES_KEY_BITS, AES_PADDINGS, decryptAes, encryptAes, inspectAesValue } from '../lib/aes'

const aesModeOptions = [
  { value: 'CBC', label: 'CBC - 链式分组，常用' },
  { value: 'CFB', label: 'CFB - 流式反馈' },
  { value: 'CTR', label: 'CTR - 计数器流式' },
  { value: 'OFB', label: 'OFB - 输出反馈流式' },
  { value: 'ECB', label: 'ECB - 独立分组，不推荐' },
]

const encodingOptions = [
  { value: 'utf8', label: 'UTF-8' },
  { value: 'hex', label: 'HEX' },
  { value: 'base64', label: 'Base64' },
]

const aesForm = reactive({
  operation: 'encrypt',
  input: '',
  inputType: 'utf8',
  outputType: 'base64',
  key: '',
  keyType: 'utf8',
  keyBits: 128,
  mode: 'CBC',
  padding: 'Pkcs7',
  iv: '',
  ivType: 'utf8',
  result: {
    result: '',
    resultHex: '',
    warning: '',
    error: '',
  },
  lastAction: '',
})

const aesInputTypeOptions = computed(() => {
  if (aesForm.operation === 'encrypt') {
    return encodingOptions.filter((option) => option.value === 'utf8' || option.value === 'hex')
  }

  return encodingOptions.filter((option) => option.value === 'base64' || option.value === 'hex')
})

const aesOutputTypeOptions = computed(() => {
  if (aesForm.operation === 'encrypt') {
    return encodingOptions.filter((option) => option.value === 'base64' || option.value === 'hex')
  }

  return encodingOptions.filter((option) => option.value === 'utf8' || option.value === 'hex')
})

const keyInfo = computed(() => inspectAesValue(aesForm.key, aesForm.keyType, '密钥'))

const ivInfo = computed(() => {
  if (aesForm.mode === 'ECB') {
    return {
      bits: 0,
      bytes: 0,
      error: '',
    }
  }

  return inspectAesValue(aesForm.iv, aesForm.ivType, 'IV')
})

const keyBitLabel = computed(() => {
  if (keyInfo.value.error) {
    return '无效'
  }

  return `${keyInfo.value.bits} bit`
})

const ivBitLabel = computed(() => {
  if (aesForm.mode === 'ECB') {
    return '不使用'
  }

  if (ivInfo.value.error) {
    return '无效'
  }

  return `${ivInfo.value.bits} bit`
})

const keyLengthError = computed(() => {
  if (!aesForm.key) {
    return ''
  }

  if (keyInfo.value.error) {
    return keyInfo.value.error
  }

  if (!AES_KEY_BITS.includes(keyInfo.value.bits)) {
    return `AES 密钥长度必须为 128、192 或 256 bit，当前为 ${keyInfo.value.bits} bit。`
  }

  return ''
})

const ivLengthError = computed(() => {
  if (aesForm.mode === 'ECB' || !aesForm.iv) {
    return ''
  }

  if (ivInfo.value.error) {
    return ivInfo.value.error
  }

  if (ivInfo.value.bits !== 128) {
    return `当前 IV 为 ${ivInfo.value.bits} bit，非 ECB 模式需要 128 bit。`
  }

  return ''
})

function emptyAesResult() {
  return {
    result: '',
    resultHex: '',
    warning: '',
    error: '',
  }
}

function normalizeAesFormats() {
  const inputTypes = aesInputTypeOptions.value.map((option) => option.value)
  const outputTypes = aesOutputTypeOptions.value.map((option) => option.value)

  if (!inputTypes.includes(aesForm.inputType)) {
    aesForm.inputType = inputTypes[0]
  }

  if (!outputTypes.includes(aesForm.outputType)) {
    aesForm.outputType = outputTypes[0]
  }

  aesForm.result = emptyAesResult()
  aesForm.lastAction = ''
}

function runAes() {
  const runner = aesForm.operation === 'encrypt' ? encryptAes : decryptAes
  const inferredKeyBits = AES_KEY_BITS.includes(keyInfo.value.bits) ? keyInfo.value.bits : aesForm.keyBits

  aesForm.result = runner({
    operation: aesForm.operation,
    input: aesForm.input,
    inputType: aesForm.inputType,
    outputType: aesForm.outputType,
    key: aesForm.key,
    keyType: aesForm.keyType,
    keyBits: inferredKeyBits,
    mode: aesForm.mode,
    padding: aesForm.padding,
    iv: aesForm.iv,
    ivType: aesForm.ivType,
  })
  aesForm.lastAction = aesForm.operation
}

function clearAes() {
  aesForm.operation = 'encrypt'
  aesForm.input = ''
  aesForm.inputType = 'utf8'
  aesForm.outputType = 'base64'
  aesForm.key = ''
  aesForm.keyType = 'utf8'
  aesForm.keyBits = 128
  aesForm.mode = 'CBC'
  aesForm.padding = 'Pkcs7'
  aesForm.iv = ''
  aesForm.ivType = 'utf8'
  aesForm.result = emptyAesResult()
  aesForm.lastAction = ''
}

watch(() => aesForm.operation, normalizeAesFormats)
</script>

<template>
  <section class="tool-panel" aria-labelledby="aes-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">AES</p>
        <h2 id="aes-title">AES 加解密</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearAes">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="aes-tool">
      <fieldset class="segmented aes-operation-row">
        <legend>操作</legend>
        <label :class="{ selected: aesForm.operation === 'encrypt' }">
          <input v-model="aesForm.operation" type="radio" value="encrypt" />
          <LockKeyhole :size="16" aria-hidden="true" />
          <span>加密</span>
        </label>
        <label :class="{ selected: aesForm.operation === 'decrypt' }">
          <input v-model="aesForm.operation" type="radio" value="decrypt" />
          <LockKeyholeOpen :size="16" aria-hidden="true" />
          <span>解密</span>
        </label>
      </fieldset>

      <div class="aes-inline-row">
        <label class="inline-field">
          <span>AES 模式</span>
          <select v-model="aesForm.mode">
            <option v-for="mode in aesModeOptions" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </option>
          </select>
        </label>

        <label class="inline-field">
          <span>填充模式</span>
          <select v-model="aesForm.padding">
            <option v-for="padding in AES_PADDINGS" :key="padding" :value="padding">{{ padding }}</option>
          </select>
        </label>
      </div>

      <div class="secret-line">
        <div class="secret-group">
          <div class="secret-combo" :class="{ invalid: keyLengthError }">
            <span class="secret-label">key</span>
            <select v-model="aesForm.keyType" title="密钥格式">
              <option v-for="option in encodingOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input v-model="aesForm.key" autocomplete="off" placeholder="输入密钥" spellcheck="false" />
            <output>{{ keyBitLabel }}</output>
          </div>
          <p v-if="keyLengthError" class="field-error">{{ keyLengthError }}</p>
        </div>

        <div class="secret-group">
          <div class="secret-combo" :class="{ invalid: ivLengthError }">
            <span class="secret-label">iv</span>
            <select v-model="aesForm.ivType" title="IV 格式" :disabled="aesForm.mode === 'ECB'">
              <option v-for="option in encodingOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input
              v-model="aesForm.iv"
              autocomplete="off"
              :disabled="aesForm.mode === 'ECB'"
              :placeholder="aesForm.mode === 'ECB' ? 'ECB 模式不使用 IV' : '输入 128 bit IV'"
              spellcheck="false"
            />
            <output>{{ ivBitLabel }}</output>
          </div>
          <p v-if="ivLengthError" class="field-error">{{ ivLengthError }}</p>
        </div>
      </div>

      <div class="aes-inline-row">
        <label class="inline-field">
          <span>输入格式</span>
          <select v-model="aesForm.inputType">
            <option v-for="option in aesInputTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="inline-field">
          <span>输出格式</span>
          <select v-model="aesForm.outputType">
            <option v-for="option in aesOutputTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="field field-wide aes-input-block">
        <span>{{ aesForm.operation === 'encrypt' ? '明文输入' : '密文输入' }}</span>
        <textarea
          v-model="aesForm.input"
          class="aes-textarea"
          :placeholder="aesForm.operation === 'encrypt' ? '请输入明文' : '请输入密文'"
          spellcheck="false"
        />
      </label>

      <div class="aes-run-row">
        <button class="primary-button" type="button" :class="{ active: aesForm.lastAction === aesForm.operation }" @click="runAes">
          <component :is="aesForm.operation === 'encrypt' ? LockKeyhole : LockKeyholeOpen" :size="17" aria-hidden="true" />
          <span>{{ aesForm.operation === 'encrypt' ? '加密' : '解密' }}</span>
        </button>
      </div>

      <label class="field field-wide aes-result-block">
        <span>结果</span>
        <textarea
          class="aes-textarea aes-result-textarea"
          :class="{ error: aesForm.result.error }"
          :value="aesForm.result.result"
          readonly
          placeholder="执行后显示结果；出错时错误信息会显示在这里"
          spellcheck="false"
        />
      </label>
    </div>
  </section>
</template>
