import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/theme';
import LoginScreen from './(auth)/login';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isInitializing, initialize } = useAuthStore();
  const { theme, initializeTheme, isHydrated } = useThemeStore();

  // Al iniciar la app, chequeamos la sesión y el tema persistido
  useEffect(() => {
    initialize();
    initializeTheme();
  }, []);

  // Esperamos a que ambos stores terminen de hidratarse/inicializarse
  if (isInitializing || !isHydrated) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.dark.background // Fallback oscuro
      }}>
        <ActivityIndicator size="large" color={Colors.dark.accentPrimary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <LoginScreen />
      )}
    </ThemeProvider>
  );
}