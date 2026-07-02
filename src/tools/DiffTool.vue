<script setup>
import { computed, reactive } from 'vue'
import { Clipboard, Eraser, FileDiff, FileJson, FileText } from '@lucide/vue'
import { formatFileReadMessage, readFileForInput } from '../lib/fileInput'

const emit = defineEmits(['copy'])

const MAX_LCS_CELLS = 2_000_000

const diffForm = reactive({
  mode: 'text',
  left: '',
  right: '',
  leftDrag: false,
  rightDrag: false,
  onlyDiff: false,
  fileMessage: '',
  fileError: '',
})

const modes = [
  { id: 'text', label: '文本', icon: FileText },
  { id: 'json', label: 'JSON', icon: FileJson },
]

const hasInput = computed(() => diffForm.left.length > 0 || diffForm.right.length > 0)

function splitLines(value) {
  if (!value) {
    return []
  }

  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortJsonValue(value[key])
        return result
      }, {})
  }

  return value
}

function normalizeJson(value, label) {
  if (!value.trim()) {
    throw new Error(`${label} JSON 为空。`)
  }

  return JSON.stringify(sortJsonValue(JSON.parse(value)), null, 2)
}

function prepareLines() {
  if (diffForm.mode === 'text') {
    return {
      leftText: diffForm.left,
      rightText: diffForm.right,
      leftLines: splitLines(diffForm.left),
      rightLines: splitLines(diffForm.right),
    }
  }

  const leftText = normalizeJson(diffForm.left, '左侧')
  const rightText = normalizeJson(diffForm.right, '右侧')

  return {
    leftText,
    rightText,
    leftLines: splitLines(leftText),
    rightLines: splitLines(rightText),
  }
}

function createRow(type, leftNo, leftText, rightNo, rightText) {
  return {
    id: `${type}-${leftNo || 'x'}-${rightNo || 'x'}-${leftText.length}-${rightText.length}`,
    type,
    leftNo,
    leftText,
    rightNo,
    rightText,
  }
}

function pairChangedBlocks(ops) {
  const rows = []
  let index = 0

  while (index < ops.length) {
    const current = ops[index]

    if (current.type === 'equal') {
      rows.push(createRow('equal', current.leftNo, current.text, current.rightNo, current.text))
      index += 1
      continue
    }

    const removed = []
    const added = []

    while (index < ops.length && ops[index].type !== 'equal') {
      if (ops[index].type === 'remove') {
        removed.push(ops[index])
      } else {
        added.push(ops[index])
      }

      index += 1
    }

    const count = Math.max(removed.length, added.length)

    for (let offset = 0; offset < count; offset += 1) {
      const left = removed[offset]
      const right = added[offset]

      if (left && right) {
        rows.push(createRow('change', left.leftNo, left.text, right.rightNo, right.text))
      } else if (left) {
        rows.push(createRow('remove', left.leftNo, left.text, '', ''))
      } else {
        rows.push(createRow('add', '', '', right.rightNo, right.text))
      }
    }
  }

  return rows
}

function diffWithLcs(leftLines, rightLines) {
  const table = Array.from({ length: leftLines.length + 1 }, () => new Uint32Array(rightLines.length + 1))

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    const row = table[leftIndex]
    const nextRow = table[leftIndex + 1]

    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      row[rightIndex] =
        leftLines[leftIndex] === rightLines[rightIndex]
          ? nextRow[rightIndex + 1] + 1
          : Math.max(nextRow[rightIndex], row[rightIndex + 1])
    }
  }

  const ops = []
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      ops.push({
        type: 'equal',
        text: leftLines[leftIndex],
        leftNo: leftIndex + 1,
        rightNo: rightIndex + 1,
      })
      leftIndex += 1
      rightIndex += 1
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      ops.push({
        type: 'remove',
        text: leftLines[leftIndex],
        leftNo: leftIndex + 1,
      })
      leftIndex += 1
    } else {
      ops.push({
        type: 'add',
        text: rightLines[rightIndex],
        rightNo: rightIndex + 1,
      })
      rightIndex += 1
    }
  }

  while (leftIndex < leftLines.length) {
    ops.push({
      type: 'remove',
      text: leftLines[leftIndex],
      leftNo: leftIndex + 1,
    })
    leftIndex += 1
  }

  while (rightIndex < rightLines.length) {
    ops.push({
      type: 'add',
      text: rightLines[rightIndex],
      rightNo: rightIndex + 1,
    })
    rightIndex += 1
  }

  return pairChangedBlocks(ops)
}

