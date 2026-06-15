import { useState, useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

interface AgentOutputEvent {
  agent_id: string;
  session_id: string;
  line: string;
  timestamp: string;
}

export function useAgentOutput(agentId: string) {
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    // Subscribe to Tauri events for real-time streaming
    const setupListener = async () => {
      unlisten = await listen<AgentOutputEvent>('agent-output', (event) => {
        if (event.payload.agent_id === agentId) {
          setOutput((prev) => [...prev, event.payload.line]);
        }
      });
    };

    setupListener();

    // Cleanup listener on unmount or agentId change
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [agentId]);

  const clear = () => setOutput([]);

  return {
    agentId,
    output,
    clear,
  };
}
