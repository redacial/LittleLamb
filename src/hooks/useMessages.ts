// Messaging hooks. Conversations + a messages subcollection, gated by participant rules.
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanText } from '../lib/sanitize'
import type { Conversation, Message, Role } from '../types'

/** Conversations the current user participates in (admin sees all via a separate query). */
export function useConversations(uid: string | undefined, allForAdmin = false) {
  const [convos, setConvos] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid && !allForAdmin) return
    const q = allForAdmin
      ? query(collection(db, 'conversations'), orderBy('lastMessageAt', 'desc'))
      : query(
          collection(db, 'conversations'),
          where('participantIds', 'array-contains', uid),
          orderBy('lastMessageAt', 'desc'),
        )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setConvos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [uid, allForAdmin])

  return { convos, loading }
}

export function useThread(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }))),
      () => setMessages([]),
    )
  }, [conversationId])
  return messages
}

export function useMessageActions() {
  const send = useCallback(
    async (
      conversationId: string,
      senderId: string,
      senderRole: Role,
      body: string,
      repliedBy?: 'Lucy' | 'David' | null,
    ) => {
      const clean = cleanText(body, 4000)
      if (!clean) return
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        conversationId,
        senderId,
        senderRole,
        body: clean,
        repliedBy: senderRole === 'admin' ? repliedBy ?? null : null,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: clean.slice(0, 120),
        lastMessageAt: serverTimestamp(),
        status: senderRole === 'admin' ? 'replied' : 'unread',
      })
    },
    [],
  )

  /** Deterministic conversation id so the same pair never creates duplicates. */
  const ensureConversation = useCallback(
    async (
      id: string,
      participantIds: string[],
      participantNames: Record<string, string>,
      kind: Conversation['kind'],
    ) => {
      await setDoc(
        doc(db, 'conversations', id),
        {
          participantIds,
          participantNames,
          kind,
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          status: 'read',
        },
        { merge: true },
      )
    },
    [],
  )

  const setStatus = useCallback(async (id: string, status: Conversation['status']) => {
    await updateDoc(doc(db, 'conversations', id), { status })
  }, [])

  return { send, ensureConversation, setStatus }
}
