// apps/mobile/src/components/app-tabs.web.tsx
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      {/* TabSlot renderiza la pantalla activa. Le damos paddingTop de 88px para no superponerse con el menú absoluto */}
      <TabSlot style={{ flex: 1, paddingTop: 88 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Inicio</TabButton>
          </TabTrigger>
          <TabTrigger name="fixture" href="/fixture" asChild>
            <TabButton>Fixture</TabButton>
          </TabTrigger>
          <TabTrigger name="groups" href="/groups" asChild>
            <TabButton>Grupos</TabButton>
          </TabTrigger>
          <TabTrigger name="inbox" href="/inbox" asChild>
            <TabButton>Bandeja</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
          {/* ─── PESTAÑAS INTERNAS OCULTAS ─── */}
          <TabTrigger name="group/create" href="/group/create" style={{ display: 'none' }} />
          <TabTrigger name="group/[id]" href="/group/[id]" style={{ display: 'none' }} />
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable style={({ pressed }) => pressed && styles.pressed} {...props}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'accentSecondary' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          ⚽ Prode con Amigos
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 10, // Mantenemos el menú por encima del contenido
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  brandText: {
    marginRight: 'auto',
    color: '#00D2FF', // Celeste premium
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    cursor: 'pointer',
  },
});