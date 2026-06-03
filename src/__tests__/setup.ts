/// <reference types="vitest" />
import "@testing-library/jest-dom/vitest";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

let uuidCounter = 0;

vi.stubGlobal("crypto", {
  randomUUID: () => {
    uuidCounter++;
    const hex = uuidCounter.toString(16).padStart(12, "0");
    return `00000000-0000-0000-0000-${hex}`;
  },
});

beforeEach(() => {
  mockInvoke.mockReset();
  localStorage.clear();
});

export { mockInvoke };
