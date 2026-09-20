//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllCharacters } from "../../services/charactersService";
import { getAllUsers, getFinishedTournaments as getAllFinished, getLastFinishedTournament, getMyCharacterWinCounts, getRounds, listenActiveTournament, listenMyCharacters, listenRankingSettings } from "../../services/firestoreService";
import { useResponsive } from "../../utils/responsive";
import { computeRankingData } from "../../utils/rankingCalc";
import { getSeasonInfo, SEASONS } from "../../utils/season";
import { RADIUS, SPACING } from "../../theme";

//js:
export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { profile, user } = useAuth();
  const { maxContentWidth } = useResponsive();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [characters, setCharacters] = useState([]);
  const [lastTournament, setLastTournament] = useState(null);
  const [characterWins, setCharacterWins] = useState({});
  const [activeTournament, setActiveTournament] = useState(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [myCharacterIds, setMyCharacterIds] = useState([]);
  const [myCharactersChecked, setMyCharactersChecked] = useState(false);
  const [myStats, setMyStats] = useState({ played: 0, won: 0 });
  const [myTierInfo, setMyTierInfo] = useState(null);
  const [randomSeed] = useState(() => Math.floor(Math.random() * 1000));
  const initialLoading = loadingExtra;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const livePulse = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;

  const seasonInfo = getSeasonInfo();
  const season = SEASONS[seasonInfo.key];

  useEffect(() => {
    if (!initialLoading) return;
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [initialLoading, spinAnim]);

  useEffect(() => {
    if (!initialLoading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [initialLoading, fadeAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mascotFloat, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mascotFloat]);

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const livePulseOpacity = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const mascotTranslate = mascotFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const mascotRotate = mascotFloat.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });

  useEffect(() => {
    const unsubMyChars = listenMyCharacters(user.uid, (docs) => {
      setMyCharacterIds(docs.map((d) => d.characterId));
      setMyCharactersChecked(true);
    });
    const unsubActiveTournament = listenActiveTournament(setActiveTournament);

    Promise.all([
      getAllCharacters()
        .then(setCharacters)
        .catch((e) => console.log("Error cargando personajes:", e.message)),
      getLastFinishedTournament()
        .then(setLastTournament)
        .catch((e) => console.log("Error cargando último torneo:", e.message)),
      getMyCharacterWinCounts(user.uid)
        .then(setCharacterWins)
        .catch((e) => console.log("Error cargando victorias:", e.message)),
    ]).finally(() => setLoadingExtra(false));

    return () => {
      unsubMyChars();
      unsubActiveTournament();
    };
  }, [user.uid]);

  useEffect(() => {
    let unsubSettings;
    async function loadRankingSnapshot() {
      const [allUsers, finished, allCharactersForRanking] = await Promise.all([getAllUsers(), getAllFinished(), getAllCharacters()]);
      const roundsByTournament = await Promise.all(
        finished.map(async (t) => (await getRounds(t.id)).map((r) => ({ ...r, tournamentId: t.id })))
      );
      const allRounds = roundsByTournament.flat().filter((r) => r.roundNumber > 0);

      const mine = finished.filter((t) => t.participantUids?.includes(user.uid));
      const won = mine.filter((t) => t.winnerUid === user.uid).length;
      setMyStats({ played: mine.length, won });

      unsubSettings = listenRankingSettings((settings) => {
        const includedUids = settings.includedUids || [];
        const { qualified } = computeRankingData({ users: allUsers, finished, allRounds, allCharacters: allCharactersForRanking, includedUids });
        const myIndex = qualified.findIndex((q) => q.uid === user.uid);
        if (myIndex === -1) {
          setMyTierInfo(null);
        } else {
          setMyTierInfo({ position: myIndex + 1, total: qualified.length });
        }
      });
    }
    loadRankingSnapshot().catch((e) => console.log("Error cargando posición en el ranking:", e.message));
    return () => unsubSettings && unsubSettings();
  }, [user.uid]);

  const charById = (id) => characters.find((c) => c.fighterNumber === id);

  const lastWinner = lastTournament?.participants?.find((p) => p.uid === lastTournament.winnerUid);
  const lastWinnerCharacter = lastWinner ? charById(lastWinner.currentCharacterId) : null;

  const myCharacterList = characters.filter((c) => myCharacterIds.includes(c.fighterNumber));
  const featuredCharacter =
    myCharacterList.length > 0 ? myCharacterList[randomSeed % myCharacterList.length] : null;
  const featuredCharacterWins = featuredCharacter ? characterWins[featuredCharacter.fighterNumber] || 0 : 0;

  const showCharactersModal = myCharactersChecked && myCharacterIds.length === 0 && isFocused;
  const isTournamentParticipant = activeTournament?.participantUids?.includes(user.uid);
  const showActiveTournamentCard = activeTournament && !isTournamentParticipant;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Portal>
          <Modal
            visible={showCharactersModal}
            dismissable={false}
            contentContainerStyle={[styles.charsModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          >
            <View style={[styles.charsModalIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={{ fontSize: 28 }}>🎮</Text>
            </View>
            <Text variant="titleMedium" style={{ marginBottom: SPACING.xs, textAlign: "center", color: theme.colors.onSurface }}>
              Todavía no cargaste personajes
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: SPACING.xl, color: theme.colors.onSurfaceVariant }}>
              Antes de jugar necesitás cargar los personajes que sueles usar.
            </Text>
            <Button
              mode="contained"
              style={{ borderRadius: RADIUS.pill, width: "100%" }}
              onPress={() => navigation.navigate("Mas", { screen: "MyCharacters" })}
            >
              Cargar personajes
            </Button>
          </Modal>
        </Portal>

        <View style={{ width: "100%", maxWidth: maxContentWidth, alignSelf: "center", flex: 1 }}>
          {initialLoading ? (
            <View style={styles.loadingFullScreen}>
              <Animated.Image
                source={require("../../assets/logo.webp")}
                style={[styles.loadingLogo, { tintColor: theme.colors.primary, transform: [{ rotate: spinDeg }] }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* --- Saludo + personaje destacado --- */}
              <View style={[styles.heroCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <View style={styles.heroHeader}>
                  <Avatar.Image size={56} source={{ uri: profile?.photoURL }} />
                  <View style={{ marginLeft: SPACING.m }}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                      Hola, {profile?.playerName || "jugador"} 👋
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75 }}>
                      Bienvenido a Smash 33
                    </Text>
                  </View>
                </View>

                {featuredCharacter ? (
                  <View style={styles.heroCharacterArea}>
                    <View style={[styles.heroHalo, { backgroundColor: theme.colors.surface }]} />
                    <View style={styles.heroCharacterImageWrap}>
                      <Image
                        source={{ uri: featuredCharacter.images?.fullImage }}
                        style={styles.heroCharacterImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, marginTop: SPACING.xs }}>
                      {featuredCharacter.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75 }}>
                      ({featuredCharacterWins} {featuredCharacterWins === 1 ? "combate ganado" : "combates ganados"})
                    </Text>
                  </View>
                ) : (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75, marginTop: SPACING.l, textAlign: "center" }}>
                    Cargá tus personajes para verlos acá.
                  </Text>
                )}
              </View>

              {/* --- Mini stats personales + posición en el ranking --- */}
              <View style={styles.miniStatsRow}>
                <View style={[styles.miniStatPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <MaterialCommunityIcons name="controller-classic-outline" size={16} color={theme.colors.primary} />
                  <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: 2 }}>{myStats.played}</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Jugados</Text>
                </View>
                <View style={[styles.miniStatPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <MaterialCommunityIcons name="trophy" size={16} color={theme.custom.gold} />
                  <Text variant="titleMedium" style={{ color: theme.custom.gold, marginTop: 2 }}>{myStats.won}</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Ganados</Text>
                </View>
                {myTierInfo && (
                  <Pressable
                    style={[styles.miniStatPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                    onPress={() => navigation.navigate("Mas", { screen: "WorldRanking" })}
                  >
                    <MaterialCommunityIcons name="podium-gold" size={16} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: 2 }}>{myTierInfo.position}°</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Ranking33</Text>
                  </Pressable>
                )}
              </View>

              {/* --- Último torneo --- */}
              {lastWinner ? (
                <Pressable onPress={() => navigation.navigate("Historial")}>
                  <View style={[styles.winnerCard, { backgroundColor: theme.colors.surface, borderColor: theme.custom.gold }]}>
                    <View style={styles.winnerRow}>
                      <View style={styles.winnerImageArea}>
                        <View style={[styles.winnerHalo, { backgroundColor: theme.custom.gold }]} />
                        {lastWinnerCharacter && (
                          <Image source={{ uri: lastWinnerCharacter.images?.fullImage }} style={styles.winnerImage} resizeMode="contain" />
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACING.l }}>
                        <View style={styles.winnerBadgeRow}>
                          <View style={[styles.winnerTrophyBadge, { backgroundColor: theme.custom.gold }]}>
                            <MaterialCommunityIcons name="trophy" size={13} color="#241A05" />
                          </View>
                          <Text variant="labelSmall" style={{ color: theme.custom.gold, fontWeight: "700", marginLeft: 6 }}>
                            CAMPEÓN DEL ÚLTIMO TORNEO
                          </Text>
                        </View>
                        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, marginTop: 2 }}>{lastWinner.playerName}</Text>
                        {lastWinnerCharacter && (
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            con {lastWinnerCharacter.name}
                          </Text>
                        )}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </View>
                </Pressable>
              ) : (
                <View style={[styles.premiumCard, styles.emptyStateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  <Text style={{ fontSize: 26 }}>🥋</Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.xs }}>
                    Todavía no hay campeón
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xs }}>
                    Jugá el próximo torneo y quedate con la corona.
                  </Text>
                </View>
              )}

              {/* --- Acceso directo al Ranking Smash 33 --- */}
              <Pressable onPress={() => navigation.navigate("Mas", { screen: "WorldRanking" })}>
                <View style={[styles.rankingCard, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.liveTag}>
                      <Animated.View style={[styles.liveDot, { backgroundColor: theme.colors.primary, opacity: livePulseOpacity }]} />
                      <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700", letterSpacing: 0.5, marginLeft: 5 }}>
                        EN VIVO
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: "800", marginTop: 2 }}>
                      Temporada de {season.label}
                    </Text>
                    <Text style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85, fontSize: 12, marginTop: 2 }}>
                      Andá a ver el Ranking Smash 33
                    </Text>
                  </View>
                  {season.mascotAsset && (
                    <Animated.Image
                      source={season.mascotAsset}
                      style={[styles.rankingMascot, { transform: [{ translateY: mascotTranslate }, { rotate: mascotRotate }] }]}
                      resizeMode="contain"
                    />
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onPrimaryContainer} />
                </View>
              </Pressable>

              {/* --- Aviso de torneo en curso, o acceso directo a crear uno --- */}
              {showActiveTournamentCard ? (
                <Pressable
                  onPress={() =>
                    navigation.navigate("Torneo", { screen: "TournamentDetail", params: { tournamentId: activeTournament.id } })
                  }
                >
                  <View style={[styles.liveBanner, { backgroundColor: theme.colors.primary, borderColor: "rgba(255,255,255,0.35)" }]}>
                    <View style={[styles.liveIconWrap, { backgroundColor: theme.colors.onPrimary }]}>
                      <MaterialCommunityIcons name="lightning-bolt" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.m }}>
                      <View style={styles.liveTag}>
                        <Animated.View style={[styles.liveDot, { backgroundColor: theme.colors.onPrimary, opacity: livePulseOpacity }]} />
                        <Text variant="labelSmall" style={[styles.liveTagText, { color: theme.colors.onPrimary }]}>
                          EN VIVO
                        </Text>
                      </View>
                      <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, marginTop: 2 }}>
                        Hay un torneo en curso
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onPrimary, opacity: 0.9, marginTop: 2 }}>
                        Si querés chequear las batallas y resultados, tocá acá
                      </Text>
                    </View>
                    <View style={[styles.liveChevronWrap, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onPrimary} />
                    </View>
                  </View>
                </Pressable>
              ) : (
                !activeTournament && (
                  <Pressable onPress={() => navigation.navigate("Torneo", { screen: "CreateTournament" })}>
                    <View style={[styles.liveBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
                      <View style={[styles.liveIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="plus" size={22} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACING.m }}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>¿Armamos un torneo?</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>No hay ninguno en curso ahora mismo</Text>
                      </View>
                      <View style={[styles.liveChevronWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                      </View>
                    </View>
                  </Pressable>
                )
              )}

              {/* --- Próximamente: Elijah (estadísticas del primero eliminado) --- */}
              <View style={[styles.premiumCard, styles.elijahCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
                <View style={styles.elijahImageWrap}>
                  <Image source={require("../../assets/elijah.png")} style={styles.elijahImage} resizeMode="cover" />
                  <View style={[styles.elijahBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="exit-run" size={13} color={theme.colors.onPrimary} />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.m }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Próximamente: Elijah</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs }}>
                    Registro y estadísticas de quien queda afuera primero en cada ronda.
                  </Text>
                </View>
              </View>

              {/* --- Próximamente: invitaciones del Gremio --- */}
              <ImageBackground
                source={require("../../assets/invitacion.jpg")}
                style={styles.inviteCard}
                imageStyle={styles.inviteCardImage}
              >
                <View style={styles.inviteVeil}>
                  <Text variant="titleMedium" style={styles.inviteTitle}>
                    Próximamente: invitaciones del Gremio
                  </Text>
                  <Text variant="bodySmall" style={styles.inviteSubtitle}>
                    Vas a poder coordinar la próxima reunión desde acá.
                  </Text>
                </View>
              </ImageBackground>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xl },
  loadingFullScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingLogo: { width: 96, height: 96 },

  heroCard: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.l,
    padding: SPACING.l,
    overflow: "hidden",
  },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.m },
  heroCharacterArea: { alignItems: "center", paddingTop: SPACING.s, paddingBottom: SPACING.xs },
  heroHalo: {
    position: "absolute",
    top: 18,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.35,
  },
  heroCharacterImageWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCharacterImage: { width: 150, height: 150 },

  miniStatsRow: { flexDirection: "row", gap: SPACING.s, marginBottom: SPACING.l },
  miniStatPill: {
    flex: 1, alignItems: "center",
    borderRadius: RADIUS.lg, borderWidth: 1,
    paddingVertical: SPACING.m,
  },

  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.m,
    marginBottom: SPACING.l,
  },
  liveIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  liveTag: { flexDirection: "row", alignItems: "center" },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  liveTagText: { letterSpacing: 1, fontWeight: "700" },
  liveChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  winnerCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    marginBottom: SPACING.l,
    padding: SPACING.l,
  },
  winnerRow: { flexDirection: "row", alignItems: "center" },
  winnerImageArea: { width: 90, height: 90, alignItems: "center", justifyContent: "center" },
  winnerHalo: { position: "absolute", width: 82, height: 82, borderRadius: 41, opacity: 0.18 },
  winnerImage: { width: 90, height: 90 },
  winnerBadgeRow: { flexDirection: "row", alignItems: "center" },
  winnerTrophyBadge: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },

  premiumCard: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.l,
    borderWidth: 1,
    padding: SPACING.l,
    overflow: "hidden",
  },
  emptyStateCard: { alignItems: "center" },

  elijahCard: { flexDirection: "row", alignItems: "center" },
  elijahImageWrap: { width: 92, height: 92 },
  elijahImage: { width: 92, height: 92, borderRadius: 46 },
  elijahBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  rankingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.l,
    marginBottom: SPACING.l,
  },
  rankingMascot: { width: 40, height: 40, marginHorizontal: SPACING.s },

  inviteCard: {
    height: 140,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.l,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  inviteCardImage: {
    resizeMode: "cover",
  },
  inviteVeil: {
    backgroundColor: "rgba(24, 14, 4, 0.62)",
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
  },
  inviteTitle: { color: "#FFF7E6", fontWeight: "600" },
  inviteSubtitle: { color: "#FFF7E6", opacity: 0.85, marginTop: SPACING.xs / 2 },

  charsModal: { margin: SPACING.xxl, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: "center" },
  charsModalIcon: {
    width: 64, height: 64, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.m,
  },
});