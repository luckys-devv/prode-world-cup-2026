import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
// IMPORTANTE: Importamos Link aquí
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { api } from '../services/api';
import { Group } from '@prode/shared';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data.data);
    } catch (error: any) {
      console.error('Error al cargar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      showAlert('Error', 'Por favor ingresá un código de invitación.');
      return;
    }

    try {
      setJoining(true);
      const response = await api.post(`/groups/join/${joinCode.trim().toUpperCase()}`);
      showAlert('¡Éxito!', response.data.message || 'Te uniste al grupo con éxito.');
      setJoinCode('');
      fetchGroups();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Código de invitación inválido o ya estás en el grupo.';
      showAlert('Error al unirse', errorMsg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Mis Grupos 👥</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Competí con tus amigos pronosticando el Mundial.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.joinCard}>
        <ThemedText type="smallBold" style={styles.joinTitle}>Unirse con código</ThemedText>
        <View style={styles.joinInputRow}>
          <TextInput
            placeholder="Ej: ABCDEF"
            placeholderTextColor="#8892B0"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.joinButton, joining && styles.buttonDisabled]}
            onPress={handleJoinGroup}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText type="smallBold" style={styles.joinButtonText}>Unirse</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>

      <View style={styles.actionRow}>
        <ThemedText type="smallBold" themeColor="textSecondary">MIS SALAS</ThemedText>
        {/* CORRECCIÓN: Envolvemos el botón con Link */}
        <Link href="/group/create" asChild>
          <TouchableOpacity style={styles.createButton}>
            <ThemedText type="smallBold" style={styles.createButtonText}>+ Crear Grupo</ThemedText>
          </TouchableOpacity>
        </Link>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.accentPrimary} style={styles.loader} />
      ) : groups.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText style={styles.emptyText} themeColor="textSecondary">
            Todavía no pertenecés a ningún grupo.{'\n'}
            ¡Creá uno o unile usando un código!
          </ThemedText>
        </ThemedView>
      ) : (
        groups.map((group) => (
          <Link href={`/group/${group.id}`} key={group.id} asChild>
            <TouchableOpacity style={styles.groupCard}>
              <View style={styles.groupCardHeader}>
                <ThemedText type="smallBold" style={styles.groupName}>{group.name}</ThemedText>
                <View style={styles.membersBadge}>
                  <ThemedText type="code" style={styles.membersBadgeText}>
                    👤 {group.memberCount} miemb.
                  </ThemedText>
                </View>
              </View>
              {group.prizeDescription && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.prizeText}>
                  🏆 Premio: {group.prizeDescription}
                </ThemedText>
              )}
              <View style={styles.codeFooter}>
                <ThemedText type="code" themeColor="accentSecondary">
                  Código: {group.inviteCode}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </Link>
        ))
      )
      }
    </ScrollView >
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
  title: {
    fontWeight: 'bold',
  },
  joinCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  joinTitle: {
    marginBottom: Spacing.two,
  },
  joinInputRow: {
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
  joinButton: {
    backgroundColor: Colors.light.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    height: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  createButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 1,
    borderColor: Colors.light.accentPrimary,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    cursor: 'pointer',
  },
  createButtonText: {
    color: Colors.light.accentPrimary,
  },
  loader: {
    marginTop: Spacing.six,
  },
  emptyCard: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  groupCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.two,
    cursor: 'pointer',
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  membersBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  membersBadgeText: {
    color: '#00D2FF',
    fontSize: 11,
  },
  prizeText: {
    fontStyle: 'italic',
  },
  codeFooter: {
    borderTopWidth: 1,
    borderColor: 'rgba(42, 49, 84, 0.4)',
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
});