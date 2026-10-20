//Importaciones:
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { IconButton, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { POINTS_TO_WIN } from "../utils/tournamentLogic";
import { RADIUS, SPACING } from "../theme";
import { scale } from "../utils/responsive";

//JS:
const ELIJAH_IMAGE = require("../assets/elijah.png");
const GOLD_ON = "#241A05";
const DISPLAY_FONT = "Rajdhani_700Bold";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function buildTimeline(roster, rounds) {
  const current = {};
  roster.forEach((p) => {
    current[p.uid] = null;
  });
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const timeline = [];
  sorted.forEach((r) => {
    if (r.roundNumber > 0) timeline.push({ round: r, fought: { ...current } });
    const chars = r.characters || {};
    Object.keys(current).forEach((uid) => {
      if (Object.prototype.hasOwnProperty.call(chars, uid)) current[uid] = chars[uid] || null;
    });
  });
  return timeline;
}

function HeadIcon({ theme, character, size, style }) {
  return (
    <View style={[styles.headWrap, { width: size, height: size, backgroundColor: theme.colors.surfaceVariant }, style]}>
      {character?.images?.iconImage ? (
        <Image source={{ uri: character.images.iconImage }} style={{ width: size, height: size }} />
      ) : (
        <MaterialCommunityIcons name="help" size={size * 0.5} color={theme.colors.onSurfaceVariant} />
      )}
    </View>
  );
}

function FloatingCharacter({ uri, delay }) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, delay]);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  return <Animated.Image source={{ uri }} style={[styles.bigImage, { transform: [{ translateY }] }]} resizeMode="contain" />;
}

