//Importaciones:
import React, { useCallback, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Avatar, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getFinishedTournaments } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { SkeletonRow } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//js:
const FRAME_GOLD = "rgba(242,184,75,0.65)";
const WINNER_CHIP_BG = "rgba(242,184,75,0.18)";

function timeAgo(timestamp) {
  if (!timestamp?.toMillis) return null;
  const ms = Date.now() - timestamp.toMillis();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

export default function HistoryScreen({ navigation }) {
  const theme = useTheme();
  const [history, setHistory] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
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
    Promise.all([getFinishedTournaments(), getAllCharacters()]).then(([data, chars]) => {
      setHistory(data);
      setCharacters(chars);
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

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: SPACING.l,
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
          <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>Historial</Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados</Text>
        </View>
      </View>

      {initialLoading ? (
        <View>
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.m }} />}
          ListEmptyComponent={<Text style={{ color: theme.colors.onSurfaceVariant }}>Todavía no se jugó ningún torneo.</Text>}
          renderItem={({ item }) => {
            const winner = item.participants?.find((p) => p.uid === item.winnerUid);
            const winnerCharacter = winner ? charById(winner.currentCharacterId) : null;
            const standings = (item.participants || []).slice().sort((a, b) => b.points - a.points);
            const when = timeAgo(item.finishedAt);

            return (
              <Pressable onPress={() => navigation.navigate("TournamentDetail", { tournamentId: item.id })}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <View style={styles.headerRow2}>
                    {winnerCharacter ? (
                      <View style={[styles.imageFrame, { borderColor: FRAME_GOLD, backgroundColor: theme.colors.surfaceVariant }]}>
                        <Image source={{ uri: winnerCharacter.images?.fullImage }} style={styles.image} resizeMode="contain" />
                      </View>
                    ) : (
                      <View style={[styles.imageFrame, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                        <MaterialCommunityIcons name="help" size={24} color={theme.colors.onSurfaceVariant} />
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: SPACING.m }}>
                      <View style={styles.winnerRow}>
                        <MaterialCommunityIcons name="trophy" size={16} color={theme.custom.gold} style={{ marginRight: SPACING.xs }} />
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
                      <MaterialCommunityIcons name="account-group" size={15} color={theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.primary, marginLeft: SPACING.xs }}>
                        {item.roster?.length} participantes
                      </Text>
                    </View>
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
                          <Avatar.Image size={20} source={{ uri: p.photoURL }} />
                          <Text style={{ marginLeft: 5, fontSize: 11, fontWeight: "700", color: isWinner ? theme.custom.gold : theme.colors.onSurfaceVariant }}>
                            {p.points}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  headerLogo: { width: 30, height: 30 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.m },
  headerRow2: { flexDirection: "row", alignItems: "center" },
  winnerRow: { flexDirection: "row", alignItems: "center" },
  imageFrame: {
    width: 64, height: 64, borderRadius: RADIUS.md, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  playersPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill, marginLeft: SPACING.s,
  },
  divider: { height: 1, marginVertical: SPACING.m },
  standingsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  standingChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.s, paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
});