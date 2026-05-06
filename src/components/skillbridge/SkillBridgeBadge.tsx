import { useEffect, useState } from 'react'
import { checkSkillBridge, type SkillBridgeInfo } from '@/lib/commands/skillbridge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SkillBridgeBadgeProps {
  onClick?: () => void
}

export function SkillBridgeBadge({ onClick }: SkillBridgeBadgeProps) {
  const [info, setInfo] = useState<SkillBridgeInfo | null>(null)

  useEffect(() => {
    checkSkillBridge().then(setInfo).catch(console.error)
  }, [])

  if (!info || info.status === 'not-installed') {
    return null
  }

  const statusConfig = {
    'bridge-active': { color: 'bg-green-500', label: 'Connected', dot: '●' },
    running: { color: 'bg-gray-400', label: 'Installed', dot: '○' },
    installed: { color: 'bg-gray-500', label: 'Installed', dot: '○' },
  }

  const config = statusConfig[info.status as keyof typeof statusConfig] || statusConfig.installed

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
          >
            <span className={config.color}>{config.dot}</span>
            <span className="text-gray-300">SkillBridge: {config.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 p-3 rounded-md shadow-lg border border-neutral-700">
          <div className="space-y-1.5 text-xs">
            {info.version && (
              <p className="text-gray-400">
                Version: <span className="text-gray-200">{info.version}</span>
              </p>
            )}
            {info.relayUrl && (
              <p className="text-gray-400">
                Relay: <span className="text-gray-200">{info.relayUrl}</span>
              </p>
            )}
            {info.mcpUrl && (
              <p className="text-gray-400">
                MCP: <span className="text-gray-200">{info.mcpUrl}</span>
              </p>
            )}
            <p className="text-gray-500 pt-1">Click to open Integrations</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default SkillBridgeBadge