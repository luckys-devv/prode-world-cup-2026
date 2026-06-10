/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/stores/themeStore';

export function useTheme() {
  const { theme } = useThemeStore();
  return Colors[theme];
}