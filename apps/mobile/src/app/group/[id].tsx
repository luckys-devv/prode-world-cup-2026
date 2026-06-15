import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Clipboard,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect, Link } from 'expo-router';
import QRCode from 'react-qr-code';
import { Colors, Spacing } from '../../constants/theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { api } from '../../services/api';
import { Group, Match, MatchStage, MatchStatus } from '@prode/shared';
import { useTheme } from '../../hooks/use-theme';

const STAGES = [
  { key: MatchStage.GROUP_STAGE, label: 'Grupos' },
  { key: MatchStage.LAST_32, label: '16avos' },
  { key: MatchStage.LAST_16, label: 'Octavos' },
  { key: MatchStage.QUARTER_FINALS, label: 'Cuartos' },
  { key: MatchStage.SEMI_FINALS, label: 'Semis' },
  { key: MatchStage.FINAL, label: 'Final' },
];

interface LeaderboardEntry {
  userId: number;
  displayName: string;
  role: string;
  aciertosGanador: number;
  aciertosExacto: number;
  puntosTotales: number;
}

interface GroupDetail extends Group {
  currentUserRole: string;
  members: {
    id: number;
    role: string;
    user: {
      id: number;
      displayName: string;
      email: string;
    };
  }[];
}

interface PredictionState {
  [matchId: number]: {
    prediction: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    predictedHomeScore: string;
    predictedAwayScore: string;
    isSaved: boolean;
  };
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useTheme();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'predictions' | 'members' | 'invite'>('leaderboard');

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [selectedStage, setSelectedStage] = useState<MatchStage>(MatchStage.GROUP_STAGE);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionState>({});
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Auto-guardado en caliente
  const [saveStates, setSaveStates] = useState<{ [matchId: number]: 'idle' | 'saving' | 'saved' | 'error' }>({});
  const debounceTimers = useRef<{ [matchId: number]: any }>({});

  // Caché de partidos por etapa para evitar re-fetches innecesarios
  const matchesCache = useRef<{ [stage: string]: Match[] }>({});

  //evitar re-fetch del campeón si ya fue cargado
  const championDataLoaded = useRef(false);

  //throttle del leaderboard (solo refrescar cada 30 segundos)
  const lastGroupFetchTime = useRef<number>(0);
  const REFRESH_INTERVAL = 30_000;

