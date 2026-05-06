import { useState } from 'react'
import { usePresetStore } from '../../stores/presetStore'
import type { Preset } from '../../lib/types'

interface PresetBarProps {
  targetAgentId?: string
  onExecute?: (preset: Preset, agentId: string) => void
}

export function PresetBar({ targetAgentId = '', onExecute }: PresetBarProps) {
  const { presets, addPreset, removePreset, executePreset } = usePresetStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [contextMenu, setContextMenu] = useState<{ preset: Preset; x: number; y: number } | null>(null)

  const [newLabel, setNewLabel] = useState('')
  const [newCommand, setNewCommand] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newAgentId, setNewAgentId] = useState('')

  const filteredPresets = presets.filter((p) =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handlePresetClick = (preset: Preset) => {
    const agentId = preset.agent_id || targetAgentId
    if (onExecute) {
      onExecute(preset, agentId)
    } else {
      executePreset(preset.id, agentId)
    }
  }

  const handleAddPreset = () => {
    if (!newLabel.trim() || !newCommand.trim()) return
    addPreset({
      label: newLabel.trim(),
      command: newCommand.trim(),
      agent_id: newAgentId,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      sort_order: presets.length,
    })
    setNewLabel('')
    setNewCommand('')
    setNewTags('')
    setNewAgentId('')
    setIsAdding(false)
  }

  const handleContextMenu = (e: React.MouseEvent, preset: Preset) => {
    e.preventDefault()
    setContextMenu({ preset, x: e.clientX, y: e.clientY })
  }

  const handleEdit = () => {
    if (contextMenu) {
      setEditingPreset(contextMenu.preset)
      setNewLabel(contextMenu.preset.label)
      setNewCommand(contextMenu.preset.command)
      setNewTags(contextMenu.preset.tags.join(', '))
      setNewAgentId(contextMenu.preset.agent_id)
      setContextMenu(null)
      setIsAdding(true)
    }
  }

  const handleDelete = () => {
    if (contextMenu) {
      removePreset(contextMenu.preset.id)
      setContextMenu(null)
    }
  }

  const handleDuplicate = () => {
    if (contextMenu) {
      const p = contextMenu.preset
      addPreset({
        label: `${p.label} (copy)`,
        command: p.command,
        agent_id: p.agent_id,
        tags: [...p.tags],
        sort_order: presets.length,
      })
      setContextMenu(null)
    }
  }

  const handleSaveEdit = () => {
    if (!editingPreset) return
    removePreset(editingPreset.id)
    addPreset({
      label: newLabel.trim(),
      command: newCommand.trim(),
      agent_id: newAgentId,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      sort_order: editingPreset.sort_order,
    })
    setEditingPreset(null)
    setNewLabel('')
    setNewCommand('')
    setNewTags('')
    setNewAgentId('')
    setIsAdding(false)
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-800 overflow-x-auto">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            onContextMenu={(e) => handleContextMenu(e, preset)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors whitespace-nowrap"
          >
            <span>{preset.label}</span>
            {preset.tags.length > 0 && (
              <div className="flex gap-0.5">
                {preset.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1 py-0.5 text-xs bg-gray-600 text-gray-300 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-24 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            type="text"
            placeholder="Command"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            className="w-32 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            type="text"
            placeholder="Tags (comma)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="w-24 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            type="text"
            placeholder="Agent ID"
            value={newAgentId}
            onChange={(e) => setNewAgentId(e.target.value)}
            className="w-20 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <button
            onClick={editingPreset ? handleSaveEdit : handleAddPreset}
            className="px-2 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setEditingPreset(null)
              setNewLabel('')
              setNewCommand('')
              setNewTags('')
              setNewAgentId('')
            }}
            className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex-shrink-0 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-md transition-colors"
        >
          + New
        </button>
      )}

      <div className="flex-shrink-0 ml-auto">
        <input
          type="text"
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500"
        />
      </div>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleEdit}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
            >
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default PresetBar