//Importaciones:
import React, { useCallback, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllUsers, getFinishedTournaments, getPlayerDeepStats, getRounds } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { useResponsive, scale } from "../../utils/responsive";
import IconBarRows from "../../components/IconBarRows";
import AnimatedBar from "../../components/AnimatedBar";
import AnimatedDonutChart from "../../components/AnimatedDonutChart";
import { Skeleton } from "../../components/Skeleton";
import { CHART_PALETTE, RADIUS, SPACING } from "../../theme";

//JS:
const NEMESIS_COLOR = "#9B5DE5";
const NEMESIS_BG = "rgba(155,93,229,0.14)";

const VIEW_OPTIONS = [
  { value: "general", label: "Generales" },
  { value: "jugador", label: "Por jugador" },
];

function joinNames(names) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

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

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedFilterUids, setSelectedFilterUids] = useState([]);
  const [activeFilterUids, setActiveFilterUids] = useState(null);

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

  const matchedTournaments =
    activeFilterUids && activeFilterUids.length > 0
      ? tournaments.filter((t) => {
          const rosterUids = t.participantUids || [];
          if (rosterUids.length !== activeFilterUids.length) return false;
          return activeFilterUids.every((uid) => rosterUids.includes(uid));
        })
      : [];
  const matchedTournamentIds = new Set(matchedTournaments.map((t) => t.id));
  const matchedRounds = allRounds.filter((r) => matchedTournamentIds.has(r.tournamentId));

  function computeAggregates(tourneyList, roundsList) {
    const tournamentWinsByPlayer = {};
    tourneyList.forEach((t) => {
      const winner = t.participants?.find((p) => p.uid === t.winnerUid);
      if (winner) tournamentWinsByPlayer[winner.playerName] = (tournamentWinsByPlayer[winner.playerName] || 0) + 1;
    });

    const roundWinsByPlayer = {};
    roundsList.forEach((r) => {
      const t = tournaments.find((tt) => tt.id === r.tournamentId);
      const winner = t?.participants?.find((p) => p.uid === r.winnerUid);
      if (winner) roundWinsByPlayer[winner.playerName] = (roundWinsByPlayer[winner.playerName] || 0) + 1;
    });

    const winsByCharacterPlayer = {};
    roundsList.forEach((r) => {
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
    const pieSignature = pieData.map((p) => `${p.name}:${p.population}`).join("|");
    const donutData = pieData.map((p) => ({ label: p.name, value: p.population, color: p.color }));
    const totalPieWins = pieData.reduce((sum, p) => sum + p.population, 0);

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

    return { pieData, pieSignature, donutData, totalPieWins, roundWinsRows, maxRoundWins, characterRowsGlobal };
  }

  const generalStats = computeAggregates(filteredTournaments, filteredRounds);
  const matchedStats = computeAggregates(matchedTournaments, matchedRounds);

  const chartWidth = Math.min(Dimensions.get("window").width - 32, maxContentWidth - 32);
  const donutSize = Math.min(scale(180), chartWidth);

  function toggleFilterUid(uid) {
    setSelectedFilterUids((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }

  function openFilterModal() {
    setSelectedFilterUids(activeFilterUids || []);
    setFilterModalOpen(true);
  }

  function applyFilter() {
    setActiveFilterUids(selectedFilterUids);
    setView("filtradas");
    setFilterModalOpen(false);
  }

  function clearFilter() {
    setActiveFilterUids(null);
    setSelectedFilterUids([]);
    setView("general");
  }

  const filteredNames = (activeFilterUids || [])
    .map((uid) => userByUid(uid)?.playerName)
    .filter(Boolean);

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
          <Pressable
            onPress={() => setView("general")}
            style={[styles.toggleThird, view === "general" && { backgroundColor: theme.colors.primary }]}
          >
            <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: scale(12), color: view === "general" ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
              Generales
            </Text>
          </Pressable>
          <Pressable
            onPress={activeFilterUids ? clearFilter : openFilterModal}
            style={[styles.toggleThird, view === "filtradas" && { backgroundColor: theme.colors.primary }]}
          >
            <Text
              numberOfLines={1}
              style={{ fontWeight: "700", fontSize: scale(12), color: view === "filtradas" ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
            >
              {activeFilterUids ? "Quitar filtro" : "Filtradas"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setView("jugador")}
            style={[styles.toggleThird, view === "jugador" && { backgroundColor: theme.colors.primary }]}
          >
            <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: scale(12), color: view === "jugador" ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
              Por jugador
            </Text>
          </Pressable>
        </View>

        {view === "general" ? (
          loading ? (
            <View>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={{ flex: 1 }}>
                  <Skeleton width={scale(64)} height={scale(30)} style={{ marginBottom: SPACING.xs }} />
                  <Skeleton width={scale(110)} height={scale(12)} />
                </View>
                <Skeleton width={scale(120)} height={scale(34)} radius={RADIUS.pill} />
              </View>
              <Skeleton width="70%" height={scale(12)} style={{ marginTop: SPACING.s, marginBottom: SPACING.l }} />

              <Skeleton width={scale(170)} height={scale(14)} style={{ marginBottom: SPACING.s }} />
              <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Skeleton width={scale(180)} height={scale(180)} radius={scale(90)} />
              </View>

              <Skeleton width={scale(190)} height={scale(14)} style={{ marginBottom: SPACING.s }} />
              <View style={{ marginBottom: SPACING.l }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.rankRow}>
                    <Skeleton width={scale(22)} height={scale(22)} radius={RADIUS.pill} />
                    <Skeleton width={scale(70)} height={scale(12)} style={{ marginLeft: SPACING.s, marginRight: SPACING.s }} />
                    <Skeleton height={scale(12)} radius={RADIUS.sm} style={{ flex: 1 }} />
                    <Skeleton width={scale(20)} height={scale(12)} style={{ marginLeft: SPACING.s }} />
                  </View>
                ))}
              </View>

              <Skeleton width={scale(200)} height={scale(14)} style={{ marginBottom: SPACING.s }} />
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.s }}>
                  <Skeleton width={scale(32)} height={scale(32)} radius={RADIUS.sm} style={{ marginRight: SPACING.m }} />
                  <Skeleton height={scale(14)} radius={RADIUS.sm} style={{ flex: 1, marginRight: SPACING.s }} />
                  <Skeleton width={scale(24)} height={scale(12)} />
                </View>
              ))}
            </View>
          ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.summaryValueRow}>
                  <MaterialCommunityIcons name="trophy" size={scale(26)} color={theme.custom.gold} style={{ marginRight: SPACING.s }} />
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
                    size={scale(16)}
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
                    size={scale(16)}
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
            {generalStats.pieData.length > 0 ? (
              <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <AnimatedDonutChart
                  data={generalStats.donutData}
                  size={donutSize}
                  strokeWidth={scale(26)}
                  animKey={`general-${onlyMyTournaments}-${generalStats.pieSignature}`}
                  centerValue={generalStats.totalPieWins}
                  centerLabel={generalStats.totalPieWins === 1 ? "torneo" : "torneos"}
                />
                <View style={styles.legendWrap}>
                  {generalStats.pieData.map((p) => (
                    <View key={p.name} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                      <Text style={{ fontSize: scale(12), color: theme.colors.onSurfaceVariant }}>{p.name} ({p.population})</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>
                {onlyMyTournaments ? "Todavía no jugaste ningún torneo terminado." : "Todavía no hay torneos terminados."}
              </Text>
            )}

            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Combates ganados por jugador</Text>
            {generalStats.roundWinsRows.length > 0 ? (
              <View style={{ marginBottom: SPACING.l }}>
                {generalStats.roundWinsRows.map((row, index) => (
                  <View key={row.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text style={{ fontSize: scale(11), fontWeight: "700", color: theme.colors.onSurfaceVariant }}>{index + 1}</Text>
                    </View>
                    <Text style={{ width: scale(84), color: theme.colors.onSurface }} numberOfLines={1}>{row.name}</Text>
                    <AnimatedBar
                      value={row.value}
                      max={generalStats.maxRoundWins}
                      resetKey={`general-${onlyMyTournaments}`}
                      style={styles.barTrack}
                    />
                    <Text style={{ width: scale(24), textAlign: "right", fontWeight: "700", color: theme.colors.onBackground }}>{row.value}</Text>
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
              data={generalStats.characterRowsGlobal}
              emptyMessage={onlyMyTournaments ? "Sin datos en los torneos en los que jugaste." : undefined}
              resetKey={`general-${onlyMyTournaments}`}
            />
          </>
          )
        ) : view === "filtradas" ? (
          loading ? (
            <View>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={{ flex: 1 }}>
                  <Skeleton width={scale(64)} height={scale(30)} style={{ marginBottom: SPACING.xs }} />
                  <Skeleton width={scale(110)} height={scale(12)} />
                </View>
              </View>
              <Skeleton width="70%" height={scale(12)} style={{ marginTop: SPACING.s, marginBottom: SPACING.l }} />
              <Skeleton width={scale(170)} height={scale(14)} style={{ marginBottom: SPACING.s }} />
              <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Skeleton width={scale(180)} height={scale(180)} radius={scale(90)} />
              </View>
            </View>
          ) : matchedTournaments.length === 0 ? (
            <View style={styles.emptyPlayerState}>
              <View style={[styles.emptyIconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="account-multiple-remove-outline" size={scale(30)} color={theme.colors.primary} />
              </View>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.m }}>Sin coincidencias</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xs }}>
                {filteredNames.length > 0
                  ? `${joinNames(filteredNames)} nunca compitieron juntos en el mismo torneo.`
                  : "Elegí al menos un jugador para comparar."}
              </Text>
              <Button mode="outlined" style={{ borderRadius: RADIUS.pill, marginTop: SPACING.l }} onPress={openFilterModal}>
                Cambiar selección
              </Button>
            </View>
          ) : (
            <>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.summaryValueRow}>
                    <MaterialCommunityIcons name="trophy" size={scale(26)} color={theme.custom.gold} style={{ marginRight: SPACING.s }} />
                    <Text variant="displaySmall" style={{ color: theme.colors.primary }}>{matchedTournaments.length}</Text>
                  </View>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados juntos</Text>
                </View>
                <Pressable onPress={openFilterModal} style={[styles.editFilterBtn, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="pencil-outline" size={scale(16)} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -SPACING.s, marginBottom: SPACING.l }}>
                Comparando a {joinNames(filteredNames)}
              </Text>

              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground, marginTop: 0 }]}>Torneos ganados por jugador</Text>
              {matchedStats.pieData.length > 0 ? (
                <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <AnimatedDonutChart
                    data={matchedStats.donutData}
                    size={donutSize}
                    strokeWidth={scale(26)}
                    animKey={`filtradas-${(activeFilterUids || []).join(",")}-${matchedStats.pieSignature}`}
                    centerValue={matchedStats.totalPieWins}
                    centerLabel={matchedStats.totalPieWins === 1 ? "torneo" : "torneos"}
                  />
                  <View style={styles.legendWrap}>
                    {matchedStats.pieData.map((p) => (
                      <View key={p.name} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                        <Text style={{ fontSize: scale(12), color: theme.colors.onSurfaceVariant }}>{p.name} ({p.population})</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>Sin datos todavía.</Text>
              )}

              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Combates ganados por jugador</Text>
              {matchedStats.roundWinsRows.length > 0 ? (
                <View style={{ marginBottom: SPACING.l }}>
                  {matchedStats.roundWinsRows.map((row, index) => (
                    <View key={row.id} style={styles.rankRow}>
                      <View style={[styles.rankBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Text style={{ fontSize: scale(11), fontWeight: "700", color: theme.colors.onSurfaceVariant }}>{index + 1}</Text>
                      </View>
                      <Text style={{ width: scale(84), color: theme.colors.onSurface }} numberOfLines={1}>{row.name}</Text>
                      <AnimatedBar
                        value={row.value}
                        max={matchedStats.maxRoundWins}
                        resetKey={`filtradas-${(activeFilterUids || []).join(",")}`}
                        style={styles.barTrack}
                      />
                      <Text style={{ width: scale(24), textAlign: "right", fontWeight: "700", color: theme.colors.onBackground }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>Sin datos todavía.</Text>
              )}

              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Combates ganados por personaje</Text>
              <IconBarRows
                data={matchedStats.characterRowsGlobal}
                resetKey={`filtradas-${(activeFilterUids || []).join(",")}`}
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
                      <Text style={{ fontSize: scale(13), fontWeight: "700", color: active ? theme.colors.primary : theme.colors.onSurface }}>
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
                  <MaterialCommunityIcons name="account-search-outline" size={scale(30)} color={theme.colors.primary} />
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.m }}>Elegí un jugador</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xs }}>
                  Tocá a alguien de la lista de arriba para ver sus estadísticas personales.
                </Text>
              </View>
            )}

            {selectedUid && (loadingPlayer ? (
              <View style={{ marginTop: SPACING.l }}>
                <View style={[styles.playerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <View style={styles.playerCardHeader}>
                    <Skeleton width={scale(44)} height={scale(44)} radius={RADIUS.pill} />
                    <Skeleton width={scale(120)} height={scale(16)} style={{ marginLeft: SPACING.m }} />
                  </View>
                  <View style={[styles.playerCardDivider, { backgroundColor: theme.colors.outline }]} />
                  <View style={styles.playerStatsRow}>
                    <View style={styles.playerStatBlock}>
                      <Skeleton width={scale(36)} height={scale(22)} style={{ marginBottom: SPACING.xs }} />
                      <Skeleton width={scale(80)} height={scale(10)} />
                    </View>
                    <View style={styles.playerStatBlock}>
                      <Skeleton width={scale(22)} height={scale(22)} radius={RADIUS.pill} style={{ marginBottom: SPACING.xs }} />
                      <Skeleton width={scale(70)} height={scale(10)} />
                    </View>
                  </View>
                </View>

                <Skeleton width={scale(210)} height={scale(14)} style={{ marginTop: SPACING.l, marginBottom: SPACING.s }} />
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.s }}>
                    <Skeleton width={scale(32)} height={scale(32)} radius={RADIUS.sm} style={{ marginRight: SPACING.m }} />
                    <Skeleton height={scale(14)} radius={RADIUS.sm} style={{ flex: 1, marginRight: SPACING.s }} />
                    <Skeleton width={scale(24)} height={scale(12)} />
                  </View>
                ))}
              </View>
            ) : (
              <>
                <View style={[styles.playerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <View style={styles.playerCardHeader}>
                    <Avatar.Image size={scale(44)} source={{ uri: selectedUser?.photoURL }} />
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
                          size={scale(22)}
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
                <IconBarRows data={playerCharacterRows} emptyMessage="Todavía no ganó ningún combate." resetKey={selectedUid} />

                {nemesisOpponent && nemesisCharacter && (
                  <View style={[styles.nemesisCard, { backgroundColor: NEMESIS_BG, borderColor: NEMESIS_COLOR }]}>
                    <View style={styles.nemesisHeader}>
                      <MaterialCommunityIcons name="emoticon-devil-outline" size={scale(16)} color={NEMESIS_COLOR} style={{ marginRight: SPACING.xs }} />
                      <Text variant="titleSmall" style={{ color: NEMESIS_COLOR, fontWeight: "800" }}>Némesis</Text>
                    </View>
                    <View style={styles.nemesisBody}>
                      {charById(playerStats.nemesis.characterId)?.images?.iconImage && (
                        <Avatar.Image
                          size={scale(28)}
                          source={{ uri: nemesisCharacter.images?.iconImage }}
                          style={{ backgroundColor: theme.colors.background }}
                        />
                      )}
                      <Text style={{ flex: 1, marginLeft: SPACING.s, color: theme.colors.onSurface }}>
                        {nemesisOpponent.playerName} con {nemesisCharacter.name}
                      </Text>
                      <View style={[styles.nemesisChip, { backgroundColor: theme.colors.surface }]}>
                        <Text style={{ fontSize: scale(11), fontWeight: "700", color: NEMESIS_COLOR }}>
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

      <Portal>
        <Modal
          visible={filterModalOpen}
          onDismiss={() => setFilterModalOpen(false)}
          contentContainerStyle={[styles.filterModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.colors.outline }]} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: SPACING.xs, paddingHorizontal: SPACING.m }}>
            Elegí con quién comparar
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.s, paddingHorizontal: SPACING.m }}>
            Se muestran solo los torneos donde jugaron todos los que elijas, juntos.
          </Text>
          <FlatList
            data={users}
            keyExtractor={(u) => u.uid}
            contentContainerStyle={{ paddingBottom: SPACING.s }}
            renderItem={({ item }) => {
              const checked = selectedFilterUids.includes(item.uid);
              return (
                <Pressable onPress={() => toggleFilterUid(item.uid)}>
                  <View style={[styles.filterOption, checked && { backgroundColor: theme.colors.primaryContainer }]}>
                    <Avatar.Image size={scale(30)} source={{ uri: item.photoURL }} />
                    <Text
                      style={{
                        marginLeft: SPACING.m,
                        flex: 1,
                        color: checked ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontWeight: checked ? "700" : "400",
                      }}
                    >
                      {item.playerName}
                    </Text>
                    <MaterialCommunityIcons
                      name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={scale(20)}
                      color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </View>
                </Pressable>
              );
            }}
          />
          <Button
            mode="contained"
            disabled={selectedFilterUids.length === 0}
            style={{ borderRadius: RADIUS.pill, marginHorizontal: SPACING.m, marginTop: SPACING.s, marginBottom: SPACING.l }}
            contentStyle={{ paddingVertical: SPACING.xs }}
            onPress={applyFilter}
          >
            {selectedFilterUids.length > 0 ? `Aplicar filtro (${selectedFilterUids.length})` : "Elegí al menos uno"}
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  headerLogo: { width: scale(42), height: scale(42) },
  toggle: { flexDirection: "row", borderRadius: RADIUS.pill, padding: scale(4), marginBottom: SPACING.l },
  toggleThird: { flex: 1, alignItems: "center", paddingVertical: SPACING.s, borderRadius: RADIUS.pill },
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
    padding: scale(4),
  },
  tournamentFilterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.pill,
  },
  tournamentFilterLabel: { fontSize: scale(13), fontWeight: "700", marginLeft: 5 },
  editFilterBtn: {
    width: scale(34), height: scale(34), borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center",
  },
  chartCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.xl, alignItems: "center", paddingVertical: SPACING.l },
  legendWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: SPACING.m, paddingHorizontal: SPACING.m },
  legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.s, marginBottom: SPACING.xs },
  legendDot: { width: scale(10), height: scale(10), borderRadius: scale(5), marginRight: 6 },
  sectionTitle: { marginTop: SPACING.s, marginBottom: SPACING.s },
  rankRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  rankBadge: {
    width: scale(22), height: scale(22), borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginRight: SPACING.s,
  },
  barTrack: { flex: 1, height: scale(12), borderRadius: RADIUS.sm, marginHorizontal: SPACING.s },
  chipsRow: { flexDirection: "row", paddingBottom: SPACING.xs },
  emptyPlayerState: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xxl,
  },
  emptyIconBadge: {
    width: scale(68), height: scale(68), borderRadius: RADIUS.xl,
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
  filterModal: {
    marginHorizontal: SPACING.l,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    maxHeight: "75%",
    paddingTop: SPACING.s,
  },
  handle: { alignItems: "center", marginBottom: SPACING.s },
  handleBar: { width: scale(40), height: scale(4), borderRadius: RADIUS.pill },
  filterOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
});