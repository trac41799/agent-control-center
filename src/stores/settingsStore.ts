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
  loadSettings: () => void;
  saveSettings: (partial: Partial<SettingsState>) => void;
  resetDefaults: () => void;
  setOnboardingCompleted: () => void;
  resetOnboarding: () => void;
  dismissOnboarding: () => void;
  isFirstLaunch: () => boolean;
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

  resetDefaults: () => {
    set(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  },
}));
