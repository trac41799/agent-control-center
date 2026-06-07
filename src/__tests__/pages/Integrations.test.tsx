import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

describe("Integrations page", () => {
  it("renders at /integrations route", () => {
    render(
      <MemoryRouter initialEntries={["/integrations"]}>
        <App />
      </MemoryRouter>
    );
    const elements = screen.getAllByText(/Integrations/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("redirects /connectors to /integrations", () => {
    render(
      <MemoryRouter initialEntries={["/connectors"]}>
        <App />
      </MemoryRouter>
    );
    const elements = screen.getAllByText(/Integrations/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("sidebar shows Integrations label in CONFIGURE group", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <Sidebar />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /Integrations/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Connectors/ })).not.toBeInTheDocument();
  });
});
