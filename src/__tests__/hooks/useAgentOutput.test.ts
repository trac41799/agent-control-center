import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAgentOutput } from '../../hooks/useAgentOutput'

describe('useAgentOutput', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useAgentOutput('test-agent'))
    expect(result.current.output).toEqual([])
  })

  it('returns agent id', () => {
    const { result } = renderHook(() => useAgentOutput('test-agent'))
    expect(result.current.agentId).toBe('test-agent')
  })

  it('has clear function', () => {
    const { result } = renderHook(() => useAgentOutput('test-agent'))
    expect(typeof result.current.clear).toBe('function')
  })

  it('clear function resets output to empty array', () => {
    const { result } = renderHook(() => useAgentOutput('test-agent'))
    act(() => {
      result.current.clear()
    })
    expect(result.current.output).toEqual([])
  })
})
