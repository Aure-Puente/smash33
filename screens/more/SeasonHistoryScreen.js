//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSeasonHistory } from "../../services/firestoreService";
import { SEASONS } from "../../utils/season";
import ScreenHeader from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
function getPositionVisual(index, total, theme) {
  const position = index + 1;
  const isLast = position === total;
  if (position === 1) return { icon: "crown", color: theme.custom.gold, label: "1er puesto" };
  if (position === 2) return { icon: "medal", color: "#C7CDD6", label: "2do puesto" };
  if (position === 3) return { icon: "medal", color: "#CD7F32", label: "3er puesto" };
  if (isLast && total > 3) return { icon: "emoticon-poop", color: theme.colors.onSurfaceVariant, label: `${position}° puesto` };
  if (position === 4) return { icon: "medal", color: "#8B5A2B", label: "4to puesto" };
  return { icon: null, color: theme.colors.primary, label: `${position}° puesto` };
}

function formatDate(value) {
  const d = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  if (!d) return "";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function SeasonCard({ season, theme }) {
  const [open, setOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const info = SEASONS[season.seasonKey] || SEASONS.spring;
  const champion = season.players?.[0];
  const topCharacter = season.topCharacters?.[0];
  const totalPlayers = season.players?.length || 0;

  function toggle() {
    const next = !open;
    setOpen(next);
    Animated.parallel([
      Animated.timing(heightAnim, { toValue: next ? contentHeight : 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(chevronAnim, { toValue: next ? 1 : 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: next ? 1 : 0, duration: next ? 280 : 160, delay: next ? 100 : 0, useNativeDriver: false }),
    ]).start();
  }

  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  const detailsContent = (
    <View style={styles.details}>
      <View style={[styles.detailsDivider, { backgroundColor: theme.colors.outline }]} />

      {/* --- Torneos jugados --- */}
      <View style={[styles.tournamentsStat, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name="controller-classic-outline" size={22} color={theme.colors.primary} />
        <Text style={{ marginLeft: SPACING.s, color: theme.colors.onSurface, fontWeight: "700", fontSize: 15 }}>
          {season.totalTournaments} {season.totalTournaments === 1 ? "torneo jugado" : "torneos jugados"} en total
        </Text>
      </View>

      {/* --- Tabla de posiciones: jugadores --- */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="podium-gold" size={17} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>
          <Text style={{ color: theme.colors.primary }}>Tabla de posiciones</Text>
          <Text style={{ color: theme.colors.onSurface }}> — Jugadores</Text>
        </Text>
      </View>
      {(season.players || []).map((p, index) => {
        const pos = getPositionVisual(index, totalPlayers, theme);
        return (
          <View key={p.uid} style={[styles.posRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.posIconWrap}>
              {pos.icon ? (
                <MaterialCommunityIcons name={pos.icon} size={22} color={pos.color} />
              ) : (
                <Text style={{ fontWeight: "800", color: pos.color, fontSize: 13 }}>{index + 1}°</Text>
              )}
            </View>
            <Avatar.Image size={34} source={{ uri: p.photoURL }} style={{ marginRight: SPACING.s }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{p.playerName}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }} numberOfLines={1}>{pos.label}</Text>
            </View>
          </View>
        );
      })}

      {/* --- Tabla de posiciones: personajes --- */}
      {season.topCharacters?.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: SPACING.l }]}>
            <MaterialCommunityIcons name="sword-cross" size={17} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              <Text style={{ color: theme.colors.primary }}>Tabla de posiciones</Text>
              <Text style={{ color: theme.colors.onSurface }}> — Personajes</Text>
            </Text>
          </View>
          {season.topCharacters.slice(0, 10).map((c, index) => {
            const pos = getPositionVisual(index, season.topCharacters.length, theme);
            return (
              <View key={c.charId} style={[styles.posRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.posIconWrap}>
                  {pos.icon ? (
                    <MaterialCommunityIcons name={pos.icon} size={22} color={pos.color} />
                  ) : (
                    <Text style={{ fontWeight: "800", color: pos.color, fontSize: 13 }}>{index + 1}°</Text>
                  )}
                </View>
                {c.characterIcon ? (
                  <Image source={{ uri: c.characterIcon }} style={styles.charIcon} />
                ) : (
                  <View style={[styles.charIcon, { backgroundColor: theme.colors.outline, alignItems: "center", justifyContent: "center" }]}>
                    <MaterialCommunityIcons name="sword-cross" size={16} color={theme.colors.onSurfaceVariant} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: SPACING.s }}>
                  <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{c.characterName}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{pos.label} · usado por {c.topPlayerName}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* --- Estadísticas individuales --- */}
      <View style={[styles.sectionHeader, { marginTop: SPACING.l }]}>
        <MaterialCommunityIcons name="chart-box-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Estadísticas individuales</Text>
      </View>
      {(season.players || []).map((p) => (
        <View key={p.uid} style={[styles.statRow, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Avatar.Image size={38} source={{ uri: p.photoURL }} style={{ marginRight: SPACING.s }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{p.playerName}</Text>
            <View style={styles.statLineRow}>
              <MaterialCommunityIcons name="trophy-outline" size={13} color={theme.colors.primary} />
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {p.won} {p.won === 1 ? "torneo ganado" : "torneos ganados"}
              </Text>
            </View>
            <View style={styles.statLineRow}>
              <MaterialCommunityIcons name="sword-cross" size={13} color={theme.colors.primary} />
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {p.roundsWon} {p.roundsWon === 1 ? "pelea ganada" : "peleas ganadas"}
              </Text>
            </View>
          </View>
          {p.bestCharacterName && (
            <View style={styles.statBestChar}>
              <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginBottom: 3 }}>Mejor personaje</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {p.bestCharacterIcon ? (
                  <Image source={{ uri: p.bestCharacterIcon }} style={styles.statCharIcon} />
                ) : (
                  <View style={[styles.statCharIcon, { backgroundColor: theme.colors.outline }]} />
                )}
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.onSurface, marginLeft: 5 }} numberOfLines={1}>
                  {p.bestCharacterName}
                </Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Pressable onPress={toggle}>
        <View style={styles.cardHeader}>
          <View style={[styles.seasonIconWrap, { backgroundColor: `${info.color}26` }]}>
            <MaterialCommunityIcons name={info.icon} size={22} color={info.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>{season.seasonLabel}</Text>
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
              {formatDate(season.start)} — {formatDate(season.end)}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <MaterialCommunityIcons name="chevron-down" size={26} color={theme.colors.primary} />
          </Animated.View>
        </View>

        <View style={styles.summaryRow}>
          {champion && (
            <View style={[styles.summaryBoxMain, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.primary }]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.primary }]}>GANADOR</Text>
              <Avatar.Image size={48} source={{ uri: champion.photoURL }} style={{ marginTop: SPACING.xs }} />
              <Text style={{ color: theme.colors.onSurface, fontWeight: "800", fontSize: 13, marginTop: SPACING.xs }} numberOfLines={1}>
                {champion.playerName}
              </Text>
            </View>
          )}

          {topCharacter && (
            <View style={[styles.summaryBoxMain, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.primary }]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.primary }]}>PERSONAJE TOP</Text>
              {topCharacter.characterIcon ? (
                <Image source={{ uri: topCharacter.characterIcon }} style={[styles.summaryCharIconMain, { marginTop: SPACING.xs }]} />
              ) : (
                <View style={[styles.summaryCharIconMain, { marginTop: SPACING.xs, backgroundColor: theme.colors.outline, alignItems: "center", justifyContent: "center" }]}>
                  <MaterialCommunityIcons name="sword-cross" size={22} color={theme.colors.primary} />
                </View>
              )}
              <Text style={{ color: theme.colors.onSurface, fontWeight: "800", fontSize: 13, marginTop: SPACING.xs }} numberOfLines={1}>
                {topCharacter.topPlayerName}
              </Text>
            </View>
          )}

          <View style={[styles.summaryBoxSmall, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.custom.gold }]}>
            <Text style={[styles.summaryLabel, { color: theme.custom.gold }]}>INSIGNIA</Text>
            {info.mascotAsset && (
              <Image source={info.mascotAsset} style={[styles.summaryInsigniaSmall, { marginTop: SPACING.xs }]} resizeMode="contain" />
            )}
          </View>
        </View>
      </Pressable>
      <View
        style={styles.measureHelper}
        pointerEvents="none"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - contentHeight) > 0.5) {
            setContentHeight(h);
            if (open) heightAnim.setValue(h);
          }
        }}
      >
        {detailsContent}
      </View>

      <Animated.View style={{ height: heightAnim, overflow: "hidden" }}>
        <Animated.View style={{ opacity: fadeAnim }}>{detailsContent}</Animated.View>
      </Animated.View>
    </View>
  );
}

export default function SeasonHistoryScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getSeasonHistory();
      setSeasons(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
    >
      <ScreenHeader title="Temporadas pasadas" subtitle="Historial del Ranking Smash 33" logo onBack={() => navigation.goBack()} />

      {loading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={190} radius={RADIUS.lg} style={{ marginBottom: SPACING.m }} />
          ))}
        </View>
      ) : seasons.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={40} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.m, textAlign: "center" }}>
            Todavía no terminó ninguna temporada
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs, textAlign: "center" }}>
            Cuando el administrador finalice la temporada actual, va a aparecer acá.
          </Text>
        </View>
      ) : (
        seasons.map((s) => <SeasonCard key={s.id} season={s} theme={theme} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.m, marginBottom: SPACING.m, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.m },
  seasonIconWrap: { width: 42, height: 42, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center" },

  summaryRow: { flexDirection: "row", gap: SPACING.s },
  summaryBoxMain: {
    flex: 1.25,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.xs,
  },
  summaryBoxSmall: {
    flex: 0.7,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.xs,
  },
  summaryLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  summaryCharIconMain: { width: 48, height: 48, borderRadius: RADIUS.md },
  summaryInsigniaSmall: { width: 30, height: 30 },

  measureHelper: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 },

  details: { marginTop: SPACING.s },
  detailsDivider: { height: 1, marginBottom: SPACING.m },

  tournamentsStat: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.md, padding: SPACING.m,
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  sectionTitle: { fontWeight: "800", fontSize: 13, marginLeft: SPACING.xs },

  posRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.md, padding: SPACING.s, marginBottom: SPACING.s,
  },
  posIconWrap: { width: 30, alignItems: "center", justifyContent: "center", marginRight: SPACING.xs },
  charIcon: { width: 34, height: 34, borderRadius: RADIUS.sm },

  statRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.md, padding: SPACING.m, marginBottom: SPACING.s,
  },
  statLineRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  statBestChar: { alignItems: "flex-end" },
  statCharIcon: { width: 22, height: 22, borderRadius: RADIUS.sm },

  emptyState: { alignItems: "center", paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
});