import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { AGENT_CONFIGS } from "@/lib/agents/configs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Terminal,
  FolderOpen,
  Rocket,
  Check,
  X,
  SkipForward,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const TOTAL_STEPS = 5;

interface AgentInstallState {
  id: string;
  label: string;
  installed: boolean;
  installHint: string | null;
  checking: boolean;
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  claude: "Anthropic's official CLI agent. Strong at complex reasoning and code generation.",
  opencode: "Open-source terminal AI agent with subagent orchestration.",
  aider: "AI pair programming tool that edits code directly in your terminal.",
  goose: "Lightweight CLI agent for quick coding tasks.",
  cline: "VS Code-born CLI agent with deep tool-use capabilities.",
  cursor: "Cursor's CLI agent - fast, context-aware coding assistant.",
  gemini: "Google's AI agent with massive context windows.",
  "qwen-code": "Alibaba's open-source coding agent with strong multi-file edits.",
  codex: "OpenAI's CLI agent optimized for code generation tasks.",
};

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [agents, setAgents] = useState<AgentInstallState[]>(() =>
    AGENT_CONFIGS.map((a) => ({
      id: a.id,
      label: a.label,
      installed: false,
      installHint: null,
      checking: false,
    }))
  );
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [detectedStack, setDetectedStack] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  const { setOnboardingCompleted } = useSettingsStore();
  const { switchProject } = useProjectStore();
  const { spawnAgent } = useAgentStore();

  const checkAllAgents = useCallback(async () => {
    const updated = [...agents];
    for (let i = 0; i < updated.length; i++) {
      const agent = AGENT_CONFIGS[i];
      setAgents((prev) =>
        prev.map((a, idx) => (idx === i ? { ...a, checking: true } : a))
      );
      try {
        const status: { installed: boolean; install_hint: string | null } =
          await invoke("check_agent_installed", {
            agentId: agent.id,
            command: agent.spawnCmd,
          });
        updated[i] = {
          ...updated[i],
          installed: status.installed,
          installHint: status.install_hint,
          checking: false,
        };
      } catch {
        updated[i] = { ...updated[i], checking: false };
      }
      setAgents([...updated]);
    }
  }, [agents]);

  const handleSkip = () => {
    setOnboardingCompleted();
    onComplete();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
      });
      if (selected && typeof selected === "string") {
        setProjectPath(selected);
        await switchProject(selected);
        const projectStore = useProjectStore.getState();
        if (projectStore.currentProject?.stack) {
          setDetectedStack(projectStore.currentProject.stack);
        }
      }
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  };

  const handleLaunchAgent = async () => {
    if (!selectedAgent || !projectPath) return;
    setIsLaunching(true);
    try {
      const agentConfig = AGENT_CONFIGS.find((a) => a.id === selectedAgent);
      if (agentConfig) {
        await spawnAgent(agentConfig, projectPath);
      }
      setOnboardingCompleted();
      onComplete();
    } catch (err) {
      console.error("Failed to launch agent:", err);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleFinish = () => {
    setOnboardingCompleted();
    onComplete();
  };

  const installedAgents = agents.filter((a) => a.installed);

  const stepLabels = ["Welcome", "Check Agents", "Open Project", "Choose Agent", "Ready"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4">
        <Card className="p-0 overflow-hidden border-indigo-500/20 shadow-glow-lg">
          {/* Header with progress */}
          <div className="gradient-primary p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">
                {stepLabels[step]}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <SkipForward className="size-4" />
                Skip
              </Button>
            </div>
            {/* Step indicators */}
            <div className="flex gap-1.5">
              {stepLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => i < step ? setStep(i) : undefined}
                  className={cn(
                    "flex-1 h-1.5 rounded-full transition-all duration-300",
                    i <= step
                      ? "bg-white shadow-glow"
                      : "bg-white/20",
                    i < step && "cursor-pointer hover:bg-white/80"
                  )}
                  title={label}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Welcome */}
            {step === 0 && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-lg">
                    <Sparkles className="size-8 text-white" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    ACC orchestrates 9 AI coding agents from one cockpit.
                  </p>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    You can spawn Claude Code, OpenCode, Aider, and more in parallel PTY sessions.
                    Control multiple agents, manage handoffs, track costs, and build knowledge
                    graphs from your sessions.
                  </p>
                </div>
                <div className="flex justify-center pt-4">
                  <Button size="lg" onClick={handleNext} className="gap-2 px-8">
                    Get Started
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Check Agents */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Let's see which AI coding agents are available on your system.
                </p>

                {!agents.some((a) => a.checking || a.installed) ? (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      onClick={checkAllAgents}
                      className="gap-2"
                    >
                      <Terminal className="size-4" />
                      Detect Installed Agents
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors",
                          agent.checking
                            ? "border-glass-border bg-glass-10"
                            : agent.installed
                              ? "border-green-500/20 bg-green-500/5"
                              : "border-gray-500/15 bg-glass-10"
                        )}
                      >
                        {agent.checking ? (
                          <Loader2 className="size-4 text-indigo-400 animate-spin shrink-0" />
                        ) : agent.installed ? (
                          <Check className="size-4 text-green-400 shrink-0" />
                        ) : (
                          <X className="size-4 text-gray-500 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {agent.label}
                          </p>
                          {!agent.installed && !agent.checking && agent.installHint && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {agent.installHint}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="gap-1.5">
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Open Project */}
            {step === 2 && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <FolderOpen className="size-12 mx-auto text-indigo-400" />
                  <h3 className="text-lg font-semibold">Open your first project</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a project folder to let ACC detect your stack.
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleOpenProject}
                    className="gap-2 px-8"
                  >
                    <FolderOpen className="size-4" />
                    Open Project
                  </Button>
                </div>

                {projectPath && (
                  <Card className="p-4 border-indigo-500/20">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Project Path</p>
                        <p className="text-sm font-mono text-foreground truncate">
                          {projectPath}
                        </p>
                      </div>
                      {detectedStack.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Detected Stack</p>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedStack.map((tech) => (
                              <span
                                key={tech}
                                className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!projectPath}
                    className="gap-1.5"
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Choose Agent */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose your starter agent from the detected installations.
                </p>

                {installedAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No agents detected. Go back and check agents, or install one and re-run onboarding.
                    </p>
                    <Button variant="outline" onClick={handleBack} className="gap-1.5">
                      <ArrowLeft className="size-4" />
                      Go Back
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                      {installedAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => setSelectedAgent(agent.id)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                            selectedAgent === agent.id
                              ? "border-indigo-500/40 bg-indigo-500/10 shadow-glow-sm"
                              : "border-glass-border bg-glass-10 hover:border-indigo-500/20"
                          )}
                        >
                          <div
                            className={cn(
                              "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              selectedAgent === agent.id
                                ? "border-indigo-400 bg-indigo-500"
                                : "border-gray-500"
                            )}
                          >
                            {selectedAgent === agent.id && (
                              <div className="size-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {agent.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {AGENT_DESCRIPTIONS[agent.id] || "AI coding assistant"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                        <ArrowLeft className="size-4" />
                        Back
                      </Button>
                      <Button
                        onClick={handleLaunchAgent}
                        disabled={!selectedAgent || isLaunching}
                        className="gap-1.5"
                      >
                        {isLaunching ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Launching...
                          </>
                        ) : (
                          <>
                            <Rocket className="size-4" />
                            Launch Agent
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 5: Ready */}
            {step === 4 && (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-lg">
                    <Rocket className="size-8 text-white" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold">You're all set!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your agent is launching with your project context. You're ready to start coding.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-start gap-2 text-left">
                      <Sparkles className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Try spawning a second agent for parallel work from the Runner dashboard.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-left">
                      <Sparkles className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Check the Knowledge page after your first session to see auto-extracted patterns.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={handleFinish}
                    className="gap-2 px-8"
                  >
                    Start Using ACC
                    <Rocket className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingWizard;