function diffByLineNumber(leftLines, rightLines) {
  const rows = []
  const count = Math.max(leftLines.length, rightLines.length)

  for (let index = 0; index < count; index += 1) {
    const hasLeft = index < leftLines.length
    const hasRight = index < rightLines.length

    if (hasLeft && hasRight && leftLines[index] === rightLines[index]) {
      rows.push(createRow('equal', index + 1, leftLines[index], index + 1, rightLines[index]))
    } else if (hasLeft && hasRight) {
      rows.push(createRow('change', index + 1, leftLines[index], index + 1, rightLines[index]))
    } else if (hasLeft) {
      rows.push(createRow('remove', index + 1, leftLines[index], '', ''))
    } else {
      rows.push(createRow('add', '', '', index + 1, rightLines[index]))
    }
  }

  return rows
}

function buildDiff(leftLines, rightLines) {
  const cellCount = leftLines.length * rightLines.length

  if (cellCount > MAX_LCS_CELLS) {
    return {
      rows: diffByLineNumber(leftLines, rightLines),
      warning: '内容较大，已按行号快速比较，移动行不会被识别为相同内容。',
    }
  }

  return {
    rows: diffWithLcs(leftLines, rightLines),
    warning: '',
  }
}

function summarizeRows(rows, leftLines, rightLines) {
  const changed = rows.filter((row) => row.type === 'change').length
  const added = rows.filter((row) => row.type === 'add').length
  const removed = rows.filter((row) => row.type === 'remove').length

  return [
    { label: '左侧行数', value: String(leftLines.length) },
    { label: '右侧行数', value: String(rightLines.length) },
    { label: '修改', value: String(changed) },
    { label: '新增', value: String(added) },
    { label: '删除', value: String(removed) },
  ]
}

const comparison = computed(() => {
  if (!hasInput.value) {
    return {
      rows: [],
      stats: [],
      error: '',
      warning: '',
      identical: false,
    }
  }

  try {
    const prepared = prepareLines()
    const result = buildDiff(prepared.leftLines, prepared.rightLines)

    return {
      rows: result.rows,
      stats: summarizeRows(result.rows, prepared.leftLines, prepared.rightLines),
      error: '',
      warning: result.warning,
      identical: prepared.leftText === prepared.rightText,
    }
  } catch (error) {
    return {
      rows: [],
      stats: [],
      error: error.message || String(error),
      warning: '',
      identical: false,
    }
  }
})

const visibleRows = computed(() => {
  if (!diffForm.onlyDiff) {
    return comparison.value.rows
  }

  return comparison.value.rows.filter((row) => row.type !== 'equal')
})

const diffText = computed(() =>
  comparison.value.rows
    .map((row) => {
      if (row.type === 'equal') {
        return ` ${row.leftText}`
      }

      if (row.type === 'remove') {
        return `-${row.leftText}`
      }

      if (row.type === 'add') {
        return `+${row.rightText}`
      }

      return `-${row.leftText}\n+${row.rightText}`
    })
    .join('\n'),
)

function clearDiff() {
  diffForm.mode = 'text'
  diffForm.left = ''
  diffForm.right = ''
  diffForm.leftDrag = false
  diffForm.rightDrag = false
  diffForm.onlyDiff = false
  diffForm.fileMessage = ''
  diffForm.fileError = ''
}

function markerForType(type) {
  return {
    add: '+',
    remove: '-',
    change: '~',
    equal: '',
  }[type]
}

function copyValue(value, key) {
  emit('copy', value, key)
}

async function readTextFile(file) {
  return readFileForInput(file, 'utf8')
}

