//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllCharacters } from "../../services/charactersService";
import {
  getLastFinishedTournament,
  getMyCharacterWinCounts,
  listenActiveTournament,
  listenMyCharacters,
} from "../../services/firestoreService";
import { useResponsive } from "../../utils/responsive";
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
  const [bestCharacter, setBestCharacter] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [myCharacterIds, setMyCharacterIds] = useState([]);
  const [myCharactersChecked, setMyCharactersChecked] = useState(false);
  const [fallbackSeed] = useState(() => Math.floor(Math.random() * 1000));
  const initialLoading = loadingExtra;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const livePulse = useRef(new Animated.Value(0)).current;

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

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const livePulseOpacity = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

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
        .then((wins) => {
          const entries = Object.entries(wins).sort((a, b) => b[1] - a[1]);
          setBestCharacter(entries[0] || null); // [characterId, winCount]
        })
        .catch((e) => console.log("Error cargando mejor personaje:", e.message)),
    ]).finally(() => setLoadingExtra(false));

    return () => {
      unsubMyChars();
      unsubActiveTournament();
    };
  }, [user.uid]);

  const charById = (id) => characters.find((c) => c.fighterNumber === id);

  const lastWinner = lastTournament?.participants?.find((p) => p.uid === lastTournament.winnerUid);
  const lastWinnerCharacter = lastWinner ? charById(lastWinner.currentCharacterId) : null;
  const bestCharacterData = bestCharacter ? charById(bestCharacter[0]) : null;
  const fallbackCharacter =
    characters.length > 0 ? characters[fallbackSeed % characters.length] : null;
  const featuredCharacter = bestCharacterData || fallbackCharacter;

  const showCharactersModal = myCharactersChecked && myCharacterIds.length === 0 && isFocused;
  const isTournamentParticipant = activeTournament?.participantUids?.includes(user.uid);
  const showActiveTournamentCard = activeTournament && !isTournamentParticipant;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + SPACING.xl },
      ]}
    >
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
            onPress={() => navigation.navigate("Perfil", { screen: "MyCharacters" })}
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
                <Avatar.Image size={48} source={{ uri: profile?.photoURL }} />
                <View style={{ marginLeft: SPACING.m }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    Hola, {profile?.playerName || "jugador"} 👋
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75 }}>
                    Bienvenido a Smash 33
                  </Text>
                </View>
              </View>

              {featuredCharacter ? (
                <View style={styles.heroCharacterArea}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>
                    {bestCharacterData ? "Tu mejor personaje" : "Personaje destacado"}
                  </Text>
                  <View style={[styles.heroHalo, { backgroundColor: theme.colors.surface }]} />
                  <Image
                    source={{ uri: featuredCharacter.images?.fullImage }}
                    style={styles.heroCharacterImage}
                    resizeMode="contain"
                  />
                  <Text variant="displaySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: SPACING.s }}>
                    {featuredCharacter.name}
                  </Text>
                  {bestCharacterData && (
                    <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75 }}>
                      {bestCharacter[1]} {bestCharacter[1] === 1 ? "combate ganado" : "combates ganados"}
                    </Text>
                  )}
                </View>
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.75, marginTop: SPACING.l, textAlign: "center" }}>
                  Cargá tus personajes para verlos acá.
                </Text>
              )}
            </View>

            {/* --- Aviso de torneo en curso  --- */}
            {showActiveTournamentCard && (
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
            )}

            {/* --- Último torneo --- */}
            {lastWinner ? (
              <View style={[styles.premiumCard, styles.winnerCard, { backgroundColor: theme.colors.surface, borderColor: theme.custom.gold }]}>
                <View style={[styles.goldStripe, { backgroundColor: theme.custom.gold }]} />
                <View style={styles.winnerRow}>
                  {lastWinnerCharacter && (
                    <View style={[styles.winnerImageWrap, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.custom.gold }]}>
                      <Image source={{ uri: lastWinnerCharacter.images?.fullImage }} style={styles.winnerImage} resizeMode="contain" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: SPACING.l }}>
                    <Text variant="bodySmall" style={{ color: theme.custom.gold }}>Campeón del último torneo</Text>
                    <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>{lastWinner.playerName}</Text>
                    {lastWinnerCharacter && (
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        con {lastWinnerCharacter.name}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 34 }}>🏆</Text>
                </View>
              </View>
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

            {/* --- Próximamente: división de gastos --- */}
            <View style={[styles.premiumCard, styles.expenseCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
              <View style={{ flex: 1, paddingRight: SPACING.s }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Próximamente: división de gastos
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8, marginTop: SPACING.xs }}>
                  Vas a poder cargar lo que gastó cada uno y dividirlo automáticamente.
                </Text>
              </View>
              <Image
                source={require("../../assets/coins.webp")}
                style={styles.expenseCoinsImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        )}
      </View>
    </ScrollView>
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
    top: 26,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.35,
  },
  heroCharacterImage: { width: 210, height: 210 },

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

  premiumCard: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.l,
    borderWidth: 1,
    padding: SPACING.l,
    overflow: "hidden",
  },
  winnerCard: { paddingVertical: SPACING.xl },
  goldStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  winnerRow: { flexDirection: "row", alignItems: "center" },
  winnerImageWrap: {
    width: 110,
    height: 110,
    borderRadius: RADIUS.l,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  winnerImage: { width: "100%", height: "100%" },
  emptyStateCard: { alignItems: "center" },

  inviteCard: {
    height: 190,
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

  expenseCard: { flexDirection: "row", alignItems: "center", paddingRight: SPACING.xs },
  expenseCoinsImage: {
    width: 148,
    height: 148,
    transform: [{ rotate: "-8deg" }],
  },

  charsModal: { margin: SPACING.xxl, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: "center" },
  charsModalIcon: {
    width: 64, height: 64, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.m,
  },
});