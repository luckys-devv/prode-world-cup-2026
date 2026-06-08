import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeHeader}>
        <ThemedText type="smallBold" themeColor="accentSecondary">
          PANEL PRINCIPAL
        </ThemedText>
        <ThemedText type="subtitle" style={styles.username}>
          ¡Hola, {user?.displayName || 'Jugador'}! 👋
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Bienvenido al Prode del Mundial FIFA 2026.
        </ThemedText>
      </View>

      {/* Tarjeta de Resumen Rápido */}
      <ThemedView type="backgroundElement" style={styles.statsCard}>
        <View style={styles.statBox}>
          <ThemedText type="title" style={styles.statValue}>0</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Puntos</ThemedText>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <ThemedText type="title" style={styles.statValue}>0</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Mis Grupos</ThemedText>
        </View>
      </ThemedView>

      {/* Accesos Rápidos */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        ACCESOS RÁPIDOS
      </ThemedText>

      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/fixture')}>
        <View>
          <ThemedText type="smallBold" themeColor="text">📅 Ver Fixture Completo</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Revisá los partidos y poné tus pronósticos</ThemedText>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/groups')}>
        <View>
          <ThemedText type="smallBold" themeColor="text">👥 Mis Grupos con Amigos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Creá un grupo o unite a uno existente</ThemedText>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/inbox')}>
        <View>
          <ThemedText type="smallBold" themeColor="text">📬 Invitaciones Recibidas</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Unite a las salas a las que fuiste invitado</ThemedText>
        </View>
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
  welcomeHeader: {
    marginVertical: Spacing.two,
  },
  username: {
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00D2FF',
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  actionCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
});