import { create } from "zustand";

interface SettingsState {
  theme: string;
  defaults: {
    projectPath: string;
    agentId: string;
    modelId: string;
  };
  loadSettings: () => void;
  saveSettings: (partial: Partial<SettingsState>) => void;
  resetDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  theme: "dark",
  defaults: {
    projectPath: "",
    agentId: "opencode",
    modelId: "",
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  loadSettings: () => {
    try {
      const saved = localStorage.getItem("acc-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          theme: parsed.theme || DEFAULT_SETTINGS.theme,
          defaults: { ...DEFAULT_SETTINGS.defaults, ...parsed.defaults },
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
      "acc-settings",
      JSON.stringify({
        theme: current.theme,
        defaults: current.defaults,
      })
    );
  },

  resetDefaults: () => {
    set(DEFAULT_SETTINGS);
    localStorage.removeItem("acc-settings");
  },
}));
