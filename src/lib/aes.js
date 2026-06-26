import CryptoJS from 'crypto-js'

export const AES_MODES = ['CBC', 'CFB', 'CTR', 'OFB', 'ECB']
export const AES_PADDINGS = ['Pkcs7', 'AnsiX923', 'Iso10126', 'Iso97971', 'ZeroPadding', 'NoPadding']
export const AES_KEY_BITS = [128, 192, 256]

const MODE_MAP = {
  CBC: CryptoJS.mode.CBC,
  CFB: CryptoJS.mode.CFB,
  CTR: CryptoJS.mode.CTR,
  OFB: CryptoJS.mode.OFB,
  ECB: CryptoJS.mode.ECB,
}

const PADDING_MAP = {
  Pkcs7: CryptoJS.pad.Pkcs7,
  AnsiX923: CryptoJS.pad.AnsiX923,
  Iso10126: CryptoJS.pad.Iso10126,
  Iso97971: CryptoJS.pad.Iso97971,
  ZeroPadding: CryptoJS.pad.ZeroPadding,
  NoPadding: CryptoJS.pad.NoPadding,
}

function createResult(overrides = {}) {
  return {
    result: '',
    resultHex: '',
    warning: '',
    error: '',
    ...overrides,
  }
}

function fail(message) {
  return createResult({
    result: `[Error]${message}`,
    error: message,
  })
}

function parseHex(input, label) {
  const value = input.trim()

  if (value.length % 2 !== 0) {
    throw new Error(`${label} HEX 长度必须为偶数。`)
  }

  if (value && !/^[\da-fA-F]+$/.test(value)) {
    throw new Error(`${label} HEX 只能包含 0-9、a-f、A-F。`)
  }

  return CryptoJS.enc.Hex.parse(value)
}

function parseBase64(input, label) {
  const value = input.replace(/\s+/g, '')

  if (value && !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error(`${label} Base64 包含非法字符。`)
  }

  if (value.length % 4 !== 0) {
    throw new Error(`${label} Base64 长度必须为 4 的倍数。`)
  }

  return CryptoJS.enc.Base64.parse(value)
}

function parseWordArray(input, type, label) {
  if (type === 'hex') {
    return parseHex(input, label)
  }

  if (type === 'base64') {
    return parseBase64(input, label)
  }

  return CryptoJS.enc.Utf8.parse(input)
}

function validateKey(keyWordArray, keyBits) {
  const expectedBytes = Number(keyBits) / 8

  if (!AES_KEY_BITS.includes(Number(keyBits))) {
    throw new Error('密钥长度只能选择 128、192 或 256 bit。')
  }

  if (keyWordArray.sigBytes !== expectedBytes) {
    throw new Error(`当前密钥为 ${keyWordArray.sigBytes} bytes，${keyBits} bit AES 需要 ${expectedBytes} bytes。`)
  }
}

function validateIv(ivWordArray, mode) {
  if (mode === 'ECB') {
    return
  }

  if (ivWordArray.sigBytes !== 16) {
    throw new Error(`当前 IV 为 ${ivWordArray.sigBytes} bytes，${mode} 模式需要 16 bytes。`)
  }
}

function validateModeAndPadding(mode, padding) {
  if (!MODE_MAP[mode]) {
    throw new Error('不支持的 AES 模式。')
  }

  if (!PADDING_MAP[padding]) {
    throw new Error('不支持的 Padding。')
  }
}

function createAesConfig({ mode, padding, ivWordArray }) {
  const config = {
    mode: MODE_MAP[mode],
    padding: PADDING_MAP[padding],
  }

  if (mode !== 'ECB') {
    config.iv = ivWordArray
  }

  return config
}

function parseCommonOptions(options) {
  const mode = options.mode
  const padding = options.padding
  validateModeAndPadding(mode, padding)

  const keyWordArray = parseWordArray(options.key, options.keyType, '密钥')
  validateKey(keyWordArray, options.keyBits)

  const ivWordArray = mode === 'ECB' ? CryptoJS.lib.WordArray.create() : parseWordArray(options.iv, options.ivType, 'IV')
  validateIv(ivWordArray, mode)

  return {
    mode,
    padding,
    keyWordArray,
    ivWordArray,
    config: createAesConfig({ mode, padding, ivWordArray }),
  }
}

function stringifyWordArray(wordArray, type) {
  if (type === 'hex') {
    return wordArray.toString(CryptoJS.enc.Hex)
  }

  if (type === 'base64') {
    return CryptoJS.enc.Base64.stringify(wordArray)
  }

  return wordArray.toString(CryptoJS.enc.Utf8)
}

export function encryptAes(options) {
  try {
    const { keyWordArray, config } = parseCommonOptions(options)
    const messageWordArray = parseWordArray(options.input, options.inputType, '输入数据')

    if (options.padding === 'NoPadding' && messageWordArray.sigBytes % 16 !== 0) {
      throw new Error('NoPadding 加密时，输入数据长度必须为 16 bytes 的倍数。')
    }

    const encrypted = CryptoJS.AES.encrypt(messageWordArray, keyWordArray, config)
    const resultHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex)

    return createResult({
      result: stringifyWordArray(encrypted.ciphertext, options.outputType),
      resultHex,
    })
  } catch (error) {
    return fail(error.message || String(error))
  }
}

export function decryptAes(options) {
  try {
    const { keyWordArray, config } = parseCommonOptions(options)
    const ciphertext = parseWordArray(options.input, options.inputType, '密文')
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, config)

    if (decrypted.sigBytes < 0) {
      throw new Error('解密失败，请检查密钥、IV、密文和 Padding。')
    }

    const resultHex = decrypted.toString(CryptoJS.enc.Hex)
    const warning = 'AES CBC/CFB/CTR/OFB/ECB 不带认证标签，请核对解密结果是否符合预期。'

    if (options.outputType === 'utf8') {
      return createResult({
        result: decrypted.toString(CryptoJS.enc.Utf8),
        resultHex,
        warning,
      })
    }

    return createResult({
      result: resultHex,
      resultHex,
      warning,
    })
  } catch (error) {
    return fail(error.message || String(error))
  }
}

export function inspectAesValue(input, type, label = '输入值') {
  try {
    const wordArray = parseWordArray(input, type, label)

    return {
      bits: wordArray.sigBytes * 8,
      bytes: wordArray.sigBytes,
      error: '',
    }
  } catch (error) {
    return {
      bits: 0,
      bytes: 0,
      error: error.message || String(error),
    }
  }
}
