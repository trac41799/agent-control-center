import { useState, useEffect } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { useProjectStore } from '../../stores/projectStore'
import { detectStack } from '../../lib/project/detector'

interface ProjectSwitcherProps {
  onProjectChange?: (path: string) => void
}

export function ProjectSwitcher({ onProjectChange }: ProjectSwitcherProps) {
  const { currentProject, recentPaths, switchProject } = useProjectStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [detectedStack, setDetectedStack] = useState<string[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    if (currentProject?.stack) {
      setDetectedStack(currentProject.stack)
    }
  }, [currentProject])

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
      })
      if (selected && typeof selected === 'string') {
        setIsDetecting(true)
        const profile = await detectStack(selected)
        await switchProject(selected)
        if (profile.stack) {
          setDetectedStack(profile.stack)
        }
        if (onProjectChange) {
          onProjectChange(selected)
        }
        setIsDetecting(false)
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err)
      setIsDetecting(false)
    }
  }

  const handleSelectRecent = async (path: string) => {
    setIsDetecting(true)
    await switchProject(path)
    const profile = await detectStack(path)
    if (profile.stack) {
      setDetectedStack(profile.stack)
    }
    if (onProjectChange) {
      onProjectChange(path)
    }
    setIsDetecting(false)
    setIsDropdownOpen(false)
  }

  const pathParts = currentProject?.path ? currentProject.path.split('/') : []
  const currentFolder = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'No project'
  const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-1 text-sm text-gray-300">
        {parentPath && (
          <>
            <span className="text-gray-500">{parentPath}/</span>
            <span className="font-medium text-gray-200">{currentFolder}</span>
          </>
        )}
        {!currentProject && (
          <span className="text-gray-500">No project selected</span>
        )}
      </div>

      {detectedStack.length > 0 && (
        <div className="flex items-center gap-1.5 ml-2">
          {detectedStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
            >
              {tech}
            </span>
          ))}
          {detectedStack.length > 4 && (
            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
              +{detectedStack.length - 4}
            </span>
          )}
        </div>
      )}

      {isDetecting && (
        <span className="text-xs text-gray-500 animate-pulse">Detecting stack...</span>
      )}

      <div className="relative ml-auto">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
        >
          Recent ▼
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {recentPaths.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No recent projects
                </div>
              ) : (
                recentPaths.map((path, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectRecent(path)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 truncate"
                    title={path}
                  >
                    {path}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleBrowse}
        disabled={isDetecting}
        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
      >
        Browse...
      </button>
    </div>
  )
}

export default ProjectSwitcher