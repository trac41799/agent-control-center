import { create } from 'zustand'
import type { Preset } from '../lib/types'

interface PresetStore {
  presets: Preset[]
  globalPresets: Preset[]
  projectPresets: Preset[]
  addPreset: (preset: Omit<Preset, 'id'>) => void
  removePreset: (id: string) => void
  reorderPresets: (ids: string[]) => void
  executePreset: (presetId: string, targetAgentId: string) => void
}

const DEFAULT_PRESETS: Omit<Preset, 'id'>[] = [
  { label: 'Fix Tests', agent_id: '', command: 'fix_tests', tags: ['testing'], sort_order: 0 },
  { label: 'Review Code', agent_id: '', command: 'review_code', tags: ['review'], sort_order: 1 },
  { label: 'Lint', agent_id: '', command: 'lint', tags: ['quality'], sort_order: 2 },
  { label: 'Commit', agent_id: '', command: 'commit', tags: ['git'], sort_order: 3 },
  { label: 'Deploy Staging', agent_id: '', command: 'deploy_staging', tags: ['deploy'], sort_order: 4 },
]

const generateId = () => crypto.randomUUID()

const createPresets = (defaults: Omit<Preset, 'id'>[]): Preset[] =>
  defaults.map((p) => ({ ...p, id: generateId() }))

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: createPresets(DEFAULT_PRESETS),
  globalPresets: createPresets(DEFAULT_PRESETS),
  projectPresets: [],

  addPreset: (preset: Omit<Preset, 'id'>) => {
    const newPreset: Preset = { ...preset, id: generateId() }
    set((state) => ({
      presets: [...state.presets, newPreset],
      globalPresets: [...state.globalPresets, newPreset],
    }))
  },

  removePreset: (id: string) => {
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id),
      globalPresets: state.globalPresets.filter((p) => p.id !== id),
      projectPresets: state.projectPresets.filter((p) => p.id !== id),
    }))
  },

  reorderPresets: (ids: string[]) => {
    set((state) => {
      const presetMap = new Map(state.presets.map((p) => [p.id, p]))
      const reordered = ids
        .map((id) => presetMap.get(id))
        .filter((p): p is Preset => p !== undefined)
      return { presets: reordered }
    })
  },

  executePreset: (presetId: string, targetAgentId: string) => {
    const preset = get().presets.find((p) => p.id === presetId)
    if (preset) {
      console.log(`Executing preset "${preset.label}" on agent ${targetAgentId}: ${preset.command}`)
    }
  },
}))