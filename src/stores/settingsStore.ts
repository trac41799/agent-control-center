import { create } from "zustand";

interface SettingsState {
  theme: string;
  defaults: {
    projectPath: string;
    agentId: string;
    modelId: string;
  };
  onboardingCompleted: boolean;
  forceShowOnboarding: boolean;
  sidebarCollapsed: Record<string, boolean>;
  loadSettings: () => void;
  saveSettings: (partial: Partial<SettingsState>) => void;
  resetDefaults: () => void;
  setOnboardingCompleted: () => void;
  resetOnboarding: () => void;
  dismissOnboarding: () => void;
  isFirstLaunch: () => boolean;
  toggleSidebarGroup: (groupId: string) => void;
}

const STORAGE_KEY = "acc-settings";

const DEFAULT_SETTINGS = {
  theme: "dark",
  defaults: {
    projectPath: "",
    agentId: "opencode",
    modelId: "",
  },
  onboardingCompleted: false,
  forceShowOnboarding: false,
  sidebarCollapsed: {
    work: false,
    review: true,
    configure: true,
    automate: true,
    system: true,
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  loadSettings: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          theme: parsed.theme || DEFAULT_SETTINGS.theme,
          defaults: { ...DEFAULT_SETTINGS.defaults, ...parsed.defaults },
          onboardingCompleted: parsed.onboardingCompleted ?? false,
          sidebarCollapsed: { ...DEFAULT_SETTINGS.sidebarCollapsed, ...parsed.sidebarCollapsed },
        });
      }
    } catch {
      // Use defaults if parsing fails
    }
  },

  saveSettings: (partial) => {
    set(partial);
    const current = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: current.theme,
        defaults: current.defaults,
        onboardingCompleted: current.onboardingCompleted,
        sidebarCollapsed: current.sidebarCollapsed,
      })
    );
  },

  setOnboardingCompleted: () => {
    set({ onboardingCompleted: true });
    const current = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: current.theme,
        defaults: current.defaults,
        onboardingCompleted: true,
        sidebarCollapsed: current.sidebarCollapsed,
      })
    );
  },

  resetOnboarding: () => {
    set({ onboardingCompleted: false, forceShowOnboarding: true });
    const current = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: current.theme,
        defaults: current.defaults,
        onboardingCompleted: false,
        sidebarCollapsed: current.sidebarCollapsed,
      })
    );
  },

  dismissOnboarding: () => {
    set({ forceShowOnboarding: false });
  },

  isFirstLaunch: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return !saved;
  },

  toggleSidebarGroup: (groupId) => {
    set((state) => ({
      sidebarCollapsed: {
        ...state.sidebarCollapsed,
        [groupId]: !state.sidebarCollapsed[groupId],
      },
    }));
  },

  resetDefaults: () => {
    set(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  },
}));
