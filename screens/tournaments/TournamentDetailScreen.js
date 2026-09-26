//Importaciones:
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { Button, IconButton, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { scale } from "../../utils/responsive";

//JS:
const VICTORY_SONGS = [
  require("../../assets/audio/victory01.mp3"),
  require("../../assets/audio/victory02.mp3"),
  require("../../assets/audio/victory03.mp3"),
  require("../../assets/audio/victory04.mp3"),
  require("../../assets/audio/victory05.mp3"),
  require("../../assets/audio/victory06.mp3"),
  require("../../assets/audio/victory07.mp3"),
  require("../../assets/audio/victory08.mp3"),
  require("../../assets/audio/victory09.mp3"),
  require("../../assets/audio/victory10.mp3"),
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function usePressScale() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  function pressIn() {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  return { scale: scaleAnim, pressIn, pressOut };
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CONFETTI_COLORS = ["#EC5F94", "#8E5FD6", "#5C7CFA", "#43A047", "#FFFFFF", "#4FC3D9"];

function ConfettiPiece({ color, startX, size }) {
  const fall = useRef(new Animated.Value(0)).current;
  const driftX = useRef((Math.random() - 0.5) * 140).current;
  const spin = useRef(360 + Math.random() * 360).current;
  const duration = useRef(2200 + Math.random() * 2200).current;
  const delay = useRef(Math.random() * 1600).current;

  useEffect(() => {
    let cancelled = false;
    function run() {
      fall.setValue(0);
      Animated.timing(fall, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (finished && !cancelled) run();
      });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, SCREEN_H + 40] });
  const translateX = fall.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spin}deg`] });
  const opacity = fall.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: 0,
        width: size,
        height: size * 1.6,
        backgroundColor: color,
        borderRadius: 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

function ConfettiField() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }).map((_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        startX: Math.random() * SCREEN_W,
        size: 6 + Math.random() * 5,
      })),
    []
  );

  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, width: SCREEN_W, height: SCREEN_H }}
      pointerEvents="none"
    >
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} color={p.color} startX={p.startX} size={p.size} />
      ))}
    </View>
  );
}

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

function BouncingTrophy({ size, color }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 550, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -scale(10)] });
  const rotate = bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["-6deg", "0deg", "6deg"] });
  return (
    <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
      <MaterialCommunityIcons name="trophy" size={size} color={color} />
    </Animated.View>
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
  const { scale: pressScale, pressIn, pressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.choiceRow,
          {
            backgroundColor: picked ? theme.colors.primaryContainer : theme.colors.surface,
            borderColor: picked ? theme.colors.primary : theme.colors.outline,
          },
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <CharacterAvatar theme={theme} character={character} size={scale(36)} radius={RADIUS.sm} />
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
          size={scale(22)}
          color={picked ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </Animated.View>
    </Pressable>
  );
}

function PlayerCard({ theme, p, character, isPending, canAssign, isMatchPoint, isChampion, isFinished, matchPointScale, onPress }) {
  const { scale: pressScale, pressIn, pressOut } = usePressScale();

  let cardBg = theme.colors.surface;
  let cardBorder = theme.colors.outline;
  let cardBorderWidth = 1;
  if (!isFinished) {
    if (isPending) {
      cardBg = theme.colors.surfaceVariant;
    } else {
      cardBg = theme.colors.primaryContainer;
      cardBorder = theme.colors.primary;
      cardBorderWidth = 1.5;
    }
  }
  if (isChampion) {
    cardBorder = theme.custom.gold;
    cardBorderWidth = 2;
  }

  const nameColor = !isFinished && !isPending ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
  const subColor = !isFinished && !isPending ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
  const capsuleBg = isMatchPoint
    ? theme.custom.gold
    : (!isFinished && !isPending ? theme.colors.surface : theme.colors.primaryContainer);
  const capsuleTextColor = isMatchPoint ? "#241A05" : theme.colors.primary;

  const inner = (
    <View
      style={[
        styles.playerCard,
        { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: cardBorderWidth },
      ]}
    >
      <View>
        <CharacterAvatar theme={theme} character={character} size={scale(60)} radius={RADIUS.lg} />
        {canAssign && (
          <View style={[styles.editBadge, { backgroundColor: theme.colors.primary, borderColor: cardBg }]}>
            <MaterialCommunityIcons name="pencil" size={scale(11)} color={theme.colors.onPrimary} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: SPACING.m }}>
        <Text variant="titleLarge" style={{ color: nameColor }}>{p.playerName}</Text>
        <Text variant="titleSmall" style={{ color: subColor, marginTop: SPACING.xs / 1.5 }}>
          {character?.name || (canAssign ? "Tocá para elegir personaje" : isPending ? "Esperando selección..." : "Sin personaje")}
        </Text>
      </View>
      <Animated.View
        style={[
          styles.scoreCapsule,
          { backgroundColor: capsuleBg },
          isMatchPoint && { transform: [{ scale: matchPointScale }] },
        ]}
      >
        {isMatchPoint && (
          <View style={[styles.matchPointFireBadge, { borderColor: theme.colors.background }]}>
            <MaterialCommunityIcons name="fire" size={scale(22)} color={theme.custom.gold} />
          </View>
        )}
        <Text style={[styles.scoreText, { color: capsuleTextColor }]}>{p.points}</Text>
      </Animated.View>
    </View>
  );

  if (!canAssign) return inner;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>{inner}</Animated.View>
    </Pressable>
  );
}

function WinnerChoiceRow({ theme, p, character, onPress }) {
  const { scale: pressScale, pressIn, pressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={{ marginBottom: SPACING.s }}>
      <Animated.View
        style={[
          styles.winnerBigRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <CharacterAvatar theme={theme} character={character} size={scale(52)} radius={RADIUS.md} />
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
            {p.playerName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {character?.name || "Sin personaje"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={scale(26)} color={theme.colors.onSurfaceVariant} />
      </Animated.View>
    </Pressable>
  );
}

function TournamentDetailScreenInner({ route, navigation }) {
  const { tournamentId } = route.params;
  const theme = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [tournament, setTournament] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [comments, setComments] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [myCharsByUid, setMyCharsByUid] = useState({});

  const [pendingWinnerUid, setPendingWinnerUid] = useState(null);
  const [pickingWinner, setPickingWinner] = useState(false);
  const [winnerUid, setWinnerUid] = useState(null);
  const [loserCharPicks, setLoserCharPicks] = useState({});
  const [pickerForUid, setPickerForUid] = useState(null);
  const [pickerMode, setPickerMode] = useState("assign");
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showMyCharacters, setShowMyCharacters] = useState(false);

  const celebrationFloat = useRef(new Animated.Value(0)).current;
  const celebrationHaloPulse = useRef(new Animated.Value(0)).current;
  const matchPointPulse = useRef(new Animated.Value(0)).current;
  const prevStatusRef = useRef(null);

  const victorySongIndex = hashString(tournamentId) % VICTORY_SONGS.length;
  const victoryPlayer = useAudioPlayer(VICTORY_SONGS[victorySongIndex]);

  useEffect(() => {
    if (celebration) {
      victoryPlayer.seekTo(0);
      victoryPlayer.play();
    } else {
      victoryPlayer.pause();
    }
  }, [celebration]);

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(matchPointPulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(matchPointPulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [matchPointPulse]);

  const celebrationFloatTranslate = celebrationFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const celebrationHaloScale = celebrationHaloPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const celebrationHaloOpacity = celebrationHaloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.65] });
  const matchPointScale = matchPointPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

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

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = tournament?.status;
    if (prevStatus && prevStatus !== "finished" && tournament?.status === "finished") {
      const winner = tournament.participants?.find((p) => p.uid === tournament.winnerUid);
      if (winner) {
        setCelebration({ playerName: winner.playerName, characterId: winner.currentCharacterId });
      }
    }
  }, [tournament?.status]);

  const isCreator = tournament && user && tournament.createdBy === user.uid;
  const isFinished = tournament?.status === "finished";
  const isParticipant = tournament?.participantUids?.includes(user.uid);
  const participants = tournament?.participants || [];
  const allHaveCurrentCharacter = participants.length > 0 && participants.every((p) => !!p.currentCharacterId);

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

  async function assignCurrentCharacter(uid, characterId) {
    const latestRound = rounds[rounds.length - 1];
    if (!latestRound) return;
    setBusy(true);
    try {
      const newCharacters = { ...latestRound.characters, [uid]: characterId };
      await correctRound({ tournamentId, roundId: latestRound.id, winnerUid: latestRound.winnerUid, characters: newCharacters });
      const updatedRounds = rounds.map((r) => (r.id === latestRound.id ? { ...r, characters: newCharacters } : r));
      await persistState(updatedRounds);
    } finally {
      setBusy(false);
    }
  }

  function openAssignPicker(uid) {
    setPickerMode("assign");
    setPickerForUid(uid);
  }

  function openLoserPicker(uid) {
    setPickerMode("loser");
    setPickerForUid(uid);
  }

  function handlePickerSelect(character) {
    if (pickerMode === "assign") {
      assignCurrentCharacter(pickerForUid, character.fighterNumber);
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
    setPendingWinnerUid(null);
    setLoserCharPicks({});
    setPickingWinner(true);
  }

  function startEditRound(round) {
    setEditingRoundId(round.id);
    setPendingWinnerUid(null);
    setWinnerUid(round.winnerUid);
    const picks = {};
    Object.entries(round.characters || {}).forEach(([uid, charId]) => {
      if (uid !== round.winnerUid) picks[uid] = charId;
    });
    setLoserCharPicks(picks);
    setPickingWinner(true);
  }

  function closeRoundModal() {
    setPickingWinner(false);
    setPendingWinnerUid(null);
    setWinnerUid(null);
    setEditingRoundId(null);
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
  const pendingWinnerParticipant = pendingWinnerUid ? participants.find((p) => p.uid === pendingWinnerUid) : null;

  async function confirmRound(uidOverride) {
    const winUid = uidOverride ?? winnerUid;
    const winner = participants.find((p) => p.uid === winUid);
    const willFinish = willFinishFor(winUid);
    const characterMap = { [winUid]: winner.currentCharacterId };
    if (!willFinish) {
      participants
        .filter((p) => p.uid !== winUid)
        .forEach((p) => {
          characterMap[p.uid] = editingRoundId ? (loserCharPicks[p.uid] ?? null) : null;
        });
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
      closeRoundModal();
    } finally {
      setBusy(false);
    }
  }

  async function finalizeWinner(uid) {
    setPendingWinnerUid(null);
    await confirmRound(uid);
  }

  function exitCelebration() {
    victoryPlayer.pause();
    setCelebration(null);
    navigation.reset({
      index: 0,
      routes: [{ name: "TournamentsHome" }],
    });
  }

  if (!tournament) {
    return (
      <View style={[styles.fullScreenCenter, { backgroundColor: theme.colors.background }]}>
        <SpinningLogo size={scale(88)} color={theme.colors.primary} />
      </View>
    );
  }

  const pickerParticipant = pickerForUid ? participants.find((p) => p.uid === pickerForUid) : null;
  const pickerCharacterList =
    pickerForUid && myCharsByUid[pickerForUid]?.length > 0
      ? characters.filter((c) => myCharsByUid[pickerForUid].includes(c.fighterNumber))
      : characters;

  const myParticipant = participants.find((p) => p.uid === user.uid);
  const myCharacterList =
    myCharsByUid[user.uid]?.length > 0
      ? characters.filter((c) => myCharsByUid[user.uid].includes(c.fighterNumber))
      : characters;

  const visibleRounds = rounds.filter((r) => r.roundNumber > 0);
  const celebrationCharacter = celebration ? charById[celebration.characterId] : null;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l }}
      >
        <ScreenHeader
          title={isFinished ? "Torneo finalizado" : "Torneo en vivo"}
          logo
          onBack={isFinished ? () => navigation.goBack() : undefined}
        />

        {isFinished && (
          <View style={[styles.finishedBanner, { backgroundColor: theme.custom.gold }]}>
            <View style={styles.finishedIconWrap}>
              <MaterialCommunityIcons name="trophy" size={scale(26)} color={theme.custom.gold} />
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
              size={scale(52)}
              radius={RADIUS.lg}
            />
          </View>
        )}

        {participants
          .slice()
          .sort((a, b) => b.points - a.points)
          .map((p) => {
            const character = charById[p.currentCharacterId];
            const isPending = !character && !isFinished;
            const canAssign = isCreator && !isFinished;
            const isMatchPoint = !isFinished && p.points === POINTS_TO_WIN - 1;
            const isChampion = isFinished && p.uid === tournament.winnerUid;

            return (
              <PlayerCard
                key={p.uid}
                theme={theme}
                p={p}
                character={character}
                isPending={isPending}
                canAssign={canAssign}
                isMatchPoint={isMatchPoint}
                isChampion={isChampion}
                isFinished={isFinished}
                matchPointScale={matchPointScale}
                onPress={() => openAssignPicker(p.uid)}
              />
            );
          })}

        {isCreator && !isFinished && !allHaveCurrentCharacter && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m, textAlign: "center" }}>
            Tocá las tarjetas de arriba para asignarle personaje a cada uno.
          </Text>
        )}

        {isCreator && !isFinished && allHaveCurrentCharacter && (
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

        {!isCreator && (
          <Button
            mode="outlined"
            icon="cards"
            style={[styles.registerButton, { marginBottom: SPACING.s }]}
            contentStyle={{ paddingVertical: SPACING.xs }}
            onPress={() => setShowMyCharacters(true)}
          >
            Mis personajes disponibles
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
        disabledIds={pickerParticipant?.usedCharacterIds || []}
        activeId={pickerParticipant?.currentCharacterId}
        emptyMessage="Este jugador todavía no tiene personajes guardados en 'Mis personajes'."
        title={pickerMode === "assign" ? "Elegí el personaje" : "Elegí el nuevo personaje"}
        onSelect={handlePickerSelect}
      />

      <CharacterPickerModal
        visible={showMyCharacters}
        onDismiss={() => setShowMyCharacters(false)}
        characters={myCharacterList}
        disabledIds={myParticipant?.usedCharacterIds || []}
        activeId={myParticipant?.currentCharacterId}
        emptyMessage="Todavía no tenés personajes guardados en 'Mis personajes'."
        title="Mis personajes disponibles"
        readOnly
      />

      <Portal>
        <Modal visible={pickingWinner} dismissable={false} contentContainerStyle={styles.fullScreenModal}>
          <View style={[styles.fullScreenModal, { backgroundColor: theme.colors.background, padding: SPACING.l }]}>
            <View style={styles.roundModalHeader}>
              {winnerUid ? (
                <IconButton icon="arrow-left" size={scale(22)} onPress={backToWinnerStep} />
              ) : (
                <View style={{ width: scale(40) }} />
              )}
              <Text variant="titleMedium" style={{ flex: 1, textAlign: "center", color: theme.colors.onBackground }}>
                {editingRoundId ? "Corregir ronda" : "Registrar ronda"}
              </Text>
              <IconButton icon="close" size={scale(22)} onPress={closeRoundModal} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!winnerUid ? (
                <>
                  <View style={styles.roundStepIntro}>
                    <BouncingTrophy size={scale(40)} color={theme.custom.gold} />
                    <Text variant="headlineSmall" style={{ marginTop: SPACING.s, textAlign: "center", color: theme.colors.onBackground }}>
                      ¿Quién ganó esta ronda?
                    </Text>
                  </View>
                  {participants.map((p) => {
                    const character = charById[p.currentCharacterId];
                    return (
                      <WinnerChoiceRow
                        key={p.uid}
                        theme={theme}
                        p={p}
                        character={character}
                        onPress={() => (editingRoundId ? selectWinner(p.uid) : setPendingWinnerUid(p.uid))}
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={[styles.winnerBanner, { backgroundColor: theme.colors.primaryContainer }]}>
                    <CharacterAvatar theme={theme} character={winnerCharacter} size={scale(44)} radius={RADIUS.sm} />
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
                      <BouncingTrophy size={scale(40)} color={theme.custom.gold} />
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
        <Modal
          visible={!!pendingWinnerUid}
          onDismiss={() => setPendingWinnerUid(null)}
          contentContainerStyle={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={[styles.confirmIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="trophy-outline" size={scale(26)} color={theme.colors.primary} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.onSurface }}>
            ¿Marcar a {pendingWinnerParticipant?.playerName} como ganador?
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Se puede corregir desde el historial.
          </Text>
          <View style={styles.confirmActions}>
            <Button mode="outlined" style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }} onPress={() => setPendingWinnerUid(null)}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={() => finalizeWinner(pendingWinnerUid)}
            >
              Confirmar
            </Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={!!celebration} dismissable={false} contentContainerStyle={styles.fullScreenModal}>
          <View style={[styles.fullScreenModal, styles.celebrationScreen, { backgroundColor: theme.custom.gold }]}>
            <ConfettiField />

            <Text variant="displaySmall" style={styles.celebrationTitle}>
              ¡Felicitaciones, {celebration?.playerName}!
            </Text>

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
            <MaterialCommunityIcons name="trash-can-outline" size={scale(28)} color={theme.colors.onErrorContainer} />
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
            <SpinningLogo size={scale(72)} color={theme.colors.primary} />
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
    width: scale(52),
    height: scale(52),
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
  editBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: scale(20), height: scale(20), borderRadius: scale(10), borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  scoreCapsule: {
    width: scale(64), height: scale(56), borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center",
  },
  matchPointFireBadge: {
    position: "absolute", top: -10, right: -8,
    width: scale(28), height: scale(28), borderRadius: scale(14), borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#241A05",
  },
  scoreText: { fontFamily: "Rajdhani_700Bold", fontSize: scale(30) },

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
    borderRadius: RADIUS.xl, borderWidth: 2,
    padding: SPACING.l,
  },
  winnerBanner: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, padding: SPACING.m, marginBottom: SPACING.m,
  },

  celebrationScreen: { alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  celebrationImageArea: {
    width: scale(320), height: scale(320),
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.m,
  },
  celebrationHalo: {
    position: "absolute", width: scale(250), height: scale(250), borderRadius: scale(125),
  },
  celebrationImage: { width: scale(310), height: scale(310) },
  celebrationTitle: { color: "#241A05", textAlign: "center", marginBottom: SPACING.l },
  celebrationSubtitle: { color: "#241A05", opacity: 0.75, marginTop: SPACING.xs, textAlign: "center" },
  confirmCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: scale(56), height: scale(56), borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.m,
  },
  confirmActions: { flexDirection: "row", width: "100%" },
  busyOverlay: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});

export default function TournamentDetailScreen(props) {
  const { tournamentId } = props.route.params;
  return (
    <TournamentDetailScreenInner key={tournamentId} {...props} />
  );
}