async function loadDroppedFile(event, side) {
  diffForm.leftDrag = false
  diffForm.rightDrag = false
  diffForm.fileMessage = ''
  diffForm.fileError = ''

  const files = [...(event.dataTransfer?.files || [])]

  if (!files.length) {
    return
  }

  try {
    if (files.length >= 2) {
      const [leftFile, rightFile] = files
      const [leftText, rightText] = await Promise.all([readTextFile(leftFile), readTextFile(rightFile)])

      diffForm.left = leftText
      diffForm.right = rightText
      diffForm.fileMessage = `左侧：${formatFileReadMessage(leftFile, 'utf8')} 右侧：${formatFileReadMessage(rightFile, 'utf8')}`
      return
    }

    const [file] = files
    const text = await readTextFile(file)

    diffForm[side] = text
    diffForm.fileMessage = `${side === 'left' ? '左侧' : '右侧'}：${formatFileReadMessage(file, 'utf8')}`
  } catch (error) {
    diffForm.fileError = error.message || String(error)
  }
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="diff-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Diff</p>
        <h2 id="diff-title">文本 / JSON Diff</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearDiff">
        <Eraser :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="controls-row diff-controls">
        <fieldset class="segmented diff-mode-selector">
          <legend>比较模式</legend>
          <label v-for="mode in modes" :key="mode.id" :class="{ selected: diffForm.mode === mode.id }">
            <input v-model="diffForm.mode" type="radio" :value="mode.id" />
            <component :is="mode.icon" :size="17" aria-hidden="true" />
            <span>{{ mode.label }}</span>
          </label>
        </fieldset>

        <label class="diff-toggle">
          <input v-model="diffForm.onlyDiff" type="checkbox" />
          <span>仅显示差异</span>
        </label>

        <button class="ghost-button" type="button" :disabled="!diffText" @click="copyValue(diffText, 'diff-result')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制 Diff</span>
        </button>
      </div>

      <div class="diff-input-grid">
        <label class="field field-wide">
          <span>左侧内容</span>
          <textarea
            v-model="diffForm.left"
            class="mono-textarea droppable-textarea diff-textarea"
            :class="{ dragging: diffForm.leftDrag }"
            placeholder="粘贴文本或 JSON，也可以拖入文件"
            spellcheck="false"
            @dragenter.prevent="diffForm.leftDrag = true"
            @dragover.prevent="diffForm.leftDrag = true"
            @dragleave.prevent="diffForm.leftDrag = false"
            @drop.prevent="loadDroppedFile($event, 'left')"
          />
        </label>

        <label class="field field-wide">
          <span>右侧内容</span>
          <textarea
            v-model="diffForm.right"
            class="mono-textarea droppable-textarea diff-textarea"
            :class="{ dragging: diffForm.rightDrag }"
            placeholder="粘贴文本或 JSON，也可以拖入文件"
            spellcheck="false"
            @dragenter.prevent="diffForm.rightDrag = true"
            @dragover.prevent="diffForm.rightDrag = true"
            @dragleave.prevent="diffForm.rightDrag = false"
            @drop.prevent="loadDroppedFile($event, 'right')"
          />
        </label>
      </div>

      <div v-if="diffForm.fileMessage" class="notice soft-notice" role="status">
        {{ diffForm.fileMessage }}
      </div>
      <p v-if="diffForm.fileError" class="field-error" role="alert">{{ diffForm.fileError }}</p>
      <p v-if="comparison.error" class="field-error" role="alert">{{ comparison.error }}</p>
      <div v-if="comparison.warning" class="notice" role="status">{{ comparison.warning }}</div>

      <div v-if="comparison.stats.length || comparison.identical" class="result-toolbar">
        <div v-if="comparison.stats.length" class="stat-pills">
          <span v-for="item in comparison.stats" :key="item.label">{{ item.label }} {{ item.value }}</span>
        </div>
        <p v-if="comparison.identical" class="diff-identical" role="status">
          <FileDiff :size="16" aria-hidden="true" />
          <span>两侧内容一致</span>
        </p>
      </div>

      <div v-if="visibleRows.length" class="diff-viewer" aria-label="Diff 结果">
        <div class="diff-head">
          <span>左侧</span>
          <span></span>
          <span>右侧</span>
        </div>
        <div v-for="row in visibleRows" :key="row.id" class="diff-row" :class="`diff-${row.type}`">
          <div class="diff-line">
            <span class="diff-line-number">{{ row.leftNo }}</span>
            <code>{{ row.leftText }}</code>
          </div>
          <span class="diff-marker">{{ markerForType(row.type) }}</span>
          <div class="diff-line">
            <span class="diff-line-number">{{ row.rightNo }}</span>
            <code>{{ row.rightText }}</code>
          </div>
        </div>
      </div>

      <p v-else-if="hasInput && !comparison.error" class="empty-state">
        {{ diffForm.onlyDiff ? '没有可显示的差异。' : '两侧内容一致。' }}
      </p>
      <p v-else class="empty-state">在左右两侧粘贴内容，或拖入 UTF-8 文本文件开始比较。</p>
    </div>
  </section>
</template>
