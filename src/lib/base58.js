const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP = Object.fromEntries([...ALPHABET].map((char, index) => [char, index]))

export function encodeBase58(buffer) {
  if (buffer.length === 0) {
    return ''
  }

  const digits = [0]

  for (const byte of buffer) {
    for (let j = 0; j < digits.length; j += 1) {
      digits[j] <<= 8
    }

    digits[0] += byte
    let carry = 0

    for (let j = 0; j < digits.length; j += 1) {
      digits[j] += carry
      carry = (digits[j] / 58) | 0
      digits[j] %= 58
    }

    while (carry) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i += 1) {
    digits.push(0)
  }

  return digits
    .reverse()
    .map((digit) => ALPHABET[digit])
    .join('')
}

export function decodeBase58(value) {
  if (value.length === 0) {
    return new Uint8Array(0)
  }

  const bytes = [0]

  for (const char of value) {
    if (!(char in ALPHABET_MAP)) {
      throw new Error(`Base58 输入包含非法字符：${char}`)
    }

    for (let j = 0; j < bytes.length; j += 1) {
      bytes[j] *= 58
    }

    bytes[0] += ALPHABET_MAP[char]
    let carry = 0

    for (let j = 0; j < bytes.length; j += 1) {
      bytes[j] += carry
      carry = bytes[j] >> 8
      bytes[j] &= 0xff
    }

    while (carry) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  for (let i = 0; value[i] === '1' && i < value.length - 1; i += 1) {
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}
