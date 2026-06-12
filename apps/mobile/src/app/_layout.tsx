import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View, useColorScheme, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/theme';
import LoginScreen from './(auth)/login';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isInitializing, initialize } = useAuthStore();
  const { theme, initializeTheme, isHydrated } = useThemeStore();

  // Al iniciar la app, chequeamos la sesión, el tema persistido y el service worker
  useEffect(() => {
    initialize();
    initializeTheme();

    // Registrar Service Worker solo en navegadores web
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Service Worker registrado:', reg.scope))
          .catch(err => console.error('Error en Service Worker:', err));
      });
    }
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