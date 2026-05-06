import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "@/components/ThemeProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Zap,
  Shield,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  Brain,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationStatus {
  name: string;
  status: "configured" | "not-configured" | "error";
  description: string;
  icon: typeof Globe;
}

export default function SettingsPage() {
  const store = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const [localDefaults, setLocalDefaults] = useState(store.defaults);
  const [localTheme, setLocalTheme] = useState(theme);
  const [fontSize, setFontSize] = useState("medium");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    store.loadSettings();
  }, []);

  useEffect(() => {
    setLocalDefaults(store.defaults);
    setLocalTheme(theme);
  }, [store.defaults, theme]);

  const handleSaveDefaults = () => {
    setTheme(localTheme as "dark" | "light" | "system");
    store.saveSettings({ defaults: localDefaults, theme: localTheme });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    store.resetDefaults();
  };

  const integrations: IntegrationStatus[] = [
    {
      name: "SkillBridge",
      status: "configured",
      description: "Agent skill discovery and execution bridge",
      icon: Zap,
    },
    {
      name: "Supabase",
      status: "configured",
      description: "Backend database and real-time sync",
      icon: Shield,
    },
    {
      name: "GitHub",
      status: "configured",
      description: "Repository management and CI/CD triggers",
      icon: Globe,
    },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case "configured":
        return <CheckCircle className="size-4 text-green-400" />;
      case "not-configured":
        return <XCircle className="size-4 text-gray-500" />;
      case "error":
        return <AlertCircle className="size-4 text-red-400" />;
      default:
        return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "configured":
        return "Connected";
      case "not-configured":
        return "Not Configured";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "configured":
        return "border-green-500/30 text-green-400";
      case "not-configured":
        return "border-gray-500/30 text-gray-400";
      case "error":
        return "border-red-500/30 text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="page-header">
        <div className="gradient-accent-bar" />
        <h1>Settings</h1>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Appearance */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="size-5" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          <Separator />

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <p className="text-xs text-muted-foreground mb-2">Choose your preferred color scheme</p>
              <div className="flex gap-3">
                {[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "System" },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors",
                      localTheme === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={value}
                      checked={localTheme === value}
                      onChange={() => { const v = value as "dark" | "light" | "system"; setLocalTheme(v); setTheme(v); }}
                      className="sr-only"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Font Size</label>
              <p className="text-xs text-muted-foreground mb-2">Adjust interface text size</p>
              <select
                className="w-40 h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Defaults */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="size-5" />
            <h2 className="text-lg font-semibold">Defaults</h2>
          </div>
          <Separator />

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Default Project Path</label>
              <Input
                className="mt-1"
                placeholder="/path/to/project"
                value={localDefaults.projectPath}
                onChange={(e) =>
                  setLocalDefaults((d) => ({ ...d, projectPath: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Default Agent</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={localDefaults.agentId}
                onChange={(e) =>
                  setLocalDefaults((d) => ({ ...d, agentId: e.target.value }))
                }
              >
                <option value="opencode">OpenCode</option>
                <option value="claude">Claude Code</option>
                <option value="windsurf">Windsurf</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Default Model</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={localDefaults.modelId}
                onChange={(e) =>
                  setLocalDefaults((d) => ({ ...d, modelId: e.target.value }))
                }
              >
                <option value="">Auto (Use agent default)</option>
                <option value="claude-sonnet-4">Claude Sonnet 4</option>
                <option value="claude-opus-4">Claude Opus 4</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="deepseek-v4">DeepSeek V4</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveDefaults} className="gap-1.5" disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="size-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Save Defaults
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="size-4" /> Reset All
              </Button>
            </div>
          </div>
        </Card>

        {/* Integrations */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="size-5" />
            <h2 className="text-lg font-semibold">Integrations</h2>
          </div>
          <Separator />

          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-3 rounded-md bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <integration.icon className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs border px-2 py-0.5 rounded-full", statusBadgeColor(integration.status))}>
                    {statusLabel(integration.status)}
                  </span>
                  {statusIcon(integration.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* About */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5" />
            <h2 className="text-lg font-semibold">About</h2>
          </div>
          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Application</span>
              <span className="text-sm font-medium">Agent Control Center</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">0.9.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Build Date</span>
              <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Environment</span>
              <span className="text-sm font-medium">Development</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
