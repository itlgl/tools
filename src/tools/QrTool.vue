<script setup>
import { reactive, watch } from 'vue'
import { Clipboard, Download, ImageUp, QrCode, RotateCcw, ScanLine } from '@lucide/vue'
import jsQR from 'jsqr'
import QRCode from 'qrcode'

const emit = defineEmits(['copy'])

const qrForm = reactive({
  text: '',
  size: 256,
  errorCorrectionLevel: 'M',
  dataUrl: '',
  generateError: '',
  decodedText: '',
  decodeError: '',
  previewUrl: '',
})

async function renderQr() {
  qrForm.generateError = ''
  qrForm.dataUrl = ''

  if (!qrForm.text) {
    return
  }

  try {
    qrForm.dataUrl = await QRCode.toDataURL(qrForm.text, {
      width: Number(qrForm.size),
      margin: 2,
      errorCorrectionLevel: qrForm.errorCorrectionLevel,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
  } catch (error) {
    qrForm.generateError = error.message || String(error)
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败。'))
    image.src = src
  })
}

async function decodeImage(file) {
  qrForm.decodedText = ''
  qrForm.decodeError = ''
  qrForm.previewUrl = ''

  if (!file) {
    return
  }

  try {
    const imageUrl = await readFileAsDataUrl(file)
    qrForm.previewUrl = imageUrl
    const image = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    context.drawImage(image, 0, 0)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (!code) {
      qrForm.decodeError = '未识别到二维码。'
      return
    }

    qrForm.decodedText = code.data
  } catch (error) {
    qrForm.decodeError = error.message || String(error)
  }
}

function onFileChange(event) {
  const [file] = event.target.files || []
  decodeImage(file)
}

function downloadQr() {
  if (!qrForm.dataUrl) {
    return
  }

  const link = document.createElement('a')
  link.href = qrForm.dataUrl
  link.download = 'qrcode.png'
  link.click()
}

function clearQr() {
  qrForm.text = ''
  qrForm.size = 256
  qrForm.errorCorrectionLevel = 'M'
  qrForm.dataUrl = ''
  qrForm.generateError = ''
  qrForm.decodedText = ''
  qrForm.decodeError = ''
  qrForm.previewUrl = ''
}

function copyValue(value, key) {
  emit('copy', value, key)
}

watch(() => [qrForm.text, qrForm.size, qrForm.errorCorrectionLevel], renderQr, { immediate: true })
</script>

<template>
  <section class="tool-panel" aria-labelledby="qr-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">QR Code</p>
        <h2 id="qr-title">二维码生成和识别</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearQr">
        <RotateCcw :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="two-column-tool">
      <div class="tool-stack">
        <div class="section-title-row">
          <h3>生成</h3>
        </div>

        <label class="field field-wide">
          <span>内容</span>
          <textarea v-model="qrForm.text" class="compact-textarea" placeholder="输入文本或 URL" spellcheck="false" />
        </label>

        <div class="option-grid">
          <label class="inline-field">
            <span>尺寸</span>
            <select v-model.number="qrForm.size">
              <option :value="192">192 px</option>
              <option :value="256">256 px</option>
              <option :value="320">320 px</option>
              <option :value="512">512 px</option>
            </select>
          </label>

          <label class="inline-field">
            <span>容错</span>
            <select v-model="qrForm.errorCorrectionLevel">
              <option value="L">L</option>
              <option value="M">M</option>
              <option value="Q">Q</option>
              <option value="H">H</option>
            </select>
          </label>
        </div>

        <p v-if="qrForm.generateError" class="field-error" role="alert">{{ qrForm.generateError }}</p>

        <div class="qr-preview">
          <img v-if="qrForm.dataUrl" :src="qrForm.dataUrl" alt="生成的二维码" />
          <QrCode v-else :size="96" aria-hidden="true" />
        </div>

        <div class="action-bar flush-action-bar">
          <button class="ghost-button" type="button" :disabled="!qrForm.text" @click="copyValue(qrForm.text, 'qr-content')">
            <Clipboard :size="16" aria-hidden="true" />
            <span>复制内容</span>
          </button>
          <button class="primary-button" type="button" :disabled="!qrForm.dataUrl" @click="downloadQr">
            <Download :size="17" aria-hidden="true" />
            <span>下载 PNG</span>
          </button>
        </div>
      </div>

      <div class="tool-stack">
        <div class="section-title-row">
          <h3>识别</h3>
        </div>

        <label class="file-drop">
          <ImageUp :size="24" aria-hidden="true" />
          <span>选择图片</span>
          <input type="file" accept="image/*" @change="onFileChange" />
        </label>

        <div class="qr-preview">
          <img v-if="qrForm.previewUrl" :src="qrForm.previewUrl" alt="待识别图片" />
          <ScanLine v-else :size="96" aria-hidden="true" />
        </div>

        <p v-if="qrForm.decodeError" class="field-error" role="alert">{{ qrForm.decodeError }}</p>

        <label class="field field-wide">
          <span>识别结果</span>
          <textarea class="compact-textarea mono-textarea" :value="qrForm.decodedText" readonly spellcheck="false" />
        </label>

        <button class="ghost-button self-start" type="button" :disabled="!qrForm.decodedText" @click="copyValue(qrForm.decodedText, 'qr-decoded')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制结果</span>
        </button>
      </div>
    </div>
  </section>
</template>