  // Selección de campeón
  const [teams, setTeams] = useState<any[]>([]);
  const [championId, setChampionId] = useState<number | null>(null);
  const [savingChampion, setSavingChampion] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  // Ver predicciones de otros miembros
  const [selectedMember, setSelectedMember] = useState<{ id: number; displayName: string } | null>(null);
  const [memberPredictions, setMemberPredictions] = useState<any[]>([]);
  const [loadingMemberPreds, setLoadingMemberPreds] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Limpiamos los timers del debouncing al desmontar
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, leaderboardRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/leaderboard`),
      ]);
      setGroup(groupRes.data.data);
      setLeaderboard(leaderboardRes.data.data);
    } catch (error: any) {
      console.error('Error al cargar datos del grupo:', error);
      showAlert('Error', 'No se pudieron cargar los datos de este grupo.');
      router.replace('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictionsData = async () => {
    if (!id) return;
    try {
      setLoadingPredictions(true);

      const cachedMatches = matchesCache.current[selectedStage];
      let fetchedMatches: Match[];

      if (cachedMatches) {
        // Matches ya cacheados: solo pedimos las predicciones
        fetchedMatches = cachedMatches;
        const predsRes = await api.get(`/predictions/group/${id}`);
        const fetchedPreds = predsRes.data.data as any[];

        const initialPredsState: PredictionState = {};
        fetchedMatches.forEach((match) => {
          const matchingPred = fetchedPreds.find((p) => p.matchId === match.id);
          initialPredsState[match.id] = {
            prediction: matchingPred ? matchingPred.prediction : null,
            predictedHomeScore: matchingPred && matchingPred.predictedHomeScore !== null ? String(matchingPred.predictedHomeScore) : '',
            predictedAwayScore: matchingPred && matchingPred.predictedAwayScore !== null ? String(matchingPred.predictedAwayScore) : '',
            isSaved: true,
          };
        });

        setMatches(fetchedMatches);
        setPredictions(initialPredsState);
      } else {
        // Primera vez en esta etapa: pedimos todo junto
        const [matchesRes, predsRes] = await Promise.all([
          api.get(`/matches?stage=${selectedStage}`),
          api.get(`/predictions/group/${id}`),
        ]);

        fetchedMatches = matchesRes.data.data as Match[];
        const fetchedPreds = predsRes.data.data as any[];

        // Guardamos en caché para próximas visitas
        matchesCache.current[selectedStage] = fetchedMatches;

        const initialPredsState: PredictionState = {};
        fetchedMatches.forEach((match) => {
          const matchingPred = fetchedPreds.find((p) => p.matchId === match.id);
          initialPredsState[match.id] = {
            prediction: matchingPred ? matchingPred.prediction : null,
            predictedHomeScore: matchingPred && matchingPred.predictedHomeScore !== null ? String(matchingPred.predictedHomeScore) : '',
            predictedAwayScore: matchingPred && matchingPred.predictedAwayScore !== null ? String(matchingPred.predictedAwayScore) : '',
            isSaved: true,
          };
        });

        setMatches(fetchedMatches);
        setPredictions(initialPredsState);
      }
    } catch (error) {
      console.error('Error al cargar fixture y predicciones:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const fetchChampionData = async () => {
    if (!id) return;
    try {
      const [teamsRes, champRes] = await Promise.all([
        api.get('/matches/teams'),
        api.get(`/predictions/group/${id}/champion`),
      ]);
      setTeams(teamsRes.data.data);
      if (champRes.data.data) {
        setChampionId(champRes.data.data.teamId);
      }
    } catch (error) {
      console.error('Error al cargar datos del campeón:', error);
    }
  };

  const fetchMemberPredictions = async (userId: number, displayName: string) => {
    try {
      setLoadingMemberPreds(true);
      setSelectedMember({ id: userId, displayName });
      setShowMemberModal(true);
      const res = await api.get(`/predictions/group/${id}/user/${userId}`);
      setMemberPredictions(res.data.data);
    } catch (error) {
      console.error('Error al cargar predicciones de miembro:', error);
      showAlert('Error', 'No se pudieron cargar las predicciones del miembro.');
      setShowMemberModal(false);
    } finally {
      setLoadingMemberPreds(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const now = Date.now();
      // Solo refrescamos si pasaron más de 30 segundos desde la última vez
      if (now - lastGroupFetchTime.current > REFRESH_INTERVAL) {
        fetchGroupData();
        lastGroupFetchTime.current = now;
      }
    }, [id])
  );

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'predictions') {
        fetchPredictionsData();
        // Solo cargamos el campeón una vez por sesión en este grupo
        if (!championDataLoaded.current) {
          fetchChampionData();
          championDataLoaded.current = true;
        }
      }
    }, [activeTab, selectedStage, id])
  );

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      showAlert('Error', 'Por favor ingresá un email válido.');
      return;
    }

    try {
      setInviting(true);
      await api.post('/invitations', {
        groupId: Number(id),
        email: inviteEmail.trim().toLowerCase(),
      });
      showAlert('¡Invitación Enviada!', `Se envió un correo a ${inviteEmail}`);
      setInviteEmail('');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al enviar la invitación.';
      showAlert('Error', errorMsg);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')
      : await new Promise((resolve) => {
        Alert.alert(
          'Confirmar eliminación',
          '¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.',
          [
            { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' }
          ]
        );
      });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await api.delete(`/groups/${id}`);
      router.replace('/groups');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar el grupo.';
      showAlert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getDeducedWinner = (homeScoreStr: string, awayScoreStr: string): 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null => {
    const home = parseInt(homeScoreStr, 10);
    const away = parseInt(awayScoreStr, 10);
    if (isNaN(home) || isNaN(away)) return null;
    if (home > away) return 'HOME_TEAM';
    if (home < away) return 'AWAY_TEAM';
    return 'DRAW';
  };

  const updateLocalScore = (matchId: number, field: 'predictedHomeScore' | 'predictedAwayScore', value: string) => {
    // Sanitizar entrada: permitir solo números enteros
    const cleanValue = value.replace(/[^0-9]/g, '');

    // 1. Actualizar el estado local inmediatamente de forma pura
    setPredictions((prev) => {
      const current = prev[matchId] || {
        prediction: null,
        predictedHomeScore: '',
        predictedAwayScore: '',
        isSaved: true,
      };

      const updated = {
        ...current,
        [field]: cleanValue,
      };

      const deduced = getDeducedWinner(updated.predictedHomeScore, updated.predictedAwayScore);
      updated.prediction = deduced;
      updated.isSaved = false;

      return {
        ...prev,
        [matchId]: updated,
      };
    });

    // 2. Lógica de auto-guardado en caliente con debouncing (800ms) ejecutada fuera del render path
    const current = predictions[matchId] || {
      prediction: null,
      predictedHomeScore: '',
      predictedAwayScore: '',
      isSaved: true,
    };

    const updated = {
      ...current,
      [field]: cleanValue,
    };

    const deduced = getDeducedWinner(updated.predictedHomeScore, updated.predictedAwayScore);

    if (updated.predictedHomeScore.trim() !== '' && updated.predictedAwayScore.trim() !== '') {
      if (debounceTimers.current[matchId]) {
        clearTimeout(debounceTimers.current[matchId]);
      }

      setSaveStates((prevStates) => ({ ...prevStates, [matchId]: 'saving' }));

      debounceTimers.current[matchId] = setTimeout(async () => {
        try {
          await api.post('/predictions', {
            matchId,
            groupId: Number(id),
            prediction: deduced,
            predictedHomeScore: parseInt(updated.predictedHomeScore, 10),
            predictedAwayScore: parseInt(updated.predictedAwayScore, 10),
          });

          // Marcar como guardado si el valor no volvió a cambiar en el intermedio
          setPredictions((prevPreds) => {
            const pred = prevPreds[matchId];
            if (!pred) return prevPreds;
            if (
              pred.predictedHomeScore === updated.predictedHomeScore &&
              pred.predictedAwayScore === updated.predictedAwayScore
            ) {
              return {
                ...prevPreds,
                [matchId]: {
                  ...pred,
                  isSaved: true,
                },
              };
            }
            return prevPreds;
          });

          setSaveStates((prevStates) => ({ ...prevStates, [matchId]: 'saved' }));
        } catch (error) {
          console.error('Error al auto-guardar la predicción:', error);
          setSaveStates((prevStates) => ({ ...prevStates, [matchId]: 'error' }));
        }
      }, 800);
    }
  };

  const handleSaveChampion = async (teamId: number) => {
    if (!teamId) return;
    try {
      setSavingChampion(true);
      await api.post('/predictions/champion', {
        groupId: Number(id),
        teamId,
      });
      setChampionId(teamId);
      showAlert('¡Pronóstico Guardado!', 'Elegiste a tu equipo campeón con éxito.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al guardar el campeón.';
      showAlert('Error', errorMsg);
    } finally {
      setSavingChampion(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <ThemedText themeColor="textSecondary" style={styles.loadingText}>
          Cargando sala...
        </ThemedText>
      </View>
    );
  }

  if (!group) return null;

  const inviteUrl = Platform.OS === 'web'
    ? `${window.location.origin}/group/join/${group.inviteCode}`
    : `prode://group/join/${group.inviteCode}`;

