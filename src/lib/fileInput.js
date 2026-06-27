export function getDroppedFile(event) {
  return event.dataTransfer?.files?.[0] || null
}

export function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }

  return btoa(binary)
}

export function formatFileReadMessage(file, mode) {
  const modeLabel = {
    text: 'UTF-8 文本',
    utf8: 'UTF-8 文本',
    json: 'UTF-8 文本',
    hex: 'HEX',
    base64: 'Base64',
  }[mode] || mode

  return `${file.name} 已读取为 ${modeLabel}，${file.size} bytes。`
}

export async function readFileForInput(file, mode = 'text') {
  if (!file) {
    return ''
  }

  if (mode === 'hex' || mode === 'base64') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return mode === 'hex' ? bytesToHex(bytes) : bytesToBase64(bytes)
  }

  return file.text()
}
