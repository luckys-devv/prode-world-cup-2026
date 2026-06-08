import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/theme';
import LoginScreen from './(auth)/login';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isInitializing, initialize } = useAuthStore();

  // Al iniciar la app, chequeamos si hay una sesión persistida
  useEffect(() => {
    initialize();
  }, []);

  // Mientras valida si hay tokens guardados, mostramos una pantalla de carga oscura
  if (isInitializing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.dark.background
      }}>
        <ActivityIndicator size="large" color={Colors.dark.accentPrimary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <LoginScreen />
      )}
    </ThemeProvider>
  );
}