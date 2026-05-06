import { create } from "zustand";

interface AppState {
  activeRoute: string;
  sidebarCollapsed: boolean;
  setActiveRoute: (route: string) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeRoute: "/runner",
  sidebarCollapsed: false,
  setActiveRoute: (route) => set({ activeRoute: route }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));