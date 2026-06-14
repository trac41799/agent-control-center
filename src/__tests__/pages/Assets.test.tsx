import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import Assets from "@/pages/Assets";

function renderAssets() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Assets />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Assets Page", () => {
  it("renders page title", () => {
    renderAssets();
    expect(screen.getByText("Asset Manager")).toBeInTheDocument();
  });

  it("renders all tab buttons", () => {
    renderAssets();
    expect(screen.getByText("Skills Library")).toBeInTheDocument();
    expect(screen.getByText("Memory Browser")).toBeInTheDocument();
    expect(screen.getByText("MCP Registry")).toBeInTheDocument();
    expect(screen.getByText("Connector Vault")).toBeInTheDocument();
    expect(screen.getByText("Plugin Manager")).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderAssets();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders Scan button for skills tab", () => {
    renderAssets();
    const scanButtons = screen.getAllByText("Scan");
    expect(scanButtons.length).toBeGreaterThan(0);
  });

  it("renders footer with count", () => {
    renderAssets();
    expect(screen.getByText("0 skills")).toBeInTheDocument();
  });

  it("renders empty state for skills", () => {
    renderAssets();
    expect(screen.getByText(/No skills found/)).toBeInTheDocument();
  });
});
