import { useState, useEffect } from 'react';

export function useAgentOutput(agentId: string) {
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    // TODO: Subscribe to Tauri events for real-time streaming
    // For now, just initialize empty state
    setOutput([]);
  }, [agentId]);

  const clear = () => setOutput([]);

  return {
    agentId,
    output,
    clear,
  };
}
