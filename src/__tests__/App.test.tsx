import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Agent Control")).toBeInTheDocument();
  });

  it("renders Sidebar navigation", () => {
    render(
      <MemoryRouter initialEntries={["/runner"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Runner")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
  });

  it("renders placeholder for unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/under construction/)).toBeInTheDocument();
  });

  it("renders theme toggle in sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
  });
});
