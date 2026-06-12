import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { useTheme } from '../hooks/use-theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const colors = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="subtitle" style={styles.title}>Mi Perfil</ThemedText>
            <Ionicons name="person-outline" size={24} color={colors.accentSecondary} />
          </View>
          <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: 4 }}>
            Administrá los datos de tu cuenta.
          </ThemedText>
        </View>

        <ThemedView
          type="backgroundElement"
          style={[styles.profileCard, { borderColor: colors.border }]}
        >
          <View style={styles.row}>
            <ThemedText type="smallBold" themeColor="textSecondary">Nombre:</ThemedText>
            <ThemedText type="small">{user?.displayName || 'No configurado'}</ThemedText>
          </View>
          <View style={[styles.row, styles.borderRow, { borderColor: colors.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">Email:</ThemedText>
            <ThemedText type="small">{user?.email}</ThemedText>
          </View>

          {/* INTERRUPTOR PREMIUM CLARO / OSCURO */}
          <View style={[styles.row, styles.borderRow, { borderColor: colors.border, alignItems: 'center' }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">Modo Oscuro:</ThemedText>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: '#6C5CE7' }}
              thumbColor={theme === 'dark' ? '#00D2FF' : '#f4f3f4'}
            />
          </View>
        </ThemedView>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <ThemedText type="smallBold" style={styles.logoutText}>Cerrar Sesión</ThemedText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginVertical: Spacing.two,
  },
  title: {
    fontWeight: 'bold',
  },
  profileCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  borderRow: {
    borderTopWidth: 1,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  logoutText: {
    color: Colors.light.error,
  },
});