//Importaciones:
import React, { useCallback, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import { Avatar, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllUsers, getFinishedTournaments, getPlayerDeepStats, getRounds } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { useResponsive } from "../../utils/responsive";
import IconBarRows from "../../components/IconBarRows";
import { Skeleton, SkeletonRow } from "../../components/Skeleton";
import { CHART_PALETTE, RADIUS, SPACING } from "../../theme";

//JS:
const NEMESIS_COLOR = "#9B5DE5";
const NEMESIS_BG = "rgba(155,93,229,0.14)";

const VIEW_OPTIONS = [
  { value: "general", label: "Generales" },
  { value: "jugador", label: "Por jugador" },
];

export default function StatsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { maxContentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState("general");

  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [allRounds, setAllRounds] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlyMyTournaments, setOnlyMyTournaments] = useState(false);

  const [selectedUid, setSelectedUid] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);

  const loadGeneral = useCallback(async () => {
    setLoading(true);
    const finished = await getFinishedTournaments();
    setTournaments(finished);

    const roundsByTournament = await Promise.all(
      finished.map(async (t) => (await getRounds(t.id)).map((r) => ({ ...r, tournamentId: t.id })))
    );
    setAllRounds(roundsByTournament.flat().filter((r) => r.roundNumber > 0));

    setCharacters(await getAllCharacters());
    setUsers(await getAllUsers());
    setLoading(false);
  }, []);

  const loadPlayerStats = useCallback(async (uid) => {
    if (!uid) return;
    setLoadingPlayer(true);
    const data = await getPlayerDeepStats(uid);
    setPlayerStats(data);
    setLoadingPlayer(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGeneral();
      if (selectedUid) loadPlayerStats(selectedUid);
    }, [loadGeneral, loadPlayerStats])
  );

  function selectPlayer(uid) {
    setSelectedUid(uid);
    loadPlayerStats(uid);
  }

  const charById = (id) => characters.find((c) => c.fighterNumber === id);
  const userByUid = (uid) => users.find((u) => u.uid === uid);
  const myTournaments = tournaments.filter((t) => t.participants?.some((p) => p.uid === user.uid));
  const filteredTournaments = onlyMyTournaments ? myTournaments : tournaments;
  const filteredTournamentIds = new Set(filteredTournaments.map((t) => t.id));
  const filteredRounds = allRounds.filter((r) => filteredTournamentIds.has(r.tournamentId));

  const tournamentWinsByPlayer = {};
  filteredTournaments.forEach((t) => {
    const winner = t.participants?.find((p) => p.uid === t.winnerUid);
    if (winner) tournamentWinsByPlayer[winner.playerName] = (tournamentWinsByPlayer[winner.playerName] || 0) + 1;
  });

  const roundWinsByPlayer = {};
  filteredRounds.forEach((r) => {
    const t = tournaments.find((tt) => tt.id === r.tournamentId);
    const winner = t?.participants?.find((p) => p.uid === r.winnerUid);
    if (winner) roundWinsByPlayer[winner.playerName] = (roundWinsByPlayer[winner.playerName] || 0) + 1;
  });

  const winsByCharacterPlayer = {}; 
  filteredRounds.forEach((r) => {
    const charId = r.characters?.[r.winnerUid];
    if (!charId) return;
    const t = tournaments.find((tt) => tt.id === r.tournamentId);
    const winner = t?.participants?.find((p) => p.uid === r.winnerUid);
    const playerName = winner?.playerName || "?";
    const key = `${charId}|${playerName}`;
    winsByCharacterPlayer[key] = (winsByCharacterPlayer[key] || 0) + 1;
  });

  const pieData = Object.entries(tournamentWinsByPlayer).map(([name, count], i) => ({
    name,
    population: count,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
    legendFontColor: theme.colors.onSurfaceVariant,
    legendFontSize: 12,
  }));

  const roundWinsRows = Object.entries(roundWinsByPlayer)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ id: name, name, value: count }));
  const maxRoundWins = Math.max(...roundWinsRows.map((r) => r.value), 1);

  const characterRowsGlobal = Object.entries(winsByCharacterPlayer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [charId, playerName] = key.split("|");
      return { id: key, iconUrl: charById(charId)?.images?.iconImage, value: count, subLabel: playerName };
    });

  const chartWidth = Math.min(Dimensions.get("window").width - 32, maxContentWidth - 32);

  // ---- Por jugador ----
  const selectedUser = userByUid(selectedUid);
  const playerFinishedWins = tournaments.filter((t) => t.winnerUid === selectedUid).length;
  const playerCharEntries = playerStats
    ? Object.entries(playerStats.characterWins).sort((a, b) => b[1] - a[1])
    : [];
  const bestPlayerCharacter = playerCharEntries[0] ? charById(playerCharEntries[0][0]) : null;
  const playerCharacterRows = playerCharEntries.map(([charId, count]) => ({
    id: charId,
    iconUrl: charById(charId)?.images?.iconImage,
    value: count,
  }));
  const nemesisOpponent = playerStats?.nemesis ? userByUid(playerStats.nemesis.opponentUid) : null;
  const nemesisCharacter = playerStats?.nemesis ? charById(playerStats.nemesis.characterId) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l }}
    >
      <View style={{ width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }}>
        <View style={styles.headerRow}>
          <Image
            source={require("../../assets/logo.webp")}
            style={[styles.headerLogo, { tintColor: theme.colors.primary }]}
            resizeMode="contain"
          />
          <View style={{ marginLeft: SPACING.m }}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Estadísticas</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos y rendimiento</Text>
          </View>
        </View>

        <View style={[styles.toggle, { backgroundColor: theme.colors.surfaceVariant }]}>
          {VIEW_OPTIONS.map((opt) => {
            const active = view === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setView(opt.value)}
                style={[styles.toggleHalf, active && { backgroundColor: theme.colors.primary }]}
              >
                <Text style={{ fontWeight: "700", fontSize: 13, color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {view === "general" ? (
          loading ? (
            <View>
              <Skeleton height={78} radius={RADIUS.lg} style={{ marginBottom: SPACING.l }} />
              <Skeleton width="60%" height={16} style={{ marginBottom: SPACING.s }} />
              <Skeleton height={200} radius={RADIUS.lg} style={{ marginBottom: SPACING.xl }} />
              <Skeleton width="60%" height={16} style={{ marginBottom: SPACING.s }} />
              <SkeletonRow style={{ marginBottom: SPACING.s }} />
              <SkeletonRow style={{ marginBottom: SPACING.s }} />
            </View>
          ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.summaryValueRow}>
                  <MaterialCommunityIcons name="trophy" size={26} color={theme.custom.gold} style={{ marginRight: SPACING.s }} />
                  <Text variant="displaySmall" style={{ color: theme.colors.primary }}>{filteredTournaments.length}</Text>
                </View>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados</Text>
              </View>

              <View style={[styles.tournamentFilter, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Pressable
                  onPress={() => setOnlyMyTournaments(false)}
                  style={[styles.tournamentFilterOption, !onlyMyTournaments && { backgroundColor: theme.colors.primary }]}
                >
                  <MaterialCommunityIcons
                    name="earth"
                    size={16}
                    color={!onlyMyTournaments ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.tournamentFilterLabel,
                      { color: !onlyMyTournaments ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setOnlyMyTournaments(true)}
                  style={[styles.tournamentFilterOption, onlyMyTournaments && { backgroundColor: theme.colors.primary }]}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={16}
                    color={onlyMyTournaments ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.tournamentFilterLabel,
                      { color: onlyMyTournaments ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Míos
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -SPACING.s, marginBottom: SPACING.l }}>
              {onlyMyTournaments
                ? `Estadísticas de los ${myTournaments.length} torneos en los que jugaste`
                : `Estadísticas de los ${tournaments.length} torneos del grupo`}
            </Text>

            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginTop: 0 }]}>Torneos ganados por jugador</Text>
            {pieData.length > 0 ? (
              <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <PieChart
                  data={pieData}
                  width={chartWidth}
                  height={200}
                  chartConfig={{ color: () => theme.colors.primary }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="8"
                />
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>
                {onlyMyTournaments ? "Todavía no jugaste ningún torneo terminado." : "Todavía no hay torneos terminados."}
              </Text>
            )}

            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Combates ganados por jugador</Text>
            {roundWinsRows.length > 0 ? (
              <View style={{ marginBottom: SPACING.l }}>
                {roundWinsRows.map((row, index) => (
                  <View key={row.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.onSurfaceVariant }}>{index + 1}</Text>
                    </View>
                    <Text style={{ width: 84, color: theme.colors.onSurface }} numberOfLines={1}>{row.name}</Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[styles.barFill, { backgroundColor: theme.colors.primary, width: `${(row.value / maxRoundWins) * 100}%` }]} />
                    </View>
                    <Text style={{ width: 24, textAlign: "right", fontWeight: "700", color: theme.colors.onBackground }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>
                {onlyMyTournaments ? "Sin datos en los torneos en los que jugaste." : "Sin datos todavía."}
              </Text>
            )}

            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Combates ganados por personaje</Text>
            <IconBarRows
              data={characterRowsGlobal}
              emptyMessage={onlyMyTournaments ? "Sin datos en los torneos en los que jugaste." : undefined}
            />
          </>
          )
        ) : (
          <>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Elegí un jugador</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {users.map((u) => {
                const active = selectedUid === u.uid;
                return (
                  <Pressable key={u.uid} onPress={() => selectPlayer(u.uid)}>
                    <View
                      style={[
                        styles.playerChip,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                        active && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? theme.colors.primary : theme.colors.onSurface }}>
                        {u.playerName}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!selectedUid && (
              <View style={styles.emptyPlayerState}>
                <View style={[styles.emptyIconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="account-search-outline" size={30} color={theme.colors.primary} />
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.m }}>Elegí un jugador</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xs }}>
                  Tocá a alguien de la lista de arriba para ver sus estadísticas personales.
                </Text>
              </View>
            )}

            {selectedUid && (loadingPlayer ? (
              <View style={{ marginTop: SPACING.l }}>
                <Skeleton height={92} radius={RADIUS.lg} style={{ marginBottom: SPACING.l }} />
                <Skeleton width="60%" height={16} style={{ marginBottom: SPACING.s }} />
                <SkeletonRow style={{ marginBottom: SPACING.s }} />
                <SkeletonRow />
              </View>
            ) : (
              <>
                <View style={[styles.playerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <View style={styles.playerCardHeader}>
                    <Avatar.Image size={44} source={{ uri: selectedUser?.photoURL }} />
                    <Text variant="titleMedium" style={{ marginLeft: SPACING.m, color: theme.colors.onSurface }}>{selectedUser?.playerName}</Text>
                  </View>
                  <View style={[styles.playerCardDivider, { backgroundColor: theme.colors.outline }]} />
                  <View style={styles.playerStatsRow}>
                    <View style={styles.playerStatBlock}>
                      <Text variant="headlineSmall" style={{ color: theme.custom.gold }}>{playerFinishedWins}</Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos ganados</Text>
                    </View>
                    <View style={styles.playerStatBlock}>
                      {bestPlayerCharacter?.images?.iconImage && (
                        <Avatar.Image
                          size={22}
                          source={{ uri: bestPlayerCharacter.images.iconImage }}
                          style={{ backgroundColor: theme.colors.background, marginBottom: SPACING.xs }}
                        />
                      )}
                      <Text variant="labelSmall" numberOfLines={1} style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                        {bestPlayerCharacter?.name || "—"}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Mejor personaje</Text>
                    </View>
                  </View>
                </View>

                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Personajes y combates ganados</Text>
                <IconBarRows data={playerCharacterRows} emptyMessage="Todavía no ganó ningún combate." />

                {nemesisOpponent && nemesisCharacter && (
                  <View style={[styles.nemesisCard, { backgroundColor: NEMESIS_BG, borderColor: NEMESIS_COLOR }]}>
                    <View style={styles.nemesisHeader}>
                      <MaterialCommunityIcons name="emoticon-devil-outline" size={16} color={NEMESIS_COLOR} style={{ marginRight: SPACING.xs }} />
                      <Text variant="titleSmall" style={{ color: NEMESIS_COLOR, fontWeight: "800" }}>Némesis</Text>
                    </View>
                    <View style={styles.nemesisBody}>
                      {charById(playerStats.nemesis.characterId)?.images?.iconImage && (
                        <Avatar.Image
                          size={28}
                          source={{ uri: nemesisCharacter.images?.iconImage }}
                          style={{ backgroundColor: theme.colors.background }}
                        />
                      )}
                      <Text style={{ flex: 1, marginLeft: SPACING.s, color: theme.colors.onSurface }}>
                        {nemesisOpponent.playerName} con {nemesisCharacter.name}
                      </Text>
                      <View style={[styles.nemesisChip, { backgroundColor: theme.colors.surface }]}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: NEMESIS_COLOR }}>
                          {playerStats.nemesis.count} {playerStats.nemesis.count === 1 ? "derrota" : "derrotas"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  headerLogo: { width: 42, height: 42 },
  toggle: { flexDirection: "row", borderRadius: RADIUS.pill, padding: 4, marginBottom: SPACING.l },
  toggleHalf: { flex: 1, alignItems: "center", paddingVertical: SPACING.s, borderRadius: RADIUS.pill },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.l,
    marginBottom: SPACING.s,
  },
  summaryValueRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  tournamentFilter: {
    flexDirection: "row",
    borderRadius: RADIUS.pill,
    padding: 4,
  },
  tournamentFilterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.pill,
  },
  tournamentFilterLabel: { fontSize: 13, fontWeight: "700", marginLeft: 5 },
  chartCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.xl, alignItems: "center", paddingVertical: SPACING.s },
  sectionTitle: { marginTop: SPACING.s, marginBottom: SPACING.s },
  rankRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  rankBadge: {
    width: 22, height: 22, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginRight: SPACING.s,
  },
  barTrack: { flex: 1, height: 12, borderRadius: RADIUS.sm, overflow: "hidden", marginHorizontal: SPACING.s },
  barFill: { height: "100%", borderRadius: RADIUS.sm },
  chipsRow: { flexDirection: "row", paddingBottom: SPACING.xs },
  emptyPlayerState: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xxl,
  },
  emptyIconBadge: {
    width: 68, height: 68, borderRadius: RADIUS.xl,
    alignItems: "center", justifyContent: "center",
  },
  playerChip: {
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    borderRadius: RADIUS.pill, borderWidth: 1.5,
    marginRight: SPACING.s,
  },
  playerCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.l, marginTop: SPACING.l, marginBottom: SPACING.l },
  playerCardHeader: { flexDirection: "row", alignItems: "center" },
  playerCardDivider: { height: 1, marginVertical: SPACING.m },
  playerStatsRow: { flexDirection: "row" },
  playerStatBlock: { flex: 1, alignItems: "center" },
  nemesisCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.m, marginTop: SPACING.s },
  nemesisHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  nemesisBody: { flexDirection: "row", alignItems: "center" },
  nemesisChip: { paddingHorizontal: SPACING.s, paddingVertical: 4, borderRadius: RADIUS.pill },
});