import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Link } from 'expo-router';
import QRCode from 'react-qr-code';
import { Colors, Spacing } from '../../constants/theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { api } from '../../services/api';
import { Group, Match, MatchStage, MatchStatus } from '@prode/shared';

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
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);

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
      const [matchesRes, predsRes] = await Promise.all([
        api.get(`/matches?stage=${selectedStage}`),
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
        };
      });

      setMatches(fetchedMatches);
      setPredictions(initialPredsState);
    } catch (error) {
      console.error('Error al cargar fixture y predicciones:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchGroupData();
      }
    }, [id])
  );

  // Agregamos "id" al dependency array para que se recargue al cambiar de grupo
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'predictions') {
        fetchPredictionsData();
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
      : true; // En mobile deberíamos usar Alert.alert con botones, por ahora lo simplificamos a true en este paso

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await api.delete(`/groups/${id}`);
      showAlert('¡Grupo Eliminado!', 'El grupo se eliminó correctamente.');
      router.replace('/groups');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar el grupo.';
      showAlert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper para deducir el ganador según los goles tipeados
  const getDeducedWinner = (homeScoreStr: string, awayScoreStr: string): 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null => {
    const home = parseInt(homeScoreStr, 10);
    const away = parseInt(awayScoreStr, 10);
    if (isNaN(home) || isNaN(away)) return null;
    if (home > away) return 'HOME_TEAM';
    if (home < away) return 'AWAY_TEAM';
    return 'DRAW';
  };

  const updateLocalScore = (matchId: number, field: 'predictedHomeScore' | 'predictedAwayScore', value: string) => {
    setPredictions((prev) => {
      const current = prev[matchId] || {
        prediction: null,
        predictedHomeScore: '',
        predictedAwayScore: '',
        isSaved: true,
      };

      // Clonamos el estado del partido
      const updated = {
        ...current,
        [field]: value,
      };

      // Deducimos el ganador en caliente con los nuevos goles
      const deduced = getDeducedWinner(updated.predictedHomeScore, updated.predictedAwayScore);
      updated.prediction = deduced;
      updated.isSaved = false;

      return {
        ...prev,
        [matchId]: updated,
      };
    });
  };

  const handleSavePrediction = async (matchId: number) => {
    const pred = predictions[matchId];
    if (!pred) return;

    const homeScore = pred.predictedHomeScore.trim() !== '' ? parseInt(pred.predictedHomeScore, 10) : null;
    const awayScore = pred.predictedAwayScore.trim() !== '' ? parseInt(pred.predictedAwayScore, 10) : null;

    if (homeScore === null || awayScore === null) {
      showAlert('Error', 'Por favor ingresá la cantidad de goles para ambos equipos.');
      return;
    }

    const deducedWinner = getDeducedWinner(pred.predictedHomeScore, pred.predictedAwayScore);
    if (!deducedWinner) {
      showAlert('Error', 'Error al calcular el ganador del partido.');
      return;
    }

    try {
      setSavingMatchId(matchId);
      await api.post('/predictions', {
        matchId,
        groupId: Number(id),
        prediction: deducedWinner,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      });

      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          isSaved: true,
        },
      }));
      showAlert('¡Pronóstico Guardado!', 'Tu predicción se registró con éxito.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al guardar el pronóstico.';
      showAlert('Error', errorMsg);
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.accentPrimary} />
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Link href="/groups" asChild>
          <TouchableOpacity style={styles.backButton}>
            <ThemedText themeColor="accentSecondary" type="smallBold">← Volver a Grupos</ThemedText>
          </TouchableOpacity>
        </Link>
        <ThemedText type="subtitle" style={styles.groupName}>{group.name}</ThemedText>
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
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'leaderboard' && styles.tabItemActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <ThemedText type="smallBold" themeColor={activeTab === 'leaderboard' ? 'text' : 'textSecondary'}>
            Posiciones
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'predictions' && styles.tabItemActive]}
          onPress={() => setActiveTab('predictions')}
        >
          <ThemedText type="smallBold" themeColor={activeTab === 'predictions' ? 'text' : 'textSecondary'}>
            Pronósticos
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
          onPress={() => setActiveTab('members')}
        >
          <ThemedText type="smallBold" themeColor={activeTab === 'members' ? 'text' : 'textSecondary'}>
            Miembros
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'invite' && styles.tabItemActive]}
          onPress={() => setActiveTab('invite')}
        >
          <ThemedText type="smallBold" themeColor={activeTab === 'invite' ? 'text' : 'textSecondary'}>
            Invitar
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Contenido de Pestaña: POSICIONES */}
      {activeTab === 'leaderboard' && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.cardTitle}>Tabla de Posiciones</ThemedText>

          <View style={styles.tableHeader}>
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
                <View key={row.userId} style={[styles.tableRow, index > 0 && styles.borderRow]}>
                  <View style={styles.colRank}>
                    {medal ? (
                      <ThemedText style={styles.medal}>{medal}</ThemedText>
                    ) : (
                      <ThemedText style={rankStyle}>{rank}</ThemedText>
                    )}
                  </View>
                  <ThemedText type="smallBold" style={styles.colUser}>{row.displayName}</ThemedText>
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
          <View style={styles.stagesSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagesScroll}>
              {STAGES.map((stage) => {
                const isActive = selectedStage === stage.key;
                return (
                  <TouchableOpacity
                    key={stage.key}
                    style={[styles.stageTabButton, isActive && styles.stageTabButtonActive]}
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
            <ActivityIndicator size="large" color={Colors.light.accentPrimary} style={{ marginTop: Spacing.five }} />
          ) : matches.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                No hay partidos programados para esta fase.
              </ThemedText>
            </ThemedView>
          ) : (
            matches.map((match) => {
              const localPred = predictions[match.id] || {
                prediction: null,
                predictedHomeScore: '',
                predictedAwayScore: '',
                isSaved: true,
              };

              const isMatchClosed = new Date() >= new Date(match.matchDate);
              const hasChanges = !localPred.isSaved;

              return (
                <ThemedView key={match.id} type="backgroundElement" style={styles.matchCard}>
                  <View style={styles.matchCardHeader}>
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
                        <View style={[styles.flag, styles.flagPlaceholder]} />
                      )}
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.teamName}>
                        {match.homeTeam.shortName}
                      </ThemedText>
                    </View>

                    {/* Inputs de Goles (Siempre activados por defecto) */}
                    <View style={styles.exactScoreInputs}>
                      <TextInput
                        style={[styles.scoreInput, isMatchClosed && styles.inputDisabled]}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={localPred.predictedHomeScore}
                        onChangeText={(val) => updateLocalScore(match.id, 'predictedHomeScore', val)}
                        editable={!isMatchClosed}
                        placeholder="0"
                        placeholderTextColor="#555B77"
                      />
                      <ThemedText type="smallBold" themeColor="textSecondary">-</ThemedText>
                      <TextInput
                        style={[styles.scoreInput, isMatchClosed && styles.inputDisabled]}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={localPred.predictedAwayScore}
                        onChangeText={(val) => updateLocalScore(match.id, 'predictedAwayScore', val)}
                        editable={!isMatchClosed}
                        placeholder="0"
                        placeholderTextColor="#555B77"
                      />
                    </View>

                    {/* Equipo Visitante */}
                    <View style={styles.teamInfo}>
                      {match.awayTeam.crestUrl ? (
                        <Image source={{ uri: match.awayTeam.crestUrl }} style={styles.flag} />
                      ) : (
                        <View style={[styles.flag, styles.flagPlaceholder]} />
                      )}
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.teamName}>
                        {match.awayTeam.shortName}
                      </ThemedText>
                    </View>
                  </View>

                  {/* CORRECCIÓN: Botones de Lectura (deshabilitados). Se prenden solos según el score ingresado */}
                  <View style={styles.selectorRow}>
                    <View
                      style={[
                        styles.selectorBtn,
                        localPred.prediction === 'HOME_TEAM' && styles.selectorBtnSelected,
                        styles.readOnlyBtn,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        themeColor={localPred.prediction === 'HOME_TEAM' ? 'text' : 'textSecondary'}
                      >
                        Gana Local
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.selectorBtn,
                        localPred.prediction === 'DRAW' && styles.selectorBtnSelected,
                        styles.readOnlyBtn,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        themeColor={localPred.prediction === 'DRAW' ? 'text' : 'textSecondary'}
                      >
                        Empate
                      </ThemedText>
                    </View>

                    <View
                      style={[
                        styles.selectorBtn,
                        localPred.prediction === 'AWAY_TEAM' && styles.selectorBtnSelected,
                        styles.readOnlyBtn,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        themeColor={localPred.prediction === 'AWAY_TEAM' ? 'text' : 'textSecondary'}
                      >
                        Gana Visita
                      </ThemedText>
                    </View>
                  </View>

                  {/* Botón de Guardar Pronóstico */}
                  {hasChanges && !isMatchClosed && (
                    <TouchableOpacity
                      style={styles.savePredBtn}
                      onPress={() => handleSavePrediction(match.id)}
                      disabled={savingMatchId === match.id}
                    >
                      {savingMatchId === match.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText type="smallBold" style={styles.savePredText}>Guardar Pronóstico</ThemedText>
                      )}
                    </TouchableOpacity>
                  )}
                </ThemedView>
              );
            })
          )}
        </View>
      )}

      {/* Contenido de Pestaña: MIEMBROS */}
      {activeTab === 'members' && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.cardTitle}>Miembros del Grupo</ThemedText>
          {group.members.map((member: any, index: number) => (
            <View key={member.id} style={[styles.memberRow, index > 0 && styles.borderRow]}>
              <View>
                <ThemedText type="smallBold">{member.user.displayName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{member.user.email}</ThemedText>
              </View>
              <View style={[
                styles.roleBadge,
                member.role === 'admin' ? styles.roleAdmin : styles.roleMember
              ]}>
                <ThemedText type="code" style={styles.roleText}>
                  {member.role === 'admin' ? 'Creador' : 'Jugador'}
                </ThemedText>
              </View>
            </View>
          ))}
        </ThemedView>
      )}

      {/* Contenido de Pestaña: INVITAR */}
      {activeTab === 'invite' && (
        <View style={{ gap: Spacing.four }}>
          <ThemedView type="backgroundElement" style={[styles.card, { alignItems: 'center' }]}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Compartir Grupo</ThemedText>

            <View style={styles.qrContainer}>
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
            <ThemedView type="backgroundSelected" style={styles.codeBox}>
              <ThemedText type="title" style={styles.codeText}>{group.inviteCode}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Invitar por Email</ThemedText>

            <View style={styles.inviteInputRow}>
              <TextInput
                style={styles.input}
                placeholder="amigo@correo.com"
                placeholderTextColor="#555B77"
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
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
  groupName: {
    fontWeight: 'bold',
  },
  prizeDesc: {
    marginTop: Spacing.one,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Spacing.two,
    padding: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  tabItemActive: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    borderColor: 'rgba(42, 49, 84, 0.4)',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  borderRow: {
    borderTopWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.2)',
  },
  colRank: {
    width: 45,
    alignItems: 'center',
  },
  colUser: {
    flex: 1,
    color: '#FFFFFF',
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
    borderColor: Colors.light.border,
  },
  codeBox: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    color: '#FFFFFF',
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
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.backgroundElement,
  },
  stageTabButtonActive: {
    backgroundColor: Colors.light.accentPrimary,
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
    borderColor: Colors.light.border,
  },
  matchCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    borderColor: Colors.light.border,
  },
  teamName: {
    color: '#FFFFFF',
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
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Spacing.one,
    width: 44,
    height: 40,
    textAlign: 'center',
    color: '#FFFFFF',
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
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorBtnSelected: {
    backgroundColor: Colors.light.accentPrimary,
    borderColor: Colors.light.accentPrimary,
  },
  readOnlyBtn: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  savePredBtn: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderWidth: 1,
    borderColor: Colors.light.accentPrimary,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  savePredText: {
    color: Colors.light.accentPrimary,
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
});