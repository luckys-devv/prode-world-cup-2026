import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { api } from '../services/api';
import { useFocusEffect } from 'expo-router';
import { Invitation } from '@prode/shared';
import { useTheme } from '../hooks/use-theme';

export default function InboxScreen() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const colors = useTheme();

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/invitations/inbox');
      setInvitations(response.data.data);
    } catch (error: any) {
      console.error('Error al cargar invitaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [])
  );

  const handleInvitationAction = async (id: number, action: 'accept' | 'reject') => {
    try {
      setActionId(id);
      const endpoint = `/invitations/${id}/${action}`;
      await api.put(endpoint);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al procesar la invitación.';
      Alert.alert('Error', errorMsg);
    } finally {
      setActionId(null);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="subtitle" style={styles.title}>Bandeja de Entrada</ThemedText>
            <Ionicons name="mail-unread-outline" size={24} color={colors.accentSecondary} />
          </View>
          <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: 4 }}>
            Invitaciones que recibiste para unirte a grupos de prode.
          </ThemedText>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accentPrimary} style={styles.loader} />
        ) : invitations.length === 0 ? (
          <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: colors.border }]}>
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              No tenés invitaciones pendientes por el momento.
            </ThemedText>
          </ThemedView>
        ) : (
          invitations.map((inv) => (
            <ThemedView
              key={inv.id}
              type="backgroundElement"
              style={[styles.invitationCard, { borderColor: colors.border }]}
            >
              <View style={styles.cardInfo}>
                <ThemedText type="smallBold" style={[styles.groupName, { color: colors.text }]}>
                  {inv.groupName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Invitado por: <ThemedText type="smallBold" themeColor="accentSecondary">{inv.senderName}</ThemedText>
                </ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={styles.dateText}>
                  {new Date(inv.createdAt).toLocaleDateString('es-AR')}
                </ThemedText>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn, actionId === inv.id && styles.btnDisabled]}
                  onPress={() => handleInvitationAction(inv.id, 'accept')}
                  disabled={actionId !== null}
                >
                  {actionId === inv.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.btnText}>Aceptar</ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, actionId === inv.id && styles.btnDisabled]}
                  onPress={() => handleInvitationAction(inv.id, 'reject')}
                  disabled={actionId !== null}
                >
                  <ThemedText type="smallBold" style={styles.rejectBtnText}>Rechazar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          ))
        )}
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
  title: {
    fontWeight: 'bold',
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
  },
  emptyText: {
    textAlign: 'center',
  },
  invitationCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  cardInfo: {
    gap: Spacing.half,
  },
  groupName: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 11,
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.light.success,
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFFFFF',
  },
  rejectBtnText: {
    color: Colors.light.error,
  },
});