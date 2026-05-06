import { invoke } from '@tauri-apps/api/core'

export interface SessionEvent {
  id: string
  session_id: string
  timestamp: string
  agent_id: string | null
  event_type: string
  target: string | null
  lines_added: number | null
  lines_removed: number | null
  exit_code: number | null
}

export interface LogEventParams {
  sessionId: string
  agentId: string
  eventType: string
  target?: string
  linesAdded?: number
  linesRemoved?: number
  exitCode?: number
}

export type EventType =
  | 'read'
  | 'edit'
  | 'run'
  | 'user_input'
  | 'agent_output'
  | 'error'
  | 'handoff'
  | 'correction'
  | 'acb_signal'
  | 'limit_event'
  | 'intelligence'
  | 'heartbeat'

export async function logSessionEvent(event: LogEventParams): Promise<string> {
  return invoke<string>('log_event', {
    sessionId: event.sessionId,
    agentId: event.agentId,
    eventType: event.eventType,
    target: event.target ?? null,
    linesAdded: event.linesAdded ?? null,
    linesRemoved: event.linesRemoved ?? null,
    exitCode: event.exitCode ?? null,
  })
}

export async function logSessionEventWithPayload(
  sessionId: string,
  agentId: string,
  eventType: string,
  target: string | undefined,
  detail: string
): Promise<string> {
  return invoke<string>('log_event_with_payload', {
    sessionId,
    agentId,
    eventType,
    target: target ?? null,
    detail,
  })
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  return invoke<SessionEvent[]>('get_events', { sessionId })
}

export async function getEventDetail(eventId: string): Promise<string | null> {
  return invoke<string | null>('get_event_detail', { eventId })
}

export const EventTypes = {
  READ: 'read',
  EDIT: 'edit',
  RUN: 'run',
  USER_INPUT: 'user_input',
  AGENT_OUTPUT: 'agent_output',
  ERROR: 'error',
  HANDOFF: 'handoff',
  CORRECTION: 'correction',
  ACB_SIGNAL: 'acb_signal',
  LIMIT_EVENT: 'limit_event',
  INTELLIGENCE: 'intelligence',
  HEARTBEAT: 'heartbeat',
} as const