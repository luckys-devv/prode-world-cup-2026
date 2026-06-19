import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { api } from '../services/api';
import { useTheme } from '../hooks/use-theme';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const colors = useTheme();

  const [groupsCount, setGroupsCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchDashboardData = async () => {
        if (!user) return;
        try {
          setLoading(true);
          const groupsRes = await api.get('/groups');
          const userGroups = groupsRes.data.data;

          setGroupsCount(userGroups.length);
          // Leemos el total calculado directamente desde el backend
          setTotalPoints(groupsRes.data.totalPoints ?? 0);
        } catch (error) {
          console.error('Error al cargar datos del dashboard:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchDashboardData();
    }, [user])
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.welcomeHeader}>
          <ThemedText type="smallBold" themeColor="accentSecondary">
            PANEL PRINCIPAL
          </ThemedText>
          <ThemedText type="subtitle" style={styles.username}>
            ¡Bienvenido, {user?.displayName || 'Jugador'}!
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Esto es Prode con Amigos 2026.
          </ThemedText>
        </View>

        {/* Tarjeta de Resumen Rápido Dinámica */}
        <ThemedView
          type="backgroundElement"
          style={[styles.statsCard, { borderColor: colors.border }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accentSecondary} style={{ flex: 1 }} />
          ) : (
            <>
              <View style={styles.statBox}>
                <ThemedText type="title" style={styles.statValue}>{totalPoints}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Puntos Totales</ThemedText>
              </View>
              <View style={[styles.statBox, styles.statBorder, { borderColor: colors.border }]}>
                <ThemedText type="title" style={styles.statValue}>{groupsCount}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Mis Grupos</ThemedText>
              </View>
            </>
          )}
        </ThemedView>

        {/* Accesos Rápidos */}
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          ACCESOS RÁPIDOS
        </ThemedText>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={() => router.push('/fixture')}
        >
          {/* Fila del ícono y el título */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
            <Ionicons name="calendar-outline" size={20} color="#00D2FF" />
            <ThemedText type="smallBold" themeColor="text">Ver Fixture Completo</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">Revisá la fecha y hora de los próximos partidos</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={() => router.push('/groups')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
            <Ionicons name="people-outline" size={20} color="#00D2FF" />
            <ThemedText type="smallBold" themeColor="text">Mis Grupos con Amigos</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">Creá un grupo o unete a uno existente</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={() => router.push('/inbox')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
            <Ionicons name="mail-unread-outline" size={20} color="#00D2FF" />
            <ThemedText type="smallBold" themeColor="text">Invitaciones Recibidas</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">Revisa tus invitaciones y empieza a jugar</ThemedText>
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
    minHeight: 100,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
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
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});