import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useConversations, useThread, useMessageActions } from '../../hooks/useMessages'
import { PageHeader } from '../../components/layout/AppLayout'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import type { Conversation } from '../../types'

/**
 * Two-panel inbox shared by all roles. Admin gets the All/Families/Nannies filter and chooses
 * who is replying (Lucy/David) — that attribution is stored but families/nannies only ever see
 * "Admin Team" (the message bubble hides repliedBy for non-admins).
 */
export function MessagesPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { convos } = useConversations(user?.uid, isAdmin)
  const { send, setStatus } = useMessageActions()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'family_admin' | 'nanny_admin'>('all')
  const [draft, setDraft] = useState('')
  const [replier, setReplier] = useState<'Lucy' | 'David'>('Lucy')

  const messages = useThread(activeId)
  const active = convos.find((c) => c.id === activeId) ?? null

  const visible = useMemo(() => {
    if (!isAdmin || filter === 'all') return convos
    return convos.filter((c) =>
      filter === 'family_admin' ? c.kind.startsWith('family') : c.kind.startsWith('nanny'),
    )
  }, [convos, filter, isAdmin])

  function otherName(c: Conversation): string {
    const otherId = c.participantIds.find((id) => id !== user?.uid)
    if (isAdmin) {
      const named = Object.entries(c.participantNames).find(([id]) => id !== 'admin')
      return named?.[1] ?? 'Member'
    }
    return c.participantNames[otherId ?? ''] ?? 'Admin Team'
  }

  async function onSend() {
    if (!activeId || !user || !profile || !draft.trim()) return
    await send(activeId, user.uid, profile.role, draft, isAdmin ? replier : null)
    setDraft('')
  }

  return (
    <>
      <PageHeader title="Messages" />
      <div className="grid h-[calc(100vh-7.5rem)] grid-cols-1 sm:grid-cols-[20rem_1fr]">
        {/* Conversation list */}
        <div className={cn('flex flex-col border-r border-charcoal/10', active && 'hidden sm:flex')}>
          {isAdmin && (
            <div className="flex gap-1 border-b border-charcoal/10 p-2">
              {(['all', 'family_admin', 'nanny_admin'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs font-bold',
                    filter === f ? 'bg-sage-100 text-sage-700' : 'text-charcoal-muted hover:bg-cream-200',
                  )}
                >
                  {f === 'all' ? 'All' : f === 'family_admin' ? 'Families' : 'Nannies'}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="p-4 text-sm text-charcoal-muted">No conversations yet.</p>
            ) : (
              visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id)
                    if (c.status === 'unread') setStatus(c.id, 'read')
                  }}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 border-b border-charcoal/5 px-4 py-3 text-left hover:bg-cream-100',
                    activeId === c.id && 'bg-cream-200',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold">{otherName(c)}</span>
                    {c.status === 'unread' && <span className="h-2 w-2 rounded-full bg-terracotta-400" />}
                  </div>
                  <span className="line-clamp-1 text-sm text-charcoal-muted">{c.lastMessage || 'No messages yet'}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn('flex flex-col', !active && 'hidden sm:flex')}>
          {!active ? (
            <div className="grid flex-1 place-items-center text-charcoal-muted">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-charcoal/10 px-4 py-3">
                <button className="sm:hidden" onClick={() => setActiveId(null)} aria-label="Back">←</button>
                <span className="font-semibold">{otherName(active)}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.senderId === user?.uid
                  const fromAdmin = m.senderRole === 'admin'
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2',
                          mine ? 'bg-sage-500 text-white' : 'bg-white ring-1 ring-charcoal/10',
                        )}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-xs font-bold opacity-70">
                            {fromAdmin ? (isAdmin && m.repliedBy ? `${m.repliedBy} · Admin` : 'Admin Team') : ''}
                          </p>
                        )}
                        <p className="whitespace-pre-line text-sm">{m.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-charcoal/10 p-3">
                {isAdmin && (
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    <span className="text-charcoal-muted">Replying as</span>
                    {(['Lucy', 'David'] as const).map((who) => (
                      <button
                        key={who}
                        onClick={() => setReplier(who)}
                        className={cn(
                          'rounded-full px-2.5 py-1 font-bold',
                          replier === who ? 'bg-sage-100 text-sage-700' : 'text-charcoal-muted',
                        )}
                      >
                        {who}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
                    placeholder="Write a message…"
                    className="flex-1 rounded-xl bg-white px-4 py-2.5 ring-1 ring-inset ring-charcoal/15 focus:ring-2 focus:ring-sage-500"
                  />
                  <Button onClick={onSend}>Send</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
