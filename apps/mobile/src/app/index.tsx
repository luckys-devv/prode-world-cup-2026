import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
          let pointsSum = 0;
          await Promise.all(
            userGroups.map(async (group: any) => {
              try {
                const lbRes = await api.get(`/groups/${group.id}/leaderboard`);
                const myEntry = lbRes.data.data.find((e: any) => e.userId === user.id);
                if (myEntry) {
                  pointsSum += myEntry.puntosTotales;
                }
              } catch (err) {
                console.error(`Error al obtener puntos del grupo ${group.id}:`, err);
              }
            })
          );
          setTotalPoints(pointsSum);
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
            ¡Hola, {user?.displayName || 'Jugador'}!
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Bienvenido al Prode con Amigos 2026.
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
          <View>
            <ThemedText type="smallBold" themeColor="text">📅 Ver Fixture Completo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Revisá los partidos y poné tus pronósticos</ThemedText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={() => router.push('/groups')}
        >
          <View>
            <ThemedText type="smallBold" themeColor="text">👥 Mis Grupos con Amigos</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Creá un grupo o unite a uno existente</ThemedText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={() => router.push('/inbox')}
        >
          <View>
            <ThemedText type="smallBold" themeColor="text">📬 Invitaciones Recibidas</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Unite a las salas a las que fuiste invitado</ThemedText>
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