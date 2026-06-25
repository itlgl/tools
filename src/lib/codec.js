import CryptoJS from 'crypto-js'
import { decodeBase58, encodeBase58 } from './base58.js'

export function hexToUint8Array(hex) {
  if (!hex) {
    return new Uint8Array(0)
  }

  const result = new Uint8Array(hex.length / 2)

  for (let i = 0; i < hex.length / 2; i += 1) {
    result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) & 0xff
  }

  return result
}

export function uint8ArrayToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseInputToWordArray(input, inputType) {
  const parsed = inputType === 'hex' ? CryptoJS.enc.Hex.parse(input) : CryptoJS.enc.Utf8.parse(input)
  const normalizedHex = parsed.toString()

  return {
    wordArray: CryptoJS.enc.Hex.parse(normalizedHex),
    hex: normalizedHex,
    isInvalidHex: inputType === 'hex' && input.toLowerCase() !== normalizedHex,
  }
}

function runHash(label, callback) {
  try {
    return {
      label,
      value: callback(),
      error: '',
    }
  } catch (error) {
    return {
      label,
      value: `[Error]${error.message}`,
      error: error.message,
    }
  }
}

function safeTransform(callback) {
  try {
    return callback()
  } catch (error) {
    return `[Error]${error.message || error}`
  }
}

export function calculateHashes(input, inputType) {
  const parsed = parseInputToWordArray(input, inputType)
  const value = parsed.wordArray

  return {
    inputHex: parsed.hex,
    warning: parsed.isInvalidHex ? '输入的 HEX 值不合法，已按实际可解析内容计算。' : '',
    rows: [
      runHash('MD5', () => CryptoJS.MD5(value).toString()),
      runHash('RIPEMD160', () => CryptoJS.RIPEMD160(value).toString()),
      runHash('SHA1', () => CryptoJS.SHA1(value).toString()),
      runHash('SHA224', () => CryptoJS.SHA224(value).toString()),
      runHash('SHA256', () => CryptoJS.SHA256(value).toString()),
      runHash('SHA384', () => CryptoJS.SHA384(value).toString()),
      runHash('SHA512', () => CryptoJS.SHA512(value).toString()),
      runHash('SHA3_224', () => CryptoJS.SHA3(value, { outputLength: 224 }).toString()),
      runHash('SHA3_256', () => CryptoJS.SHA3(value, { outputLength: 256 }).toString()),
      runHash('SHA3_384', () => CryptoJS.SHA3(value, { outputLength: 384 }).toString()),
      runHash('SHA3_512', () => CryptoJS.SHA3(value, { outputLength: 512 }).toString()),
    ],
  }
}

export function encodeFromHex(input) {
  const parsed = parseInputToWordArray(input, 'hex')

  return {
    inputHex: parsed.hex,
    warning: parsed.isInvalidHex ? '输入的 HEX 值不合法，已按实际可解析内容编码。' : '',
    base64: safeTransform(() => CryptoJS.enc.Base64.stringify(parsed.wordArray)),
    base58: safeTransform(() => encodeBase58(hexToUint8Array(parsed.hex))),
  }
}

export function encodeFromUtf8(input) {
  const parsed = parseInputToWordArray(input, 'utf8')

  return {
    inputHex: parsed.hex,
    warning: '',
    base64: safeTransform(() => CryptoJS.enc.Base64.stringify(parsed.wordArray)),
    base58: safeTransform(() => encodeBase58(hexToUint8Array(parsed.hex))),
  }
}

export function decodeToHex(input) {
  return {
    inputHex: '解码时无效',
    warning: '',
    base64: safeTransform(() => CryptoJS.enc.Base64.parse(input).toString()),
    base58: safeTransform(() => uint8ArrayToHex(decodeBase58(input))),
  }
}

export function decodeToUtf8(input) {
  return {
    inputHex: '解码时无效',
    warning: '',
    base64: safeTransform(() => CryptoJS.enc.Base64.parse(input).toString(CryptoJS.enc.Utf8)),
    base58: safeTransform(() => {
      const base58Hex = uint8ArrayToHex(decodeBase58(input))
      return CryptoJS.enc.Hex.parse(base58Hex).toString(CryptoJS.enc.Utf8)
    }),
  }
}
