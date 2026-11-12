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
  'i want you to',
  'i need to',
  'i want to',
  "i'd like you to",
  "i'd like to",
  "i've been trying to",
  "i'm trying to",
  'i really like',
  'i really love',
  'i really want to',
  'i really need to',
  'i just want to',
  'i just need to',
  'i like',
  'i love',
  'i prefer',
  'i think',
  'i feel like',
  'we need to',
  'we want to',
  'we should',
  'i should',
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
  'from', 'and', 'or', 'but', 'anymore', 'now', 'again', 'too', 'though',
  'anyway', 'either',
])

/** Product names and acronyms users type in lower case. */
const NAMES: Record<string, string> = {
  opencode: 'OpenCode',
  'gsd core': 'GSD Core',
  'gsd-core': 'gsd-core',
  gsd: 'GSD',
  github: 'GitHub',
  gitlab: 'GitLab',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  sqlite: 'SQLite',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  bedrock: 'Bedrock',
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  electron: 'Electron',
  react: 'React',
  node: 'Node',
  api: 'API',
  apis: 'APIs',
  ui: 'UI',
  url: 'URL',
  urls: 'URLs',
  json: 'JSON',
  yaml: 'YAML',
  sql: 'SQL',
  csv: 'CSV',
  html: 'HTML',
  css: 'CSS',
  llm: 'LLM',
  mcp: 'MCP',
  ipc: 'IPC',
  sdk: 'SDK',
  cli: 'CLI',
  http: 'HTTP',
  https: 'HTTPS',
  pdf: 'PDF',
  ai: 'AI',
}

const FILLER_WORDS_RE =
  /\b(?:just|really|actually|basically|simply|literally|maybe|perhaps|quite|very|definitely|probably)\b/gi
const HEDGE_RE = /\b(?:kind|sort)\s+of\b/gi
const THING_RE = /\b([A-Za-z][A-Za-z0-9-]+)\s+(?:thing|stuff)\b/gi
const THING_KEEP = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'our',
  'their', 'his', 'her', 'its', 'any', 'some', 'no', 'one', 'every', 'each',
])

/** A casual reason the user tacked onto the request. */
const CASUAL_TAIL_RE =
  /\s+(?:i|we)\s+(?:don'?t|do not|won'?t|would not|didn'?t|couldn'?t|shouldn'?t|can'?t|want|need|think|feel|like|love|hate|prefer|wish|hope|just|really|also|still|only|already|never|always|keep|kept|tried|try|am|was|were|have|had)\b/i
const CONTRACTION_TAIL_RE = /\s+(?:i|we)'(?:m|ve|d|ll)\b/i
const RATIONALE_TAIL_RE =
  /\s+(?:because|since|as (?:i|we)|which (?:i|we))\b/i

/** Words that make a good place to shorten a long title. */
const CAP_BOUNDARY_WORDS = new Set([
  'of', 'for', 'from', 'with', 'in', 'on', 'to', 'by', 'at', 'about', 'into',
  'over', 'under', 'after', 'before', 'when', 'where', 'that', 'which', 'and',
  'or',
])

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const FRAMING_RE = new RegExp(
  `^(?:${FRAMING_PREFIXES.map(escapeRe).join('|')})\\b[\\s,:.!-]*`,
  'i'
)

const NAME_RE = new RegExp(
  `\\b(?:${Object.keys(NAMES)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')})\\b`,
  'gi'
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

/** Cut the earliest casual tail: a first-person aside or a stated reason. */
function trimCasualTail(text: string): string {
  let end = text.length
  for (const re of [CASUAL_TAIL_RE, CONTRACTION_TAIL_RE, RATIONALE_TAIL_RE]) {
    const match = re.exec(text)
    if (match && match.index < end) end = match.index
  }
  return text.slice(0, end)
}

function dropFiller(text: string): string {
  return text
    .replace(HEDGE_RE, ' ')
    .replace(FILLER_WORDS_RE, ' ')
    .replace(THING_RE, (match, prev: string) =>
      THING_KEEP.has(prev.toLowerCase()) ? match : prev
    )
}

function applyNames(text: string): string {
  return text
    .replace(NAME_RE, (match) => NAMES[match.toLowerCase()] ?? match)
    .replace(/\bi\b/g, 'I')
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

function finish(text: string): string {
  return polish(applyNames(dropFiller(trimCasualTail(text))))
}

/** Cut at the last word boundary, never mid-word. Counts code points so a
 * cut cannot split a surrogate pair. Long titles prefer a natural phrase
 * boundary (of, for, when...) over a mid-phrase cut. */
function cap(text: string): string {
  const chars = Array.from(text)
  if (chars.length <= TITLE_MAX_CHARS) return text
  const slice = chars.slice(0, TITLE_MAX_CHARS).join('')
  const words = slice.split(' ')
  let phrase = ''
  for (let i = 3; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, '')
    if (!CAP_BOUNDARY_WORDS.has(word)) continue
    const head = words.slice(0, i).join(' ')
    if (Array.from(head).length >= 20) phrase = head
  }
  if (phrase.length > 0) return phrase
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
  return finish(coordinator === -1 ? sentence : sentence.slice(0, coordinator))
}

/**
 * Condensed title for a session whose first user message is `text`.
 * Returns '' for empty (or unlabellable) input; callers keep the old title.
 */
export function buildSessionTitle(text: string): string {
  const cleaned = cleanPrompt(text)
  if (cleaned.length === 0) return ''
  const stripped = stripFraming(cleaned)
  const candidate = labelFrom(stripped) || finish(firstSentence(stripped))
  return cap(sentenceCase(cap(candidate)))
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
