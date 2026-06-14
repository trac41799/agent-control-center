import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import Playbooks from "@/pages/Playbooks";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

function renderPlaybooks() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Playbooks />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Playbooks Page", () => {
  it("renders page title", () => {
    renderPlaybooks();
    expect(screen.getByText("Playbooks")).toBeInTheDocument();
  });

  it("renders description", () => {
    renderPlaybooks();
    expect(screen.getByText(/Export and import .acc bundles/)).toBeInTheDocument();
  });

  it("renders Export Playbook section", () => {
    renderPlaybooks();
    expect(screen.getByText("Export Playbook")).toBeInTheDocument();
  });

  it("renders Import Playbook section", () => {
    renderPlaybooks();
    expect(screen.getByText("Import Playbook")).toBeInTheDocument();
  });

  it("renders Playbook Name input", () => {
    renderPlaybooks();
    expect(screen.getByPlaceholderText("my-client-playbook")).toBeInTheDocument();
  });

  it("renders include checkboxes", () => {
    renderPlaybooks();
    expect(screen.getByText("Skills Library")).toBeInTheDocument();
    expect(screen.getByText("Memory Files")).toBeInTheDocument();
    expect(screen.getByText("Preset Commands")).toBeInTheDocument();
  });

  it("renders Generate Manifest button", () => {
    renderPlaybooks();
    expect(screen.getByText("Generate Manifest")).toBeInTheDocument();
  });

  it("renders drop zone for .acc files", () => {
    renderPlaybooks();
    expect(screen.getByText(/Drop a .acc playbook file here/)).toBeInTheDocument();
  });

  it("renders Select .acc File button", () => {
    renderPlaybooks();
    expect(screen.getByText("Select .acc File")).toBeInTheDocument();
  });

  it("renders Reactive Memory section", () => {
    renderPlaybooks();
    expect(screen.getByText("Reactive Memory")).toBeInTheDocument();
  });

  it("renders Feature Docs section", () => {
    renderPlaybooks();
    expect(screen.getByText("Feature Docs")).toBeInTheDocument();
  });

  it("renders doc type buttons", () => {
    renderPlaybooks();
    expect(screen.getByText("EXECUTIVE PLAN")).toBeInTheDocument();
    expect(screen.getByText("CHANGELOG")).toBeInTheDocument();
    expect(screen.getByText("QA REPORT")).toBeInTheDocument();
    expect(screen.getByText("TECHNICAL PLAN")).toBeInTheDocument();
  });

  it("renders empty memory candidates message", () => {
    renderPlaybooks();
    expect(screen.getByText(/No memory candidates yet/)).toBeInTheDocument();
  });
});
