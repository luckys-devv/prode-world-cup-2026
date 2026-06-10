import { Platform } from 'react-native';

// Definimos la paleta premium. Hacemos que tanto 'light' como 'dark'
// usen el modo oscuro para forzar nuestra estética premium por defecto.
export const Colors = {
  light: {
    text: '#1E293B',                  // Slate 800 (Oscuro para contraste)
    background: '#F8FAFC',            // Slate 50 (Fondo claro limpio)
    backgroundElement: '#FFFFFF',     // Blanco puro para las tarjetas (Cards)
    backgroundSelected: '#F1F5F9',    // Slate 100 para items seleccionados/inputs
    textSecondary: '#64748B',         // Slate 500 para textos secundarios
    border: '#E2E8F0',                // Slate 200 para bordes premium

    // Colores de destaque ajustados para fondo claro
    accentPrimary: '#6C5CE7',
    accentSecondary: '#0284C7',
    accentGold: '#D97706',
    accentSilver: '#64748B',
    accentBronze: '#B45309',
    success: '#10B981',
    error: '#EF4444',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0A0E1A',
    backgroundElement: '#131832',
    backgroundSelected: '#1C2344',
    textSecondary: '#8892B0',

    accentPrimary: '#6C5CE7',
    accentSecondary: '#00D2FF',
    accentGold: '#FFD700',
    accentSilver: '#C0C0C0',
    accentBronze: '#CD7F32',
    success: '#00E676',
    error: '#FF5252',
    border: '#2A3154',
  },
} as const;
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    display: 'Outfit',
    mono: 'Courier New',
  },
  default: {
    sans: 'sans-serif',
    display: 'sans-serif-medium',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;