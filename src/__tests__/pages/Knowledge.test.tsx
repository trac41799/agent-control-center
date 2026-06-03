import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import KnowledgePage from "@/pages/Knowledge";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

function renderKnowledge() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <KnowledgePage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("KnowledgePage", () => {
  it("renders Knowledge Compounder page title", () => {
    renderKnowledge();
    expect(screen.getByText("Knowledge Compounder")).toBeInTheDocument();
  });

  it("renders Run Compounder button", () => {
    renderKnowledge();
    expect(screen.getByText("Run Compounder")).toBeInTheDocument();
  });

  it("renders Browse tab", () => {
    renderKnowledge();
    expect(screen.getByText("Browse")).toBeInTheDocument();
  });

  it("renders Refresh button", () => {
    renderKnowledge();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("renders Add Item button", () => {
    renderKnowledge();
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderKnowledge();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("Run Compounder button click opens dialog", async () => {
    renderKnowledge();
    const btn = screen.getByText("Run Compounder");
    await userEvent.click(btn);
    expect(screen.getByText(/Session ID/i)).toBeInTheDocument();
  });

  it("renders Relations tab", () => {
    renderKnowledge();
    expect(screen.getByText("Relations")).toBeInTheDocument();
  });
});
