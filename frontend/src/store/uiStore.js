import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default language can be adjusted; user chose 'en'
const DEFAULT_LANGUAGE = 'en';

export const useUiStore = create(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'ui-preferences',
      partialize: (state) => ({ language: state.language }),
    }
  )
);


