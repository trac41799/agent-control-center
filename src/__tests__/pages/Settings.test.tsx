import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import SettingsPage from "@/pages/Settings";

function renderSettings() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("SettingsPage", () => {
  it("renders all sections", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Defaults")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders theme radio buttons", () => {
    renderSettings();
    expect(screen.getByLabelText("Dark")).toBeInTheDocument();
    expect(screen.getByLabelText("Light")).toBeInTheDocument();
    expect(screen.getByLabelText("System")).toBeInTheDocument();
  });

  it("renders default agent/model selects", () => {
    renderSettings();
    expect(screen.getByDisplayValue("OpenCode")).toBeInTheDocument();
  });

  it("renders integration status cards", () => {
    renderSettings();
    expect(screen.getByText("SkillBridge")).toBeInTheDocument();
    expect(screen.getByText("Supabase")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders about section with version", () => {
    renderSettings();
    expect(screen.getByText("Agent Control Center")).toBeInTheDocument();
    expect(screen.getByText("0.9.0")).toBeInTheDocument();
  });

  it("Save Defaults button is present", () => {
    renderSettings();
    expect(screen.getByText("Save Defaults")).toBeInTheDocument();
  });

  it("Reset All button is present", () => {
    renderSettings();
    expect(screen.getByText("Reset All")).toBeInTheDocument();
  });

  it("Save Defaults button changes to Saved on click", async () => {
    renderSettings();
    const saveBtn = screen.getByText("Save Defaults");
    await userEvent.click(saveBtn);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("allows changing theme radio selection", async () => {
    renderSettings();
    const lightRadio = screen.getByLabelText("Light");
    await userEvent.click(lightRadio);
    expect(lightRadio).toBeChecked();
  });

  it("shows integration status labels", () => {
    renderSettings();
    const connectedBadges = screen.getAllByText("Connected");
    expect(connectedBadges.length).toBe(3);
  });

  it("renders font size selector", () => {
    renderSettings();
    expect(screen.getByDisplayValue("Medium")).toBeInTheDocument();
  });
});
