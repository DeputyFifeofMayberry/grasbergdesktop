/**
 * Condensed session titles: the first user prompt reduced to a short
 * "verb + object" label, so the sidebar says what a session is about instead
 * of echoing its opening line. Pure and deterministic — no model call.
 */

const TITLE_MAX_CHARS = 60
/** A verb further into the prompt is probably not the action being asked for. */
const VERB_WINDOW = 40

const FRAMING_PREFIXES = [
  'hey',
  'hi',
  'hello',
  'please',
  'pls',
  'kindly',
  'can you',
  'could you',
  'would you',
  'will you',
  'i need you to',
  'i need to',
  'i want to',
  "i'd like to",
  'help me',
  "let's",
]

const ACTION_VERBS = new Set([
  'fix', 'add', 'update', 'change', 'remove', 'delete', 'refactor', 'rename',
  'move', 'create', 'build', 'write', 'implement', 'investigate', 'debug',
  'check', 'review', 'test', 'improve', 'clean', 'extract', 'migrate',
  'support', 'enable', 'disable', 'document', 'explain', 'optimize',
  'optimise', 'split', 'merge', 'replace', 'convert', 'prevent', 'handle',
  'reduce', 'increase', 'make', 'set', 'show', 'hide', 'find', 'look',
  'trace', 'verify', 'bump', 'wire', 'connect', 'export', 'import',
  'schedule',
])

/** Words that leave a label hanging when they end up last. */
const DANGLING_WORDS = new Set([
  'the', 'a', 'an', 'to', 'for', 'in', 'on', 'with', 'of', 'at', 'by',
  'from', 'and', 'or', 'but',
])

const FRAMING_RE = new RegExp(
  `^(?:${FRAMING_PREFIXES.map((prefix) =>
    prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})\\b[\\s,:.!-]*`,
  'i'
)

function cleanPrompt(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]\n]{0,200})\]\([^)\n]{0,500}\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/^[ \t]*(?:[>#]+|[-*+]|\d+[.)])\s*/gm, '')
    .replace(/[*~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:task|request)\s*:\s*/i, '')
}

function stripFraming(text: string): string {
  let out = text
  while (FRAMING_RE.test(out)) out = out.replace(FRAMING_RE, '')
  return out
}

function findVerb(text: string): { index: number } | null {
  const words = /[A-Za-z][A-Za-z']*/g
  for (let match = words.exec(text); match; match = words.exec(text)) {
    if (match.index > VERB_WINDOW) return null
    if (ACTION_VERBS.has(match[0].toLowerCase())) return { index: match.index }
  }
  return null
}

/** End of the first sentence, or the whole text when there is no terminator. */
function firstSentence(text: string): string {
  const end = text.search(/[.!?;](?=\s|$)/)
  return end === -1 ? text : text.slice(0, end)
}

function polish(text: string): string {
  const words = text
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0)
  while (words.length > 1 && DANGLING_WORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop()
  }
  return words.join(' ')
}

/** Cut at the last word boundary, never mid-word. Counts code points so a
 * cut cannot split a surrogate pair. */
function cap(text: string): string {
  const chars = Array.from(text)
  if (chars.length <= TITLE_MAX_CHARS) return text
  const slice = chars.slice(0, TITLE_MAX_CHARS).join('')
  const lastSpace = slice.lastIndexOf(' ')
  return lastSpace === -1 ? slice : slice.slice(0, lastSpace)
}

function sentenceCase(text: string): string {
  return text.length === 0 ? '' : text.charAt(0).toUpperCase() + text.slice(1)
}

function labelFrom(text: string): string {
  const verb = findVerb(text)
  if (!verb) return ''
  const afterVerb = text.slice(verb.index)
  const sentence = firstSentence(afterVerb)
  const coordinator = sentence.search(/\s+(?:and also|then|plus)\s+/i)
  return polish(coordinator === -1 ? sentence : sentence.slice(0, coordinator))
}

/**
 * Condensed title for a session whose first user message is `text`.
 * Returns '' for empty (or unlabellable) input; callers keep the old title.
 */
export function buildSessionTitle(text: string): string {
  const cleaned = cleanPrompt(text)
  if (cleaned.length === 0) return ''
  const stripped = stripFraming(cleaned)
  // No verb means the prompt is descriptive or not English: keep the cleaned
  // first sentence, which still beats the old raw-line echo.
  const candidate = labelFrom(stripped) || polish(firstSentence(stripped))
  return cap(sentenceCase(polish(cap(candidate))))
}

/**
 * True when `storedTitle` is exactly what the old auto-title rule produced:
 * the first line of the first user message, trimmed, cut at 60 chars.
 */
export function isOldStyleTitle(storedTitle: string, firstUserContent: string): boolean {
  const content = firstUserContent.trim()
  if (content.length === 0) return false
  const firstLine = content.split('\n')[0].trim()
  return storedTitle === firstLine.slice(0, TITLE_MAX_CHARS)
}
