//Importaciones:
import React, { useCallback, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { deleteTournament, getAllUsers, getFinishedTournaments } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";

//js:
const ADMIN_EMAIL = "aurepuente25@gmail.com";
const FRAME_GOLD = "rgba(242,184,75,0.65)";
const WINNER_CHIP_BG = "rgba(242,184,75,0.18)";
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(date) {
  if (!date) return null;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function HistoryCardSkeleton({ theme }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <View style={styles.headerRow2}>
        <Skeleton width={scale(64)} height={scale(64)} radius={RADIUS.md} />
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Skeleton width="70%" height={scale(20)} style={{ marginBottom: SPACING.xs }} />
          <Skeleton width="45%" height={scale(12)} style={{ marginBottom: SPACING.xs }} />
          <Skeleton width="35%" height={scale(10)} />
        </View>
        <Skeleton width={scale(92)} height={scale(26)} radius={RADIUS.pill} />
      </View>
      <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
      <View style={styles.standingsRow}>
        <Skeleton width={scale(54)} height={scale(26)} radius={RADIUS.pill} />
        <Skeleton width={scale(54)} height={scale(26)} radius={RADIUS.pill} />
        <Skeleton width={scale(54)} height={scale(26)} radius={RADIUS.pill} />
        <Skeleton width={scale(54)} height={scale(26)} radius={RADIUS.pill} />
      </View>
    </View>
  );
}

function HistoryCard({ item, theme, charById, isAdmin, onPress, onDeletePress }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  const winner = item.participants?.find((p) => p.uid === item.winnerUid);
  const winnerCharacter = winner ? charById(winner.currentCharacterId) : null;
  const standings = (item.participants || []).slice().sort((a, b) => b.points - a.points);
  const when = formatDate(item.finishedAt?.toDate ? item.finishedAt.toDate() : null);

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, transform: [{ scale: pressScale }] }]}>
        <View style={styles.headerRow2}>
          {winnerCharacter ? (
            <View style={[styles.imageFrame, { borderColor: FRAME_GOLD, backgroundColor: theme.colors.surfaceVariant }]}>
              <Image source={{ uri: winnerCharacter.images?.fullImage }} style={styles.image} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.imageFrame, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="help" size={scale(24)} color={theme.colors.onSurfaceVariant} />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <View style={styles.winnerRow}>
              <MaterialCommunityIcons name="trophy" size={scale(16)} color={theme.custom.gold} style={{ marginRight: SPACING.xs }} />
              <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flexShrink: 1 }} numberOfLines={1}>
                {winner?.playerName || "—"}
              </Text>
            </View>
            {winnerCharacter && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>con {winnerCharacter.name}</Text>
            )}
            {when && (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, opacity: 0.7 }}>{when}</Text>
            )}
          </View>

          <View style={[styles.playersPill, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="account-group" size={scale(18)} color={theme.colors.primary} />
            <Text style={{ fontSize: scale(15), fontWeight: "700", color: theme.colors.primary, marginLeft: SPACING.xs }}>
              {item.roster?.length}
            </Text>
          </View>

          {isAdmin && (
            <Pressable onPress={onDeletePress} hitSlop={8} style={[styles.deleteBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={scale(15)} color={theme.colors.error} />
            </Pressable>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

        <View style={styles.standingsRow}>
          {standings.map((p) => {
            const isWinner = p.uid === item.winnerUid;
            return (
              <View
                key={p.uid}
                style={[
                  styles.standingChip,
                  { backgroundColor: theme.colors.surfaceVariant },
                  isWinner && { backgroundColor: WINNER_CHIP_BG },
                ]}
              >
                <Avatar.Image size={scale(20)} source={{ uri: p.photoURL }} />
                <Text style={{ marginLeft: 5, fontSize: scale(11), fontWeight: "700", color: isWinner ? theme.custom.gold : theme.colors.onSurfaceVariant }}>
                  {p.points}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function HistoryScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [history, setHistory] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [winnerFilter, setWinnerFilter] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [winnerPickerOpen, setWinnerPickerOpen] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(10)).current;
  const enterScale = useRef(new Animated.Value(0.985)).current;

  const runEnter = useCallback(() => {
    enterOpacity.setValue(0);
    enterY.setValue(10);
    enterScale.setValue(0.985);

    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterY, enterScale]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getFinishedTournaments(), getAllCharacters(), getAllUsers()]).then(([data, chars, users]) => {
      setHistory(data);
      setCharacters(chars);
      setAllUsers(users);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      runEnter();
      return undefined;
    }, [load, runEnter])
  );

  const charById = (id) => characters.find((c) => c.fighterNumber === id);
  const initialLoading = loading && history.length === 0;

  const filteredHistory = history.filter((item) => {
    if (winnerFilter && item.winnerUid !== winnerFilter) return false;
    if (dateFrom || dateTo) {
      const finishedDate = item.finishedAt?.toDate ? item.finishedAt.toDate() : null;
      if (!finishedDate) return false;
      if (dateFrom && finishedDate < startOfDay(dateFrom)) return false;
      if (dateTo && finishedDate > endOfDay(dateTo)) return false;
    }
    return true;
  });

  const hasActiveFilters = !!(winnerFilter || dateFrom || dateTo);

  function clearFilters() {
    setWinnerFilter(null);
    setDateFrom(null);
    setDateTo(null);
  }

  function handleDateChange(event, selected) {
    const target = activeDatePicker;
    if (Platform.OS === "android") setActiveDatePicker(null);
    if (event.type === "dismissed" || !selected) return;
    if (target === "from") setDateFrom(selected);
    else if (target === "to") setDateTo(selected);
  }

  const winnerFilterName = winnerFilter ? allUsers.find((u) => u.uid === winnerFilter)?.playerName : null;

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTournament(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: SPACING.l,
        paddingTop: insets.top + SPACING.l,
        opacity: enterOpacity,
        transform: [{ translateY: enterY }, { scale: enterScale }],
      }}
    >
      <View style={styles.headerRow}>
        <Image
          source={require("../../assets/logo.webp")}
          style={[styles.headerLogo, { tintColor: theme.colors.primary }]}
          resizeMode="contain"
        />
        <View style={{ marginLeft: SPACING.m }}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Historial</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setWinnerPickerOpen(true)}
          style={[
            styles.filterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            winnerFilter && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
          ]}
        >
          <MaterialCommunityIcons name="trophy-outline" size={scale(14)} color={winnerFilter ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          <Text
            numberOfLines={1}
            style={[styles.filterPillText, { color: winnerFilter ? theme.colors.primary : theme.colors.onSurfaceVariant }]}
          >
            {winnerFilterName || "Ganador"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveDatePicker("from")}
          style={[
            styles.filterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            dateFrom && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
          ]}
        >
          <MaterialCommunityIcons name="calendar-start" size={scale(14)} color={dateFrom ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          <Text style={[styles.filterPillText, { color: dateFrom ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
            {dateFrom ? `${dateFrom.getDate()}/${dateFrom.getMonth() + 1}` : "Desde"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveDatePicker("to")}
          style={[
            styles.filterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            dateTo && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
          ]}
        >
          <MaterialCommunityIcons name="calendar-end" size={scale(14)} color={dateTo ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          <Text style={[styles.filterPillText, { color: dateTo ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
            {dateTo ? `${dateTo.getDate()}/${dateTo.getMonth() + 1}` : "Hasta"}
          </Text>
        </Pressable>

        {hasActiveFilters && (
          <Pressable onPress={clearFilters} style={styles.clearFilterBtn}>
            <MaterialCommunityIcons name="close-circle" size={scale(22)} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
      </View>

      {initialLoading ? (
        <View>
          <HistoryCardSkeleton theme={theme} />
          <View style={{ height: SPACING.m }} />
          <HistoryCardSkeleton theme={theme} />
          <View style={{ height: SPACING.m }} />
          <HistoryCardSkeleton theme={theme} />
          <View style={{ height: SPACING.m }} />
          <HistoryCardSkeleton theme={theme} />
          <View style={{ height: SPACING.m }} />
          <HistoryCardSkeleton theme={theme} />
          <View style={{ height: SPACING.m }} />
          <HistoryCardSkeleton theme={theme} />
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.m }} />}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {hasActiveFilters ? "Ningún torneo coincide con estos filtros." : "Todavía no se jugó ningún torneo."}
            </Text>
          }
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              theme={theme}
              charById={charById}
              isAdmin={isAdmin}
              onPress={() => navigation.navigate("TournamentDetail", { tournamentId: item.id })}
              onDeletePress={() => setDeleteTarget(item)}
            />
          )}
        />
      )}

      <Portal>
        <Modal
          visible={winnerPickerOpen}
          onDismiss={() => setWinnerPickerOpen(false)}
          contentContainerStyle={[styles.winnerModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.colors.outline }]} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: SPACING.s, paddingHorizontal: SPACING.m }}>
            Filtrar por ganador
          </Text>
          <FlatList
            data={[{ uid: null, playerName: "Todos" }, ...allUsers]}
            keyExtractor={(item) => item.uid || "all"}
            contentContainerStyle={{ paddingBottom: SPACING.m }}
            renderItem={({ item }) => {
              const selected = winnerFilter === item.uid;
              return (
                <Pressable onPress={() => { setWinnerFilter(item.uid); setWinnerPickerOpen(false); }}>
                  <View style={[styles.winnerOption, selected && { backgroundColor: theme.colors.primaryContainer }]}>
                    {item.uid ? (
                      <Avatar.Image size={scale(30)} source={{ uri: item.photoURL }} />
                    ) : (
                      <View style={[styles.allUsersIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <MaterialCommunityIcons name="account-group" size={scale(17)} color={theme.colors.onSurfaceVariant} />
                      </View>
                    )}
                    <Text
                      style={{
                        marginLeft: SPACING.m,
                        color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontWeight: selected ? "700" : "400",
                      }}
                    >
                      {item.playerName}
                    </Text>
                    {selected && (
                      <MaterialCommunityIcons name="check" size={scale(18)} color={theme.colors.onPrimaryContainer} style={{ marginLeft: "auto" }} />
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        </Modal>
      </Portal>

      {activeDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={(activeDatePicker === "from" ? dateFrom : dateTo) || new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {activeDatePicker && Platform.OS !== "android" && (
        <Portal>
          <Modal
            visible
            onDismiss={() => setActiveDatePicker(null)}
            contentContainerStyle={[styles.dateModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: SPACING.s }}>
              {activeDatePicker === "from" ? "Desde" : "Hasta"}
            </Text>
            <DateTimePicker
              value={(activeDatePicker === "from" ? dateFrom : dateTo) || new Date()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
            <Button mode="contained" style={{ borderRadius: RADIUS.pill, marginTop: SPACING.m }} onPress={() => setActiveDatePicker(null)}>
              Listo
            </Button>
          </Modal>
        </Portal>
      )}
      <Portal>
        <Modal
          visible={!!deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
          contentContainerStyle={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={[styles.confirmIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="trash-can-outline" size={scale(26)} color={theme.colors.onErrorContainer} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.onSurface }}>
            Eliminar torneo
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Se va a borrar este torneo del historial de todos junto con sus rondas y comentarios. Esta acción no se puede deshacer.
          </Text>
          <View style={styles.confirmActions}>
            <Button mode="outlined" style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }} onPress={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              loading={deleting}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </View>
        </Modal>
      </Portal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  headerLogo: { width: scale(42), height: scale(42) },
  filterRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACING.s, marginBottom: SPACING.l },
  filterPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill, borderWidth: 1,
    maxWidth: scale(150),
  },
  filterPillText: { fontSize: scale(12), fontWeight: "700", marginLeft: SPACING.xs },
  clearFilterBtn: { padding: 2 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.m },
  headerRow2: { flexDirection: "row", alignItems: "center" },
  winnerRow: { flexDirection: "row", alignItems: "center" },
  imageFrame: {
    width: scale(64), height: scale(64), borderRadius: RADIUS.md, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  playersPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    borderRadius: RADIUS.pill, marginLeft: SPACING.s,
  },
  divider: { height: 1, marginVertical: SPACING.m },
  standingsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  standingChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.s, paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  deleteBadge: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.s,
  },
  winnerModal: {
    marginHorizontal: SPACING.l,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    maxHeight: "70%",
    paddingTop: SPACING.s,
  },
  handle: { alignItems: "center", marginBottom: SPACING.s },
  handleBar: { width: scale(40), height: scale(4), borderRadius: RADIUS.pill },
  winnerOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  allUsersIcon: { width: scale(30), height: scale(30), borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  dateModal: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.l,
    alignItems: "center",
  },
  confirmCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.m,
  },
  confirmActions: { flexDirection: "row", width: "100%" },
});