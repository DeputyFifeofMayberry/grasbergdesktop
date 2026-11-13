/**
 * Home overview — the app's landing surface, laid out as a workspace briefing:
 * a hero and mode cards, a full-width start band, a two-column activity row
 * (Scheduled + Recent work), and a three-column utility row (Notes + Recent
 * runs + Projects). Conditional cards (Needs you, Brief, Getting started,
 * Inbox) stack above the rows. Every card links deeper into the surface it
 * summarizes.
 */

import { useEffect, useMemo, useState } from 'react'
import type { ConversationSummary, Project } from '@shared/types'
import { errorMessage, unwrap } from '@/api/uld'
import { modKeyLabel } from '@/lib/platform'
import { newConversation } from '@/lib/new-conversation'
import { showBots } from '@/lib/main-sections'
import { useWorkflowsStore } from '@/stores/workflows'
import { useProjectsStore } from '@/stores/projects'
import BriefCard from './BriefCard'
import GettingStartedCard from './GettingStartedCard'
import ScheduledCard from './ScheduledCard'
import InboxCard from './InboxCard'
import NeedsYouCard from './NeedsYouCard'
import NotesCard from './NotesCard'
import RecentRunsCard from './RecentRunsCard'
import RecentWorkCard from './RecentWorkCard'
import ProjectsCard from './ProjectsCard'
import QuickActionsCard from './QuickActionsCard'
import crest from '@/assets/warhawks-crest.svg'
import ModeIcon from '../ModeIcon'
import './home.css'

const RECENT_WORK_LIMIT = 10

export default function HomeView(): React.JSX.Element {
  // Keep the cross-mode overview fresh when projects are edited in the sidebar.
  // Fetch all modes; the sidebar's list itself contains only the selected mode.
  const sidebarProjects = useProjectsStore((s) => s.projects)
  const [recent, setRecent] = useState<ConversationSummary[] | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    // Freshness refresh for the shared overview (boot already loaded it).
    void useWorkflowsStore.getState().load()
    void (async () => {
      try {
        const [recentWork, allProjects] = await Promise.allSettled([
          unwrap(window.uld.conversations.list({ limit: RECENT_WORK_LIMIT })),
          unwrap(window.uld.projects.list()),
        ])
        if (cancelled) return
        if (recentWork.status === 'fulfilled') setRecent(recentWork.value)
        if (allProjects.status === 'fulfilled') setProjects(allProjects.value)
        setLoadError(recentWork.status === 'rejected' ? errorMessage(recentWork.reason) : allProjects.status === 'rejected' ? errorMessage(allProjects.reason) : null)
      } catch (e) {
        if (cancelled) return
        setLoadError(errorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sidebarProjects, reload])

  const projectNameById = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p.name])),
    [projects]
  )

  return (
    <div className="home">
      <header className="home-hero">
        <img className="home-hero-crest" src={crest} alt="" aria-hidden="true" draggable={false} />
        <div className="home-hero-content">
          <p className="home-kicker">ULM Warhawks</p>
          <h1 className="home-title">Welcome back</h1>
          <p className="home-subtitle">Start a chat, open a workspace, or check your bots.</p>
          <div className="home-hero-actions">
            <button type="button" className="btn btn-primary home-hero-action" onClick={() => newConversation('chat')}>New chat</button>
            <span className="home-kbd-hint"><span className="kbd">{modKeyLabel}</span><span className="kbd">K</span> commands</span>
          </div>
        </div>
      </header>
      <section className="home-modes" aria-label="Modes">
        <button type="button" className="home-mode-card" data-mode="chat" onClick={() => newConversation('chat')}>
          <ModeIcon mode="chat" size={20} /><span><span className="home-mode-name">Chat</span><span className="home-mode-desc">Talk to your models.</span></span><span className="home-mode-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" className="home-mode-card" data-mode="work" onClick={() => newConversation('work')}>
          <ModeIcon mode="work" size={20} /><span><span className="home-mode-name">Work</span><span className="home-mode-desc">Build in a workspace.</span></span><span className="home-mode-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" className="home-mode-card" data-mode="bots" onClick={() => showBots()}>
          <ModeIcon mode="bots" size={20} /><span><span className="home-mode-name">Bots</span><span className="home-mode-desc">Run your always-on agents.</span></span><span className="home-mode-arrow" aria-hidden="true">→</span>
        </button>
      </section>
      <section className="home-dashboard" aria-label="Workspace overview">
        <h2 className="home-dashboard-title">Your workspace</h2>
        {loadError && <div className="callout home-callout" role="alert">Could not refresh the overview: {loadError} <button className="btn" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
        <NeedsYouCard />
        <BriefCard />
        <QuickActionsCard />
        <GettingStartedCard recent={recent} />
        <InboxCard />
        <div className="home-split">
          <ScheduledCard />
          <RecentWorkCard items={recent} projectNameById={projectNameById} />
        </div>
        <div className="home-trio">
          <NotesCard />
          <RecentRunsCard />
          <ProjectsCard projects={projects} />
        </div>
      </section>
    </div>
  )
}
