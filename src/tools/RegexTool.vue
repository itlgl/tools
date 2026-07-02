<script setup>
import { computed, reactive } from 'vue'
import { Braces, Clipboard, Eraser, RotateCcw } from '@lucide/vue'

const emit = defineEmits(['copy'])

const MAX_MATCHES = 500

const regexForm = reactive({
  pattern: '',
  text: '',
  replacement: '',
  flags: {
    global: true,
    ignoreCase: false,
    multiline: false,
    dotAll: false,
    unicode: false,
    sticky: false,
  },
})

const flagOptions = [
  { id: 'global', flag: 'g', label: '全局' },
  { id: 'ignoreCase', flag: 'i', label: '忽略大小写' },
  { id: 'multiline', flag: 'm', label: '多行' },
  { id: 'dotAll', flag: 's', label: '点匹配换行' },
  { id: 'unicode', flag: 'u', label: 'Unicode' },
  { id: 'sticky', flag: 'y', label: '粘连' },
]

const flags = computed(() => flagOptions.filter((option) => regexForm.flags[option.id]).map((option) => option.flag).join(''))

function buildRegex() {
  if (!regexForm.pattern) {
    throw new Error('请输入正则表达式。')
  }

  return new RegExp(regexForm.pattern, flags.value)
}

function advanceStringIndex(value, index, unicode) {
  if (!unicode || index + 1 >= value.length) {
    return index + 1
  }

  const first = value.charCodeAt(index)
  const second = value.charCodeAt(index + 1)

  if (first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff) {
    return index + 2
  }

  return index + 1
}

function formatGroups(match) {
  const groups = []

  for (let index = 1; index < match.length; index += 1) {
    groups.push({
      label: `$${index}`,
      value: match[index] ?? '未匹配',
    })
  }

  for (const [key, value] of Object.entries(match.groups || {})) {
    groups.push({
      label: key,
      value: value ?? '未匹配',
    })
  }

  return groups
}

function createMatchRow(match, index) {
  const value = match[0]

  return {
    id: `${index}-${match.index}-${value.length}`,
    number: index + 1,
    start: match.index,
    end: match.index + value.length,
    value,
    groups: formatGroups(match),
  }
}

function createSegments(text, matches) {
  if (!matches.length) {
    return [{ id: 'text-0', type: 'text', text }]
  }

  const segments = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({
        id: `text-${cursor}-${match.start}`,
        type: 'text',
        text: text.slice(cursor, match.start),
      })
    }

    if (match.end > match.start) {
      segments.push({
        id: `match-${match.number}-${match.start}`,
        type: 'match',
        text: text.slice(match.start, match.end),
      })
    } else {
      segments.push({
        id: `zero-${match.number}-${match.start}`,
        type: 'zero',
        text: '',
      })
    }

    cursor = Math.max(cursor, match.end)
  }

  if (cursor < text.length) {
    segments.push({
      id: `text-${cursor}-${text.length}`,
      type: 'text',
      text: text.slice(cursor),
    })
  }

  return segments
}

const analysis = computed(() => {
  if (!regexForm.pattern) {
    return {
      valid: false,
      error: '',
      matches: [],
      segments: [],
      stats: [],
      truncated: false,
    }
  }

  try {
    const regex = buildRegex()
    const matches = []
    let truncated = false

    if (regexForm.text) {
      if (regexForm.flags.global || regexForm.flags.sticky) {
        let match = regex.exec(regexForm.text)

        while (match) {
          matches.push(createMatchRow(match, matches.length))

          if (matches.length >= MAX_MATCHES) {
            truncated = true
            break
          }

          if (match[0] === '') {
            regex.lastIndex = advanceStringIndex(regexForm.text, regex.lastIndex, regexForm.flags.unicode)
          }

          match = regex.exec(regexForm.text)
        }
      } else {
        const match = regex.exec(regexForm.text)

        if (match) {
          matches.push(createMatchRow(match, 0))
        }
      }
    }

    return {
      valid: true,
      error: '',
      matches,
      segments: createSegments(regexForm.text, matches),
      stats: [
        { label: '匹配数', value: String(matches.length) },
        { label: 'Flags', value: flags.value || '无' },
        { label: '测试字符', value: String(regexForm.text.length) },
      ],
      truncated,
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message || String(error),
      matches: [],
      segments: [],
      stats: [],
      truncated: false,
    }
  }
})

const replacementResult = computed(() => {
  if (!regexForm.pattern || !regexForm.text) {
    return ''
  }

  try {
    return regexForm.text.replace(buildRegex(), regexForm.replacement)
  } catch {
    return ''
  }
})

const matchText = computed(() =>
  analysis.value.matches
    .map((match) => {
      const groups = match.groups.map((group) => `${group.label}: ${group.value}`).join('; ')
      return [match.number, `${match.start}-${match.end}`, match.value, groups].filter(Boolean).join('\t')
    })
    .join('\n'),
)

