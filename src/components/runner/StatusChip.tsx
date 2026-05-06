import type { AgentStatus } from '../../lib/types'

interface StatusChipProps {
  status: AgentStatus
}

const statusConfig: Record<AgentStatus, { color: string; bg: string; border: string; label: string; pulse: boolean }> = {
  idle:       { color: 'bg-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Idle', pulse: false },
  thinking:   { color: 'bg-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Thinking', pulse: true },
  writing:    { color: 'bg-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'Writing', pulse: true },
  'running tests': { color: 'bg-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Running tests', pulse: true },
  done:       { color: 'bg-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Done', pulse: false },
  failed:     { color: 'bg-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed', pulse: false },
  stalled:    { color: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Stalled', pulse: true },
}

export function inferStatus(output: string[]): AgentStatus {
  const text = output.join(' ').toLowerCase()
  
  if (text.includes('error') || text.includes('failed') || text.includes('fail')) return 'failed'
  if (text.includes('done') || text.includes('complete') || text.includes('finished')) return 'done'
  if (text.includes('test') || text.includes('pytest') || text.includes('npm test')) return 'running tests'
  if (text.includes('writing') || text.includes('editing') || text.includes('creating')) return 'writing'
  if (text.includes('thinking') || text.includes('analyzing')) return 'thinking'
  
  return 'thinking'
}

export default function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status]
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${config.bg} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${config.pulse ? 'animate-status-pulse shadow-[0_0_4px_currentColor]' : ''}`} />
      <span className="text-foreground">{config.label}</span>
    </div>
  )
}
