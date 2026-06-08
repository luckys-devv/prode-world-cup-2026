import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';

export default function GroupsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Mis Grupos 👥</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Unite o creá grupos para jugar con amigos.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.emptyCard}>
        <ThemedText style={styles.emptyText} themeColor="textSecondary">
          Todavía no pertenecés a ningún grupo.
        </ThemedText>
      </ThemedView>
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
  title: {
    fontWeight: 'bold',
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
  },
});