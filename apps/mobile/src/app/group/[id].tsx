import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

type TimeTab = 'past' | 'today' | 'upcoming';
const TIME_TABS: { key: TimeTab; label: string }[] = [
  { key: 'past', label: 'Anteriores' },
  { key: 'today', label: 'Hoy' },
  { key: 'upcoming', label: 'Próximos' },
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
    winnerPoints: number;
    exactScorePoints: number;
  };
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useTheme();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'predictions' | 'members' | 'invite' | 'scoring'>('leaderboard');

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [selectedTimeTab, setSelectedTimeTab] = useState<TimeTab>('today');
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionState>({});
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Modo edición: qué partido está siendo editado
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [savingPrediction, setSavingPrediction] = useState(false);

  // Evitar re-fetch del campeón si ya fue cargado
  const championDataLoaded = useRef(false);
  // Throttle del leaderboard (solo refrescar cada 30 segundos)
  const lastGroupFetchTime = useRef<number>(0);
  const lastFetchedId = useRef<string | null>(null); // <-- NUEVO: Guardará de qué grupo son los datos actuales
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

  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: Match[] } = {};
    matches.forEach((match) => {
      const dateKey = new Date(match.matchDate).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });
    return Object.entries(groups);
  }, [matches]);

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

      // Calcular rango de fechas según la hora local del usuario
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      let matchesUrl = '/matches?';
      if (selectedTimeTab === 'past') {
        matchesUrl += `dateTo=${todayStart.toISOString()}`;
      } else if (selectedTimeTab === 'today') {
        matchesUrl += `dateFrom=${todayStart.toISOString()}&dateTo=${todayEnd.toISOString()}`;
      } else {
        // upcoming: desde mañana en adelante
        const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        matchesUrl += `dateFrom=${tomorrowStart.toISOString()}`;
      }

      const [matchesRes, predsRes] = await Promise.all([
        api.get(matchesUrl),
        api.get(`/predictions/group/${id}`),
      ]);

      const fetchedMatches = matchesRes.data.data as Match[];
      const fetchedPreds = predsRes.data.data as any[];

      const initialPredsState: PredictionState = {};
      fetchedMatches.forEach((match) => {
        const matchingPred = fetchedPreds.find((p) => p.matchId === match.id);
        initialPredsState[match.id] = {
          prediction: matchingPred ? matchingPred.prediction : null,
          predictedHomeScore: matchingPred && matchingPred.predictedHomeScore !== null ? String(matchingPred.predictedHomeScore) : '',
          predictedAwayScore: matchingPred && matchingPred.predictedAwayScore !== null ? String(matchingPred.predictedAwayScore) : '',
          isSaved: true,
          // Puntos obtenidos en este partido
          winnerPoints: matchingPred?.winnerPoints ?? 0,
          exactScorePoints: matchingPred?.exactScorePoints ?? 0,
        };
      });

      setMatches(fetchedMatches);
      setPredictions(initialPredsState);
    } catch (error) {
      console.error('Error al cargar partidos y predicciones:', error);
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

      // Si entramos a un ID de grupo DIFERENTE al anterior, forzamos la recarga inmediata
      if (id !== lastFetchedId.current) {
        setGroup(null); // Borramos visualmente el grupo viejo mientras carga el nuevo
        championDataLoaded.current = false; // Forzamos a que vuelva a buscar el campeón
        lastFetchedId.current = id as string;

        fetchGroupData();
        lastGroupFetchTime.current = now;
        return;
      }
      // Si entramos al MISMO grupo, aplicamos la regla de los 30 segundos
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
        if (!championDataLoaded.current) {
          fetchChampionData();
          championDataLoaded.current = true;
        }
      }
    }, [activeTab, selectedTimeTab, id])
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
    const cleanValue = value.replace(/[^0-9]/g, '');
    setPredictions((prev) => {
      const current = prev[matchId] || {
        prediction: null,
        predictedHomeScore: '',
        predictedAwayScore: '',
        isSaved: false,
        winnerPoints: 0,
        exactScorePoints: 0,
      };
      const updated = { ...current, [field]: cleanValue };
      updated.prediction = getDeducedWinner(updated.predictedHomeScore, updated.predictedAwayScore);
      updated.isSaved = false;
      return { ...prev, [matchId]: updated };
    });
  };

  const handleSavePrediction = async (matchId: number) => {
    const pred = predictions[matchId];
    if (!pred || pred.predictedHomeScore.trim() === '' || pred.predictedAwayScore.trim() === '') {
      showAlert('Error', 'Completá ambos marcadores antes de confirmar.');
      return;
    }
    try {
      setSavingPrediction(true);
      await api.post('/predictions', {
        matchId,
        groupId: Number(id),
        prediction: pred.prediction,
        predictedHomeScore: parseInt(pred.predictedHomeScore, 10),
        predictedAwayScore: parseInt(pred.predictedAwayScore, 10),
      });
      setPredictions((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], isSaved: true },
      }));
      setEditingMatchId(null);
    } catch (error: any) {
      const status = error.status || error.response?.status || error.request?.status;
      if (status === 200 || status === 201) {
        setPredictions((prev) => ({
          ...prev,
          [matchId]: { ...prev[matchId], isSaved: true },
        }));
        setEditingMatchId(null);
        return;
      }
      const errorMsg = error.response?.data?.message || 'Error al guardar el pronóstico.';
      showAlert('Error', errorMsg);
    } finally {
      setSavingPrediction(false);
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
      const status = error.status || error.response?.status || error.request?.status;
      if (status === 200 || status === 201) {
        setChampionId(teamId);
        showAlert('¡Pronóstico Guardado!', 'Elegiste a tu equipo campeón con éxito.');
        return;
      }
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
        <View style={[styles.tabBarContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
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
                Partidos
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
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'scoring' && { backgroundColor: colors.backgroundSelected }]}
              onPress={() => setActiveTab('scoring')}
            >
              <ThemedText type="smallBold" themeColor={activeTab === 'scoring' ? 'text' : 'textSecondary'}>
                Puntaje
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Contenido de Pestaña: PUNTAJE */}
        {activeTab === 'scoring' && (
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Configuración de Puntaje</ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.four }}>
              El creador ha elegido esta configuración para sumar puntos en este grupo:
            </ThemedText>
            <View style={{ gap: Spacing.three }}>
              {/* Ganador */}
              <View style={styles.scoringRow}>
                <ThemedText type="smallBold" style={{ flex: 1, color: colors.text }}>🎯 Acertar Ganador o Empate</ThemedText>
                {group.scoringConfig.winnerPrediction.enabled ? (
                  <View style={[styles.pointsBadge, styles.pointsPositive]}><ThemedText type="code" style={styles.pointsBadgeText}>+{group.scoringConfig.winnerPrediction.points} pts</ThemedText></View>
                ) : (
                  <ThemedText type="smallBold" themeColor="error">Apagado</ThemedText>
                )}
              </View>
              {/* Exacto */}
              <View style={styles.scoringRow}>
                <ThemedText type="smallBold" style={{ flex: 1, color: colors.text }}>⚽ Acertar Resultado Exacto</ThemedText>
                {group.scoringConfig.exactScore.enabled ? (
                  <View style={[styles.pointsBadge, styles.pointsPositive]}><ThemedText type="code" style={styles.pointsBadgeText}>+{group.scoringConfig.exactScore.points} pts</ThemedText></View>
                ) : (
                  <ThemedText type="smallBold" themeColor="error">Apagado</ThemedText>
                )}
              </View>
              {/* Campeón */}
              <View style={styles.scoringRow}>
                <ThemedText type="smallBold" style={{ flex: 1, color: colors.text }}>🏆 Acertar Campeón Mundial</ThemedText>
                {group.scoringConfig.champion.enabled ? (
                  <View style={[styles.pointsBadge, styles.pointsPositive]}><ThemedText type="code" style={styles.pointsBadgeText}>+{group.scoringConfig.champion.points} pts</ThemedText></View>
                ) : (
                  <ThemedText type="smallBold" themeColor="error">Apagado</ThemedText>
                )}
              </View>

              {/* Líder de Grupo */}
              <View style={styles.scoringRow}>
                <ThemedText type="smallBold" style={{ flex: 1, color: colors.text }}>⭐ Acertar Líder de Grupo</ThemedText>
                {group.scoringConfig.groupLeader.enabled ? (
                  <View style={[styles.pointsBadge, styles.pointsPositive]}><ThemedText type="code" style={styles.pointsBadgeText}>+{group.scoringConfig.groupLeader.points} pts</ThemedText></View>
                ) : (
                  <ThemedText type="smallBold" themeColor="error">Apagado</ThemedText>
                )}
              </View>
            </View>
            <View style={{ marginTop: Spacing.four, paddingTop: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
              <ThemedText type="smallBold" style={{ color: colors.text }}>👀 Ver pronósticos de otros miembros:</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
                {group.scoringConfig.showPredictionsBeforeStart
                  ? "Sí, se pueden espiar las predicciones antes de que empiece el partido."
                  : "No, solo se pueden ver una vez que el partido haya comenzado (oculto)."}
              </ThemedText>
            </View>
          </ThemedView>
        )}

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
              {TIME_TABS.map((tab) => {
                const isActive = selectedTimeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.stageTabButton, isActive && { backgroundColor: colors.accentPrimary }]}
                    onPress={() => setSelectedTimeTab(tab.key)}
                  >
                    <ThemedText type="smallBold" style={[styles.stageTabText, isActive && styles.stageTabTextActive]}>
                      {tab.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loadingPredictions ? (
              <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: Spacing.five }} />
            ) : matches.length === 0 ? (
              <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: colors.border }]}>
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  No hay partidos programados en esta sección.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: Spacing.four }}>
                {groupedByDate.map(([dateStr, dateMatches]) => (
                  <View key={dateStr} style={styles.dateGroupContainer}>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.dateHeader}>
                      {dateStr}
                    </ThemedText>

                    <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
                      {dateMatches.map((match) => {
                        const localPred = predictions[match.id] || {
                          prediction: null,
                          predictedHomeScore: '',
                          predictedAwayScore: '',
                          isSaved: true,
                          winnerPoints: 0,
                          exactScorePoints: 0,
                        };
                        const isMatchClosed = new Date() >= new Date(match.matchDate);
                        const isEditing = editingMatchId === match.id;
                        const hasPrediction = localPred.predictedHomeScore !== '' && localPred.predictedAwayScore !== '';

                        // Determinar el badge de estado / hora
                        let statusText = '';
                        let isLive = match.status === 'IN_PLAY';
                        let isFinished = match.status === 'FINISHED';

                        if (isFinished) {
                          statusText = 'Finalizado';
                        } else if (isLive) {
                          statusText = '• En vivo';
                        } else {
                          statusText = new Date(match.matchDate).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) + ' hs';
                        }

                        // Calcular puntos obtenidos
                        const pointsObtained = localPred.winnerPoints + localPred.exactScorePoints;

                        return (
                          <ThemedView key={match.id} type="backgroundElement" style={[styles.matchCard, { borderColor: colors.border }]}>
                            {/* Header del Partido */}
                            <View style={styles.matchCardHeader}>
                              <ThemedText type="smallBold" themeColor="textSecondary">
                                {match.groupName || match.stage}
                              </ThemedText>
                              <View style={[
                                styles.statusBadge,
                                isFinished && styles.statusFinished,
                                isLive && styles.statusLive
                              ]}>
                                <ThemedText type="code" style={[
                                  styles.statusBadgeText,
                                  isFinished && styles.statusFinishedText,
                                  isLive && styles.statusLiveText
                                ]}>
                                  {statusText}
                                </ThemedText>
                              </View>
                            </View>

                            {/* Cuerpo del Partido (Banderas, Nombres y Goles) */}
                            <View style={styles.matchCardBody}>
                              {/* Local */}
                              <View style={styles.teamInfo}>
                                {match.homeTeam.crestUrl ? (
                                  <Image source={{ uri: match.homeTeam.crestUrl }} style={styles.flag} />
                                ) : (
                                  <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
                                )}
                                <ThemedText type="smallBold" numberOfLines={1} style={[styles.teamName, { color: colors.text }]}>
                                  {match.homeTeam.name}
                                </ThemedText>
                              </View>

                              {/* Marcadores / VS */}
                              {isEditing ? (
                                <View style={styles.exactScoreInputs}>
                                  <TextInput
                                    style={[styles.scoreInput, {
                                      backgroundColor: colors.backgroundSelected,
                                      borderColor: colors.border,
                                      color: colors.text
                                    }]}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    value={localPred.predictedHomeScore}
                                    onChangeText={(val) => updateLocalScore(match.id, 'predictedHomeScore', val)}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                  />
                                  <ThemedText type="smallBold" themeColor="textSecondary">-</ThemedText>
                                  <TextInput
                                    style={[styles.scoreInput, {
                                      backgroundColor: colors.backgroundSelected,
                                      borderColor: colors.border,
                                      color: colors.text
                                    }]}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    value={localPred.predictedAwayScore}
                                    onChangeText={(val) => updateLocalScore(match.id, 'predictedAwayScore', val)}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                  />
                                </View>
                              ) : (
                                <View style={styles.scoreDisplayContainer}>
                                  {isFinished || isLive ? (
                                    <View style={styles.officialScoreRow}>
                                      <ThemedText style={styles.officialScoreText}>
                                        {match.homeScore}
                                      </ThemedText>
                                      <ThemedText type="small" themeColor="textSecondary" style={{ marginHorizontal: Spacing.two }}>
                                        vs
                                      </ThemedText>
                                      <ThemedText style={styles.officialScoreText}>
                                        {match.awayScore}
                                      </ThemedText>
                                    </View>
                                  ) : (
                                    <ThemedText type="smallBold" themeColor="textSecondary">
                                      vs
                                    </ThemedText>
                                  )}
                                </View>
                              )}

                              {/* Visitante */}
                              <View style={styles.teamInfo}>
                                {match.awayTeam.crestUrl ? (
                                  <Image source={{ uri: match.awayTeam.crestUrl }} style={styles.flag} />
                                ) : (
                                  <View style={[styles.flag, styles.flagPlaceholder, { borderColor: colors.border }]} />
                                )}
                                <ThemedText type="smallBold" numberOfLines={1} style={[styles.teamName, { color: colors.text }]}>
                                  {match.awayTeam.name}
                                </ThemedText>
                              </View>
                            </View>

                            {/* Sección Inferior de Predicción / Botones */}
                            {isEditing ? (
                              <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: colors.accentPrimary }, savingPrediction && styles.buttonDisabled]}
                                onPress={() => handleSavePrediction(match.id)}
                                disabled={savingPrediction}
                              >
                                {savingPrediction ? (
                                  <ActivityIndicator size="small" color={colors.background} />
                                ) : (
                                  <ThemedText type="smallBold" style={[styles.confirmBtnText, { color: colors.background }]}>
                                    Confirmar Pronóstico
                                  </ThemedText>
                                )}
                              </TouchableOpacity>
                            ) : (
                              <View style={[styles.predictionRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.two }]}>
                                {hasPrediction ? (
                                  <View style={[styles.predictionStatusContainer, { flex: 1, justifyContent: 'space-between', paddingRight: Spacing.two }]}>
                                    <ThemedText type="small" themeColor="textSecondary">
                                      Tu resultado: <ThemedText type="smallBold" style={{ color: colors.text }}>{localPred.predictedHomeScore} - {localPred.predictedAwayScore}</ThemedText>
                                    </ThemedText>
                                    {(isFinished || isLive) && (
                                      <View style={[
                                        styles.pointsBadge,
                                        pointsObtained > 0 ? styles.pointsPositive : styles.pointsZero
                                      ]}>
                                        <ThemedText type="code" style={[styles.pointsBadgeText, pointsObtained > 0 && { color: colors.success }]}>
                                          +{pointsObtained} pts
                                        </ThemedText>
                                      </View>
                                    )}
                                  </View>
                                ) : (
                                  <ThemedText type="small" themeColor="textSecondary" style={{ fontStyle: 'italic' }}>
                                    Sin pronóstico
                                  </ThemedText>
                                )}

                                {!isMatchClosed && (
                                  <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => setEditingMatchId(match.id)}
                                  >
                                    <ThemedText type="smallBold" themeColor="accentSecondary">
                                      {hasPrediction ? 'Editar' : 'Nuevo'}
                                    </ThemedText>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </ThemedView>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
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
                <View style={{ flex: 1, paddingRight: Spacing.two }}>
                  <ThemedText type="smallBold" style={{ color: colors.text }} numberOfLines={1}>
                    {member.user.displayName}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {member.user.email}
                  </ThemedText>
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
  tabBarContainer: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
  },
  tabBarScroll: {
    paddingHorizontal: Spacing.one,
    gap: 4,
  },
  tabItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four, // Ahora usamos padding en lugar de flex:1
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
  },
  scoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.one,
    gap: 4,
  },
  stageTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Spacing.one,
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
    height: 44,
    padding: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateGroupContainer: {
    marginTop: Spacing.two,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: Spacing.one,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  statusBadgeText: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusFinished: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusFinishedText: {
    color: '#9CA3AF',
  },
  statusLive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusLiveText: {
    color: '#EF4444',
  },
  scoreDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialScoreText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmBtn: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  confirmBtnText: {
    fontSize: 13,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pointsBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half,
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
  pointsPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pointsZero: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pointsBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
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
    minHeight: 48,
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