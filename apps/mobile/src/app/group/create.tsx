import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../../constants/theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { api } from '../../services/api';
import { ScoringConfig } from '@prode/shared';
import { useTheme } from '../../hooks/use-theme';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CreateGroupScreen() {
  const [isGroupStageEnded, setIsGroupStageEnded] = useState(false);
  const isSubmitting = useRef(false);
  const [name, setName] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useTheme();

  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    winnerPrediction: { enabled: true, points: 1 },
    exactScore: { enabled: true, points: 3 },
    groupLeader: { enabled: false, points: 3 },
    champion: { enabled: true, points: 5 },
    showPredictionsBeforeStart: false,
  });

  useEffect(() => {
    const checkGroupStage = async () => {
      try {
        const response = await api.get('/matches?stage=GROUP_STAGE');
        const groupStageMatches = response.data.data;
        if (groupStageMatches && groupStageMatches.length > 0) {
          const dates = groupStageMatches.map((m: any) => new Date(m.matchDate).getTime());
          const maxDate = Math.max(...dates);
          if (Date.now() >= maxDate) {
            setIsGroupStageEnded(true);
            // Si la fase de grupos ya terminó, forzar a deshabilitado
            setScoringConfig((prev) => ({
              ...prev,
              champion: {
                ...prev.champion,
                enabled: false,
              },
            }));
          }
        }
      } catch (error) {
        console.error('Error al verificar la fase de grupos:', error);
      }
    };
    checkGroupStage();
  }, []);

  const toggleConfig = (key: keyof Omit<ScoringConfig, 'showPredictionsBeforeStart'>) => {
    setScoringConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }));
  };

  const updatePoints = (key: keyof Omit<ScoringConfig, 'showPredictionsBeforeStart'>, value: string) => {
    const points = parseInt(value, 10) || 0;
    setScoringConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        points,
      },
    }));
  };

  const handleCreateGroup = async () => {
    if (isSubmitting.current) return;
    if (!name.trim()) {
      showAlert('Error', 'Por favor, ingresá el nombre del grupo.');
      return;
    }

    try {
      isSubmitting.current = true;
      setLoading(true);
      const response = await api.post('/groups', {
        name: name.trim(),
        prizeDescription: prizeDescription.trim() || undefined,
        scoringConfig,
      });

      const newGroup = response.data.data;
      // Navegamos al grupo creado
      router.replace(`/group/${newGroup.id}`);
    } catch (error: any) {
      // Railway + React Native + Axios: el XHR completa con 200 pero dispara onerror
      // El grupo YA FUE CREADO, así que rescatamos la respuesta y navegamos igual
      if (error.request?.status === 200 || error.request?.status === 201) {
        try {
          const data = JSON.parse(error.request.responseText);
          router.replace(`/group/${data.data.id}`);
          return;
        } catch {
          // Si no se puede parsear, al menos llevamos a la lista de grupos
          router.replace('/groups');
          return;
        }
      }
      let details = '';
      if (error.response) {
        details = `Estado Respuesta: ${error.response.status}\nDatos: ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        // XMLHttpRequest en React Native
        details = `Sin respuesta. XMLHttp Status: ${error.request.status}\nReadyState: ${error.request.readyState}`;
      } else {
        details = `Error configuración: ${error.message}`;
      }

      const errorMsg = `Mensaje: ${error.message}\nCódigo: ${error.code}\n\n${details}`;
      showAlert('Diagnóstico de Error', errorMsg);
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText themeColor="accentSecondary" type="smallBold">← Volver</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={[styles.title, { color: colors.text }]}>Crear Grupo 🏆</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Configurá la sala de juego y sus reglas.
          </ThemedText>
        </View>

        {/* Ajustes Generales */}
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Ajustes Generales</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              Nombre del Grupo
            </ThemedText>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.backgroundSelected,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Ej: Los Pibes del Laburo"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              Premio para el Ganador (Opcional)
            </ThemedText>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.backgroundSelected,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Ej: Un asado / Fernet de oro"
              placeholderTextColor={colors.textSecondary}
              value={prizeDescription}
              onChangeText={setPrizeDescription}
            />
          </View>
        </ThemedView>

        {/* Reglas de Puntaje */}
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Reglas de Puntaje</ThemedText>

          {/* 1. Ganador / Empate */}
          <View style={styles.ruleRow}>
            <View style={styles.ruleInfo}>
              <ThemedText type="smallBold">Acertar Ganador o Empate</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Predicción básica (Local/Empate/Visita)
              </ThemedText>
            </View>
            <View style={styles.ruleControls}>
              {scoringConfig.winnerPrediction.enabled && (
                <TextInput
                  style={[styles.pointsInput, {
                    backgroundColor: colors.backgroundSelected,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  keyboardType="number-pad"
                  value={String(scoringConfig.winnerPrediction.points)}
                  onChangeText={(val) => updatePoints('winnerPrediction', val)}
                />
              )}
              <Switch
                value={scoringConfig.winnerPrediction.enabled}
                onValueChange={() => toggleConfig('winnerPrediction')}
                trackColor={{ false: colors.backgroundSelected, true: colors.accentPrimary }}
              />
            </View>
          </View>

          {/* 2. Resultado Exacto */}
          <View style={[styles.ruleRow, styles.borderRow, { borderColor: colors.border }]}>
            <View style={styles.ruleInfo}>
              <ThemedText type="smallBold">Acertar Score Exacto</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Puntos extras por acertar goles (Ej: 2-1)
              </ThemedText>
            </View>
            <View style={styles.ruleControls}>
              {scoringConfig.exactScore.enabled && (
                <TextInput
                  style={[styles.pointsInput, {
                    backgroundColor: colors.backgroundSelected,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  keyboardType="number-pad"
                  value={String(scoringConfig.exactScore.points)}
                  onChangeText={(val) => updatePoints('exactScore', val)}
                />
              )}
              <Switch
                value={scoringConfig.exactScore.enabled}
                onValueChange={() => toggleConfig('exactScore')}
                trackColor={{ false: colors.backgroundSelected, true: colors.accentPrimary }}
              />
            </View>
          </View>

          {/* 3. Campeón */}
          <View style={[styles.ruleRow, styles.borderRow, { borderColor: colors.border }]}>
            <View style={styles.ruleInfo}>
              <ThemedText type="smallBold">Acertar Campeón del Mundo</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isGroupStageEnded
                  ? 'Inhabilitado (la fase de grupos ya terminó)'
                  : 'Se calcula al finalizar el torneo'}
              </ThemedText>
            </View>
            <View style={styles.ruleControls}>
              {scoringConfig.champion.enabled && (
                <TextInput
                  style={[styles.pointsInput, {
                    backgroundColor: colors.backgroundSelected,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  keyboardType="number-pad"
                  value={String(scoringConfig.champion.points)}
                  onChangeText={(val) => updatePoints('champion', val)}
                  editable={!isGroupStageEnded}
                />
              )}
              <Switch
                value={scoringConfig.champion.enabled}
                onValueChange={() => toggleConfig('champion')}
                trackColor={{ false: colors.backgroundSelected, true: colors.accentPrimary }}
                disabled={isGroupStageEnded}
              />
            </View>
          </View>

          {/* 4. Privacidad */}
          <View style={[styles.ruleRow, styles.borderRow, { borderColor: colors.border }]}>
            <View style={styles.ruleInfo}>
              <ThemedText type="smallBold">Ver pronósticos antes de empezar</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Mostrar predicciones ajenas antes del silbatazo
              </ThemedText>
            </View>
            <Switch
              value={scoringConfig.showPredictionsBeforeStart}
              onValueChange={(val) =>
                setScoringConfig((prev) => ({ ...prev, showPredictionsBeforeStart: val }))
              }
              trackColor={{ false: colors.backgroundSelected, true: colors.accentPrimary }}
            />
          </View>
        </ThemedView>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText type="smallBold" style={styles.submitText}>Crear Grupo</ThemedText>
          )}
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
  header: {
    marginVertical: Spacing.two,
  },
  backButton: {
    marginBottom: Spacing.two,
  },
  title: {
    fontWeight: 'bold',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.4)',
    paddingBottom: Spacing.two,
    color: '#00D2FF',
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: 15,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  borderRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  ruleInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  ruleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pointsInput: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    width: 45,
    height: 35,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: Colors.light.accentPrimary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});