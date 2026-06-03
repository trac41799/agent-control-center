import type { Pipeline, PipelineConsumer } from './types'

const ESC = String.fromCharCode(27)
const ANSI_ESCAPE_REGEX = new RegExp(ESC + '\\[[0-9;]*[a-zA-Z]', 'g')
const ANSI_ESCAPE_REGEX_EXTENDED = new RegExp(ESC + '\\][^' + String.fromCharCode(7) + ']*' + String.fromCharCode(7), 'g')
const ANSI_CSI_REGEX = new RegExp(ESC + '\\[([0-9;]*)?[A-Z@_]', 'g')
const ANSI_OSC_REGEX = new RegExp(ESC + '\\][0-9]+;[^' + String.fromCharCode(7) + ']*' + String.fromCharCode(7), 'g')

function stripAnsi(text: string): string {
  return text
    .replace(ANSI_ESCAPE_REGEX, '')
    .replace(ANSI_ESCAPE_REGEX_EXTENDED, '')
    .replace(ANSI_CSI_REGEX, '')
    .replace(ANSI_OSC_REGEX, '')
}

function createPipeline(consumers: PipelineConsumer[] = []): Pipeline {
  const activeConsumers: Map<string, PipelineConsumer> = new Map()
  let pendingLines: string[] = []
  let animationFrameId: number | null = null
  let isProcessing = false

  consumers.forEach((c) => activeConsumers.set(c.name, c))

  const processBatch = () => {
    if (pendingLines.length === 0) {
      isProcessing = false
      animationFrameId = null
      return
    }

    const batch = pendingLines.splice(0, pendingLines.length)

    for (const line of batch) {
      activeConsumers.forEach((consumer) => {
        try {
          consumer.onText(line)
        } catch (e) {
          console.error(`Consumer ${consumer.name} error:`, e)
        }
      })
    }

    animationFrameId = requestAnimationFrame(processBatch)
  }

  const feed = (rawData: string): void => {
    const cleanText = stripAnsi(rawData)
    const lines = cleanText.split('\n')

    for (const line of lines) {
      if (line.trim().length > 0 || line.length > 0) {
        pendingLines.push(line + '\n')
      }
    }

    if (!isProcessing) {
      isProcessing = true
      animationFrameId = requestAnimationFrame(processBatch)
    }
  }

  const addConsumer = (consumer: PipelineConsumer): void => {
    activeConsumers.set(consumer.name, consumer)
  }

  const removeConsumer = (name: string): void => {
    activeConsumers.delete(name)
  }

  const destroy = (): void => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    pendingLines = []
    activeConsumers.clear()
  }

  return { feed, addConsumer, removeConsumer, destroy }
}

export { createPipeline, stripAnsi }