  const groupStageMatches = matches.filter((m: any) => m.stage === 'GROUP_STAGE');
  const isGroupStageEnded = groupStageMatches.length > 0
    ? new Date() >= new Date(groupStageMatches[groupStageMatches.length - 1].matchDate)
    : matches.length > 0 && new Date() >= new Date(matches[0].matchDate);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Link href="/groups" asChild>
            <TouchableOpacity style={styles.backButton}>
              <ThemedText themeColor="accentSecondary" type="smallBold">← Volver a Grupos</ThemedText>
            </TouchableOpacity>
          </Link>
          <ThemedText type="subtitle" style={[styles.groupNameText, { color: colors.text }]}>
            {group.name}
          </ThemedText>
          {group.prizeDescription ? (
            <ThemedText themeColor="accentGold" type="smallBold" style={styles.prizeDesc}>
              🏆 Premio: {group.prizeDescription}
            </ThemedText>
          ) : (
            <ThemedText themeColor="textSecondary" type="small" style={styles.prizeDesc}>
              Sin premio configurado
            </ThemedText>
          )}
        </View>

        {/* Subnavegación de Pestañas */}
        <View style={[styles.tabBar, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'leaderboard' && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <ThemedText type="smallBold" themeColor={activeTab === 'leaderboard' ? 'text' : 'textSecondary'}>
              Posiciones
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'predictions' && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab('predictions')}
          >
            <ThemedText type="smallBold" themeColor={activeTab === 'predictions' ? 'text' : 'textSecondary'}>
              Pronósticos
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'members' && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab('members')}
          >
            <ThemedText type="smallBold" themeColor={activeTab === 'members' ? 'text' : 'textSecondary'}>
              Miembros
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'invite' && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab('invite')}
          >
            <ThemedText type="smallBold" themeColor={activeTab === 'invite' ? 'text' : 'textSecondary'}>
              Invitar
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Contenido de Pestaña: POSICIONES */}
        {activeTab === 'leaderboard' && (
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Tabla de Posiciones</ThemedText>

            <View style={[styles.tableHeader, { borderColor: colors.border }]}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colRank}>Pos</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colUser}>Usuario</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colStat}>Ac.</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colStat}>Ex.</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colPts}>Pts</ThemedText>
            </View>

            {leaderboard.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Aún no hay puntos registrados.
              </ThemedText>
            ) : (
              leaderboard.map((row, index) => {
                const rank = index + 1;
                let medal = '';
                let rankStyle: any = styles.rankText;

                if (rank === 1) { medal = '🥇'; rankStyle = styles.rankFirst; }
                else if (rank === 2) { medal = '🥈'; rankStyle = styles.rankSecond; }
                else if (rank === 3) { medal = '🥉'; rankStyle = styles.rankThird; }

                return (
                  <View key={row.userId} style={[styles.tableRow, index > 0 && [styles.borderRow, { borderColor: colors.border }]]}>
                    <View style={styles.colRank}>
                      {medal ? (
                        <ThemedText style={styles.medal}>{medal}</ThemedText>
                      ) : (
                        <ThemedText style={rankStyle}>{rank}</ThemedText>
                      )}
                    </View>
                    <ThemedText type="smallBold" style={[styles.colUser, { color: colors.text }]}>{row.displayName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.colStat}>
                      {row.aciertosGanador}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.colStat}>
                      {row.aciertosExacto}
                    </ThemedText>
                    <ThemedText type="smallBold" themeColor="accentSecondary" style={styles.colPts}>
                      {row.puntosTotales}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </ThemedView>
        )}

        {/* Contenido de Pestaña: PRONÓSTICOS */}
        {activeTab === 'predictions' && (
          <View style={{ gap: Spacing.four }}>

            {/* SELECCIÓN DEL CAMPEÓN DEL MUNDIAL */}
            {group.scoringConfig?.champion?.enabled && (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
                <ThemedText type="smallBold" style={styles.cardTitle}>🏆 Predicción de Campeón Mundial</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.three }}>
                  Elegí qué equipo creés que ganará la Copa del Mundo 2026.
                </ThemedText>

                {Platform.OS === 'web' ? (
                  <select
                    value={championId || ''}
                    onChange={(e) => handleSaveChampion(Number(e.target.value))}
                    disabled={isGroupStageEnded || savingChampion}
                    style={{
                      backgroundColor: colors.backgroundSelected,
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 15,
                      width: '100%',
                      cursor: isGroupStageEnded ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">-- Seleccioná un Equipo --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.pickerBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSelected,
                        opacity: isGroupStageEnded ? 0.6 : 1
                      }
                    ]}
                    onPress={() => setShowPickerModal(true)}
                    disabled={isGroupStageEnded || savingChampion}
                  >
                    {savingChampion ? (
                      <ActivityIndicator size="small" color={colors.accentPrimary} />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: colors.text }}>
                        {championId
                          ? `🏆 ${teams.find((t) => t.id === championId)?.name}`
                          : 'Seleccionar Equipo Campeón'}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                )}

                {isGroupStageEnded && (
                  <ThemedText type="code" themeColor="error" style={{ marginTop: Spacing.two, textAlign: 'center' }}>
                    🔒 Elección de campeón cerrada (la fase de grupos ya terminó)
                  </ThemedText>
                )}
              </ThemedView>
            )}

            <View style={[styles.stagesSelector, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagesScroll}>
                {STAGES.map((stage) => {
                  const isActive = selectedStage === stage.key;
                  return (
                    <TouchableOpacity
                      key={stage.key}
                      style={[styles.stageTabButton, isActive && { backgroundColor: colors.accentPrimary }]}
                      onPress={() => setSelectedStage(stage.key)}
                    >
                      <ThemedText type="smallBold" style={[styles.stageTabText, isActive && styles.stageTabTextActive]}>
                        {stage.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {loadingPredictions ? (
              <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: Spacing.five }} />
            ) : matches.length === 0 ? (
              <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: colors.border }]}>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  No hay partidos programados para esta fase.
                </ThemedText>
              </ThemedView>
            ) : (
              <FlatList
                data={matches}
                keyExtractor={(match) => String(match.id)}
                scrollEnabled={false}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={3}
                renderItem={({ item: match }) => {
                  const localPred = predictions[match.id] || {
                    prediction: null,
                    predictedHomeScore: '',
                    predictedAwayScore: '',
                    isSaved: true,
                  };
                  const isMatchClosed = new Date() >= new Date(match.matchDate);

                  return (
                    <ThemedView key={match.id} type="backgroundElement" style={[styles.matchCard, { borderColor: colors.border }]}>
                      <View style={[styles.matchCardHeader, { borderColor: colors.border }]}>
                        <ThemedText type="code" themeColor="accentSecondary">
                          {new Date(match.matchDate).toLocaleDateString('es-AR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })} hs
                        </ThemedText>

                        {isMatchClosed ? (
                          <View style={styles.closedBadge}>
                            <ThemedText type="code" style={styles.closedBadgeText}>🔒 Cerrado</ThemedText>
                          </View>
                        ) : saveStates[match.id] === 'saving' ? (
                          <View style={[styles.openBadge, { backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}>
                            <ThemedText type="code" style={{ color: colors.accentGold, fontSize: 10, fontWeight: 'bold' }}>⏳ Guardando...</ThemedText>
                          </View>
                        ) : saveStates[match.id] === 'saved' ? (
                          <View style={[styles.openBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <ThemedText type="code" style={{ color: colors.success, fontSize: 10, fontWeight: 'bold' }}>✓ Guardado</ThemedText>
                          </View>
                        ) : saveStates[match.id] === 'error' ? (
                          <View style={[styles.closedBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <ThemedText type="code" style={{ color: colors.error, fontSize: 10, fontWeight: 'bold' }}>⚠️ Error</ThemedText>
                          </View>
                        ) : (
                          <View style={styles.openBadge}>
                            <ThemedText type="code" style={styles.openBadgeText}>🟢 Abierto</ThemedText>
                          </View>
                        )}
                      </View>

                      <View style={styles.matchCardBody}>
                        {/* Equipo Local */}
                        <View style={styles.teamInfo}>
                          {match.homeTeam.crestUrl ? (
                            <Image source={{ uri: match.homeTeam.crestUrl }} style={styles.flag} />
                          ) : (
                            <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
                          )}
                          <ThemedText type="smallBold" numberOfLines={1} style={[styles.teamName, { color: colors.text }]}>
                            {match.homeTeam.shortName}
                          </ThemedText>
                        </View>

                        {/* Inputs de Goles */}
                        <View style={styles.exactScoreInputs}>
                          <TextInput
                            style={[styles.scoreInput, {
                              backgroundColor: colors.backgroundSelected,
                              borderColor: colors.border,
                              color: colors.text
                            }, isMatchClosed && styles.inputDisabled]}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={localPred.predictedHomeScore}
                            onChangeText={(val) => updateLocalScore(match.id, 'predictedHomeScore', val)}
                            editable={!isMatchClosed}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                          />
                          <ThemedText type="smallBold" themeColor="textSecondary">-</ThemedText>
                          <TextInput
                            style={[styles.scoreInput, {
                              backgroundColor: colors.backgroundSelected,
                              borderColor: colors.border,
                              color: colors.text
                            }, isMatchClosed && styles.inputDisabled]}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={localPred.predictedAwayScore}
                            onChangeText={(val) => updateLocalScore(match.id, 'predictedAwayScore', val)}
                            editable={!isMatchClosed}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>

                        {/* Equipo Visitante */}
                        <View style={styles.teamInfo}>
                          {match.awayTeam.crestUrl ? (
                            <Image source={{ uri: match.awayTeam.crestUrl }} style={styles.flag} />
                          ) : (
                            <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
                          )}
                          <ThemedText type="smallBold" numberOfLines={1} style={[styles.teamName, { color: colors.text }]}>
                            {match.awayTeam.shortName}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Indicador de Ganador */}
                      <View style={styles.selectorRow}>
                        <View style={[styles.selectorBtn, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }, localPred.prediction === 'HOME_TEAM' && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }, styles.readOnlyBtn]}>
                          <ThemedText type="smallBold" themeColor={localPred.prediction === 'HOME_TEAM' ? 'text' : 'textSecondary'}>Gana Local</ThemedText>
                        </View>
                        <View style={[styles.selectorBtn, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }, localPred.prediction === 'DRAW' && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }, styles.readOnlyBtn]}>
                          <ThemedText type="smallBold" themeColor={localPred.prediction === 'DRAW' ? 'text' : 'textSecondary'}>Empate</ThemedText>
                        </View>
                        <View style={[styles.selectorBtn, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }, localPred.prediction === 'AWAY_TEAM' && { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }, styles.readOnlyBtn]}>
                          <ThemedText type="smallBold" themeColor={localPred.prediction === 'AWAY_TEAM' ? 'text' : 'textSecondary'}>Gana Visita</ThemedText>
                        </View>
                      </View>
                    </ThemedView>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* Contenido de Pestaña: MIEMBROS */}
        {activeTab === 'members' && (
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Miembros del Grupo</ThemedText>
            {group.members.map((member: any, index: number) => (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberRow, index > 0 && [styles.borderRow, { borderColor: colors.border }]]}
                onPress={() => fetchMemberPredictions(member.user.id, member.user.displayName)}
              >
                <View>
                  <ThemedText type="smallBold" style={{ color: colors.text }}>{member.user.displayName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{member.user.email}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={[
                    styles.roleBadge,
                    member.role === 'admin' ? styles.roleAdmin : styles.roleMember
                  ]}>
                    <ThemedText type="code" style={styles.roleText}>
                      {member.role === 'admin' ? 'Creador' : 'Jugador'}
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="accentSecondary" type="smallBold">👁️ Ver</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {/* Contenido de Pestaña: INVITAR */}
        {activeTab === 'invite' && (
          <View style={{ gap: Spacing.four }}>
            <ThemedView type="backgroundElement" style={[styles.card, { alignItems: 'center', borderColor: colors.border }]}>
              <ThemedText type="smallBold" style={styles.cardTitle}>Compartir Grupo</ThemedText>

              <View style={[styles.qrContainer, { borderColor: colors.border }]}>
                <QRCode
                  value={inviteUrl}
                  size={160}
                  bgColor="#131832"
                  fgColor="#00D2FF"
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.three }}>
                Código de Invitación:
              </ThemedText>
              <ThemedView type="backgroundSelected" style={[styles.codeBox, { borderColor: colors.border }]}>
                <ThemedText type="title" style={styles.codeText}>{group.inviteCode}</ThemedText>
              </ThemedView>

              {/* Botón para Copiar Código al Portapapeles */}
              <TouchableOpacity
                style={[styles.copyCodeBtn, { borderColor: colors.border }]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    navigator.clipboard.writeText(group.inviteCode);
                  } else {
                    Clipboard.setString(group.inviteCode);
                  }
                  showAlert('¡Copiado!', 'El código de invitación se copió al portapapeles.');
                }}
              >
                <ThemedText type="smallBold" themeColor="accentSecondary">
                  📋 Copiar Código
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
              <ThemedText type="smallBold" style={styles.cardTitle}>Invitar por Email</ThemedText>

              <View style={styles.inviteInputRow}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.backgroundSelected,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder="amigo@correo.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                />
                <TouchableOpacity
                  style={[styles.inviteBtn, inviting && styles.buttonDisabled]}
                  onPress={handleSendInvite}
                  disabled={inviting}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.inviteBtnText}>Enviar</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>

            {/* Botón de eliminar (Solo visible si eres creador y estás solo en el grupo) */}
            {group.currentUserRole === 'admin' && group.memberCount === 1 && (
              <TouchableOpacity style={styles.deleteGroupButton} onPress={handleDeleteGroup}>
                <ThemedText type="smallBold" style={styles.deleteGroupText}>
                  🗑️ Eliminar Grupo
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Modal para selección de campeón en Nativo */}
        <Modal
          visible={showPickerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: colors.border }]}>
              <ThemedText type="smallBold" style={styles.modalTitle}>Elegir Campeón Mundial</ThemedText>

              <FlatList
                data={teams}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      championId === item.id && { backgroundColor: 'rgba(108, 92, 231, 0.1)' }
                    ]}
                    onPress={() => {
                      handleSaveChampion(item.id);
                      setShowPickerModal(false);
                    }}
                  >
                    <ThemedText type="smallBold" style={{ color: colors.text }}>{item.name}</ThemedText>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowPickerModal(false)}
              >
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Cerrar</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </Modal>

        {/* MODAL PARA VER LAS PREDICCIONES DE UN JUGADOR */}
        <Modal
          visible={showMemberModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMemberModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView
              type="backgroundElement"
              style={[styles.modalContent, { borderColor: colors.border, maxHeight: '80%' }]}
            >
              <ThemedText type="smallBold" style={styles.modalTitle}>
                🎯 Pronósticos de {selectedMember?.displayName}
              </ThemedText>

              {loadingMemberPreds ? (
                <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginVertical: Spacing.five }} />
              ) : memberPredictions.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={[styles.centerText, { marginVertical: Spacing.four }]}>
                  Este usuario aún no tiene predicciones registradas.
                </ThemedText>
              ) : (
                <FlatList
                  data={memberPredictions}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => {
                    const isHidden = item.prediction === 'HIDDEN';

                    return (
                      <View style={[styles.memberMatchRow, { borderColor: colors.border }]}>
                        {/* Equipos */}
                        <View style={{ flex: 1.5 }}>
                          <ThemedText type="smallBold" numberOfLines={1} style={{ color: colors.text }}>
                            {item.match.homeTeam.shortName} vs {item.match.awayTeam.shortName}
                          </ThemedText>
                          <ThemedText type="code" themeColor="textSecondary">
                            {item.match.stage === 'GROUP_STAGE' ? 'Fase de Grupos' : 'Eliminatorias'}
                          </ThemedText>
                        </View>

                        {/* Predicción */}
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          {isHidden ? (
                            <View style={styles.closedBadge}>
                              <ThemedText type="code" style={styles.closedBadgeText}>🔒 Oculto</ThemedText>
                            </View>
                          ) : (
                            <View style={{ alignItems: 'flex-end' }}>
                              <ThemedText type="smallBold" themeColor="accentSecondary">
                                {item.predictedHomeScore} - {item.predictedAwayScore}
                              </ThemedText>
                              <ThemedText type="code" themeColor="textSecondary">
                                {item.prediction === 'HOME_TEAM' ? 'Gana Local' : item.prediction === 'AWAY_TEAM' ? 'Gana Visita' : 'Empate'}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  style={{ marginVertical: Spacing.two }}
                />
              )}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowMemberModal(false)}
              >
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Cerrar</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.three,
  },
  header: {
    marginVertical: Spacing.two,
  },
  backButton: {
    marginBottom: Spacing.two,
  },
  groupNameText: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  prizeDesc: {
    marginTop: Spacing.one,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.one,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.4)',
    paddingBottom: Spacing.two,
    color: '#00D2FF',
    marginBottom: Spacing.three,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  borderRow: {
    borderTopWidth: 1,
  },
  colRank: {
    width: 45,
    alignItems: 'center',
  },
  colUser: {
    flex: 1,
  },
  colStat: {
    width: 40,
    textAlign: 'center',
  },
  colPts: {
    width: 50,
    textAlign: 'right',
  },
  rankText: {
    fontWeight: '600',
    color: '#8892B0',
  },
  rankFirst: { fontWeight: 'bold', color: '#FFD700' },
  rankSecond: { fontWeight: 'bold', color: '#C0C0C0' },
  rankThird: { fontWeight: 'bold', color: '#CD7F32' },
  medal: {
    fontSize: 18,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  roleBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  roleAdmin: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  roleMember: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  roleText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  qrContainer: {
    padding: Spacing.four,
    backgroundColor: '#131832',
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  codeBox: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D2FF',
    letterSpacing: 4,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: 15,
  },
  inviteBtn: {
    backgroundColor: Colors.light.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    height: 44,
  },
  inviteBtnText: {
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centerText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },

  // Estilos de la Pestaña de Pronósticos
  stagesSelector: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  stagesScroll: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  stageTabButton: {
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one + Spacing.half,
    backgroundColor: 'rgba(28, 35, 68, 0.4)',
  },
  stageTabText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  stageTabTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    borderWidth: 1,
  },
  matchCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.4)',
    paddingBottom: Spacing.two,
  },
  closedBadge: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  closedBadgeText: {
    color: Colors.light.error,
    fontSize: 10,
    fontWeight: 'bold',
  },
  openBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  openBadgeText: {
    color: Colors.light.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  teamInfo: {
    flex: 1.2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  flag: {
    width: 44,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flagPlaceholder: {
    borderWidth: 1,
  },
  teamName: {
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  exactScoreInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreInput: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    width: 44,
    height: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputDisabled: {
    backgroundColor: 'rgba(42, 49, 84, 0.1)',
    color: Colors.light.textSecondary,
    borderColor: 'transparent',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  selectorBtn: {
    flex: 1,
    height: 38,
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyBtn: {
    opacity: 0.85,
  },
  deleteGroupButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  deleteGroupText: {
    color: Colors.light.error,
  },

  // Componentes agregados para modal e invitaciones
  copyCodeBtn: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.three,
    textAlign: 'center',
    color: '#00D2FF',
  },
  modalItem: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  modalCloseBtn: {
    marginTop: Spacing.three,
    backgroundColor: Colors.light.error,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },

  // Visualización de predicciones de miembros
  memberMatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
});