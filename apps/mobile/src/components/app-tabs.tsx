// apps/mobile/src/components/app-tabs.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppTabs() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          width: '100%',
          elevation: 0, // quita sombra en android si la hubiera
          borderTopWidth: 1, // una línea sutil arriba
        },
        tabBarActiveTintColor: colors.accentSecondary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarItemStyle: {
          flex: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="fixture"
        options={{
          title: 'Fixture',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Bandeja',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'mail' : 'mail-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* ─── PESTAÑAS INTERNAS OCULTAS ─── */}
      <Tabs.Screen
        name="(auth)/login"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="group/create"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="group/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}