//Importaciones:
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { getAllCharacters } from "../../services/charactersService";
import {
  addComment,
  applyRecomputedState,
  correctRound,
  deleteTournament,
  listenComments,
  listenMyCharacters,
  listenRounds,
  listenTournament,
  submitRound,
} from "../../services/firestoreService";
import { POINTS_TO_WIN, recomputeTournamentState } from "../../utils/tournamentLogic";
import CharacterPickerModal from "../../components/CharacterPickerModal";
import CommentsSection from "../../components/CommentsSection";
import RoundHistoryRow, { EmptyRoundHistory } from "../../components/RoundHistoryRow";
import ScreenHeader from "../../components/ScreenHeader";
import { RADIUS, SPACING } from "../../theme";

//JS:
function SpinningLogo({ size = 96, color }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);
  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.Image
      source={require("../../assets/logo.webp")}
      style={{ width: size, height: size, tintColor: color, transform: [{ rotate: spinDeg }] }}
      resizeMode="contain"
    />
  );
}

function CharacterAvatar({ theme, character, size, radius }) {
  if (character?.images?.iconImage) {
    return (
      <Image
        source={{ uri: character.images.iconImage }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center" },
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      <MaterialCommunityIcons name="help" size={size * 0.42} color={theme.colors.onSurfaceVariant} />
    </View>
  );
}

function CharacterChoiceRow({ theme, playerName, character, onPress }) {
  const picked = !!character;
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.choiceRow,
          {
            backgroundColor: picked ? theme.colors.primaryContainer : theme.colors.surface,
            borderColor: picked ? theme.colors.primary : theme.colors.outline,
          },
        ]}
      >
        <CharacterAvatar theme={theme} character={character} size={36} radius={RADIUS.sm} />
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text
            variant="titleSmall"
            style={{ color: picked ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
          >
            Selección de {playerName}
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: picked ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
              opacity: picked ? 0.8 : 1,
            }}
          >
            {picked ? character.name : "Todavía no eligió"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={picked ? "check-circle" : "chevron-right"}
          size={22}
          color={picked ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </View>
    </Pressable>
  );
}

export default function TournamentDetailScreen({ route, navigation }) {
  const { tournamentId } = route.params;
  const theme = useTheme();
  const { user, profile } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [comments, setComments] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [myCharsByUid, setMyCharsByUid] = useState({});

  const [pickingWinner, setPickingWinner] = useState(false);
  const [winnerUid, setWinnerUid] = useState(null);
  const [loserCharPicks, setLoserCharPicks] = useState({});
  const [pickerForUid, setPickerForUid] = useState(null);
  const [pickerMode, setPickerMode] = useState("loser"); 
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null); 
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const celebrationFloat = useRef(new Animated.Value(0)).current;
  const celebrationHaloPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebration) return;
    celebrationFloat.setValue(0);
    celebrationHaloPulse.setValue(0);
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(celebrationFloat, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(celebrationFloat, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(celebrationHaloPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(celebrationHaloPulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    haloLoop.start();
    return () => {
      floatLoop.stop();
      haloLoop.stop();
    };
  }, [celebration, celebrationFloat, celebrationHaloPulse]);

  const celebrationFloatTranslate = celebrationFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const celebrationHaloScale = celebrationHaloPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const celebrationHaloOpacity = celebrationHaloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.65] });

  useEffect(() => {
    getAllCharacters().then(setCharacters);
    const u1 = listenTournament(tournamentId, setTournament);
    const u2 = listenRounds(tournamentId, setRounds);
    const u3 = listenComments(tournamentId, setComments);
    return () => { u1(); u2(); u3(); };
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament) return;
    const unsubs = tournament.roster.map((p) =>
      listenMyCharacters(p.uid, (docs) => {
        setMyCharsByUid((prev) => ({ ...prev, [p.uid]: docs.map((d) => d.characterId) }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [tournament?.id]);

  const isCreator = tournament && user && tournament.createdBy === user.uid;
  const isFinished = tournament?.status === "finished";
  const isParticipant = tournament?.participantUids?.includes(user.uid);
  const participants = tournament?.participants || [];
  const allHaveInitialCharacter = participants.length > 0 && participants.every((p) => !!p.currentCharacterId);

  const charById = useMemo(() => {
    const map = {};
    characters.forEach((c) => { map[c.fighterNumber] = c; });
    return map;
  }, [characters]);

  async function persistState(newRounds) {
    const { participants: newParticipants, winnerUid: newWinnerUid, isFinished: finished } = recomputeTournamentState(
      tournament.roster,
      newRounds
    );
    await applyRecomputedState({ tournamentId, participants: newParticipants, winnerUid: newWinnerUid, isFinished: finished });
  }

  async function assignInitialCharacter(uid, characterId) {
    const round0 = rounds.find((r) => r.roundNumber === 0);
    if (!round0) return;
    setBusy(true);
    try {
      const newCharacters = { ...round0.characters, [uid]: characterId };
      await correctRound({ tournamentId, roundId: round0.id, winnerUid: null, characters: newCharacters });
      const updatedRounds = rounds.map((r) => (r.id === round0.id ? { ...r, characters: newCharacters } : r));
      await persistState(updatedRounds);
    } finally {
      setBusy(false);
    }
  }

  function openInitialPicker(uid) {
    setPickerMode("initial");
    setPickerForUid(uid);
  }

  function openLoserPicker(uid) {
    setPickingWinner(false);
    setPickerMode("loser");
    setPickerForUid(uid);
  }

  function handlePickerSelect(character) {
    if (pickerMode === "initial") {
      assignInitialCharacter(pickerForUid, character.fighterNumber);
    } else {
      setLoserCharPicks((prev) => ({ ...prev, [pickerForUid]: character.fighterNumber }));
      setPickingWinner(true); 
    }
    setPickerForUid(null);
  }

  function handlePickerDismiss() {
    setPickerForUid(null);
    if (pickerMode === "loser" && winnerUid) setPickingWinner(true);
  }

  async function handleConfirmDelete() {
    setConfirmingDelete(false);
    setBusy(true);
    try {
      await deleteTournament(tournamentId);
      navigation.navigate("TournamentsHome");
    } finally {
      setBusy(false);
    }
  }

  function startRegisterRound() {
    setEditingRoundId(null);
    setWinnerUid(null);
    setLoserCharPicks({});
    setPickingWinner(true);
  }

  function startEditRound(round) {
    setEditingRoundId(round.id);
    setWinnerUid(round.winnerUid);
    const picks = {};
    Object.entries(round.characters || {}).forEach(([uid, charId]) => {
      if (uid !== round.winnerUid) picks[uid] = charId;
    });
    setLoserCharPicks(picks);
    setPickingWinner(true);
  }

  function willFinishFor(uid) {
    const baseRounds = editingRoundId ? rounds.filter((r) => r.id !== editingRoundId) : rounds;
    const simulated = recomputeTournamentState(tournament.roster, baseRounds);
    const pointsBefore = simulated.participants.find((p) => p.uid === uid)?.points ?? 0;
    return pointsBefore + 1 >= POINTS_TO_WIN;
  }

  function selectWinner(uid) {
    setWinnerUid(uid);
    setLoserCharPicks({});
    if (!editingRoundId && willFinishFor(uid)) {
      confirmRound(uid);
    }
  }

  function backToWinnerStep() {
    setWinnerUid(null);
    setLoserCharPicks({});
  }

  const willFinishTournament = winnerUid ? willFinishFor(winnerUid) : false;
  const losers = participants.filter((p) => p.uid !== winnerUid);
  const allLoserPicksReady = willFinishTournament || (winnerUid && losers.every((p) => !!loserCharPicks[p.uid]));
  const winnerParticipant = winnerUid ? participants.find((p) => p.uid === winnerUid) : null;
  const winnerCharacter = winnerParticipant ? charById[winnerParticipant.currentCharacterId] : null;

  async function confirmRound(uidOverride) {
    const winUid = uidOverride ?? winnerUid;
    const winner = participants.find((p) => p.uid === winUid);
    const willFinish = willFinishFor(winUid);
    const characterMap = { [winUid]: winner.currentCharacterId };
    if (!willFinish) {
      participants
        .filter((p) => p.uid !== winUid)
        .forEach((p) => { characterMap[p.uid] = loserCharPicks[p.uid]; });
    }

    setBusy(true);
    try {
      if (editingRoundId) {
        await correctRound({ tournamentId, roundId: editingRoundId, winnerUid: winUid, characters: characterMap });
        const updatedRounds = rounds.map((r) => (r.id === editingRoundId ? { ...r, winnerUid: winUid, characters: characterMap } : r));
        await persistState(updatedRounds);
      } else {
        const nextRoundNumber = rounds.length;
        await submitRound({ tournamentId, roundNumber: nextRoundNumber, winnerUid: winUid, characters: characterMap });
        await persistState([...rounds, { roundNumber: nextRoundNumber, winnerUid: winUid, characters: characterMap }]);
      }

      if (willFinish && !editingRoundId) {
        setCelebration({ playerName: winner.playerName, characterId: winner.currentCharacterId });
      }

      setPickingWinner(false);
      setEditingRoundId(null);
    } finally {
      setBusy(false);
    }
  }

  function exitCelebration() {
    setCelebration(null);
    navigation.reset({
      index: 0,
      routes: [{ name: "TournamentsHome" }],
    });
  }

  if (!tournament) {
    return (
      <View style={[styles.fullScreenCenter, { backgroundColor: theme.colors.background }]}>
        <SpinningLogo size={88} color={theme.colors.primary} />
      </View>
    );
  }

  const pickerParticipant = pickerForUid ? participants.find((p) => p.uid === pickerForUid) : null;
  const pickerCharacterList =
    pickerForUid && myCharsByUid[pickerForUid]?.length > 0
      ? characters.filter((c) => myCharsByUid[pickerForUid].includes(c.fighterNumber))
      : characters;

  const visibleRounds = rounds.filter((r) => r.roundNumber > 0);
  const celebrationCharacter = celebration ? charById[celebration.characterId] : null;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: SPACING.l }}>
        <ScreenHeader
          title={isFinished ? "Torneo finalizado" : "Torneo en vivo"}
          onBack={isFinished ? () => navigation.goBack() : undefined}
        />

        {isFinished && (
          <View style={[styles.finishedBanner, { backgroundColor: theme.custom.gold }]}>
            <View style={styles.finishedIconWrap}>
              <MaterialCommunityIcons name="trophy" size={26} color={theme.custom.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.m }}>
              <Text variant="bodySmall" style={{ color: "#241A05", opacity: 0.7 }}>
                Torneo terminado
              </Text>
              <Text variant="titleLarge" style={{ color: "#241A05" }}>
                Ganó {participants.find((p) => p.uid === tournament.winnerUid)?.playerName}
              </Text>
            </View>
            <CharacterAvatar
              theme={theme}
              character={charById[participants.find((p) => p.uid === tournament.winnerUid)?.currentCharacterId]}
              size={52}
              radius={RADIUS.lg}
            />
          </View>
        )}
        {participants
          .slice()
          .sort((a, b) => b.points - a.points)
          .map((p) => {
            const character = charById[p.currentCharacterId];
            return (
              <View
                key={p.uid}
                style={[
                  styles.playerCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                  p.uid === tournament.winnerUid && isFinished && { borderColor: theme.custom.gold, borderWidth: 2 },
                ]}
              >
                <CharacterAvatar theme={theme} character={character} size={60} radius={RADIUS.lg} />
                <View style={{ flex: 1, marginLeft: SPACING.m }}>
                  <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>{p.playerName}</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs / 1.5 }}>
                    {character?.name || "Sin personaje"}
                  </Text>
                </View>
                <View style={[styles.scoreCapsule, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.scoreText, { color: theme.colors.primary }]}>{p.points}</Text>
                </View>
              </View>
            );
          })}

        {isCreator && !isFinished && !allHaveInitialCharacter && (
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <Text variant="titleSmall" style={{ marginBottom: SPACING.s, color: theme.colors.onSurface }}>Elegí los personajes iniciales</Text>
            {participants.map((p) => (
              <View key={p.uid} style={{ marginBottom: SPACING.s }}>
                <CharacterChoiceRow
                  theme={theme}
                  playerName={p.playerName}
                  character={charById[p.currentCharacterId]}
                  onPress={() => openInitialPicker(p.uid)}
                />
              </View>
            ))}
          </View>
        )}

        {isCreator && !isFinished && allHaveInitialCharacter && (
          <Button
            mode="contained"
            icon="trophy-outline"
            style={styles.registerButton}
            contentStyle={{ paddingVertical: SPACING.xs }}
            onPress={startRegisterRound}
          >
            Registrar resultado de ronda
          </Button>
        )}

        {isCreator && !isFinished && (
          <Button mode="text" textColor={theme.colors.error} style={{ marginTop: SPACING.s }} onPress={() => setConfirmingDelete(true)}>
            Eliminar torneo en curso
          </Button>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        <Text variant="titleSmall" style={{ marginBottom: SPACING.s, color: theme.colors.onBackground }}>Historial de rondas</Text>
        {visibleRounds.length === 0 ? (
          <EmptyRoundHistory />
        ) : (
          visibleRounds.map((r) => (
            <RoundHistoryRow
              key={r.id}
              tournamentId={tournamentId}
              round={r}
              winnerName={participants.find((p) => p.uid === r.winnerUid)?.playerName}
              canEdit={isCreator}
              onEdit={() => startEditRound(r)}
              readOnlyReactions={isParticipant}
            />
          ))
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        <CommentsSection
          comments={comments}
          readOnly={isParticipant}
          onAddComment={(text) =>
            addComment({ tournamentId, uid: user.uid, playerName: profile.playerName, photoURL: profile.photoURL, text })
          }
        />
      </ScrollView>
      <CharacterPickerModal
        visible={!!pickerForUid}
        onDismiss={handlePickerDismiss}
        characters={pickerCharacterList}
        disabledIds={pickerMode === "loser" ? pickerParticipant?.usedCharacterIds || [] : []}
        emptyMessage="Este jugador todavía no tiene personajes guardados en 'Mis personajes'."
        title={pickerMode === "initial" ? "Elegí el personaje inicial" : "Elegí el nuevo personaje"}
        onSelect={handlePickerSelect}
      />

      <Portal>
        <Modal visible={pickingWinner} dismissable={false} contentContainerStyle={styles.fullScreenModal}>
          <View style={[styles.fullScreenModal, { backgroundColor: theme.colors.background, padding: SPACING.l }]}>
            <View style={styles.roundModalHeader}>
              {winnerUid ? (
                <IconButton icon="arrow-left" size={22} onPress={backToWinnerStep} />
              ) : (
                <View style={{ width: 40 }} />
              )}
              <Text variant="titleMedium" style={{ flex: 1, textAlign: "center", color: theme.colors.onBackground }}>
                {editingRoundId ? "Corregir ronda" : "Registrar ronda"}
              </Text>
              <IconButton icon="close" size={22} onPress={() => setPickingWinner(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!winnerUid ? (
                <>
                  <View style={styles.roundStepIntro}>
                    <MaterialCommunityIcons name="trophy" size={40} color={theme.custom.gold} />
                    <Text variant="headlineSmall" style={{ marginTop: SPACING.s, textAlign: "center", color: theme.colors.onBackground }}>
                      ¿Quién ganó esta ronda?
                    </Text>
                  </View>
                  {participants.map((p) => {
                    const character = charById[p.currentCharacterId];
                    return (
                      <Pressable key={p.uid} onPress={() => selectWinner(p.uid)} style={{ marginBottom: SPACING.s }}>
                        <View style={[styles.winnerBigRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                          <CharacterAvatar theme={theme} character={character} size={52} radius={RADIUS.md} />
                          <View style={{ flex: 1, marginLeft: SPACING.m }}>
                            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                              {p.playerName}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {character?.name || "Sin personaje"}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={26} color={theme.colors.onSurfaceVariant} />
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={[styles.winnerBanner, { backgroundColor: theme.colors.primaryContainer }]}>
                    <CharacterAvatar theme={theme} character={winnerCharacter} size={44} radius={RADIUS.sm} />
                    <View style={{ marginLeft: SPACING.m }}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                        Ganó {winnerParticipant?.playerName}
                      </Text>
                      {winnerCharacter && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                          con {winnerCharacter.name}
                        </Text>
                      )}
                    </View>
                  </View>

                  {willFinishTournament ? (
                    <View style={styles.roundStepIntro}>
                      <MaterialCommunityIcons name="trophy" size={40} color={theme.custom.gold} />
                      <Text variant="bodyMedium" style={{ marginTop: SPACING.s, textAlign: "center", color: theme.colors.onSurfaceVariant }}>
                        Con esta victoria termina el torneo — no hace falta elegir personaje nuevo.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: SPACING.l }}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.s }}>
                        Los que perdieron eligen su nuevo personaje:
                      </Text>
                      {losers.map((p) => (
                        <View key={p.uid} style={{ marginBottom: SPACING.s }}>
                          <CharacterChoiceRow
                            theme={theme}
                            playerName={p.playerName}
                            character={charById[loserCharPicks[p.uid]]}
                            onPress={() => openLoserPicker(p.uid)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {winnerUid && !(willFinishTournament && !editingRoundId) && (
              <Button
                mode="contained"
                disabled={!allLoserPicksReady}
                style={{ borderRadius: RADIUS.pill, marginTop: SPACING.m }}
                contentStyle={{ paddingVertical: SPACING.xs }}
                onPress={() => confirmRound()}
              >
                Confirmar
              </Button>
            )}
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={!!celebration} dismissable={false} contentContainerStyle={styles.fullScreenModal}>
          <View style={[styles.fullScreenModal, styles.celebrationScreen, { backgroundColor: theme.custom.gold }]}>
            <Text style={styles.celebrationStar}>✦</Text>
            <Text style={[styles.celebrationStar, { top: 90, right: 40, left: undefined }]}>✦</Text>
            <Text style={[styles.celebrationStar, { bottom: 140, left: 50 }]}>✦</Text>
            <Text style={[styles.celebrationStar, { bottom: 100, right: 30, left: undefined }]}>✦</Text>

            <View style={styles.celebrationImageArea}>
              <Animated.View
                style={[
                  styles.celebrationHalo,
                  { backgroundColor: "#FFFFFF", opacity: celebrationHaloOpacity, transform: [{ scale: celebrationHaloScale }] },
                ]}
              />
              {celebrationCharacter?.images?.fullImage && (
                <Animated.Image
                  source={{ uri: celebrationCharacter.images.fullImage }}
                  style={[styles.celebrationImage, { transform: [{ translateY: celebrationFloatTranslate }] }]}
                  resizeMode="contain"
                />
              )}
            </View>

            <Text variant="displaySmall" style={styles.celebrationTitle}>
              ¡Felicitaciones, {celebration?.playerName}!
            </Text>
            {celebrationCharacter && (
              <Text variant="titleMedium" style={styles.celebrationSubtitle}>
                Campeón del torneo con {celebrationCharacter.name}
              </Text>
            )}

            <Button
              mode="contained"
              icon="trophy"
              buttonColor="#241A05"
              textColor={theme.custom.gold}
              style={{ borderRadius: RADIUS.pill, marginTop: SPACING.xl, width: "100%" }}
              contentStyle={{ paddingVertical: SPACING.s }}
              onPress={exitCelebration}
            >
              Salir
            </Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={confirmingDelete}
          onDismiss={() => setConfirmingDelete(false)}
          contentContainerStyle={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={[styles.confirmIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="trash-can-outline" size={28} color={theme.colors.onErrorContainer} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.onSurface }}>
            Eliminar torneo
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Se va a borrar todo el progreso de este torneo (rondas, comentarios, reacciones). Esta acción no se puede deshacer.
          </Text>
          <View style={styles.confirmActions}>
            <Button mode="outlined" style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }} onPress={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={busy} dismissable={false} contentContainerStyle={styles.fullScreenModal}>
          <View style={[styles.fullScreenModal, styles.busyOverlay]}>
            <SpinningLogo size={72} color={theme.colors.primary} />
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreenCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
    finishedBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.l,
    padding: SPACING.l,
  },
  finishedIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: "#241A05",
    alignItems: "center",
    justifyContent: "center",
  },

  playerCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.l, marginBottom: SPACING.m,
  },
  scoreCapsule: {
    minWidth: 64, height: 56, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.m,
  },
  scoreText: { fontFamily: "Rajdhani_700Bold", fontSize: 30 },

  sheetCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.m, marginTop: SPACING.s, marginBottom: SPACING.s },
  registerButton: { marginTop: SPACING.s, borderRadius: RADIUS.pill },
  divider: { height: 1, marginVertical: SPACING.xl },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.m,
  },

  fullScreenModal: { flex: 1, margin: 0 },
  roundModalHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  roundStepIntro: { alignItems: "center", marginTop: SPACING.l, marginBottom: SPACING.xl },
  winnerBigRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    padding: SPACING.l,
  },
  winnerBanner: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, padding: SPACING.m, marginBottom: SPACING.m,
  },

  celebrationScreen: { alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  celebrationStar: { position: "absolute", top: 70, left: 40, fontSize: 22, color: "#241A05", opacity: 0.25 },
  celebrationImageArea: {
    width: 320, height: 320,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.m,
  },
  celebrationHalo: {
    position: "absolute", width: 250, height: 250, borderRadius: 125,
  },
  celebrationImage: { width: 310, height: 310 },
  celebrationTitle: { color: "#241A05", textAlign: "center" },
  celebrationSubtitle: { color: "#241A05", opacity: 0.75, marginTop: SPACING.xs, textAlign: "center" },
  confirmCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 56, height: 56, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.m,
  },
  confirmActions: { flexDirection: "row", width: "100%" },
  busyOverlay: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});