function clearRegex() {
  regexForm.pattern = ''
  regexForm.text = ''
  regexForm.replacement = ''
  regexForm.flags.global = true
  regexForm.flags.ignoreCase = false
  regexForm.flags.multiline = false
  regexForm.flags.dotAll = false
  regexForm.flags.unicode = false
  regexForm.flags.sticky = false
}

function copyValue(value, key) {
  emit('copy', value, key)
}
</script>

<template>
  <section class="tool-panel" aria-labelledby="regex-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">RegExp</p>
        <h2 id="regex-title">正则测试器</h2>
      </div>
      <button class="ghost-button" type="button" title="清空" @click="clearRegex">
        <Eraser :size="18" aria-hidden="true" />
        <span>清空</span>
      </button>
    </div>

    <div class="tool-stack">
      <div class="regex-pattern-grid">
        <label class="field field-wide">
          <span>正则表达式</span>
          <input v-model="regexForm.pattern" class="mono-textarea" type="text" placeholder="\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b" spellcheck="false" />
        </label>

        <fieldset class="check-grid regex-flag-grid">
          <legend>Flags</legend>
          <label v-for="option in flagOptions" :key="option.id">
            <input v-model="regexForm.flags[option.id]" type="checkbox" />
            <span>{{ option.flag }} · {{ option.label }}</span>
          </label>
        </fieldset>
      </div>

      <p v-if="analysis.error" class="field-error" role="alert">{{ analysis.error }}</p>

      <label class="field field-wide">
        <span>测试文本</span>
        <textarea v-model="regexForm.text" class="mono-textarea regex-textarea" placeholder="粘贴要测试的文本" spellcheck="false" />
      </label>

      <div v-if="analysis.stats.length" class="result-toolbar">
        <div class="stat-pills">
          <span v-for="item in analysis.stats" :key="item.label">{{ item.label }} {{ item.value }}</span>
        </div>
        <button class="ghost-button slim-button" type="button" :disabled="!matchText" @click="copyValue(matchText, 'regex-matches')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制匹配</span>
        </button>
      </div>

      <div class="section-title-row">
        <h3>匹配高亮</h3>
      </div>

      <pre v-if="regexForm.text" class="regex-preview" aria-label="匹配高亮结果"><template v-for="segment in analysis.segments" :key="segment.id"><mark v-if="segment.type === 'match'">{{ segment.text }}</mark><span v-else-if="segment.type === 'zero'" class="regex-zero-match" title="零宽匹配"></span><span v-else>{{ segment.text }}</span></template></pre>
      <p v-else class="empty-state">输入测试文本后显示匹配高亮。</p>
      <div v-if="analysis.truncated" class="notice" role="status">匹配数量超过 {{ MAX_MATCHES }} 条，已截断显示。</div>

      <div class="section-title-row">
        <h3>匹配详情</h3>
      </div>

      <div v-if="analysis.matches.length" class="regex-match-table">
        <div class="regex-match-head">
          <span>#</span>
          <span>范围</span>
          <span>匹配内容</span>
          <span>捕获组</span>
          <span></span>
        </div>
        <div v-for="match in analysis.matches" :key="match.id" class="regex-match-row">
          <output>{{ match.number }}</output>
          <output>{{ match.start }}-{{ match.end }}</output>
          <output>{{ match.value || '零宽匹配' }}</output>
          <output>
            <span v-if="match.groups.length" class="regex-group-list">
              <span v-for="group in match.groups" :key="`${match.id}-${group.label}`">{{ group.label }}: {{ group.value }}</span>
            </span>
            <span v-else>无</span>
          </output>
          <button class="icon-button" type="button" title="复制匹配内容" @click="copyValue(match.value, `regex-match-${match.number}`)">
            <Clipboard :size="16" aria-hidden="true" />
            <span class="sr-only">复制匹配内容</span>
          </button>
        </div>
      </div>
      <p v-else-if="regexForm.pattern && regexForm.text && !analysis.error" class="empty-state">没有匹配项。</p>

      <div class="divider"></div>

      <div class="section-title-row">
        <h3>替换预览</h3>
        <button class="ghost-button slim-button" type="button" :disabled="!replacementResult" @click="copyValue(replacementResult, 'regex-replacement')">
          <Clipboard :size="16" aria-hidden="true" />
          <span>复制结果</span>
        </button>
      </div>

      <label class="field field-wide">
        <span>替换为</span>
        <input v-model="regexForm.replacement" class="mono-textarea" type="text" placeholder="$1" spellcheck="false" />
      </label>

      <label class="field field-wide">
        <span>替换结果</span>
        <textarea class="mono-textarea compact-textarea" :value="replacementResult" readonly spellcheck="false" />
      </label>

      <button class="ghost-button self-start" type="button" :disabled="!replacementResult" @click="regexForm.text = replacementResult">
        <RotateCcw :size="16" aria-hidden="true" />
        <span>结果转测试文本</span>
      </button>
    </div>
  </section>
</template>
