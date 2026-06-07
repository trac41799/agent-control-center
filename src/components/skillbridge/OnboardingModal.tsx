import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSkip: () => void
}

const SKILLBRIDGE_DOWNLOAD_URL = 'https://github.com/anomalyco/skillbridge/releases'

const steps = [
  {
    number: 1,
    title: 'Download SkillBridge',
    description: 'Get the latest release for your platform.',
  },
  {
    number: 2,
    title: 'Install and launch',
    description: 'Follow the installation instructions.',
  },
  {
    number: 3,
    title: 'ACC will auto-detect',
    description: 'Once running, ACC detects SkillBridge automatically.',
  },
]

export function OnboardingModal({ open, onOpenChange, onSkip }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleSkip = () => {
    onSkip()
    onOpenChange(false)
  }

  const handleDownload = () => {
    window.open(SKILLBRIDGE_DOWNLOAD_URL, '_blank')
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl">
        <div className="p-6 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-gray-100">Welcome to SourceForge</h2>
          <p className="mt-1 text-sm text-gray-400">
            Get started with SkillBridge to enable cloud memory sync.
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  index === currentStep
                    ? 'bg-secondary'
                    : index < currentStep
                    ? 'bg-green-500/10'
                    : 'bg-transparent'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-600 text-neutral-300'
                  }`}
                >
                  {index < currentStep ? '✓' : step.number}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-200">{step.title}</p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-neutral-700">
          <Button variant="ghost" onClick={handleSkip} className="text-gray-400">
            Skip — I only need local agents
          </Button>
          <div className="flex gap-2">
            {currentStep === 0 ? (
              <Button onClick={handleDownload}>Install SkillBridge</Button>
            ) : (
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Got it' : 'Next'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal