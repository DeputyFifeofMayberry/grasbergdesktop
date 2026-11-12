/**
 * Boot backfill: old raw titles become condensed labels once, manual renames
 * stay, and the one-shot flag prevents a second pass.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Message } from '@shared/types'
import { openDatabase, type AppDatabase } from '../../src/main/db/database'
import { ChatService } from '../../src/main/services/chat-service'

let dir: string
let db: AppDatabase
let service: ChatService

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'uld-title-backfill-'))
  db = openDatabase(join(dir, 'app.db'))
  service = new ChatService(db, () => undefined, {
    resolveAdapter: () => {
      throw new Error('no adapter in this test')
    },
  })
})
afterEach(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

function seedConversation(title: string, content: string | null): string {
  const conversation = db.conversations.create({ mode: 'chat', title })
  if (content !== null) {
    const message: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      role: 'user',
      content,
      status: 'complete',
      seq: 1,
      createdAt: Date.now(),
    }
    db.messages.insert(message)
  }
  return conversation.id
}

function oldTitle(content: string): string {
  return content.trim().split('\n')[0].trim().slice(0, 60)
}

describe('ChatService.backfillSessionTitles', () => {
  it('condenses old-style titles and leaves manual renames alone', () => {
    const prompt = 'Please fix the sidebar flicker when I switch chats.'
    const raw = seedConversation(oldTitle(prompt), prompt)
    const placeholder = seedConversation('New chat', 'add CSV export to the reports page')
    const manual = seedConversation('My custom name', prompt)
    const empty = seedConversation('New chat', null)

    service.backfillSessionTitles()

    expect(db.conversations.getById(raw)?.title).toBe(
      'Fix the sidebar flicker when I switch chats'
    )
    expect(db.conversations.getById(placeholder)?.title).toBe('Add CSV export to the reports page')
    expect(db.conversations.getById(manual)?.title).toBe('My custom name')
    expect(db.conversations.getById(empty)?.title).toBe('New chat')
    expect(db.settings.get().sessionTitleVersion).toBe(3)
  })

  it('re-titles chats from the earlier title pass', () => {
    const prompt = 'remove the inbox plugin thing from opencode i dont want it anymore'
    const early = seedConversation(
      'Remove the inbox plugin thing from opencode i dont want it',
      prompt
    )
    db.settings.update({ sessionTitleVersion: 1 })

    service.backfillSessionTitles()

    expect(db.conversations.getById(early)?.title).toBe('Remove the inbox plugin from OpenCode')
    expect(db.settings.get().sessionTitleVersion).toBe(3)
  })

  it('runs only once', () => {
    service.backfillSessionTitles()
    const late = seedConversation('New chat', 'rename the relay endpoint')

    service.backfillSessionTitles()

    expect(db.conversations.getById(late)?.title).toBe('New chat')
  })
})
