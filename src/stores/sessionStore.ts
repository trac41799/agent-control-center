import { create } from 'zustand'
import type { SessionEvent } from '../lib/types'

interface SessionStore {
  events: SessionEvent[]
  activeSessionId: string | null
  addEvent: (event: Omit<SessionEvent, 'id' | 'session_id'>) => void
  getEventsForAgent: (agentId: string) => SessionEvent[]
  clearSession: () => void
}

const generateId = () => crypto.randomUUID()

export const useSessionStore = create<SessionStore>((set, get) => ({
  events: [],
  activeSessionId: null,

  addEvent: (event: Omit<SessionEvent, 'id' | 'session_id'>) => {
    const activeSession = get().activeSessionId
    if (!activeSession) return

    const newEvent: SessionEvent = {
      ...event,
      id: generateId(),
      session_id: activeSession,
    }

    set((state) => ({
      events: [...state.events, newEvent],
    }))
  },

  getEventsForAgent: (agentId: string): SessionEvent[] => {
    return get().events.filter((e) => e.agent_id === agentId)
  },

  clearSession: () => {
    set({ events: [], activeSessionId: null })
  },
}))