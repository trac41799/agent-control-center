import { invoke } from "@tauri-apps/api/core";
import type { MemoryFact, MemoryFactInput, MemoryQuery, SessionCheckpoint, MemorySearchResult, MemoryStats } from "./types";

export async function createMemoryFact(input: MemoryFactInput): Promise<MemoryFact> {
  return invoke("create_memory_fact_cmd", { input });
}

export async function getMemoryFact(id: string): Promise<MemoryFact> {
  return invoke("get_memory_fact_cmd", { id });
}

export async function getMemoryFacts(params: Partial<MemoryQuery>): Promise<MemoryFact[]> {
  return invoke("get_memory_facts_cmd", params);
}

export async function updateMemoryFact(id: string, content?: string, confidence?: number, metadata?: string): Promise<MemoryFact> {
  return invoke("update_memory_fact_cmd", { id, content, confidence, metadata });
}

export async function deleteMemoryFact(id: string): Promise<void> {
  return invoke("delete_memory_fact_cmd", { id });
}

export async function memoryHybridSearch(params: { agent_id?: string; session_id?: string; org_id?: string; q: string; limit?: number }): Promise<MemorySearchResult[]> {
  return invoke("memory_hybrid_search_cmd", params);
}

export async function memoryGetContext(agent_id: string, session_id: string, query?: string, budget?: number): Promise<string> {
  return invoke("memory_get_context_cmd", { agent_id, session_id, query, budget });
}

export async function createCheckpoint(agent_id: string, session_id: string, turn_number: number, state_blob: number[], summary?: string, token_count?: number): Promise<SessionCheckpoint> {
  return invoke("create_checkpoint_cmd", { agent_id, session_id, turn_number, state_blob, summary, token_count });
}

export async function getLatestCheckpoint(agent_id: string, session_id: string): Promise<SessionCheckpoint | null> {
  return invoke("get_latest_checkpoint_cmd", { agent_id, session_id });
}

export async function getMemoryStats(org_id: string): Promise<MemoryStats> {
  return invoke("memory_stats_cmd", { org_id });
}
