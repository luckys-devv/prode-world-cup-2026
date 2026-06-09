import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../../constants/theme';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { api } from '../../services/api';
// Reutilizamos el tipo del monorepo
import { ScoringConfig } from '@prode/shared';

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Configuración de puntaje inicializada según los tipos compartidos
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    winnerPrediction: { enabled: true, points: 1 },
    exactScore: { enabled: true, points: 3 },
    groupLeader: { enabled: false, points: 3 },
    champion: { enabled: true, points: 5 },
    showPredictionsBeforeStart: false,
  });

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
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor, ingresá el nombre del grupo.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/groups', {
        name: name.trim(),
        prizeDescription: prizeDescription.trim() || undefined,
        scoringConfig,
      });

      const newGroup = response.data.data;
      Alert.alert('¡Grupo Creado!', 'Tu grupo de prode se creó exitosamente.');

      // Navegamos al detalle del grupo recién creado
      router.replace(`/group/${newGroup.id}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al crear el grupo.';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText themeColor="accentSecondary" type="smallBold">← Volver</ThemedText>
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.title}>Crear Grupo 🏆</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Configurá la sala de juego y sus reglas.
        </ThemedText>
      </View>

      {/* Ajustes Generales */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>Ajustes Generales</ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            Nombre del Grupo
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ej: Los Pibes del Laburo"
            placeholderTextColor="#555B77"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            Premio para el Ganador (Opcional)
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ej: Un asado / Fernet de oro"
            placeholderTextColor="#555B77"
            value={prizeDescription}
            onChangeText={setPrizeDescription}
          />
        </View>
      </ThemedView>

      {/* Reglas de Puntaje */}
      <ThemedView type="backgroundElement" style={styles.card}>
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
                style={styles.pointsInput}
                keyboardType="number-pad"
                value={String(scoringConfig.winnerPrediction.points)}
                onChangeText={(val) => updatePoints('winnerPrediction', val)}
              />
            )}
            <Switch
              value={scoringConfig.winnerPrediction.enabled}
              onValueChange={() => toggleConfig('winnerPrediction')}
              trackColor={{ false: '#1C2344', true: '#6C5CE7' }}
            />
          </View>
        </View>

        {/* 2. Resultado Exacto */}
        <View style={[styles.ruleRow, styles.borderRow]}>
          <View style={styles.ruleInfo}>
            <ThemedText type="smallBold">Acertar Score Exacto</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Puntos extras por acertar goles (Ej: 2-1)
            </ThemedText>
          </View>
          <View style={styles.ruleControls}>
            {scoringConfig.exactScore.enabled && (
              <TextInput
                style={styles.pointsInput}
                keyboardType="number-pad"
                value={String(scoringConfig.exactScore.points)}
                onChangeText={(val) => updatePoints('exactScore', val)}
              />
            )}
            <Switch
              value={scoringConfig.exactScore.enabled}
              onValueChange={() => toggleConfig('exactScore')}
              trackColor={{ false: '#1C2344', true: '#6C5CE7' }}
            />
          </View>
        </View>

        {/* 3. Campeón */}
        <View style={[styles.ruleRow, styles.borderRow]}>
          <View style={styles.ruleInfo}>
            <ThemedText type="smallBold">Acertar Campeón del Mundo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Se calcula al finalizar el torneo
            </ThemedText>
          </View>
          <View style={styles.ruleControls}>
            {scoringConfig.champion.enabled && (
              <TextInput
                style={styles.pointsInput}
                keyboardType="number-pad"
                value={String(scoringConfig.champion.points)}
                onChangeText={(val) => updatePoints('champion', val)}
              />
            )}
            <Switch
              value={scoringConfig.champion.enabled}
              onValueChange={() => toggleConfig('champion')}
              trackColor={{ false: '#1C2344', true: '#6C5CE7' }}
            />
          </View>
        </View>

        {/* 4. Privacidad */}
        <View style={[styles.ruleRow, styles.borderRow]}>
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
            trackColor={{ false: '#1C2344', true: '#6C5CE7' }}
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
    borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    color: '#FFFFFF',
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
    borderColor: 'rgba(42, 49, 84, 0.4)',
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
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Spacing.one,
    width: 45,
    height: 35,
    textAlign: 'center',
    color: '#FFFFFF',
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