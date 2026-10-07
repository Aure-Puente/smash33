//Importaciones:
import React, { useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import { getSeasonInfo, SEASONS } from "../../utils/season";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";

//JS:
function AdminCard({ theme, icon, title, description, tag, highlight, onPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  const bg = highlight ? theme.colors.primaryContainer : theme.colors.surface;
  const border = highlight ? theme.colors.primary : theme.colors.outline;
  const textColor = highlight ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
  const subColor = highlight ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: bg, borderColor: border, borderWidth: highlight ? 2 : 1, transform: [{ scale: pressScale }] },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: highlight ? theme.colors.surface : theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={icon} size={scale(28)} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <View style={styles.titleRow}>
            <Text variant="titleMedium" style={{ color: textColor, fontWeight: "800" }}>
              {title}
            </Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.tagText, { color: theme.colors.onSurfaceVariant }]}>{tag}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: subColor, opacity: 0.85, fontSize: scale(12), marginTop: 2 }}>{description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={scale(24)} color={subColor} />
      </Animated.View>
    </Pressable>
  );
}

export default function AdminPanelScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const season = SEASONS[getSeasonInfo().key];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
    >
      <ScreenHeader title="Panel de Admin" subtitle="Solo vos ves esto" logo onBack={() => navigation.goBack()} />

      <AdminCard
        theme={theme}
        highlight
        icon={season?.icon || "trophy"}
        title="Ranking 33"
        description="Jugadores del ranking y cierre de temporada"
        onPress={() => navigation.navigate("AdminRanking")}
      />

      <AdminCard
        theme={theme}
        icon="medal-outline"
        title="Insignias"
        tag="PRONTO"
        description="Asignar medallas e insignias a mano"
        onPress={() => navigation.navigate("AdminBadges")}
      />

      <AdminCard
        theme={theme}
        icon="microphone-message"
        title="Alias de voz"
        description="Sobrenombres de jugadores y personajes para el control por voz"
        onPress={() => navigation.navigate("AdminVoiceAliases")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    marginBottom: SPACING.m,
  },
  iconWrap: {
    width: scale(54),
    height: scale(54),
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  tag: {
    marginLeft: SPACING.s,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.s,
    paddingVertical: 2,
  },
  tagText: { fontSize: scale(9), fontWeight: "800", letterSpacing: 0.8 },
});