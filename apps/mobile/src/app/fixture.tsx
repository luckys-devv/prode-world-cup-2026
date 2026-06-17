import React, { useEffect, useState, useCallback } from 'react';
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

  const renderMatchCard = ({ item }: { item: Match }) => {
    const dateParsed = new Date(item.matchDate);
    const dateFormatted = format(dateParsed, "EEEE d 'de' MMMM - HH:mm 'hs'", { locale: es });

    const hasStarted =
      item.status === MatchStatus.IN_PLAY ||
      item.status === MatchStatus.PAUSED ||
      item.status === MatchStatus.FINISHED;

    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { borderColor: colors.border }]}>
          <Text style={[styles.dateText, { color: colors.accentSecondary }]}>{dateFormatted}</Text>
          {item.groupName && (
            <Text style={[styles.groupText, { color: colors.textSecondary }]}>
              {item.groupName.replace('_', ' ')}
            </Text>
          )}
        </View>

        <View style={styles.matchBody}>
          {/* Local */}
          <View style={styles.teamContainer}>
            {item.homeTeam.crestUrl ? (
              <Image source={{ uri: item.homeTeam.crestUrl }} style={styles.flag} />
            ) : (
              <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {item.homeTeam.shortName}
            </Text>
          </View>

          {/* Marcador */}
          <View style={styles.scoreContainer}>
            {hasStarted ? (
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreText, { color: colors.text }]}>{item.homeScore}</Text>
                <Text style={[styles.scoreDivider, { color: colors.textSecondary }]}>-</Text>
                <Text style={[styles.scoreText, { color: colors.text }]}>{item.awayScore}</Text>
              </View>
            ) : (
              <Text style={[styles.versusText, { color: colors.textSecondary }]}>VS</Text>
            )}

            {item.status === MatchStatus.IN_PLAY && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>EN VIVO</Text>
              </View>
            )}
            {item.status === MatchStatus.PAUSED && (
              <View style={[styles.liveBadge, { backgroundColor: '#E2B13C' }]}>
                <Text style={styles.liveText}>ENTRETIEMPO</Text>
              </View>
            )}
          </View>

          {/* Visitante */}
          <View style={styles.teamContainer}>
            {item.awayTeam.crestUrl ? (
              <Image source={{ uri: item.awayTeam.crestUrl }} style={styles.flag} />
            ) : (
              <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
            )}
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {item.awayTeam.shortName}
            </Text>
          </View>
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
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay partidos programados para esta fase.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMatchCard}
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
    gap: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.5)',
    paddingBottom: Spacing.two,
  },
  dateText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  groupText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  teamContainer: {
    flex: 1.2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  flag: {
    width: 50,
    height: 33,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flagPlaceholder: {
    borderWidth: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreDivider: {
    fontSize: 20,
  },
  versusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveBadge: {
    backgroundColor: Colors.light.error,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});