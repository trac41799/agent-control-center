export interface PipelineConsumer {
  name: string
  onText: (line: string) => void
}

export interface Pipeline {
  feed: (rawData: string) => void
  addConsumer: (consumer: PipelineConsumer) => void
  removeConsumer: (name: string) => void
  destroy: () => void
}