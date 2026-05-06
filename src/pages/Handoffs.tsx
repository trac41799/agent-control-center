import { useState } from "react";
import { useOrchestrationStore, type HandoffEnvelope } from "@/stores/orchestrationStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  Copy,
} from "lucide-react";

interface ValidatedSection {
  name: string;
  present: boolean;
}

export default function Handoffs() {
  const store = useOrchestrationStore();
  const [content, setContent] = useState("");
  const [envelope, setEnvelope] = useState<HandoffEnvelope>({
    original_task: "",
    completed_by: "",
    model_used: "",
    output_summary: "",
    changed_files: [],
    diff_preview: "",
    handoff_instruction: "",
    next_agent: "",
    next_model: "",
  });
  const [validatedSections, setValidatedSections] = useState<ValidatedSection[] | null>(null);
  const [handoffOutput, setHandoffOutput] = useState("");

  const handleValidate = async () => {
    if (!content.trim()) return;
    const result = await store.validateHandoff(content);
    setValidatedSections(
      result.missing.map((name) => ({ name, present: false })).concat(
        ["Completed Work", "Test Results", "Interface Contracts Exposed", "Files NOT Modified", "Design Decisions", "Handoff Instructions"]
          .filter((s) => !result.missing.includes(s))
          .map((name) => ({ name, present: true }))
      )
    );
  };

  const handleBuild = async () => {
    const result = await store.buildHandoff(envelope);
    setHandoffOutput(result);
  };

  const handleFileChange = (value: string) => {
    setEnvelope((prev) => ({
      ...prev,
      changed_files: value.split("\n").filter(Boolean),
    }));
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="page-header">
        <div className="gradient-accent-bar" />
        <h1>Handoff Monitor</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Build Handoff Envelope */}
        <div className="flex flex-col gap-4 min-h-0">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Send className="size-4 text-[#58a6ff]" />
              <span className="text-sm font-medium text-gray-300">Build Handoff Envelope</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Original Task</label>
                <Input
                  value={envelope.original_task}
                  onChange={(e) => setEnvelope((p) => ({ ...p, original_task: e.target.value }))}
                  placeholder="Describe the original task"
                  className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Completed By</label>
                  <Input
                    value={envelope.completed_by}
                    onChange={(e) => setEnvelope((p) => ({ ...p, completed_by: e.target.value }))}
                    placeholder="e.g., claude"
                    className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Model Used</label>
                  <Input
                    value={envelope.model_used}
                    onChange={(e) => setEnvelope((p) => ({ ...p, model_used: e.target.value }))}
                    placeholder="e.g., sonnet-4"
                    className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Next Agent</label>
                  <Input
                    value={envelope.next_agent}
                    onChange={(e) => setEnvelope((p) => ({ ...p, next_agent: e.target.value }))}
                    placeholder="e.g., aider"
                    className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Next Model</label>
                  <Input
                    value={envelope.next_model}
                    onChange={(e) => setEnvelope((p) => ({ ...p, next_model: e.target.value }))}
                    placeholder="e.g., gemini-2.5-pro"
                    className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Output Summary</label>
                <textarea
                  value={envelope.output_summary}
                  onChange={(e) => setEnvelope((p) => ({ ...p, output_summary: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none"
                  placeholder="Brief summary of what was done"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Changed Files (one per line)</label>
                <textarea
                  value={envelope.changed_files.join("\n")}
                  onChange={(e) => handleFileChange(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none"
                  placeholder="file1.ts&#10;file2.ts"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Diff Preview</label>
                <textarea
                  value={envelope.diff_preview}
                  onChange={(e) => setEnvelope((p) => ({ ...p, diff_preview: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none font-mono"
                  placeholder="+ added line&#10;- removed line"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Handoff Instructions</label>
                <textarea
                  value={envelope.handoff_instruction}
                  onChange={(e) => setEnvelope((p) => ({ ...p, handoff_instruction: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none"
                  placeholder="Instructions for the next agent"
                />
              </div>
            </div>
            <Button onClick={handleBuild} className="gap-1.5 w-full">
              <FileCheck className="size-4" />
              Generate Handoff
            </Button>
          </Card>
        </div>

        {/* Right: Validate & Preview */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Validation */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-[#d29922]" />
              <span className="text-sm font-medium text-gray-300">Validate Handoff Schema</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none"
              placeholder="Paste handoff content here to validate schema..."
            />
            <Button onClick={handleValidate} variant="outline" className="gap-1.5 w-full">
              <Eye className="size-4" />
              Validate Schema
            </Button>
            {validatedSections && (
              <div className="space-y-1.5 mt-2">
                {validatedSections.map((section) => (
                  <div key={section.name} className="flex items-center gap-2 text-xs">
                    {section.present ? (
                      <CheckCircle2 className="size-3.5 text-green-500" />
                    ) : (
                      <XCircle className="size-3.5 text-red-500" />
                    )}
                    <span className={section.present ? "text-green-400" : "text-red-400"}>
                      {section.name}
                    </span>
                    {!section.present && (
                      <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                        missing
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Handoff Output */}
          {handoffOutput && (
            <Card className="p-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-4 text-green-400" />
                  <span className="text-sm font-medium text-gray-300">Generated Handoff</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1"
                  onClick={() => navigator.clipboard.writeText(handoffOutput)}
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {handoffOutput}
                </pre>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
