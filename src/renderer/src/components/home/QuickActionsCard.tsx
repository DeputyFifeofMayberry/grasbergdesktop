/**
 * Full-width start band: one-click entry points into a chat, a work task, or
 * a workflow.
 */

import type { ConversationMode } from '@shared/types'
import { newConversation } from '@/lib/new-conversation'
import { useUiStore } from '@/stores/ui'

const ACTIONS: ReadonlyArray<{ mode: ConversationMode; label: string }> = [
  { mode: 'chat', label: 'New chat' },
  { mode: 'work', label: 'New work task' },
]

export default function QuickActionsCard(): React.JSX.Element {
  return (
    <section className="card home-start" aria-label="Quick actions">
      <div className="home-start-copy">
        <h2 className="home-start-title">Start something</h2>
        <p className="home-start-subtitle">A chat, a work task, or an automation.</p>
      </div>
      <div className="home-actions">
        {ACTIONS.map((a) => (
          <button
            type="button"
            key={a.mode}
            className={a.mode === 'chat' ? 'btn btn-primary' : 'btn'}
            onClick={() => newConversation(a.mode)}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => useUiStore.getState().openWorkflows(true)}
        >
          New workflow
        </button>
      </div>
    </section>
  )
}
