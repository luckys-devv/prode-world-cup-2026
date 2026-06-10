import { create } from 'zustand';
import { storage } from '../utils/storage';

interface ThemeState {
  theme: 'light' | 'dark';
  isHydrated: boolean;
  toggleTheme: () => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // Por defecto dark
  isHydrated: false,

  toggleTheme: async () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    await storage.setItem('appTheme', nextTheme);
    set({ theme: nextTheme });
  },

  initializeTheme: async () => {
    try {
      const savedTheme = await storage.getItem('appTheme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        set({ theme: savedTheme, isHydrated: true });
        return;
      }
    } catch (error) {
      console.warn('Error al inicializar el tema:', error);
    }
    set({ theme: 'dark', isHydrated: true });
  },
}));