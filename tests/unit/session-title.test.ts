import { describe, expect, it } from 'vitest'
import { buildSessionTitle, isOldStyleTitle } from '../../src/main/services/session-title'

describe('buildSessionTitle', () => {
  const cases: Array<[string, string]> = [
    [
      'hey can you fix the sidebar flicker when I switch chats',
      'Fix the sidebar flicker when I switch chats',
    ],
    ['```ts\nconst x = 1\n```\nadd CSV export to reports', 'Add CSV export to reports'],
    [
      'Please investigate why the relay drops frames. Also check logs.',
      'Investigate why the relay drops frames',
    ],
    ['the app is slow', 'The app is slow'],
    ['', ''],
    ['please', ''],
    ['fix the spinner.', 'Fix the spinner'],
    ['add dark mode', 'Add dark mode'],
    ['add CSV export and also wire the settings toggle', 'Add CSV export'],
    ['update the docs then ship it', 'Update the docs'],
    ['- [docs](https://example.com) update the README', 'Update the README'],
    ['fix `npm test` on Windows', 'Fix npm test on Windows'],
    ['fix the parser in index.ts', 'Fix the parser in index.ts'],
    ['fix the version string in v1.2', 'Fix the version string in v1.2'],
    ['Task: update the relay docs', 'Update the relay docs'],
    ['please update the docs for', 'Update the docs'],
    ['Corrige el error de sincronización en el móvil', 'Corrige el error de sincronización en el móvil'],
    [
      'remove the inbox plugin thing from opencode i dont want it anymore',
      'Remove the inbox plugin from OpenCode',
    ],
    [
      "remove global installation for gsd-core. i don't want it anymore",
      'Remove global installation for gsd-core',
    ],
    [
      'i really like the planning and spec phases of the gsd core method. is there a way',
      'The planning and spec phases of the GSD Core method',
    ],
    ['fix the sidebar thing', 'Fix the sidebar'],
    ['add a retry because the relay drops frames', 'Add a retry'],
    ['fix the API url in settings', 'Fix the API URL in settings'],
    ['fix the bug i found in the relay', 'Fix the bug I found in the relay'],
    ['just update the docs', 'Update the docs'],
  ]

  it.each(cases)('%s -> %s', (input, expected) => {
    expect(buildSessionTitle(input)).toBe(expected)
  })

  it('caps long labels at a word boundary under 60 chars', () => {
    const title = buildSessionTitle(
      'refactor the conversation list so it uses a virtualised renderer and stops lagging'
    )
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.startsWith('Refactor the conversation list')).toBe(true)
    expect(title.endsWith('virtualised')).toBe(true)
  })

  it('never splits a surrogate pair when capping', () => {
    const title = buildSessionTitle('x' + '😀'.repeat(80))
    expect(Array.from(title).length).toBe(60)
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(title)).toBe(false)
  })
})

describe('isOldStyleTitle', () => {
  it('matches the old first-line truncation', () => {
    expect(isOldStyleTitle('fix the sidebar', 'fix the sidebar\nmore text')).toBe(true)
    expect(isOldStyleTitle('fix the sidebar', '\n  fix the sidebar  ')).toBe(true)
    expect(isOldStyleTitle('x'.repeat(60), 'x'.repeat(80))).toBe(true)
  })

  it('leaves manual renames and other titles alone', () => {
    expect(isOldStyleTitle('Fix the sidebar', 'fix the sidebar')).toBe(false)
    expect(isOldStyleTitle('x'.repeat(59), 'x'.repeat(80))).toBe(false)
    expect(isOldStyleTitle('New chat', 'fix the sidebar')).toBe(false)
    expect(isOldStyleTitle('New chat', '')).toBe(false)
  })
})