function PendingCharacter({ theme, size }) {
  const spin = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    const beatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const dotsLoop = Animated.loop(
      Animated.stagger(
        220,
        dots.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0.25, duration: 500, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    spinLoop.start();
    beatLoop.start();
    dotsLoop.start();
    return () => {
      spinLoop.stop();
      beatLoop.stop();
      dotsLoop.stop();
    };
  }, [spin, beat, dots]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const qScale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const discScale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.02] });
  const inner = size * 0.74;
  const labelSize = clamp(size * 0.09, 12, 22);

  return (
    <View style={styles.pendingWrap}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={[
            styles.pendingRing,
            { width: size, height: size, borderRadius: size / 2, borderColor: theme.colors.outline, transform: [{ rotate }] },
          ]}
        />
        <Animated.View
          style={{
            position: "absolute",
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: theme.colors.surfaceVariant,
            transform: [{ scale: discScale }],
          }}
        />
        <Animated.Text
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: size * 0.5,
            lineHeight: size * 0.6,
            color: theme.colors.onSurface,
            opacity: 0.9,
            transform: [{ scale: qScale }],
          }}
        >
          ?
        </Animated.Text>
      </View>
      <View style={[styles.pendingLabelRow, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={{ fontFamily: DISPLAY_FONT, fontSize: labelSize, letterSpacing: 3, color: theme.colors.onSurface }}>ELIGIENDO</Text>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{
              width: labelSize * 0.28,
              height: labelSize * 0.28,
              borderRadius: labelSize,
              marginLeft: labelSize * 0.2,
              backgroundColor: theme.colors.primary,
              opacity: d,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function BoardPlayerCard({ theme, p, character, index, isMatchPoint, isLeader, wasElijah, matchPointScale, cardWidth }) {
  const nameSize = clamp(cardWidth * 0.11, 22, 64);
  const charSize = clamp(cardWidth * 0.055, 14, 30);
  const pointsSize = clamp(cardWidth * 0.3, 56, 180);

  const borderColor = isMatchPoint ? theme.custom.gold : isLeader ? theme.colors.primary : theme.colors.outline;
  const bigImage = character?.images?.fullImage;

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor, borderWidth: isMatchPoint || isLeader ? 3 : 1.5 },
        isMatchPoint && { transform: [{ scale: matchPointScale }] },
      ]}
    >
      {/* Etiquetas arriba */}
      <View style={styles.cardTags}>
        {isLeader && !isMatchPoint ? (
          <View style={[styles.tag, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={scale(14)} color={theme.colors.onPrimary} />
            <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>LÍDER</Text>
          </View>
        ) : (
          <View />
        )}
        {wasElijah && (
          <View style={[styles.tag, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Image source={ELIJAH_IMAGE} style={styles.tagElijah} />
            <Text style={[styles.tagText, { color: theme.colors.onSurfaceVariant }]}>ELIJAH</Text>
          </View>
        )}
      </View>

      {/* Personaje en grande */}
      <View style={styles.imageArea}>
        {bigImage && (
          <View
            style={[
              styles.halo,
              { backgroundColor: isMatchPoint ? theme.custom.gold : theme.colors.primary, opacity: isMatchPoint ? 0.28 : 0.14 },
            ]}
          />
        )}
        {bigImage ? (
          <FloatingCharacter uri={bigImage} delay={index * 350} />
        ) : (
          <PendingCharacter theme={theme} size={clamp(cardWidth * 0.42, 80, 240)} />
        )}
      </View>

      {/* Datos */}
      <View style={styles.infoRow}>
        <View style={{ flex: 1, paddingBottom: SPACING.xs }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, lineHeight: nameSize * 1.1, color: theme.colors.onSurface }}
          >
            {p.playerName}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: charSize, color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
            {character?.name || "Sin personaje"}
          </Text>
        </View>
        <View style={styles.pointsWrap}>
          {isMatchPoint && (
            <MaterialCommunityIcons
              name="fire"
              size={pointsSize * 0.32}
              color={theme.custom.gold}
              style={{ marginBottom: pointsSize * 0.12, marginRight: 2 }}
            />
          )}
          <Text
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: pointsSize,
              lineHeight: pointsSize * 0.92,
              marginBottom: -pointsSize * 0.08,
              color: isMatchPoint ? theme.custom.gold : theme.colors.primary,
            }}
          >
            {p.points}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function HistoryRound({ theme, entry, participants, charById, isLatest }) {
  const { round, fought } = entry;
  return (
    <View
      style={[
        styles.historyRow,
        { backgroundColor: theme.colors.background, borderColor: isLatest ? theme.colors.primary : theme.colors.outline },
      ]}
    >
      <View style={[styles.roundBadge, { backgroundColor: isLatest ? theme.colors.primary : theme.colors.surfaceVariant }]}>
        <Text
          style={{
            fontSize: scale(10),
            fontWeight: "800",
            letterSpacing: 1,
            color: isLatest ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
          }}
        >
          {isLatest ? "ÚLTIMA" : "RONDA"}
        </Text>
        <Text
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: scale(30),
            lineHeight: scale(32),
            color: isLatest ? theme.colors.onPrimary : theme.colors.onSurface,
          }}
        >
          {round.roundNumber}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyPlayers}>
        {participants.map((p) => {
          const isWinner = round.winnerUid === p.uid;
          const isElijah = round.elijahUid === p.uid;
          const character = charById[fought[p.uid]];
          return (
            <View key={p.uid} style={styles.historyPlayer}>
              <View>
                <HeadIcon
                  theme={theme}
                  character={character}
                  size={scale(60)}
                  style={[
                    { borderWidth: 3, borderColor: "transparent" },
                    isWinner && { borderColor: theme.custom.gold },
                    isElijah && { opacity: 0.5 },
                  ]}
                />
                {isWinner && (
                  <View style={[styles.miniBadge, { backgroundColor: theme.custom.gold, borderColor: theme.colors.surface }]}>
                    <MaterialCommunityIcons name="trophy" size={scale(12)} color={GOLD_ON} />
                  </View>
                )}
                {isElijah && <Image source={ELIJAH_IMAGE} style={[styles.miniBadge, { borderColor: theme.colors.surface }]} />}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: scale(13),
                  marginTop: SPACING.xs,
                  maxWidth: scale(96),
                  color: isWinner ? theme.custom.gold : theme.colors.onSurfaceVariant,
                  fontWeight: isWinner ? "800" : "600",
                }}
              >
                {p.playerName}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: scale(11), maxWidth: scale(96), color: theme.colors.onSurfaceVariant, opacity: 0.75 }}
              >
                {character?.name || "—"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HistoryModal({ theme, visible, onClose, timeline, participants, charById, maxHeight }) {
  const total = timeline.length;
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.historyModal,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, maxHeight },
        ]}
      >
        {/* Cabecera */}
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.primaryContainer }]}>
          <View style={[styles.modalHeaderCircle, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.modalIcon, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="history" size={scale(26)} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: scale(28), letterSpacing: 2, color: theme.colors.onPrimaryContainer }}>
              HISTORIAL
            </Text>
            <Text style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8, fontSize: scale(13) }}>
              {total} {total === 1 ? "ronda jugada" : "rondas jugadas"}
            </Text>
          </View>
          <IconButton icon="close" size={scale(24)} iconColor={theme.colors.onPrimaryContainer} onPress={onClose} />
        </View>

        {/* Leyenda */}
        <View style={[styles.legendRow, { borderBottomColor: theme.colors.outline }]}>
          <View style={[styles.legendDot, { borderColor: theme.custom.gold }]} />
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Ganó la ronda</Text>
          <Image source={ELIJAH_IMAGE} style={[styles.legendElijah, { marginLeft: SPACING.l }]} />
          <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Elijah</Text>
        </View>

        {/* Rondas, de la más nueva a la más vieja */}
        <ScrollView contentContainerStyle={{ padding: SPACING.l }}>
          {total === 0 ? (
            <View style={styles.modalEmpty}>
              <MaterialCommunityIcons name="sword-cross" size={scale(36)} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.s, fontSize: scale(14) }}>
                Todavía no se jugó ninguna ronda
              </Text>
            </View>
          ) : (
            [...timeline]
              .reverse()
              .map((entry, i) => (
                <HistoryRound
                  key={entry.round.id || entry.round.roundNumber}
                  theme={theme}
                  entry={entry}
                  participants={participants}
                  charById={charById}
                  isLatest={i === 0}
                />
              ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

export default function TournamentBoardView({ tournament, rounds, charById, matchPointScale, micButton, onExit }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [gridWidth, setGridWidth] = useState(width);

  const participants = tournament.participants || [];
  const timeline = useMemo(() => buildTimeline(tournament.roster || participants, rounds), [tournament.roster, rounds]);
  const lastEntry = timeline[timeline.length - 1];
  const nextRoundNumber = timeline.length + 1;
  const maxPoints = Math.max(0, ...participants.map((p) => p.points));
  const leaders = participants.filter((p) => p.points === maxPoints && maxPoints > 0);

  const isLandscape = width > height;
  const columns = isLandscape ? Math.min(participants.length, 4) || 1 : Math.min(participants.length, 2) || 1;
  const rows = [];
  for (let i = 0; i < participants.length; i += columns) rows.push(participants.slice(i, i + columns));
  const cardWidth = (gridWidth - SPACING.m * (columns - 1)) / columns;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + SPACING.s, paddingBottom: insets.bottom + SPACING.m },
      ]}
    >
      <StatusBar hidden />
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Image source={require("../assets/logo.webp")} style={[styles.logo, { tintColor: theme.colors.primary }]} resizeMode="contain" />
        <Text style={[styles.brand, { color: theme.colors.onBackground }]}>SMASH 33</Text>
        <View style={[styles.roundPill, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ fontFamily: DISPLAY_FONT, fontSize: scale(18), color: theme.colors.onPrimary }}>RONDA {nextRoundNumber}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {micButton}
        <Pressable
          onPress={() => setHistoryOpen(true)}
          hitSlop={8}
          style={[styles.exitBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
        >
          <MaterialCommunityIcons name="history" size={scale(22)} color={theme.colors.onSurface} />
          {timeline.length > 0 && (
            <View style={[styles.countDot, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
              <Text style={{ color: theme.colors.onPrimary, fontSize: scale(10), fontWeight: "800" }}>{timeline.length}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={onExit}
          hitSlop={8}
          style={[styles.exitBtn, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
        >
          <MaterialCommunityIcons name="fullscreen-exit" size={scale(22)} color={theme.colors.onSurface} />
        </Pressable>
      </View>

      {/* Jugadores */}
      <View style={{ flex: 1 }} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.gridRow, ri > 0 && { marginTop: SPACING.m }]}>
            {row.map((p, ci) => {
              const index = ri * columns + ci;
              return (
                <View key={p.uid} style={[styles.gridCell, ci > 0 && { marginLeft: SPACING.m }]}>
                  <BoardPlayerCard
                    theme={theme}
                    p={p}
                    index={index}
                    character={charById[p.currentCharacterId]}
                    isMatchPoint={p.points === POINTS_TO_WIN - 1}
                    isLeader={leaders.length === 1 && leaders[0].uid === p.uid}
                    wasElijah={lastEntry?.round?.elijahUid === p.uid}
                    matchPointScale={matchPointScale}
                    cardWidth={cardWidth}
                  />
                </View>
              );
            })}
            {Array.from({ length: columns - row.length }).map((_, k) => (
              <View key={`empty-${k}`} style={[styles.gridCell, { marginLeft: SPACING.m }]} />
            ))}
          </View>
        ))}
      </View>

      <HistoryModal
        theme={theme}
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        timeline={timeline}
        participants={participants}
        charById={charById}
        maxHeight={height * 0.88}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACING.l },
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.m },
  logo: { width: scale(34), height: scale(34) },
  brand: { fontFamily: DISPLAY_FONT, fontSize: scale(22), letterSpacing: 2, marginLeft: SPACING.s, marginRight: SPACING.m },
  roundPill: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.m, paddingVertical: 2 },
  exitBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.s,
  },

  gridRow: { flex: 1, flexDirection: "row" },
  gridCell: { flex: 1 },

  card: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.m, overflow: "hidden" },
  cardTags: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: scale(24), zIndex: 2 },
  tag: { flexDirection: "row", alignItems: "center", borderRadius: RADIUS.pill, paddingHorizontal: SPACING.s, paddingVertical: 3 },
  tagText: { fontSize: scale(11), fontWeight: "800", letterSpacing: 0.8, marginLeft: 4 },
  tagElijah: { width: scale(16), height: scale(16), borderRadius: scale(8) },
  imageArea: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: "78%", aspectRatio: 1, maxHeight: "100%", borderRadius: 9999 },
  bigImage: { width: "100%", height: "100%" },
  pendingWrap: { alignItems: "center", justifyContent: "center" },
  pendingRing: { position: "absolute", borderWidth: 3, borderStyle: "dashed" },
  pendingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.m,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.xs,
  },
  pointsWrap: { flexDirection: "row", alignItems: "flex-end", marginLeft: SPACING.s },
  infoRow: { flexDirection: "row", alignItems: "flex-end", marginTop: SPACING.s },

  historyModal: {
    alignSelf: "center",
    width: "92%",
    maxWidth: 980,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SPACING.l,
    paddingRight: SPACING.s,
    paddingVertical: SPACING.l,
    overflow: "hidden",
  },
  modalHeaderCircle: {
    position: "absolute",
    right: -scale(40),
    top: -scale(70),
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    opacity: 0.12,
  },
  modalIcon: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmpty: { alignItems: "center", paddingVertical: SPACING.xxl },
  countDot: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.s, borderBottomWidth: 1 },
  legendDot: { width: scale(14), height: scale(14), borderRadius: scale(7), borderWidth: 2 },
  legendElijah: { width: scale(16), height: scale(16), borderRadius: scale(8) },
  legendText: { fontSize: scale(12), marginLeft: SPACING.xs, fontWeight: "600" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  roundBadge: {
    width: scale(68),
    height: scale(68),
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.m,
  },
  historyPlayers: { alignItems: "flex-start" },
  historyPlayer: { alignItems: "center", marginRight: SPACING.xl, minWidth: scale(72) },
  headWrap: { borderRadius: 9999, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  miniBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});