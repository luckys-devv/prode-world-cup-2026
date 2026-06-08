import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Mi Perfil 👤</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Administrá los datos de tu cuenta.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.profileCard}>
        <View style={styles.row}>
          <ThemedText type="smallBold" themeColor="textSecondary">Nombre:</ThemedText>
          <ThemedText type="small">{user?.displayName || 'No configurado'}</ThemedText>
        </View>
        <View style={[styles.row, styles.borderRow]}>
          <ThemedText type="smallBold" themeColor="textSecondary">Email:</ThemedText>
          <ThemedText type="small">{user?.email}</ThemedText>
        </View>
      </ThemedView>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <ThemedText type="smallBold" style={styles.logoutText}>Cerrar Sesión 🔓</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    borderColor: Colors.light.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  borderRow: {
    borderTopWidth: 1,
    borderColor: Colors.light.border,
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