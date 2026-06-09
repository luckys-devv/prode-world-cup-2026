import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Colors, Spacing } from '../constants/theme';
import { api } from '../services/api';
import { useFocusEffect } from 'expo-router';
// Importamos los tipos unificados desde el paquete compartido del monorepo
import { Match, MatchStage, MatchStatus } from '@prode/shared';

// Mapeo de etapas de la API de fútbol a español amigable
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

    // Determinamos si el partido ya empezó o finalizó
    const hasStarted =
      item.status === MatchStatus.IN_PLAY ||
      item.status === MatchStatus.PAUSED ||
      item.status === MatchStatus.FINISHED;

    // Se puede pronosticar si aún está programado o confirmado con horario
    const canPredict =
      item.status === MatchStatus.SCHEDULED ||
      item.status === MatchStatus.TIMED;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{dateFormatted}</Text>
          {item.groupName && (
            <Text style={styles.groupText}>
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
              <View style={[styles.flag, styles.flagPlaceholder]} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {item.homeTeam.shortName}
            </Text>
          </View>

          {/* Marcador */}
          <View style={styles.scoreContainer}>
            {hasStarted ? (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>{item.homeScore}</Text>
                <Text style={styles.scoreDivider}>-</Text>
                <Text style={styles.scoreText}>{item.awayScore}</Text>
              </View>
            ) : (
              <Text style={styles.versusText}>VS</Text>
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
              <View style={[styles.flag, styles.flagPlaceholder]} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {item.awayTeam.shortName}
            </Text>
          </View>
        </View>

        {canPredict && (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Pronosticar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {STAGES.map((stage) => {
            const isActive = selectedStage === stage.key;
            return (
              <TouchableOpacity
                key={stage.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setSelectedStage(stage.key)}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {stage.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.light.accentPrimary} />
          <Text style={styles.loaderText}>Cargando fixture...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay partidos programados para esta fase.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tabsContainer: {
    backgroundColor: Colors.light.backgroundSelected,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tabButtonActive: {
    backgroundColor: Colors.light.accentPrimary,
    borderColor: Colors.light.accentPrimary,
  },
  tabButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    color: Colors.light.accentSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  groupText: {
    color: Colors.light.textSecondary,
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
    borderColor: Colors.light.border,
  },
  teamName: {
    color: Colors.light.text,
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
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreDivider: {
    color: Colors.light.textSecondary,
    fontSize: 20,
  },
  versusText: {
    color: Colors.light.textSecondary,
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
  actionButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 1,
    borderColor: Colors.light.accentPrimary,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  actionButtonText: {
    color: Colors.light.accentPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});