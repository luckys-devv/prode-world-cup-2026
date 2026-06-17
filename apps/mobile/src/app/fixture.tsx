import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Colors, Spacing } from '../constants/theme';
import { api } from '../services/api';
import { useFocusEffect } from 'expo-router';
import { Match, MatchStage, MatchStatus } from '@prode/shared';
import { useTheme } from '../hooks/use-theme';

const STAGES = [
  { key: MatchStage.GROUP_STAGE, label: 'Grupos' },
  { key: MatchStage.LAST_32, label: '16avos' },
  { key: MatchStage.LAST_16, label: 'Octavos' },
  { key: MatchStage.QUARTER_FINALS, label: 'Cuartos' },
  { key: MatchStage.SEMI_FINALS, label: 'Semis' },
  { key: MatchStage.FINAL, label: 'Final' },
];

export default function FixtureScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<MatchStage>(MatchStage.GROUP_STAGE);
  const colors = useTheme();

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/matches?stage=${selectedStage}`);
      setMatches(response.data.data);
    } catch (error) {
      console.error('Error al obtener partidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [selectedStage])
  );

  // Agrupamos los partidos por fecha (Día)
  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};

    matches.forEach(match => {
      const dateObj = new Date(match.matchDate);
      const dateKey = format(dateObj, 'yyyy-MM-dd');

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    // Convertimos el diccionario en un array ordenado para la FlatList
    return Object.keys(groups)
      .sort()
      .map(dateKey => {
        // Parseamos al mediodía para evitar problemas de desfase horario al mostrar el título
        const parsedDate = new Date(`${dateKey}T12:00:00`);
        return {
          dateKey,
          dateLabel: format(parsedDate, "EEEE d 'de' MMMM", { locale: es }),
          data: groups[dateKey]
        };
      });
  }, [matches]);

  const renderMatchRow = (match: Match) => {
    const hasStarted =
      match.status === MatchStatus.IN_PLAY ||
      match.status === MatchStatus.PAUSED ||
      match.status === MatchStatus.FINISHED;

    const isLive = match.status === MatchStatus.IN_PLAY || match.status === MatchStatus.PAUSED;
    const matchTime = format(new Date(match.matchDate), 'HH:mm');

    return (
      <View key={match.id} style={styles.matchRow}>
        {/* Local: Bandera a la izquierda, Nombre a la derecha */}
        <View style={styles.teamLeft}>
          {match.homeTeam.crestUrl ? (
            <Image source={{ uri: match.homeTeam.crestUrl }} style={styles.flagSmall} />
          ) : (
            <View style={[styles.flagSmall, styles.flagPlaceholder, { borderColor: colors.border }]} />
          )}
          <Text style={[styles.teamNameSmall, { color: colors.text }]} numberOfLines={1}>
            {match.homeTeam.shortName}
          </Text>
        </View>

        {/* Centro: Badge de horario o resultado */}
        <View style={styles.centerContainer}>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
            {hasStarted ? (
              <Text style={[
                styles.badgeText,
                { color: colors.text },
                isLive && { color: Colors.light.error } // Texto rojo si está en vivo
              ]}>
                {match.homeScore} - {match.awayScore}
              </Text>
            ) : (
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {matchTime}
              </Text>
            )}
          </View>
        </View>

        {/* Visitante: Nombre a la izquierda, Bandera a la derecha */}
        <View style={styles.teamRight}>
          <Text style={[styles.teamNameSmall, { color: colors.text }, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam.shortName}
          </Text>
          {match.awayTeam.crestUrl ? (
            <Image source={{ uri: match.awayTeam.crestUrl }} style={styles.flagSmall} />
          ) : (
            <View style={[styles.flagSmall, styles.flagPlaceholder, { borderColor: colors.border }]} />
          )}
        </View>
      </View>
    );
  };

  const renderGroupedCard = ({ item }: { item: { dateLabel: string, data: Match[] } }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{item.dateLabel}</Text>

        <View style={styles.matchesContainer}>
          {item.data.map(match => renderMatchRow(match))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {STAGES.map((stage) => {
            const isActive = selectedStage === stage.key;
            return (
              <TouchableOpacity
                key={stage.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                  isActive && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }
                ]}
                onPress={() => setSelectedStage(stage.key)}
              >
                <Text style={[
                  styles.tabButtonText,
                  { color: colors.textSecondary },
                  isActive && { color: '#FFFFFF' }
                ]}>
                  {stage.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Cargando fixture...</Text>
        </View>
      ) : groupedMatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay partidos programados para esta fase.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedMatches}
          keyExtractor={(item) => item.dateKey}
          renderItem={renderGroupedCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  tabButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.three,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.four, // Separación entre tarjetas de diferentes días
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
    marginBottom: Spacing.three,
  },
  matchesContainer: {
    gap: Spacing.three, // Separación vertical entre partidos del mismo día
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  teamRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  centerContainer: {
    width: 70, // Espacio fijo para el badge central
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagSmall: {
    width: 24,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flagPlaceholder: {
    borderWidth: 1,
  },
  teamNameSmall: {
    fontSize: 13,
    flexShrink: 1,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});